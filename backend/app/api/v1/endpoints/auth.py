import logging
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from app.database.session import get_db
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserLogin, UserOut, Token
from app.core.security import hash_password, verify_password, create_access_token
from app.api.deps import get_current_user

logger = logging.getLogger("myclinix.auth")

router = APIRouter()

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    """Register a new user account with role-based access control."""
    clean_email = user_in.email.lower().strip()
    logger.info(f"Registration request received for email: {clean_email} with role: {user_in.role}")
    
    try:
        existing_user = db.query(User).filter(User.email == clean_email).first()
    except SQLAlchemyError as e:
        logger.error(f"Database error checking existing user during registration: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connectivity error during registration."
        )

    if existing_user:
        logger.warning(f"Registration rejected: account already exists for {clean_email}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    try:
        user = User(
            email=clean_email,
            hashed_password=hash_password(user_in.password),
            full_name=user_in.full_name.strip(),
            role=user_in.role,
            is_active=True,
            is_verified=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        logger.info(f"Successfully registered user {user.id} ({clean_email})")
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Database error creating user {clean_email}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to register user due to a database error."
        )

    token = create_access_token(subject=user.id, role=user.role)
    return Token(access_token=token, token_type="bearer", user=UserOut.model_validate(user))

@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    """Authenticate user with email and password and return a JWT access token."""
    clean_email = login_data.email.lower().strip()
    logger.info(f"Login attempt for: {clean_email}")
    
    try:
        user = db.query(User).filter(User.email == clean_email).first()
    except SQLAlchemyError as e:
        logger.error(f"Database query error during login for {clean_email}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database service error during authentication. Please check database connectivity."
        )

    if not user:
        logger.warning(f"Login failed: user not found ({clean_email})")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(login_data.password, user.hashed_password):
        logger.warning(f"Login failed: invalid password for {clean_email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        logger.warning(f"Login rejected: account is inactive ({clean_email})")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is currently inactive. Contact your administrator."
        )

    try:
        token = create_access_token(subject=user.id, role=user.role)
        logger.info(f"Login successful for {clean_email} ({user.role})")
        return Token(access_token=token, token_type="bearer", user=UserOut.model_validate(user))
    except Exception as e:
        logger.error(f"Error generating token for {clean_email}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to issue authentication token."
        )

@router.post("/token", response_model=Token, include_in_schema=False)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """OAuth2 password form login endpoint for Swagger UI compatibility."""
    clean_username = form_data.username.lower().strip()
    try:
        user = db.query(User).filter(User.email == clean_username).first()
    except SQLAlchemyError as e:
        logger.error(f"Database error in OAuth2 token endpoint: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error during authentication."
        )

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is currently inactive."
        )

    token = create_access_token(subject=user.id, role=user.role)
    return Token(access_token=token, token_type="bearer", user=UserOut.model_validate(user))

@router.get("/me", response_model=UserOut)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Get profile of the currently logged-in user."""
    return UserOut.model_validate(current_user)

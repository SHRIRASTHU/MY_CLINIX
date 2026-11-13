import logging
import time
from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from app.database.session import get_db
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserLogin, UserOut, Token
from app.core.security import hash_password, verify_password, create_access_token
from app.api.deps import get_current_user
from app.services.audit_service import log_event, get_client_ip

logger = logging.getLogger("myclinix.auth")

# In-memory sliding-window rate limiter for brute-force protection (development/single-instance)
# Production deployments should configure Nginx / Cloudflare / Redis rate limiting.
_login_attempts: dict[str, list[float]] = defaultdict(list)
MAX_LOGIN_ATTEMPTS = 10
RATE_LIMIT_WINDOW_SECONDS = 15 * 60  # 15 minutes

router = APIRouter()

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, request: Request, db: Session = Depends(get_db)):
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

    log_event(
        db,
        action="register",
        actor_id=user.id,
        actor_role=user.role,
        request=request,
        extra={"role": user.role}
    )

    token = create_access_token(subject=user.id, role=user.role)
    return Token(access_token=token, token_type="bearer", user=UserOut.model_validate(user))

@router.post("/login", response_model=Token)
def login(login_data: UserLogin, request: Request, db: Session = Depends(get_db)):
    """Authenticate user with email and password and return a JWT access token."""
    clean_email = login_data.email.lower().strip()
    logger.info(f"Login attempt for: {clean_email}")

    # Rate limiting check
    client_ip = get_client_ip(request) or "unknown"
    now = time.time()
    # Prune timestamps outside the 15-minute window
    _login_attempts[client_ip] = [t for t in _login_attempts[client_ip] if now - t < RATE_LIMIT_WINDOW_SECONDS]

    if len(_login_attempts[client_ip]) >= MAX_LOGIN_ATTEMPTS:
        logger.warning(f"Rate limit exceeded for IP {client_ip} attempting login on {clean_email}")
        log_event(
            db,
            action="login_rate_limited",
            outcome="blocked",
            request=request,
            extra={"client_ip": client_ip}
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts. Please wait 15 minutes before retrying."
        )

    try:
        user = db.query(User).filter(User.email == clean_email).first()
    except SQLAlchemyError as e:
        logger.error(f"Database query error during login for {clean_email}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database service error during authentication. Please check database connectivity."
        )

    if not user or not verify_password(login_data.password, user.hashed_password):
        # Record attempt for rate limiting
        _login_attempts[client_ip].append(now)
        logger.warning(f"Login failed: invalid credentials for {clean_email}")
        log_event(
            db,
            action="login_failed",
            outcome="failure",
            request=request,
            extra={"client_ip": client_ip}
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        logger.warning(f"Login rejected: account is inactive ({clean_email})")
        log_event(
            db,
            action="login_inactive_rejected",
            actor_id=user.id,
            actor_role=user.role,
            outcome="forbidden",
            request=request,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is currently inactive. Contact your administrator."
        )

    # Clear rate limit counter on success
    if client_ip in _login_attempts:
        _login_attempts[client_ip] = []

    log_event(
        db,
        action="login_success",
        actor_id=user.id,
        actor_role=user.role,
        outcome="success",
        request=request,
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

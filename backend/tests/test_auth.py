def test_user_registration(client):
    payload = {
        "email": "dr.smith@hospital.org",
        "password": "SecurePassword123!",
        "full_name": "Dr. Sarah Smith",
        "role": "medical_reviewer"
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "dr.smith@hospital.org"
    assert data["user"]["role"] == "medical_reviewer"

def test_duplicate_user_registration_fails(client):
    payload = {
        "email": "john.doe@example.com",
        "password": "Password123!",
        "full_name": "John Doe",
        "role": "patient"
    }
    res1 = client.post("/api/v1/auth/register", json=payload)
    assert res1.status_code == 201

    res2 = client.post("/api/v1/auth/register", json=payload)
    assert res2.status_code == 400
    assert "already exists" in res2.json()["detail"]

def test_login_success_and_me(client):
    # Register user
    reg_payload = {
        "email": "nurse.clara@clinic.com",
        "password": "Password123!",
        "full_name": "Clara Oswald",
        "role": "caregiver"
    }
    client.post("/api/v1/auth/register", json=reg_payload)

    # Login
    login_payload = {
        "email": "nurse.clara@clinic.com",
        "password": "Password123!"
    }
    login_res = client.post("/api/v1/auth/login", json=login_payload)
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    assert token is not None

    # Access /me
    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "nurse.clara@clinic.com"
    assert me_res.json()["role"] == "caregiver"

def test_login_invalid_password(client):
    reg_payload = {
        "email": "test@example.com",
        "password": "CorrectPassword123!",
        "full_name": "Test User",
        "role": "patient"
    }
    client.post("/api/v1/auth/register", json=reg_payload)

    login_payload = {
        "email": "test@example.com",
        "password": "WrongPassword!"
    }
    res = client.post("/api/v1/auth/login", json=login_payload)
    assert res.status_code == 401

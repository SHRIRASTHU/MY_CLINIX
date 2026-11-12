def test_user_registration_roles(client):
    for role in ["doctor", "patient", "administrator"]:
        payload = {
            "email": f"test.{role}@hospital.org",
            "password": "SecurePassword123!",
            "full_name": f"Test {role.capitalize()}",
            "role": role
        }
        response = client.post("/api/v1/auth/register", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["role"] == role

def test_invalid_role_registration_rejected(client):
    for invalid_role in ["superman", "caregiver", "medical_reviewer"]:
        payload = {
            "email": f"invalid_{invalid_role}@example.com",
            "password": "Password123!",
            "full_name": "Invalid Role",
            "role": invalid_role
        }
        res = client.post("/api/v1/auth/register", json=payload)
        assert res.status_code == 422

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
    reg_payload = {
        "email": "dr.lin@clinic.com",
        "password": "Password123!",
        "full_name": "Dr. Lin",
        "role": "doctor"
    }
    client.post("/api/v1/auth/register", json=reg_payload)

    login_payload = {
        "email": "dr.lin@clinic.com",
        "password": "Password123!"
    }
    login_res = client.post("/api/v1/auth/login", json=login_payload)
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    assert token is not None

    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "dr.lin@clinic.com"
    assert me_res.json()["role"] == "doctor"

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

def test_role_authorization_admin_vs_doctor_and_patient(client):
    client.post("/api/v1/auth/register", json={
        "email": "admin@test.org", "password": "Password123!", "full_name": "Admin", "role": "administrator"
    })
    admin_token = client.post("/api/v1/auth/login", json={"email": "admin@test.org", "password": "Password123!"}).json()["access_token"]

    client.post("/api/v1/auth/register", json={
        "email": "doc@test.org", "password": "Password123!", "full_name": "Doctor", "role": "doctor"
    })
    doc_token = client.post("/api/v1/auth/login", json={"email": "doc@test.org", "password": "Password123!"}).json()["access_token"]

    client.post("/api/v1/auth/register", json={
        "email": "pat@test.org", "password": "Password123!", "full_name": "Patient", "role": "patient"
    })
    pat_token = client.post("/api/v1/auth/login", json={"email": "pat@test.org", "password": "Password123!"}).json()["access_token"]

    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    doc_headers = {"Authorization": f"Bearer {doc_token}"}
    pat_headers = {"Authorization": f"Bearer {pat_token}"}

    # 1. Admin can list all users and view platform stats
    admin_users_res = client.get("/api/v1/admin/users", headers=admin_headers)
    assert admin_users_res.status_code == 200
    assert len(admin_users_res.json()) >= 3

    admin_stats_res = client.get("/api/v1/admin/stats", headers=admin_headers)
    assert admin_stats_res.status_code == 200
    assert admin_stats_res.json()["total_doctors"] >= 1

    # 2. Doctor CANNOT access admin endpoints (403 Forbidden)
    doc_forbidden = client.get("/api/v1/admin/users", headers=doc_headers)
    assert doc_forbidden.status_code == 403

    # 3. Patient CANNOT access admin endpoints (403 Forbidden)
    pat_forbidden = client.get("/api/v1/admin/users", headers=pat_headers)
    assert pat_forbidden.status_code == 403

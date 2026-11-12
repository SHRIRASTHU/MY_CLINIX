def get_auth_token(client, email, password, full_name, role="patient"):
    client.post("/api/v1/auth/register", json={
        "email": email,
        "password": password,
        "full_name": full_name,
        "role": role
    })
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return res.json()["access_token"]

def test_patient_creation_and_isolation(client):
    token_a = get_auth_token(client, "alice@test.com", "Password123!", "Alice Wonder", "patient")
    token_b = get_auth_token(client, "bob@test.com", "Password123!", "Bob Builder", "patient")

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Alice creates a patient profile (her father)
    patient_payload = {
        "first_name": "Arthur",
        "last_name": "Wonder",
        "date_of_birth": "1958-04-12",
        "gender": "male",
        "blood_group": "O+",
        "emergency_contact_name": "Alice Wonder",
        "emergency_contact_phone": "+1-555-0199",
        "medical_notes": "History of hypertension and coronary artery disease."
    }
    create_res = client.post("/api/v1/patients", json=patient_payload, headers=headers_a)
    assert create_res.status_code == 201
    patient_a_id = create_res.json()["id"]
    assert create_res.json()["access_level"] == "owner"

    # Alice should see Arthur in her patient list
    list_a = client.get("/api/v1/patients", headers=headers_a)
    assert list_a.status_code == 200
    assert len(list_a.json()) == 1
    assert list_a.json()[0]["id"] == patient_a_id

    # Bob's patient list should be strictly EMPTY (Isolation)
    list_b = client.get("/api/v1/patients", headers=headers_b)
    assert list_b.status_code == 200
    assert len(list_b.json()) == 0

    # Bob attempts direct access to Alice's patient -> Must return 403 Forbidden
    direct_access = client.get(f"/api/v1/patients/{patient_a_id}", headers=headers_b)
    assert direct_access.status_code == 403
    assert "Access denied" in direct_access.json()["detail"]

    # Alice grants Bob caregiver access
    grant_res = client.post(
        f"/api/v1/patients/{patient_a_id}/access",
        json={"user_email": "bob@test.com", "access_level": "caregiver"},
        headers=headers_a
    )
    assert grant_res.status_code == 201

    # Bob can now view the patient profile
    detail_b = client.get(f"/api/v1/patients/{patient_a_id}", headers=headers_b)
    assert detail_b.status_code == 200
    assert detail_b.json()["first_name"] == "Arthur"

    # Bob (caregiver) can update notes
    update_res = client.put(
        f"/api/v1/patients/{patient_a_id}",
        json={"medical_notes": "Updated: Prescribed new ACE inhibitor."},
        headers=headers_b
    )
    assert update_res.status_code == 200
    assert "ACE inhibitor" in update_res.json()["medical_notes"]

    # Bob (caregiver) CANNOT delete the record -> Only Owner/Admin can delete
    delete_res_b = client.delete(f"/api/v1/patients/{patient_a_id}", headers=headers_b)
    assert delete_res_b.status_code == 403

    # Alice (owner) deletes the patient record
    delete_res_a = client.delete(f"/api/v1/patients/{patient_a_id}", headers=headers_a)
    assert delete_res_a.status_code == 204

    # Now detail returns 404
    assert client.get(f"/api/v1/patients/{patient_a_id}", headers=headers_a).status_code == 404

import sys
import json
import requests

BASE_URL = "http://127.0.0.1:8000/api"

def run_tests():
    print("=== CIVIORA AUTHENTICATION & RBAC AUTOMATED SUITE ===")
    
    # 1. DEMO LOGIN VERIFICATION
    print("\n1. Testing Preserved Demo Logins...")
    roles = ["CITIZEN", "UNIVERSITY", "INDUSTRY_PARTNER", "GOVERNMENT_ADMIN"]
    demo_tokens = {}
    for r in roles:
        res = requests.post(f"{BASE_URL}/auth/quick-login", json={"role": r})
        assert res.status_code == 200, f"Demo login failed for {r}: {res.text}"
        data = res.json()
        assert data["user"]["role"] == r
        assert data["user"]["auth_mode"] == "DEMO"
        demo_tokens[r] = data["access_token"]
        print(f"   [OK] Demo Login for {r} -> Token received (User: {data['user']['email']})")

    # 2. CITIZEN REGISTRATION & LOGIN
    print("\n2. Testing Real Citizen Sign Up & Sign In...")
    cit_email = "real_citizen_test@civiora.in"
    cit_pass = "SecurePass123!"
    
    # Register Citizen
    res = requests.post(f"{BASE_URL}/auth/register", json={
        "name": "Real Citizen Test",
        "email": cit_email,
        "password": cit_pass,
        "confirm_password": cit_pass,
        "role": "CITIZEN",
        "phone": "+91 9998887770",
        "location": "Ranchi"
    })
    assert res.status_code == 200, f"Citizen registration failed: {res.text}"
    cit_data = res.json()
    assert cit_data["user"]["role"] == "CITIZEN"
    assert cit_data["user"]["account_status"] == "ACTIVE"
    assert cit_data["user"]["auth_mode"] == "REAL"
    print(f"   [OK] Registered Citizen: {cit_email} (Status: {cit_data['user']['account_status']})")

    # Login Real Citizen
    res = requests.post(f"{BASE_URL}/auth/login", json={"email": cit_email, "password": cit_pass})
    assert res.status_code == 200, f"Citizen login failed: {res.text}"
    cit_login_data = res.json()
    cit_token = cit_login_data["access_token"]
    print("   [OK] Real Citizen Login Successful!")

    # Test authenticated profile endpoint (/me)
    res = requests.get(f"{BASE_URL}/auth/me", headers={"Authorization": f"Bearer {cit_token}"})
    assert res.status_code == 200
    assert res.json()["email"] == cit_email
    print("   [OK] Endpoint /auth/me verified real citizen identity.")

    # 3. UNIVERSITY REGISTRATION & LOGIN
    print("\n3. Testing Real University Sign Up & Sign In...")
    univ_email = "rnd@ranchi_univ.edu.in"
    univ_pass = "UnivResearch2026!"
    res = requests.post(f"{BASE_URL}/auth/register", json={
        "name": "Dr. S. K. Mahato",
        "email": univ_email,
        "password": univ_pass,
        "confirm_password": univ_pass,
        "role": "UNIVERSITY",
        "organization_name": "Ranchi University R&D Cell",
        "location": "Ranchi",
        "department_sector": "Water & CleanTech"
    })
    assert res.status_code == 200, f"University registration failed: {res.text}"
    univ_token = res.json()["access_token"]
    print("   [OK] University Account Registered & Signed In.")

    # 4. MSME / INDUSTRY REGISTRATION & LOGIN
    print("\n4. Testing Real MSME / Industry Sign Up & Sign In...")
    msme_email = "csr@tata_cleantech.com"
    msme_pass = "IndustryCSR2026!"
    res = requests.post(f"{BASE_URL}/auth/register", json={
        "name": "Vikram Sethi",
        "email": msme_email,
        "password": msme_pass,
        "confirm_password": msme_pass,
        "role": "INDUSTRY_PARTNER",
        "organization_name": "Tata CleanTech CSR Ltd",
        "location": "Jamshedpur",
        "department_sector": "Environmental Remediation"
    })
    assert res.status_code == 200, f"MSME registration failed: {res.text}"
    msme_token = res.json()["access_token"]
    print("   [OK] MSME / Industry Account Registered & Signed In.")

    # 5. GOVERNMENT REGISTRATION & ADMIN APPROVAL FLOW
    print("\n5. Testing Government Account Verification Flow...")
    govt_email = "officer.urban@jharkhand.gov.in"
    govt_pass = "GovtAdminPass2026!"
    
    # Register Government Account
    res = requests.post(f"{BASE_URL}/auth/register", json={
        "name": "Amitabh Roy (IAS)",
        "email": govt_email,
        "password": govt_pass,
        "confirm_password": govt_pass,
        "role": "GOVERNMENT_ADMIN",
        "organization_name": "Urban Development Dept, Govt of Jharkhand",
        "location": "Ranchi Secretariat"
    })
    assert res.status_code == 200, f"Govt registration failed: {res.text}"
    reg_res = res.json()
    assert reg_res["requires_verification"] is True
    pending_user_id = reg_res["user"]["id"]
    print(f"   [OK] Registered Govt User #{pending_user_id}. Status: PENDING (Requires Verification)")

    # Attempt to Login BEFORE Approval -> Must fail with 403 / Pending message
    res = requests.post(f"{BASE_URL}/auth/login", json={"email": govt_email, "password": govt_pass})
    assert res.status_code == 403, f"Expected 403 for pending account, got: {res.status_code}"
    print("   [OK] Login BLOCKED for PENDING Government Account as expected.")

    # Demo Admin approves the pending user
    admin_token = demo_tokens["GOVERNMENT_ADMIN"]
    res = requests.get(f"{BASE_URL}/auth/pending-users", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    pending_list = res.json()
    assert any(u["id"] == pending_user_id for u in pending_list)
    print("   [OK] Admin retrieved pending account from queue.")

    # Update status to ACTIVE
    res = requests.patch(
        f"{BASE_URL}/auth/users/{pending_user_id}/status",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"account_status": "ACTIVE"}
    )
    assert res.status_code == 200
    print(f"   [OK] Admin APPROVED Government User #{pending_user_id}.")

    # Login NOW AFTER Approval -> Must succeed
    res = requests.post(f"{BASE_URL}/auth/login", json={"email": govt_email, "password": govt_pass})
    assert res.status_code == 200, f"Login failed after approval: {res.text}"
    approved_govt_data = res.json()
    assert approved_govt_data["user"]["role"] == "GOVERNMENT_ADMIN"
    print("   [OK] Approved Government User Signed In Successfully! Granted GOVERNMENT_ADMIN role.")

    # 6. FORGOT PASSWORD & RESET FLOW
    print("\n6. Testing Forgot Password Flow...")
    res = requests.post(f"{BASE_URL}/auth/forgot-password", json={"email": cit_email})
    assert res.status_code == 200
    forgot_data = res.json()
    reset_link = forgot_data["simulated_reset_link"]
    token = reset_link.split("token=")[1]
    print(f"   [OK] Forgot password token generated: {token[:12]}...")

    # Reset Password
    new_cit_pass = "BrandNewPass2026!"
    res = requests.post(f"{BASE_URL}/auth/reset-password", json={
        "token": token,
        "new_password": new_cit_pass,
        "confirm_password": new_cit_pass
    })
    assert res.status_code == 200
    print("   [OK] Password reset successfully!")

    # Verify old password fails & new password works
    res_old = requests.post(f"{BASE_URL}/auth/login", json={"email": cit_email, "password": cit_pass})
    assert res_old.status_code == 401, "Old password should fail"

    res_new = requests.post(f"{BASE_URL}/auth/login", json={"email": cit_email, "password": new_cit_pass})
    assert res_new.status_code == 200, "New password should succeed"
    print("   [OK] Real Citizen successfully authenticated with NEW password.")

    # 7. PROFILE UPDATE TEST
    print("\n7. Testing Profile Editing...")
    cit_new_token = res_new.json()["access_token"]
    res = requests.patch(
        f"{BASE_URL}/auth/profile",
        headers={"Authorization": f"Bearer {cit_new_token}"},
        json={"name": "Real Citizen Updated", "location": "Dhanbad"}
    )
    assert res.status_code == 200
    updated_user = res.json()
    assert updated_user["name"] == "Real Citizen Updated"
    assert updated_user["location"] == "Dhanbad"
    print("   [OK] User profile updated successfully.")

    print("\n=======================================================")
    print("  ALL AUTHENTICATION & RBAC TESTS PASSED SUCCESSFULLY! ")
    print("=======================================================\n")

if __name__ == "__main__":
    run_tests()

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_funding_pipeline():
    print("====================================================")
    print("RUNNING DEDICATED FUNDING WORKFLOW & ENDPOINT TESTS")
    print("====================================================")

    # 1. Login as University User
    res = client.post("/api/auth/login", json={"email": "iitm@civiora.gov.in", "password": "univ123"})
    assert res.status_code == 200, f"Login failed: {res.text}"
    univ_token = res.json()["access_token"]
    headers_univ = {"Authorization": f"Bearer {univ_token}"}
    print("[PASS] Login successful as UNIVERSITY role!")

    # 2. Login as Industry Partner
    res = client.post("/api/auth/login", json={"email": "industry@civiora.gov.in", "password": "ind123"})
    if res.status_code != 200:
        # Quick login fallback for tests
        res = client.post("/api/auth/quick-login", json={"role": "INDUSTRY_PARTNER"})
    assert res.status_code == 200
    ind_token = res.json()["access_token"]
    headers_ind = {"Authorization": f"Bearer {ind_token}"}
    print("[PASS] Login successful as INDUSTRY_PARTNER role!")

    # 3. Create a Funding Request for PRJ-2026-003
    print("\n--- 1. CREATE FUNDING REQUEST ---")
    create_payload = {
        "project_id": "PRJ-2026-003",
        "partner_id": 1,
        "requested_amount": 15.5,
        "purpose": "Sensor hardware scaling & microgrid integration",
        "description": "Deployment of 10 solar microgrid IoT controllers across Ranchi district.",
        "expected_outcome": "Uninterrupted power monitoring with automated load shedding during monsoon flooding.",
        "evidence_url": "http://127.0.0.1:8000/uploads/solar_blueprint.pdf"
    }
    res = client.post("/api/funding-requests", json=create_payload, headers=headers_univ)
    assert res.status_code == 200, f"Create funding request failed: {res.text}"
    freq_data = res.json()
    freq_id = freq_data["id"]
    print(f"[PASS] Funding Request Created! ID={freq_id}, Status={freq_data['status']}, Requested=₹{freq_data['requested_amount']} Lakhs")
    assert freq_data["status"] == "PENDING"
    assert freq_data["requested_amount"] == 15.5
    assert freq_data["project_name"] != ""

    # 4. List Funding Requests
    print("\n--- 2. LIST FUNDING REQUESTS ---")
    res = client.get("/api/funding-requests", headers=headers_ind)
    assert res.status_code == 200
    freq_list = res.json()
    print(f"[PASS] Retrieved {len(freq_list)} total funding requests.")
    assert len(freq_list) >= 3

    # 5. Get Funding Request Detail by ID
    print("\n--- 3. GET FUNDING REQUEST DETAIL ---")
    res = client.get(f"/api/funding-requests/{freq_id}", headers=headers_ind)
    assert res.status_code == 200
    req_detail = res.json()
    assert req_detail["id"] == freq_id
    print(f"[PASS] Funding Request #{freq_id} retrieved successfully! Project={req_detail['project_name']}")

    # 6. Approve Funding Request
    print("\n--- 4. APPROVE FUNDING REQUEST ---")
    res = client.patch(f"/api/funding-requests/{freq_id}/approve", json={"approved_amount": 15.0}, headers=headers_ind)
    assert res.status_code == 200, f"Approve failed: {res.text}"
    approved_data = res.json()
    assert approved_data["status"] == "APPROVED"
    assert approved_data["approved_amount"] == 15.0
    print(f"[PASS] Funding Request #{freq_id} APPROVED! Approved Amount=₹{approved_data['approved_amount']} Lakhs")

    # 7. Create and Reject another Funding Request
    print("\n--- 5. CREATE AND REJECT FUNDING REQUEST ---")
    # First create another request on PRJ-2026-003 since previous is no longer pending
    create_payload2 = {
        "project_id": "PRJ-2026-003",
        "partner_id": 2,
        "requested_amount": 25.0,
        "purpose": "Secondary drone mapping pilot",
        "description": "High-altitude thermal drone scanning",
        "expected_outcome": "Thermal aerial mapping of water drainage blockage points",
    }
    res2 = client.post("/api/funding-requests", json=create_payload2, headers=headers_univ)
    assert res2.status_code == 200
    freq_id2 = res2.json()["id"]

    res_rej = client.patch(f"/api/funding-requests/{freq_id2}/reject", json={"rejection_reason": "Budget limit reached for Q3"}, headers=headers_ind)
    assert res_rej.status_code == 200
    rej_data = res_rej.json()
    assert rej_data["status"] == "REJECTED"
    assert rej_data["rejection_reason"] == "Budget limit reached for Q3"
    print(f"[PASS] Funding Request #{freq_id2} REJECTED! Reason: '{rej_data['rejection_reason']}'")

    # 8. Check Project Details to confirm funding requests and CSR fundings
    print("\n--- 6. VERIFY PROJECT DETAILS INTEGRATION ---")
    res_proj = client.get("/api/projects/PRJ-2026-003", headers=headers_univ)
    assert res_proj.status_code == 200
    proj_info = res_proj.json()
    assert "funding_requests" in proj_info
    assert len(proj_info["funding_requests"]) >= 2
    assert "csr_fundings" in proj_info
    print(f"[PASS] Project PRJ-2026-003 incorporates {len(proj_info['funding_requests'])} funding requests and {len(proj_info['csr_fundings'])} CSR funding entries!")

    print("\n====================================================")
    print("ALL DEDICATED FUNDING TESTS PASSED (100%)!")
    print("====================================================")

if __name__ == "__main__":
    test_funding_pipeline()

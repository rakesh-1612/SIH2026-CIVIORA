import urllib.request
import json
import sys

BASE_URL = "http://127.0.0.1:8000/api"

def get_token(email, password):
    req = urllib.request.Request(
        f"{BASE_URL}/auth/login",
        data=json.dumps({"email": email, "password": password}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))["access_token"]

def http_post(url, data, token=None, expected_code=200):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8"),
        headers=headers
    )
    try:
        with urllib.request.urlopen(req) as resp:
            assert resp.status == expected_code, f"Expected {expected_code}, got {resp.status}"
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        if e.code == expected_code:
            return json.loads(e.read().decode("utf-8"))
        raise e

def http_get(url, token=None, expected_code=200):
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            assert resp.status == expected_code, f"Expected {expected_code}, got {resp.status}"
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        if e.code == expected_code:
            return json.loads(e.read().decode("utf-8"))
        raise e

def http_patch(url, data=None, token=None, expected_code=200):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8") if data else b"",
        headers=headers,
        method="PATCH"
    )
    try:
        with urllib.request.urlopen(req) as resp:
            assert resp.status == expected_code, f"Expected {expected_code}, got {resp.status}"
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        if e.code == expected_code:
            return json.loads(e.read().decode("utf-8"))
        raise e

def run_full_audit():
    print("===============================================================")
    print("CIVIORA JHARKHAND AUDIT & ROLE SECURITY SUITE")
    print("===============================================================")

    # 1. AUTHENTICATION & TOKEN AUDIT
    print("\n[SECTION 1: AUTHENTICATION & JWT TOKENS]")
    cit_token = get_token("citizen@civiora.gov.in", "citizen123")
    univ1_token = get_token("iitm@civiora.gov.in", "univ123") # institution_id = 1 (IIT ISM Dhanbad)
    admin_token = get_token("admin@civiora.gov.in", "admin123")
    print("  [PASS] CITIZEN authentication successful")
    print("  [PASS] UNIVERSITY (IIT ISM Dhanbad) authentication successful")
    print("  [PASS] GOVERNMENT_ADMIN authentication successful")

    # 2. SHARED HOMEPAGE PUBLIC OVERVIEW AUDIT (ALL ROLES & GUESTS)
    print("\n[SECTION 2: HOMEPAGE SHARED OVERVIEW ENDPOINT (GET /api/overview)]")
    # Guest access
    guest_ov = http_get(f"{BASE_URL}/overview", expected_code=200)
    assert guest_ov["total_challenges"] > 0
    print(f"  [PASS] Guest access to GET /api/overview succeeded: {guest_ov['total_challenges']} challenges")

    # Citizen access
    cit_ov = http_get(f"{BASE_URL}/overview", token=cit_token, expected_code=200)
    assert cit_ov["total_challenges"] == guest_ov["total_challenges"]
    print("  [PASS] CITIZEN access to GET /api/overview succeeded with 0 RBAC errors")

    # University access
    univ_ov = http_get(f"{BASE_URL}/overview", token=univ1_token, expected_code=200)
    assert univ_ov["total_challenges"] == guest_ov["total_challenges"]
    print("  [PASS] UNIVERSITY access to GET /api/overview succeeded with 0 RBAC errors")

    # Admin access
    admin_ov = http_get(f"{BASE_URL}/overview", token=admin_token, expected_code=200)
    assert admin_ov["total_challenges"] == guest_ov["total_challenges"]
    print("  [PASS] GOVERNMENT_ADMIN access to GET /api/overview succeeded with 0 RBAC errors")

    # 3. ROLE-BASED ACCESS CONTROL (RBAC) SECURITY AUDIT
    print("\n[SECTION 3: ROLE-BASED ACCESS CONTROL (RBAC) SECURITY]")
    # Unauthenticated request to protected admin endpoint -> 401
    res = http_get(f"{BASE_URL}/analytics/dashboard", expected_code=401)
    assert "detail" in res
    print("  [PASS] Unauthenticated access to /analytics/dashboard returns 401 Unauthorized")

    # Citizen request to Admin-only dashboard -> 403
    res = http_get(f"{BASE_URL}/analytics/dashboard", token=cit_token, expected_code=403)
    assert "detail" in res
    print("  [PASS] Citizen access to /analytics/dashboard returns 403 Forbidden")

    # University request to Admin-only dashboard -> 403
    res = http_get(f"{BASE_URL}/analytics/dashboard", token=univ1_token, expected_code=403)
    assert "detail" in res
    print("  [PASS] University access to /analytics/dashboard returns 403 Forbidden")

    # Admin request to Admin dashboard -> 200
    res = http_get(f"{BASE_URL}/analytics/dashboard", token=admin_token, expected_code=200)
    assert "total_challenges" in res
    print("  [PASS] Admin access to /analytics/dashboard returns 200 OK with analytics data")

    # 4. END-TO-END JHARKHAND CHALLENGE SUBMISSION & AI NLP PROCESSING
    print("\n[SECTION 4: JHARKHAND CHALLENGE SUBMISSION & AI PIPELINE]")
    flood_payload = {
        "title": "Severe monsoon waterlogging near Main Road Overbridge, Ranchi",
        "description": "Subway and main roads under 4 feet of storm water. Commuters stranded near Ranchi station, health hazard due to sewage mixing with flood water.",
        "location": "Main Road Overbridge, Ranchi",
        "district": "Ranchi",
        "state": "Jharkhand",
        "latitude": 23.3524,
        "longitude": 85.3242,
        "urgency_level": "CRITICAL"
    }
    ch_res = http_post(f"{BASE_URL}/challenges", flood_payload, token=cit_token)
    assert ch_res["id"].startswith("CIV-2026-")
    assert ch_res["analysis"]["predicted_category"] == "Disaster Management"
    assert len(ch_res["analysis"]["keywords"]) > 0
    assert len(ch_res["recommended_institutions"]) == 0
    print(f"  [PASS] Challenge Created: ID={ch_res['id']}")
    print(f"  [PASS] AI Categorization: {ch_res['analysis']['predicted_category']} [{ch_res['analysis']['subcategory']}]")
    print(f"  [PASS] Keywords Extracted: {ch_res['analysis']['keywords']}")
    print(f"  [PASS] Priority Score: {ch_res['analysis']['priority_score']}/100 [{ch_res['analysis']['priority_level']}]")

    # 5. DUPLICATE SIMILARITY DETECTION
    print("\n[SECTION 5: DUPLICATE & COSINE SIMILARITY DETECTION]")
    dup_payload = {
        "title": "Waterlogging near Ranchi Overbridge subway",
        "description": "Monsoon downpours cause 3 feet of waterlogging near Ranchi Overbridge subway blocking bus traffic",
        "location": "Overbridge Subway",
        "district": "Ranchi",
        "state": "Jharkhand",
        "latitude": 23.3520,
        "longitude": 85.3240,
        "urgency_level": "HIGH"
    }
    dup_res = http_post(f"{BASE_URL}/challenges", dup_payload, token=cit_token)
    top_sim = dup_res["similar_challenges"][0] if dup_res["similar_challenges"] else None
    assert top_sim is not None
    assert top_sim["similarity_score"] >= 65
    print(f"  [PASS] Target Challenge ID: {dup_res['id']}")
    print(f"  [PASS] Top Similar Match: {top_sim['id']} ('{top_sim['title']}')")
    print(f"  [PASS] Dynamic Similarity Score: {top_sim['similarity_score']}% [{top_sim['classification']}]")

    # 6. INSTITUTION ACCEPTANCE & PROJECT CREATION
    print("\n[SECTION 6: INSTITUTION ACCEPTANCE & PROJECT INSTANTIATION]")
    # Citizen trying to accept challenge -> 403 Forbidden
    http_post(f"{BASE_URL}/challenges/{ch_res['id']}/accept", {}, token=cit_token, expected_code=403)
    print("  [PASS] Citizen attempting to accept challenge returns 403 Forbidden")

    # Citizen trying to decline challenge -> 403 Forbidden
    http_post(f"{BASE_URL}/challenges/{ch_res['id']}/decline", {}, token=cit_token, expected_code=403)
    print("  [PASS] Citizen attempting to decline challenge returns 403 Forbidden")

    # University declining secondary challenge -> 200 OK
    dec_res = http_post(f"{BASE_URL}/challenges/{dup_res['id']}/decline", {}, token=univ1_token, expected_code=200)
    assert dec_res["status"] == "DECLINED"
    print("  [PASS] University declining challenge match returns 200 OK with status DECLINED")

    # University accepting challenge (empty body, derived from token) -> 200 OK
    proj_res = http_post(f"{BASE_URL}/challenges/{ch_res['id']}/accept", {}, token=univ1_token, expected_code=200)
    assert proj_res["id"].startswith("PRJ-2026-")
    assert proj_res["institution_id"] == 1
    assert len(proj_res["milestones"]) == 5
    print(f"  [PASS] Challenge Accepted by IIT (ISM) Dhanbad: Project ID={proj_res['id']} (derived from JWT token)")
    print(f"  [PASS] Initial Status: {proj_res['status']}, Progress: {proj_res['progress']}%")

    # 7. MILESTONES & ROADMAP EXECUTIONS
    print("\n[SECTION 7: MILESTONE PROGRESS & STATUS TRANSITIONS]")
    ms_id = proj_res["milestones"][1]["id"] # Pending milestone #2
    ms_res = http_patch(f"{BASE_URL}/milestones/{ms_id}/toggle", token=univ1_token)
    assert ms_res["is_completed"] == True

    updated_proj = http_get(f"{BASE_URL}/projects/{proj_res['id']}", token=univ1_token)
    assert updated_proj["progress"] == 40.0 # 2 out of 5 milestones completed
    print(f"  [PASS] Milestone Toggled: '{ms_res['title']}' -> is_completed=True")
    print(f"  [PASS] Updated Project Completion Progress: {updated_proj['progress']}%")

    # Transition Project Status via JSON payload
    st_res = http_patch(f"{BASE_URL}/projects/{proj_res['id']}/status", {"status": "IN_PROGRESS"}, token=univ1_token)
    assert st_res["status"] == "IN_PROGRESS"
    print(f"  [PASS] Project Status Transitioned to: {st_res['status']}")

    # 8. GEOSPATIAL INTELLIGENCE & SPATIAL HOTSPOTS (JHARKHAND REGION)
    print("\n[SECTION 8: GEOSPATIAL MAP & SPATIAL CLUSTERING (JHARKHAND)]")
    hotspots = http_get(f"{BASE_URL}/analytics/hotspots", token=admin_token)
    assert len(hotspots) > 0
    print(f"  [PASS] Total Spatial Hotspots Calculated: {len(hotspots)}")
    print(f"  [PASS] Top High-Density Risk Hotspot: {hotspots[0]['name']} ({hotspots[0]['challenge_count']} challenges)")

    print("\n===============================================================")
    print("ALL END-TO-END AUDIT SCENARIOS PASSED WITH ZERO ERRORS!")
    print("===============================================================")

if __name__ == "__main__":
    run_full_audit()

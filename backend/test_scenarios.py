import urllib.request
import urllib.error
import json

BASE_URL = "http://127.0.0.1:8000/api"

def get_token_for_role(role):
    req = urllib.request.Request(
        f"{BASE_URL}/auth/quick-login",
        data=json.dumps({"role": role}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))["access_token"]

def http_post(url, data, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8"),
        headers=headers
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def expect_http_error(url, data, token=None, expected_status=400):
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
            raise Exception(f"Expected HTTP {expected_status}, but received {resp.status}")
    except urllib.error.HTTPError as e:
        if e.code != expected_status:
            raise Exception(f"Expected HTTP {expected_status}, but received {e.code}")
        err_body = json.loads(e.read().decode("utf-8"))
        return err_body

def http_get(url, token=None):
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def http_patch(url, data=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8") if data else b"",
        headers=headers,
        method="PATCH"
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def run_tests():
    print("====================================================")
    print("RUNNING CIVIORA MANDATORY GEOSPATIAL TEST SCENARIOS")
    print("====================================================")

    print("\n--- AUTHENTICATING DEMO USER ROLES ---")
    cit_token = get_token_for_role("CITIZEN")
    univ_token = get_token_for_role("UNIVERSITY")
    admin_token = get_token_for_role("GOVERNMENT_ADMIN")
    print("[PASS] Authenticated CITIZEN, UNIVERSITY, and GOVERNMENT_ADMIN roles!")

    # TEST 1 — VALID RANCHI CHALLENGE
    print("\n--- TEST 1: CREATE VALID RANCHI CHALLENGE ---")
    t1_payload = {
        "title": "Severe monsoon waterlogging near Ranchi Main Road Overbridge",
        "description": "Monsoon downpours flood overbridge area blocking traffic.",
        "location": "Main Road Overbridge, Ranchi",
        "district": "Ranchi",
        "state": "Jharkhand",
        "latitude": 23.3524,
        "longitude": 85.3242,
        "urgency_level": "CRITICAL"
    }
    t1_res = http_post(f"{BASE_URL}/challenges", t1_payload, token=cit_token)
    print(f"[PASS] Ranchi Challenge Accepted: ID={t1_res['id']} | District={t1_res['district']}")
    assert t1_res['district'] == "Ranchi"

    # TEST 2 — VALID DHANBAD CHALLENGE
    print("\n--- TEST 2: CREATE VALID DHANBAD CHALLENGE ---")
    t2_payload = {
        "title": "Coal dust pollution along Katras corridor, Dhanbad",
        "description": "Coal trucks release heavy soot near residential schools.",
        "location": "Katras Railway Station Road",
        "district": "Dhanbad",
        "state": "Jharkhand",
        "latitude": 23.8050,
        "longitude": 86.2800,
        "urgency_level": "HIGH"
    }
    t2_res = http_post(f"{BASE_URL}/challenges", t2_payload, token=cit_token)
    print(f"[PASS] Dhanbad Challenge Accepted: ID={t2_res['id']} | District={t2_res['district']}")
    assert t2_res['district'] == "Dhanbad"

    # TEST 3 — VALID HAZARIBAGH CHALLENGE
    print("\n--- TEST 3: CREATE VALID HAZARIBAGH CHALLENGE ---")
    t3_payload = {
        "title": "Broken streetlights along NH33 corridor, Hazaribagh",
        "description": "Pedestrian safety risk due to non-functional streetlights.",
        "location": "NH33 Bus Stand Corridor, Hazaribagh",
        "district": "Hazaribagh",
        "state": "Jharkhand",
        "latitude": 23.9950,
        "longitude": 85.3620,
        "urgency_level": "HIGH"
    }
    t3_res = http_post(f"{BASE_URL}/challenges", t3_payload, token=cit_token)
    print(f"[PASS] Hazaribagh Challenge Accepted: ID={t3_res['id']} | District={t3_res['district']}")
    assert t3_res['district'] == "Hazaribagh"

    # TEST 4 — KARACHI, PAKISTAN CHALLENGE (EXPECT SUCCESS - GLOBAL LOCATION SUPPORT)
    print("\n--- TEST 4: KARACHI, PAKISTAN CHALLENGE (GLOBAL LOCATION ACCEPTED) ---")
    t4_payload = {
        "title": "Lack of toilets in Karachi overbridge area",
        "description": "Public toilet shortage near overbridge.",
        "location": "Main Road Overbridge, Karachi, Pakistan",
        "district": "Karachi",
        "state": "Sindh",
        "latitude": 24.8607,
        "longitude": 67.0011,
        "location_source": "MANUAL_SELECTION",
        "urgency_level": "HIGH"
    }
    t4_res = http_post(f"{BASE_URL}/challenges", t4_payload, token=cit_token)
    print(f"[PASS] Karachi Challenge Accepted: ID={t4_res['id']} | Location={t4_res['location']}")
    assert "Karachi" in t4_res['location']

    # TEST 5 — CHENNAI, INDIA CHALLENGE (EXPECT SUCCESS - TEST LOCATION)
    print("\n--- TEST 5: CHENNAI, INDIA CHALLENGE (GLOBAL LOCATION ACCEPTED) ---")
    t5_payload = {
        "title": "Waterlogging in Anna Nagar subway, Chennai",
        "description": "Subway flooding during monsoon rain.",
        "location": "Anna Nagar, Chennai, Tamil Nadu, India",
        "district": "Chennai",
        "state": "Tamil Nadu",
        "latitude": 13.0827,
        "longitude": 80.2707,
        "location_source": "CURRENT_LOCATION",
        "urgency_level": "HIGH"
    }
    t5_res = http_post(f"{BASE_URL}/challenges", t5_payload, token=cit_token)
    print(f"[PASS] Chennai Challenge Accepted: ID={t5_res['id']} | Location={t5_res['location']}")
    assert "Chennai" in t5_res['location']

    # TEST 6 — OUT-OF-RANGE COORDINATES (999, 999) (EXPECT REJECTION)
    print("\n--- TEST 6: OUT-OF-RANGE COORDINATES (999, 999) (EXPECT REJECTED) ---")
    t6_payload = {
        "title": "Test Challenge with Out of Range Coordinates",
        "description": "Invalid location test.",
        "location": "Invalid Coordinates",
        "district": "Invalid",
        "state": "Invalid",
        "latitude": 999.0,
        "longitude": 999.0,
        "urgency_level": "LOW"
    }
    t6_err = expect_http_error(f"{BASE_URL}/challenges", t6_payload, token=cit_token, expected_status=400)
    print(f"[PASS] Out of Range Coordinates REJECTED! Detail message: '{t6_err['detail']}'")

    # TEST 7 — GEOSPATIAL MAP & HOTSPOTS INTEGRATION
    print("\n--- TEST 7: GIS MAP & HOTSPOTS DATA FLOW ---")
    all_challenges = http_get(f"{BASE_URL}/challenges", token=admin_token)
    hotspots = http_get(f"{BASE_URL}/analytics/hotspots", token=admin_token)
    print(f"[PASS] Total Challenges in Database: {len(all_challenges)}")
    print(f"[PASS] Spatial Hotspot Clusters: {len(hotspots)}")
    
    # Ensure all challenges have valid global coordinates (-90 to 90 lat, -180 to 180 lng)
    for ch in all_challenges:
        assert -90.0 <= float(ch['latitude']) <= 90.0
        assert -180.0 <= float(ch['longitude']) <= 180.0
    print("[PASS] Verified 100% of stored database challenges have valid global geographic coordinates!")

    # TEST 8 — INSTITUTION ACCEPTANCE & PROJECT MILESTONES
    print("\n--- TEST 8: INSTITUTION ACCEPTANCE & PROJECT FLOW ---")
    accept_payload = {"institution_id": 1}
    proj_res = http_post(f"{BASE_URL}/challenges/{t1_res['id']}/accept", accept_payload, token=univ_token)
    print(f"[PASS] Challenge Accepted by Institution: Project ID={proj_res['id']}")

    print("\n====================================================")
    print("ALL GEOSPATIAL PIPELINE & RBAC TESTS PASSED SUCCESSFULLY!")
    print("====================================================")

if __name__ == "__main__":
    run_tests()

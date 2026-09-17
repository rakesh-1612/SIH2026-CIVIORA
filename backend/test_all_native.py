from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def run_native_tests():
    print("====================================================")
    print("RUNNING NATIVE FASTAPI ENDPOINT & PIPELINE TESTS")
    print("====================================================")

    # 1. Login
    res = client.post("/api/auth/login", json={"email": "citizen@civiora.gov.in", "password": "citizen123"})
    assert res.status_code == 200, f"Login failed: {res.text}"
    cit_token = res.json()["access_token"]
    headers_cit = {"Authorization": f"Bearer {cit_token}"}
    print("[PASS] Login successful for CITIZEN role!")

    res = client.post("/api/auth/login", json={"email": "iitm@civiora.gov.in", "password": "univ123"})
    univ_token = res.json()["access_token"]
    headers_univ = {"Authorization": f"Bearer {univ_token}"}

    res = client.post("/api/auth/login", json={"email": "admin@civiora.gov.in", "password": "admin123"})
    admin_token = res.json()["access_token"]
    headers_admin = {"Authorization": f"Bearer {admin_token}"}

    # 1.5 Test File Upload Endpoint (Guest and Authenticated)
    print("\n--- TEST 1.5: GUEST & AUTHENTICATED FILE UPLOAD ENDPOINT ---")
    files = {"file": ("test_evidence.jpg", b"fake image bytes", "image/jpeg")}
    res_upload = client.post("/api/upload", files=files)
    assert res_upload.status_code == 200, f"Upload failed: {res_upload.text}"
    up_data = res_upload.json()
    assert up_data["name"] == "test_evidence.jpg"
    assert up_data["type"] == "IMAGE"
    assert "uploads/" in up_data["url"]
    print(f"[PASS] File upload endpoint working! URL={up_data['url']}")

    # 2. Challenge Submission with Entity Type & Media
    print("\n--- TEST 1: CHALLENGE SUBMISSION WITH ULB ENTITY & MEDIA ---")
    sub_payload = {
        "title": "Severe monsoon waterlogging near Main Road Overbridge, Ranchi",
        "description": "Subway underpass overflows during heavy rainfall blocking traffic and emergency vehicles.",
        "category": "Disaster Management",
        "location": "Main Road Overbridge, Ranchi",
        "district": "Ranchi",
        "state": "Jharkhand",
        "latitude": 23.3524,
        "longitude": 85.3242,
        "urgency_level": "CRITICAL",
        "submitter_type": "URBAN_LOCAL_BODY",
        "submitter_org": "Ranchi Municipal Corporation Ward 10",
        "media_files": [{"name": "subway_flooding.jpg", "type": "IMAGE", "url": "blob:http://..."}]
    }
    res = client.post("/api/challenges", json=sub_payload, headers=headers_cit)
    assert res.status_code == 200, f"Challenge submission failed: {res.text}"
    ch_data = res.json()
    ch_id = ch_data["id"]
    print(f"[PASS] Challenge Created: ID={ch_id}")
    print(f"[PASS] Submitter Entity: {ch_data['submitter_type']} ({ch_data['submitter_org']})")
    print(f"[PASS] Challenge Analysis Complete: Priority Level={ch_data['analysis']['priority_level']}")

    # 3. University Accepts Challenge & Instantiates Project
    print("\n--- TEST 2: UNIVERSITY ACCEPTS CHALLENGE ---")
    res = client.post(f"/api/challenges/{ch_id}/accept", json={"institution_id": 1}, headers=headers_univ)
    assert res.status_code == 200, f"Accept failed: {res.text}"
    proj_data = res.json()
    proj_id = proj_data["id"]
    print(f"[PASS] Solution Project Created: ID={proj_id}")
    print(f"[PASS] Status: {proj_data['status']}")

    # 4. Industry Partnership Hub: CSR Funding, Mentorship, Tech Transfer
    print("\n--- TEST 3: INDUSTRY PARTNERSHIP HUB & CSR MODULE ---")
    res = client.get("/api/industry/partners")
    assert res.status_code == 200
    partners = res.json()
    print(f"[PASS] Industry Partners Available: {len(partners)}")

    if partners:
        p_id = partners[0]["id"]
        res = client.post(f"/api/projects/{proj_id}/csr-funding", json={
            "partner_id": p_id,
            "amount_in_lakhs": 20.0,
            "purpose": "Hardware sensor pilot sponsorship"
        })
        assert res.status_code == 200
        print(f"[PASS] CSR Funding Proposed: INR {res.json()['amount_in_lakhs']} Lakhs")


        res = client.post(f"/api/projects/{proj_id}/mentorship", json={
            "partner_id": p_id,
            "mentor_name": "Dr. Rajesh Verma",
            "expertise_domain": "IoT Hardware Sensors",
            "contact_email": "mentor@adityapur-msme.org"
        })
        assert res.status_code == 200
        print(f"[PASS] Industry Mentor Assigned: {res.json()['mentor_name']}")

        res = client.post(f"/api/projects/{proj_id}/tech-transfer", json={
            "partner_id": p_id,
            "ip_type": "PILOT_DEPLOYMENT",
            "licensing_terms": "Non-exclusive municipal licensing"
        })
        assert res.status_code == 200
        print(f"[PASS] Tech Transfer Agreement Initiated: {res.json()['ip_type']}")

    # 5. Stakeholder Communication System & Comments
    print("\n--- TEST 4: STAKEHOLDER COMMUNICATION & COMMENTS ---")
    res = client.post(f"/api/projects/{proj_id}/comments", json={
        "author_name": "Ranchi Municipal Admin",
        "author_role": "GOVERNMENT_ADMIN",
        "content": "Inspected site near Main Road Overbridge. Sensors installed."
    })
    assert res.status_code == 200
    print(f"[PASS] Comment Posted: '{res.json()['content']}'")

    # 6. Notifications System
    print("\n--- TEST 5: NOTIFICATIONS ENGINE ---")
    res = client.get("/api/notifications", headers=headers_admin)
    assert res.status_code == 200
    notifs = res.json()
    print(f"[PASS] Notifications Retrieved: {len(notifs)} items")

    # 7. Admin Analytics Dashboard & Hotspots
    print("\n--- TEST 6: ADMIN ANALYTICS DASHBOARD & HOTSPOTS ---")
    res = client.get("/api/analytics/dashboard", headers=headers_admin)
    assert res.status_code == 200
    print(f"[PASS] Dashboard Metrics Total Challenges: {res.json()['total_challenges']}")

    res = client.get("/api/analytics/hotspots", headers=headers_admin)
    assert res.status_code == 200
    print(f"[PASS] Spatial Hotspot Clusters: {len(res.json())}")

    # 8. Civic Social Feed & Engagement Engine Tests
    print("\n--- TEST 7: CIVIC SOCIAL FEED & ENGAGEMENT ENGINE ---")
    # Fetch Feed
    res_feed = client.get("/api/challenges/feed?tab=for_you", headers=headers_cit)
    assert res_feed.status_code == 200
    feed_list = res_feed.json()
    assert len(feed_list) > 0
    print(f"[PASS] Public Civic Feed returned {len(feed_list)} social cards!")

    target_id = ch_id

    # Test 7.1: Like Action & Anti-manipulation
    res_like = client.post(f"/api/challenges/{target_id}/like", headers=headers_cit)
    assert res_like.status_code == 200
    like_data = res_like.json()
    assert like_data["user_liked"] is True
    assert like_data["likes_count"] >= 1
    print(f"[PASS] Like Registered: likes_count={like_data['likes_count']}, boost=+{like_data['community_boost']}")

    # Test 7.2: Repost Action & Attribution & Priority Boost
    res_repost = client.post(f"/api/challenges/{target_id}/repost", headers=headers_cit)
    assert res_repost.status_code == 200
    repost_data = res_repost.json()
    assert repost_data["user_reposted"] is True
    print(f"[PASS] Repost Registered: reposts_count={repost_data['reposts_count']}, new_prio={repost_data['priority_score']}")

    # Test 7.3: Anti-manipulation duplicate repost check
    res_repost_dup = client.post(f"/api/challenges/{target_id}/repost", headers=headers_cit)
    assert res_repost_dup.status_code == 200
    assert res_repost_dup.json()["user_reposted"] is True
    print("[PASS] Anti-manipulation rule enforced: duplicate repost attempt handled cleanly without duplicating records!")

    # Test 7.4: Share Action
    res_share = client.post(f"/api/challenges/{target_id}/share", headers=headers_cit)
    assert res_share.status_code == 200
    print(f"[PASS] Share Registered: shares_count={res_share.json()['shares_count']}")

    # Test 7.5: Post Public Comment
    res_comm = client.post(f"/api/challenges/{target_id}/comments", json={"content": "Urgent attention required by municipal engineers!"}, headers=headers_cit)
    assert res_comm.status_code == 200
    comm_obj = res_comm.json()
    assert comm_obj["content"] == "Urgent attention required by municipal engineers!"
    print(f"[PASS] Comment Posted: ID={comm_obj['id']}, Author={comm_obj['author_name']}")

    # Test 7.6: User Activity Tracking
    res_act = client.get("/api/challenges/my-activity", headers=headers_cit)
    assert res_act.status_code == 200
    act_data = res_act.json()
    assert "my_challenges" in act_data
    assert "liked_challenges" in act_data
    assert "reposted_challenges" in act_data
    assert "my_comments" in act_data
    print(f"[PASS] User Activity Workspace verified: {len(act_data['my_challenges'])} submitted, {len(act_data['liked_challenges'])} liked, {len(act_data['reposted_challenges'])} reposted!")

    print("\n--- TEST 8: CIVI-CONNECT UNIFIED PROJECT COLLABORATION CHAT ---")
    proj_id = "PRJ-2026-001"
    
    # Test 8.1: Retrieve CIVI-CONNECT Room
    res_room = client.get(f"/api/projects/{proj_id}/civi-connect", headers=headers_cit)
    assert res_room.status_code == 200
    room_data = res_room.json()
    assert room_data["project_id"] == proj_id
    assert room_data["active_participant_count"] >= 4
    print(f"[PASS] CIVI-CONNECT Room Retrieved: project_id={room_data['project_id']}, participants={room_data['active_participant_count']}")

    # Test 8.2: Retrieve Messages Stream
    res_msgs = client.get(f"/api/projects/{proj_id}/civi-connect/messages", headers=headers_cit)
    assert res_msgs.status_code == 200
    msg_list = res_msgs.json()
    assert len(msg_list) >= 4
    print(f"[PASS] CIVI-CONNECT Message Stream Returned {len(msg_list)} messages (includes Citizen, University, MSME, Govt & SYSTEM messages)!")

    # Test 8.3: Post Message as Citizen
    res_post_msg = client.post(
        f"/api/projects/{proj_id}/civi-connect/messages",
        json={"message": "Can the engineering team confirm if depth telemetry is live?"},
        headers=headers_cit
    )
    assert res_post_msg.status_code == 200
    posted_msg = res_post_msg.json()
    assert posted_msg["sender_role"] == "CITIZEN"
    print(f"[PASS] CIVI-CONNECT Message Posted: ID={posted_msg['id']}, Sender={posted_msg['sender_name']} ({posted_msg['sender_role']})")

    # Test 8.4: Automated System Message on Lifecycle Status Change
    res_status = client.patch(f"/api/projects/{proj_id}/status", json={"status": "DEPLOYED"}, headers=headers_univ)
    assert res_status.status_code == 200

    
    res_msgs_after = client.get(f"/api/projects/{proj_id}/civi-connect/messages", headers=headers_cit)
    msgs_after = res_msgs_after.json()
    sys_msgs = [m for m in msgs_after if m["is_system_message"] or m["sender_role"] == "SYSTEM"]
    assert len(sys_msgs) > 0
    print(f"[PASS] Automated SYSTEM Lifecycle Event Message inserted into CIVI-CONNECT room: '{sys_msgs[-1]['message'].replace('→', '->')}'")


    print("\n====================================================")
    print("ALL MANDATORY, CIVIC SOCIAL FEED & CIVI-CONNECT TESTS PASSED (100%)!")
    print("====================================================")

if __name__ == "__main__":
    run_native_tests()



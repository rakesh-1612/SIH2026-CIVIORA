"""
End-to-End Automated Test Suite for CIVIORA Notification System.
Tests all 9 end-to-end notification workflows across Citizen, University, MSME, and Government roles.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal
from app.models import User, Challenge, Project, FundingRequest, Notification, ChallengeRepost, ProjectMessage
from app.services.auth_service import create_jwt_token, hash_password
from app.routers.challenges import create_challenge, repost_challenge
from app.routers.institutions import accept_challenge
from app.routers.funding import create_funding_request, add_funding_contribution_post
from app.routers.projects import update_project_status, toggle_milestone
from app.routers.civi_connect import send_civi_connect_message
from app.routers.notifications import get_notifications, get_unread_count, mark_notification_read, mark_all_read
from app.schemas import ChallengeCreate, AcceptChallengeRequest, FundingRequestCreate, FundingContributionCreate, ProjectStatusUpdate, CiviConnectMessageCreate

def safe_str(s: str) -> str:
    if not s:
        return ""
    return s.encode("ascii", "ignore").decode("ascii")

def run_tests():
    db = SessionLocal()
    try:
        print("====================================================")
        print("   STARTING CIVIORA NOTIFICATION E2E TEST SUITE     ")
        print("====================================================")

        # 1. Fetch / ensure test users
        citizen = db.query(User).filter(User.role == "CITIZEN").first()
        univ = db.query(User).filter(User.role == "UNIVERSITY").first()
        govt = db.query(User).filter(User.role == "GOVERNMENT_ADMIN").first()
        msme = db.query(User).filter(User.role == "INDUSTRY_PARTNER").first()

        assert citizen and univ and govt and msme, "Demo users must be present in database!"

        print(f"[AUTH] Citizen User: {citizen.name} (ID: {citizen.id})")
        print(f"[AUTH] University User: {univ.name} (ID: {univ.id}, Inst: {univ.institution_id})")
        print(f"[AUTH] Government User: {govt.name} (ID: {govt.id})")
        print(f"[AUTH] MSME User: {msme.name} (ID: {msme.id})")

        # Clear old test notifications to start clean
        db.query(Notification).delete()
        db.commit()

        # ----------------------------------------------------
        # TEST 1: Citizen Submits Challenge
        # ----------------------------------------------------
        print("\n--- TEST 1: Citizen Submits Challenge ---")
        ch_payload = ChallengeCreate(
            title="E2E Test Severe Waterlogging in Ward 12, Ranchi",
            description="Severe street flooding blocking ambulances during rainstorm.",
            location="Ward 12, Main Road, Ranchi",
            district="Ranchi",
            state="Jharkhand",
            latitude=23.3524,
            longitude=85.3242,
            urgency_level="CRITICAL"
        )
        ch_res = create_challenge(ch_payload, db=db, current_user=citizen)
        print(f"[PASS] Challenge Created: ID {ch_res.id}")

        # Verify Citizen notifications
        cit_notifs = get_notifications(db=db, current_user=citizen)
        print(f"[CHECK] Citizen Notifications Count: {len(cit_notifs)}")
        sub_notif = next((n for n in cit_notifs if "submitted" in n.title.lower()), None)
        ai_notif = next((n for n in cit_notifs if "ai" in n.title.lower()), None)
        assert sub_notif, "Citizen must receive challenge submission notification!"
        assert ai_notif, "Citizen must receive AI analysis completion notification!"
        print(f"  -> Citizen Notification: '{safe_str(sub_notif.title)}' - '{safe_str(sub_notif.message)}'")
        print(f"  -> AI Notification: '{safe_str(ai_notif.title)}' - '{safe_str(ai_notif.message)}'")

        # Verify Government Notification for CRITICAL challenge
        govt_notifs = get_notifications(db=db, current_user=govt)
        govt_high_notif = next((n for n in govt_notifs if "high priority" in n.title.lower()), None)
        assert govt_high_notif, "Government must receive High Priority Challenge notification!"
        print(f"  -> Government Notification: '{safe_str(govt_high_notif.title)}'")

        # ----------------------------------------------------
        # TEST 2: University Accepts Challenge -> Solution Project Created
        # ----------------------------------------------------
        print("\n--- TEST 2: University Accepts Challenge ---")
        proj_res = accept_challenge(ch_res.id, req=AcceptChallengeRequest(institution_id=univ.institution_id), db=db, user=univ)
        print(f"[PASS] Solution Project Created: ID {proj_res.id}")

        # Check Citizen received Acceptance Notification
        cit_notifs_t2 = get_notifications(db=db, current_user=citizen)
        accept_notif = next((n for n in cit_notifs_t2 if "accepted" in n.title.lower()), None)
        assert accept_notif, "Citizen must receive 'Challenge accepted' notification!"
        print(f"  -> Citizen Acceptance Notification: '{safe_str(accept_notif.title)}' - '{safe_str(accept_notif.message)}'")

        # Check University received Project Created Notification
        univ_notifs = get_notifications(db=db, current_user=univ)
        proj_notif = next((n for n in univ_notifs if "project created" in n.title.lower()), None)
        assert proj_notif, "University must receive Solution Project Created notification!"
        print(f"  -> University Project Notification: '{safe_str(proj_notif.title)}'")

        # ----------------------------------------------------
        # TEST 3: University Creates Funding Request
        # ----------------------------------------------------
        print("\n--- TEST 3: University Creates Funding Request ---")
        freq_payload = FundingRequestCreate(
            project_id=proj_res.id,
            minimum_required=10.0,
            maximum_required=12.0,
            justification="procurement of IoT water depth sensors and cellular telemetry units"
        )
        freq_res = create_funding_request(freq_payload, db=db, user=univ)
        print(f"[PASS] Funding Request Created: ID {freq_res.id}")

        # Check MSME received Funding Request Notification
        msme_notifs = get_notifications(db=db, current_user=msme)
        funding_notif = next((n for n in msme_notifs if "funding request" in n.title.lower()), None)
        assert funding_notif, "MSME must receive new funding request notification!"
        print(f"  -> MSME Funding Notification: '{safe_str(funding_notif.title)}' - '{safe_str(funding_notif.message)}'")

        # Check Government received Funding Request Monitoring Notification
        govt_notifs_t3 = get_notifications(db=db, current_user=govt)
        govt_fund_notif = next((n for n in govt_notifs_t3 if "funding" in n.title.lower()), None)
        assert govt_fund_notif, "Government must receive funding request monitoring notification!"
        print(f"  -> Government Funding Notification: '{safe_str(govt_fund_notif.title)}'")

        # ----------------------------------------------------
        # TEST 4: MSME Contributes Funding
        # ----------------------------------------------------
        print("\n--- TEST 4: MSME Contributes Funding ---")
        contrib_payload = FundingContributionCreate(
            funding_request_id=freq_res.id,
            contribution_amount=12.0,
            share_percentage=100.0,
            partner_id=1
        )
        contrib_res = add_funding_contribution_post(freq_res.id, payload=contrib_payload, db=db, user=msme)
        print(f"[PASS] Funding Contribution Recorded. Request Status: {contrib_res.status}")

        # Check University received Funding Contribution Notification
        univ_notifs_t4 = get_notifications(db=db, current_user=univ)
        contrib_notif = next((n for n in univ_notifs_t4 if "contribution" in n.title.lower() or "fully funded" in n.title.lower()), None)
        assert contrib_notif, "University must receive funding contribution notification!"
        print(f"  -> University Contribution Notification: '{safe_str(contrib_notif.title)}' - '{safe_str(contrib_notif.message)}'")

        # ----------------------------------------------------
        # TEST 5: University Updates Milestone / Project Status
        # ----------------------------------------------------
        print("\n--- TEST 5: University Updates Milestone / Status ---")
        status_res = update_project_status(proj_res.id, payload=ProjectStatusUpdate(status="PILOT_TESTING"), db=db, user=univ)
        print(f"[PASS] Project Status Updated: {status_res.status}")

        # Verify Citizen & Government received Status Change Notification
        cit_notifs_t5 = get_notifications(db=db, current_user=citizen)
        status_notif = next((n for n in cit_notifs_t5 if "status" in n.title.lower() or "pilot" in n.message.lower()), None)
        assert status_notif, "Citizen must receive project status change notification!"
        print(f"  -> Citizen Status Change Notification: '{safe_str(status_notif.title)}' - '{safe_str(status_notif.message)}'")

        # ----------------------------------------------------
        # TEST 6: Participant Sends CIVI-CONNECT Message
        # ----------------------------------------------------
        print("\n--- TEST 6: Participant Sends CIVI-CONNECT Message ---")
        msg_payload = CiviConnectMessageCreate(message="IoT telemetry hub deployed at Ranchi overbridge. Live data active.")
        msg_res = send_civi_connect_message(proj_res.id, payload=msg_payload, db=db, current_user=univ)
        print(f"[PASS] CIVI-CONNECT Message Sent by University (ID: {msg_res.id})")

        # Verify Citizen received Message Notification, but Sender (Univ) did NOT receive own notification
        cit_notifs_t6 = get_notifications(db=db, current_user=citizen)
        civi_notif = next((n for n in cit_notifs_t6 if "civi-connect" in n.title.lower()), None)
        assert civi_notif, "Citizen must receive CIVI-CONNECT message notification!"
        print(f"  -> Citizen CIVI-CONNECT Notification: '{safe_str(civi_notif.title)}' - '{safe_str(civi_notif.message)}'")

        univ_notifs_t6 = get_notifications(db=db, current_user=univ)
        own_msg_notif = next((n for n in univ_notifs_t6 if n.created_at == civi_notif.created_at and n.user_id == univ.id), None)
        assert not own_msg_notif, "Sender must NOT receive notification for their own CIVI-CONNECT message!"
        print("  -> Confirmed: Sender excluded from receiving self-notification.")

        # ----------------------------------------------------
        # TEST 7: Social Repost Activity Threshold
        # ----------------------------------------------------
        print("\n--- TEST 7: Social Engagement & Repost Threshold ---")
        repost_challenge(ch_res.id, db=db, current_user=univ)
        
        cit_notifs_t7 = get_notifications(db=db, current_user=citizen)
        attn_notif = next((n for n in cit_notifs_t7 if "getting attention" in n.title.lower() or "repost" in n.message.lower()), None)
        assert attn_notif, "Citizen must receive aggregated social engagement notification!"
        print(f"  -> Citizen Social Notification: '{safe_str(attn_notif.title)}' - '{safe_str(attn_notif.message)}'")

        # ----------------------------------------------------
        # TEST 8: User Reads Notification & Count Decreases
        # ----------------------------------------------------
        print("\n--- TEST 8: Mark Notification Read & Unread Count ---")
        initial_unread = get_unread_count(db=db, current_user=citizen).unread_count
        print(f"  -> Initial Citizen Unread Count: {initial_unread}")
        assert initial_unread > 0, "Citizen must have unread notifications!"

        first_unread = next(n for n in cit_notifs_t7 if not n.is_read)
        mark_notification_read(first_unread.id, db=db, current_user=citizen)

        after_unread = get_unread_count(db=db, current_user=citizen).unread_count
        print(f"  -> Updated Unread Count after reading 1 item: {after_unread}")
        assert after_unread == initial_unread - 1, "Unread count must decrease by exactly 1!"

        mark_all_read(db=db, current_user=citizen)
        final_unread = get_unread_count(db=db, current_user=citizen).unread_count
        print(f"  -> Final Unread Count after 'Mark All Read': {final_unread}")
        assert final_unread == 0, "Unread count must be 0 after 'Mark All Read'!"

        # ----------------------------------------------------
        # TEST 9: DB Persistence Across Refresh
        # ----------------------------------------------------
        print("\n--- TEST 9: DB Persistence Verification ---")
        db.expire_all()
        persisted_notifs = get_notifications(db=db, current_user=citizen)
        assert all(n.is_read for n in persisted_notifs), "Read state must persist in DB across sessions!"
        print("  -> Confirmed: Notification read state and history fully persisted in SQLite DB.")

        print("\n====================================================")
        print("   ALL 9 E2E NOTIFICATION TESTS PASSED SUCCESSFULLY! ")
        print("====================================================")

    finally:
        db.close()

if __name__ == "__main__":
    run_tests()

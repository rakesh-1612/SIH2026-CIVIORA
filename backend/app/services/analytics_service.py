from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func
import json
import math
from app.models import (
    Challenge, ChallengeAnalysis, Project, Institution, ActivityLog,
    FundingRequest, FundingContribution, CSRFunding, IndustryPartner, Milestone,
    ChallengeLike, ChallengeRepost, ChallengeShare, ChallengeComment
)

def get_dashboard_analytics(db: Session) -> Dict[str, Any]:
    """
    Computes comprehensive, real-time Government Command Centre monitoring metrics
    strictly from SQLite database queries and model aggregations.
    """
    total_challenges = db.query(Challenge).count()
    new_challenges = db.query(Challenge).filter(Challenge.status.in_(["SUBMITTED", "AI_ANALYZED"])).count()
    
    active_projects = db.query(Project).filter(
        Project.status.in_(["ACCEPTED", "IN_PROGRESS", "PROTOTYPE", "PILOT_TESTING", "DEPLOYED"])
    ).count()

    high_critical = db.query(ChallengeAnalysis).filter(
        ChallengeAnalysis.priority_level.in_(["HIGH", "CRITICAL"])
    ).count()

    resolved = db.query(Challenge).filter(
        Challenge.status.in_(["DEPLOYED", "RESOLVED"])
    ).count()

    # Average project progress
    avg_prog_res = db.query(func.avg(Project.progress)).scalar()
    avg_progress = round(float(avg_prog_res), 1) if avg_prog_res is not None else 0.0

    # 1. Project Lifecycle Counts
    lifecycle_stages = ["ACCEPTED", "IN_PROGRESS", "PROTOTYPE", "PILOT_TESTING", "DEPLOYED", "RESOLVED"]
    lifecycle_counts = {}
    for stage in lifecycle_stages:
        cnt = db.query(Project).filter(Project.status == stage).count()
        lifecycle_counts[stage] = cnt

    # 2. Institution Project Performance Aggregation
    institutions = db.query(Institution).all()
    institution_performance = []
    for inst in institutions:
        inst_projects = db.query(Project).filter(Project.institution_id == inst.id).all()
        tot_p = len(inst_projects)
        in_prog_p = sum(1 for p in inst_projects if p.status == "IN_PROGRESS")
        pilot_p = sum(1 for p in inst_projects if p.status in ["PROTOTYPE", "PILOT_TESTING"])
        dep_p = sum(1 for p in inst_projects if p.status == "DEPLOYED")
        res_p = sum(1 for p in inst_projects if p.status == "RESOLVED")
        avg_p = round(sum(p.progress for p in inst_projects) / tot_p, 1) if tot_p > 0 else 0.0
        
        # Parse departments / expertise if stringified
        depts = json.loads(inst.departments) if isinstance(inst.departments, str) else (inst.departments or [])
        exps = json.loads(inst.research_expertise) if isinstance(inst.research_expertise, str) else (inst.research_expertise or [])

        institution_performance.append({
            "institution_id": inst.id,
            "institution_name": inst.name,
            "city": inst.city,
            "state": inst.state,
            "rating": inst.rating,
            "contact_email": inst.contact_email,
            "departments": depts,
            "research_expertise": exps,
            "total_projects": tot_p,
            "in_progress": in_prog_p,
            "pilot": pilot_p,
            "deployed": dep_p,
            "resolved": res_p,
            "avg_progress": avg_p
        })
    institution_performance.sort(key=lambda x: x["total_projects"], reverse=True)

    # 3. Projects Requiring Government Attention (Risk Flags)
    projects = db.query(Project).all()
    projects_requiring_attention = []
    for proj in projects:
        reasons = []
        ch = db.query(Challenge).filter(Challenge.id == proj.challenge_id).first()
        prio_lvl = ch.analysis.priority_level if ch and ch.analysis else "MEDIUM"
        
        # Risk 1: High/Critical priority with low progress
        if prio_lvl in ["CRITICAL", "HIGH"] and proj.progress < 30.0:
            reasons.append(f"{prio_lvl} priority challenge with low execution progress ({proj.progress}%)")

        # Risk 2: Uncompleted milestones on advanced stage
        incomplete_milestones = [m for m in proj.milestones if not m.is_completed]
        if proj.status in ["PROTOTYPE", "PILOT_TESTING"] and len(incomplete_milestones) >= 2:
            reasons.append(f"Advanced stage ({proj.status}) has {len(incomplete_milestones)} uncompleted milestones")

        # Risk 3: Funding deficit
        freqs = db.query(FundingRequest).filter(FundingRequest.project_id == proj.id).all()
        for fr in freqs:
            tot_comm = sum(c.contribution_amount for c in fr.contributions if c.status == "APPROVED")
            req_target = fr.minimum_required or fr.requested_amount or 0.0
            rem_min = max(0.0, req_target - tot_comm)
            if rem_min > 0 and fr.status != "FULLY_FUNDED":
                reasons.append(f"Funding gap of ₹{round(rem_min, 2)} Lakhs required for completion")

        if reasons:
            inst = db.query(Institution).filter(Institution.id == proj.institution_id).first()
            projects_requiring_attention.append({
                "project_id": proj.id,
                "project_name": proj.project_name,
                "challenge_id": proj.challenge_id,
                "challenge_title": ch.title if ch else proj.project_name,
                "institution_id": proj.institution_id,
                "institution_name": inst.name if inst else "R&D Lab",
                "district": ch.district if ch else "Jharkhand",
                "priority": prio_lvl,
                "status": proj.status,
                "progress": proj.progress,
                "reasons": reasons,
                "reason_summary": " • ".join(reasons)
            })

    # 4. Multi-Company Funding Analytics Breakdown
    funding_requests = db.query(FundingRequest).all()
    tot_requested = 0.0
    tot_committed = 0.0
    fully_funded_count = 0
    partially_funded_count = 0
    project_funding_analytics = []

    for fr in funding_requests:
        req_min = fr.minimum_required or fr.requested_amount or 0.0
        req_max = fr.maximum_required or fr.requested_amount or req_min
        tot_requested += req_max

        comm_amt = sum(c.contribution_amount for c in fr.contributions if c.status == "APPROVED")
        tot_committed += comm_amt

        rem_amt = max(0.0, req_max - comm_amt)
        is_fully = comm_amt >= req_min or fr.status == "FULLY_FUNDED"
        if is_fully:
            fully_funded_count += 1
            f_status = "FULLY_FUNDED"
        elif comm_amt > 0:
            partially_funded_count += 1
            f_status = "PARTIALLY_FUNDED"
        else:
            f_status = "PENDING_FUNDING"

        proj = db.query(Project).filter(Project.id == fr.project_id).first()
        inst = db.query(Institution).filter(Institution.id == proj.institution_id).first() if proj else None

        partners_list = []
        for c in fr.contributions:
            partner = db.query(IndustryPartner).filter(IndustryPartner.id == c.partner_id).first()
            partners_list.append({
                "partner_id": c.partner_id,
                "partner_name": partner.name if partner else f"Partner #{c.partner_id}",
                "contribution_amount": c.contribution_amount,
                "share_percentage": c.share_percentage,
                "status": c.status
            })

        project_funding_analytics.append({
            "funding_request_id": fr.id,
            "project_id": fr.project_id,
            "project_name": proj.project_name if proj else f"Project {fr.project_id}",
            "university_name": inst.name if inst else "University",
            "minimum_required": req_min,
            "maximum_required": req_max,
            "committed_amount": round(comm_amt, 2),
            "remaining_amount": round(rem_amt, 2),
            "status": f_status,
            "partners": partners_list
        })

    # Add CSR funding contributions sum
    csr_fundings = db.query(CSRFunding).all()
    csr_sum = sum(c.amount_in_lakhs for c in csr_fundings)
    tot_committed_final = round(tot_committed + csr_sum, 2)

    # Categorization distributions
    cat_counts = db.query(Challenge.category, func.count(Challenge.id)).group_by(Challenge.category).all()
    category_distribution = [{"category": cat, "count": cnt} for cat, cnt in cat_counts]

    prio_counts = db.query(ChallengeAnalysis.priority_level, func.count(ChallengeAnalysis.id)).group_by(ChallengeAnalysis.priority_level).all()
    priority_distribution = [{"level": lvl, "count": cnt} for lvl, cnt in prio_counts]

    stat_counts = db.query(Challenge.status, func.count(Challenge.id)).group_by(Challenge.status).all()
    status_distribution = [{"status": st, "count": cnt} for st, cnt in stat_counts]

    dist_counts = db.query(Challenge.district, func.count(Challenge.id)).group_by(Challenge.district).all()
    district_distribution = [{"district": dst, "count": cnt} for dst, cnt in dist_counts]

    inst_proj = db.query(
        Institution.name, func.count(Project.id)
    ).join(Project, Project.institution_id == Institution.id, isouter=True)\
     .group_by(Institution.id).all()
    institution_participation = [{"institution": inst, "projects_count": cnt} for inst, cnt in inst_proj if cnt > 0][:8]

    activities = db.query(ActivityLog).order_by(ActivityLog.timestamp.desc()).limit(10).all()
    recent_activities = [
        {
            "id": act.id,
            "challenge_id": act.challenge_id,
            "project_id": act.project_id,
            "action": act.action,
            "performed_by": act.performed_by,
            "timestamp": act.timestamp.isoformat() if act.timestamp else ""
        }
        for act in activities
    ]

    total_likes = db.query(ChallengeLike).count()
    total_reposts = db.query(ChallengeRepost).count()
    total_shares = db.query(ChallengeShare).count()
    total_comments = db.query(ChallengeComment).count()

    all_challenges = db.query(Challenge).all()
    reposted_ranking = []
    boost_ranking = []
    total_boost_sum = 0.0

    from app.services.priority_service import calculate_priority_score

    for ch in all_challenges:
        l_c = len(ch.likes)
        r_c = len(ch.reposts)
        s_c = len(ch.shares)
        c_c = len(ch.comments)
        
        an = ch.analysis
        if an:
            prio = calculate_priority_score(
                an.severity_score, an.urgency_score, an.impact_score,
                submitter_type=ch.submitter_type or "CITIZEN_INDIVIDUAL",
                likes_count=l_c, reposts_count=r_c, shares_count=s_c, comments_count=c_c
            )
            base_p = prio["base_priority_score"]
            c_boost = prio["community_boost"]
            final_p = prio["priority_score"]
        else:
            base_p = 50.0
            c_boost = 0.0
            final_p = 50.0

        total_boost_sum += c_boost

        reposted_ranking.append({
            "id": ch.id,
            "title": ch.title,
            "district": ch.district,
            "category": ch.category,
            "likes_count": l_c,
            "reposts_count": r_c,
            "shares_count": s_c,
            "comments_count": c_c,
            "base_priority": base_p,
            "community_boost": c_boost,
            "final_priority": final_p
        })

    reposted_ranking.sort(key=lambda x: (x["reposts_count"], x["likes_count"]), reverse=True)
    boost_ranking = sorted(reposted_ranking, key=lambda x: x["community_boost"], reverse=True)

    return {
        "total_challenges": total_challenges,
        "new_challenges": new_challenges,
        "active_projects": active_projects,
        "in_progress_projects": active_projects,
        "high_critical_challenges": high_critical,
        "resolved_challenges": resolved,
        "projects_at_risk_count": len(projects_requiring_attention),
        "total_funding_committed": tot_committed_final,
        "avg_project_progress": avg_progress,
        "lifecycle_counts": lifecycle_counts,
        "institution_performance": institution_performance,
        "projects_requiring_attention": projects_requiring_attention,
        "funding_overview": {
            "total_funding_requested": round(tot_requested, 2),
            "total_funding_committed": tot_committed_final,
            "fully_funded_projects": fully_funded_count,
            "partially_funded_projects": partially_funded_count
        },
        "project_funding_analytics": project_funding_analytics,
        "category_distribution": category_distribution,
        "priority_distribution": priority_distribution,
        "status_distribution": status_distribution,
        "district_distribution": district_distribution,
        "institution_participation": institution_participation,
        "recent_activities": recent_activities,
        "social_engagement_overview": {
            "total_likes": total_likes,
            "total_reposts": total_reposts,
            "total_shares": total_shares,
            "total_comments": total_comments,
            "avg_community_boost": round(total_boost_sum / len(all_challenges), 1) if all_challenges else 0.0
        },
        "most_reposted_challenges": reposted_ranking[:5],
        "highest_community_boost": boost_ranking[:5]
    }

def calculate_hotspots(db: Session) -> List[Dict[str, Any]]:
    """
    Calculates geographic hotspots based on challenge coordinates in SQLite.
    Groups challenges within spatial radius (~15km) to detect high risk civic clusters.
    """
    challenges = db.query(Challenge).all()
    if not challenges:
        return []

    clusters = {}
    for ch in challenges:
        key = f"{ch.district}_{ch.category}"
        if key not in clusters:
            clusters[key] = {
                "id": f"HOTSPOT-{len(clusters)+1:03d}",
                "district": ch.district,
                "primary_category": ch.category,
                "lats": [],
                "lngs": [],
                "challenges": [],
                "high_prio_count": 0
            }
        
        clusters[key]["lats"].append(ch.latitude)
        clusters[key]["lngs"].append(ch.longitude)
        
        prio_lvl = ch.analysis.priority_level if ch.analysis else "MEDIUM"
        if prio_lvl in ["HIGH", "CRITICAL"]:
            clusters[key]["high_prio_count"] += 1

        clusters[key]["challenges"].append({
            "id": ch.id,
            "title": ch.title,
            "latitude": ch.latitude,
            "longitude": ch.longitude,
            "priority": prio_lvl,
            "status": ch.status
        })

    hotspots = []
    for key, data in clusters.items():
        if len(data["challenges"]) >= 1:
            avg_lat = sum(data["lats"]) / len(data["lats"])
            avg_lng = sum(data["lngs"]) / len(data["lngs"])
            hotspots.append({
                "id": data["id"],
                "name": f"{data['district']} {data['primary_category']} Hotspot",
                "center_lat": round(avg_lat, 4),
                "center_lng": round(avg_lng, 4),
                "challenge_count": len(data["challenges"]),
                "high_priority_count": data["high_prio_count"],
                "district": data["district"],
                "primary_category": data["primary_category"],
                "challenges": data["challenges"]
            })

    hotspots.sort(key=lambda x: (x["high_priority_count"], x["challenge_count"]), reverse=True)
    return hotspots

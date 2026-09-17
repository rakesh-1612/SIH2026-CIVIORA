import ast
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models import Institution, Challenge, ChallengeMatch, Project, Milestone, ActivityLog, User
from app.schemas import InstitutionResponse, ChallengeDetailResponse, AcceptChallengeRequest, ProjectResponse
from app.routers.challenges import format_challenge_detail
from app.services.auth_service import require_roles

router = APIRouter(prefix="/api", tags=["institutions"])

def parse_json_list(val: str) -> List[str]:
    if not val:
        return []
    try:
        return ast.literal_eval(val)
    except Exception:
        return [val]

@router.get("/institutions", response_model=List[InstitutionResponse])
def get_all_institutions(db: Session = Depends(get_db)):
    insts = db.query(Institution).all()
    res = []
    for inst in insts:
        res.append(InstitutionResponse(
            id=inst.id,
            name=inst.name,
            city=inst.city,
            state=inst.state,
            departments=parse_json_list(inst.departments),
            research_expertise=parse_json_list(inst.research_expertise),
            technologies=parse_json_list(inst.technologies),
            capabilities=parse_json_list(inst.capabilities),
            relevant_domains=parse_json_list(inst.relevant_domains),
            contact_email=inst.contact_email,
            rating=inst.rating
        ))
    return res

@router.get("/institutions/{id}/recommended", response_model=List[ChallengeDetailResponse])
def get_recommended_challenges_for_institution(
    id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["UNIVERSITY", "GOVERNMENT_ADMIN"]))
):
    if user.role == "UNIVERSITY" and user.institution_id != id:
        raise HTTPException(
            status_code=403,
            detail=f"Restricted Area. You are logged in as {user.name} (Institution #{user.institution_id}) and cannot access Institution #{id}'s workspace."
        )

    inst = db.query(Institution).filter(Institution.id == id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")
    
    challenges = db.query(Challenge).all()
    return [format_challenge_detail(ch, db) for ch in challenges]

@router.post("/challenges/{id}/accept", response_model=ProjectResponse)
def accept_challenge(
    id: str,
    req: Optional[AcceptChallengeRequest] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["UNIVERSITY", "GOVERNMENT_ADMIN"]))
):
    """
    Institution accepts a challenge:
    Automatically derives institution identity from authenticated user for UNIVERSITY role.
    """
    if user.role == "UNIVERSITY":
        if not user.institution_id:
            raise HTTPException(
                status_code=403,
                detail="Restricted Action. Your user account is not associated with an accredited institution."
            )
        target_inst_id = user.institution_id
    else:
        target_inst_id = req.institution_id if (req and req.institution_id) else (user.institution_id or 1)

    ch = db.query(Challenge).filter(Challenge.id == id).first()
    if not ch:
        raise HTTPException(status_code=404, detail="Challenge not found")

    inst = db.query(Institution).filter(Institution.id == target_inst_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")

    # Verify or create match record for this institution
    match_rec = db.query(ChallengeMatch).filter(
        ChallengeMatch.challenge_id == id,
        ChallengeMatch.institution_id == inst.id
    ).first()
    if not match_rec:
        match_rec = ChallengeMatch(
            challenge_id=id,
            institution_id=inst.id,
            match_percentage=85.0,
            relevant_expertise="[]",
            explanation=f"Matched to {inst.name}",
            status="RECOMMENDED"
        )
        db.add(match_rec)
        db.flush()

    # Check existing project for this challenge
    existing_proj = db.query(Project).filter(Project.challenge_id == id).first()
    if existing_proj:
        if existing_proj.institution_id != inst.id:
            raise HTTPException(
                status_code=403,
                detail=f"Challenge '{ch.title}' has already been accepted by another institution."
            )
        # Re-accepting by the same university (idempotent action)
        ch.status = "ACCEPTED"
        match_rec.status = "ACCEPTED"
        db.commit()
        return format_project_response(existing_proj, db)

    # Update challenge status
    ch.status = "ACCEPTED"
    match_rec.status = "ACCEPTED"

    # Generate Project ID
    proj_count = db.query(Project).count() + 1
    proj_id = f"PRJ-2026-{proj_count:03d}"

    project = Project(
        id=proj_id,
        project_name=f"CIVIORA Solution: {ch.title}",
        challenge_id=ch.id,
        institution_id=inst.id,
        description=f"Field research, prototype design, and deployment by {inst.name} to address '{ch.title}'.",
        status="ACCEPTED",
        progress=15.0
    )
    db.add(project)
    db.flush()

    # Default milestones
    m1 = Milestone(project_id=proj_id, title="Requirement & Site Survey", description="Conduct field survey & stakeholder interviews", is_completed=True)
    m2 = Milestone(project_id=proj_id, title="Solution Design & Architecture", description="Finalize technical design & resource allocation", is_completed=False)
    m3 = Milestone(project_id=proj_id, title="Prototype Development", description="Build hardware/software solution prototype", is_completed=False)
    m4 = Milestone(project_id=proj_id, title="Pilot Testing & Validation", description="Deploy pilot test in target district", is_completed=False)
    m5 = Milestone(project_id=proj_id, title="Full Deployment & Handover", description="Handover operational system to municipal authority", is_completed=False)

    db.add_all([m1, m2, m3, m4, m5])

    # Log activity
    db.add(ActivityLog(
        challenge_id=ch.id,
        project_id=proj_id,
        action=f"{inst.name} accepted challenge '{ch.title}' and instantiated project {proj_id}",
        performed_by=inst.name
    ))

    # Generate Real Notifications across stakeholders
    from app.services.notification_service import create_notification
    if ch.citizen_id:
        create_notification(
            db,
            user_id=ch.citizen_id,
            title="Challenge accepted",
            message=f"Your challenge '{ch.title[:40]}' has been accepted by {inst.name}.",
            type="PROJECT",
            related_entity_type="PROJECT",
            related_entity_id=proj_id,
            link=f"/projects?id={proj_id}"
        )
    
    create_notification(
        db,
        user_role="UNIVERSITY",
        institution_id=inst.id,
        title="Solution Project Created",
        message=f"Solution Project {proj_id} created for '{ch.title[:40]}'.",
        type="PROJECT",
        related_entity_type="PROJECT",
        related_entity_id=proj_id,
        link=f"/projects?id={proj_id}"
    )

    create_notification(
        db,
        user_role="INDUSTRY_PARTNER",
        title="New Project Available for Industry Participation",
        message=f"{inst.name} launched Solution Project '{ch.title[:40]}'.",
        type="PROJECT",
        related_entity_type="PROJECT",
        related_entity_id=proj_id,
        link="/industry"
    )

    create_notification(
        db,
        user_role="GOVERNMENT_ADMIN",
        title="Challenge Accepted & Monitoring Active",
        message=f"{inst.name} accepted challenge '{ch.title[:40]}'.",
        type="PROJECT",
        related_entity_type="PROJECT",
        related_entity_id=proj_id,
        link="/admin"
    )

    db.commit()
    db.refresh(project)

    return format_project_response(project, db)

@router.post("/challenges/{id}/decline")
def decline_challenge(
    id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["UNIVERSITY", "GOVERNMENT_ADMIN"]))
):
    """
    Institution declines a challenge match:
    Derives institution identity from authenticated user for UNIVERSITY role.
    """
    if user.role == "UNIVERSITY":
        if not user.institution_id:
            raise HTTPException(
                status_code=403,
                detail="Restricted Action. Your user account is not associated with an accredited institution."
            )
        target_inst_id = user.institution_id
    else:
        target_inst_id = user.institution_id or 1

    ch = db.query(Challenge).filter(Challenge.id == id).first()
    if not ch:
        raise HTTPException(status_code=404, detail="Challenge not found")

    inst = db.query(Institution).filter(Institution.id == target_inst_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")

    match_rec = db.query(ChallengeMatch).filter(
        ChallengeMatch.challenge_id == id,
        ChallengeMatch.institution_id == inst.id
    ).first()
    if not match_rec:
        match_rec = ChallengeMatch(
            challenge_id=id,
            institution_id=inst.id,
            match_percentage=85.0,
            relevant_expertise="[]",
            explanation=f"Matched to {inst.name}",
            status="RECOMMENDED"
        )
        db.add(match_rec)
        db.flush()

    match_rec.status = "DECLINED"

    db.add(ActivityLog(
        challenge_id=ch.id,
        action=f"{inst.name} declined challenge '{ch.title}'",
        performed_by=inst.name
    ))

    db.commit()
    return {"message": "Challenge declined successfully.", "status": "DECLINED"}

def format_project_response(proj: Project, db: Session) -> ProjectResponse:
    from app.schemas import (
        MilestoneResponse, ProjectCommentResponse,
        CSRFundingResponse, MentorshipOfferResponse, TechTransferResponse
    )
    from app.models import ProjectComment, CSRFunding, MentorshipOffer, TechTransfer
    
    ms_list = db.query(Milestone).filter(Milestone.project_id == proj.id).all()
    milestone_res = [
        MilestoneResponse(
            id=m.id,
            project_id=m.project_id,
            title=m.title,
            description=m.description,
            due_date=m.due_date,
            is_completed=m.is_completed,
            completed_at=m.completed_at
        )
        for m in ms_list
    ]

    comments = db.query(ProjectComment).filter(ProjectComment.project_id == proj.id).order_by(ProjectComment.created_at.asc()).all()
    comment_res = [
        ProjectCommentResponse(
            id=c.id,
            project_id=c.project_id,
            author_name=c.author_name,
            author_role=c.author_role,
            content=c.content,
            created_at=c.created_at
        ) for c in comments
    ]

    csr_list = db.query(CSRFunding).filter(CSRFunding.project_id == proj.id).all()
    csr_res = [
        CSRFundingResponse(
            id=f.id,
            project_id=f.project_id,
            partner_id=f.partner_id,
            partner_name=f.partner.name if f.partner else "Industry Partner",
            amount_in_lakhs=f.amount_in_lakhs,
            purpose=f.purpose,
            status=f.status,
            created_at=f.created_at
        ) for f in csr_list
    ]

    mentor_list = db.query(MentorshipOffer).filter(MentorshipOffer.project_id == proj.id).all()
    mentor_res = [
        MentorshipOfferResponse(
            id=m.id,
            project_id=m.project_id,
            partner_id=m.partner_id,
            partner_name=m.partner.name if m.partner else "Industry Partner",
            mentor_name=m.mentor_name,
            expertise_domain=m.expertise_domain,
            contact_email=m.contact_email,
            status=m.status,
            created_at=m.created_at
        ) for m in mentor_list
    ]

    transfer_list = db.query(TechTransfer).filter(TechTransfer.project_id == proj.id).all()
    transfer_res = [
        TechTransferResponse(
            id=t.id,
            project_id=t.project_id,
            partner_id=t.partner_id,
            partner_name=t.partner.name if t.partner else "Industry Partner",
            ip_type=t.ip_type,
            licensing_terms=t.licensing_terms,
            status=t.status,
            created_at=t.created_at
        ) for t in transfer_list
    ]

    from app.models import FundingRequest
    from app.routers.funding import format_funding_response
    funding_req_list = db.query(FundingRequest).filter(FundingRequest.project_id == proj.id).all()
    funding_req_res = [format_funding_response(fr, db) for fr in funding_req_list]

    return ProjectResponse(
        id=proj.id,
        project_name=proj.project_name,
        challenge_id=proj.challenge_id,
        challenge_title=proj.challenge.title if proj.challenge else "",
        challenge_category=proj.challenge.category if proj.challenge else "",
        challenge_location=proj.challenge.location if proj.challenge else "",
        challenge_district=proj.challenge.district if proj.challenge else "",
        challenge_state=proj.challenge.state if proj.challenge else "",
        institution_id=proj.institution_id,
        institution_name=proj.institution.name if proj.institution else "",
        description=proj.description,
        status=proj.status,
        progress=proj.progress,
        created_at=proj.created_at,
        updated_at=proj.updated_at,
        milestones=milestone_res,
        comments=comment_res,
        csr_fundings=csr_res,
        mentorships=mentor_res,
        tech_transfers=transfer_res,
        funding_requests=funding_req_res
    )


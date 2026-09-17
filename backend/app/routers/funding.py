from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models import FundingRequest, FundingContribution, Project, IndustryPartner, ActivityLog, Notification, User
from app.schemas import (
    FundingRequestCreate, FundingRequestApprove, FundingRequestReject, FundingRequestResponse,
    FundingContributionCreate, FundingContributionResponse
)
from app.services.auth_service import get_optional_current_user

router = APIRouter(prefix="/api", tags=["funding-requests"])

def format_funding_response(fr: FundingRequest, db: Session) -> FundingRequestResponse:
    proj = db.query(Project).filter(Project.id == fr.project_id).first()
    partner = db.query(IndustryPartner).filter(IndustryPartner.id == fr.partner_id).first() if fr.partner_id else None

    # Fetch active contributions
    contrib_list = db.query(FundingContribution).filter(
        FundingContribution.funding_request_id == fr.id,
        FundingContribution.status == "APPROVED"
    ).order_by(FundingContribution.created_at.asc()).all()

    contrib_responses: List[FundingContributionResponse] = []
    total_committed = 0.0
    total_share = 0.0
    partner_ids = set()
    partner_names = []

    for c in contrib_list:
        total_committed += c.contribution_amount
        total_share += c.share_percentage
        partner_ids.add(c.partner_id)
        pt = db.query(IndustryPartner).filter(IndustryPartner.id == c.partner_id).first()
        pt_name = pt.name if pt else f"Partner #{c.partner_id}"
        partner_names.append(pt_name)
        contrib_responses.append(FundingContributionResponse(
            id=c.id,
            funding_request_id=c.funding_request_id,
            project_id=c.project_id,
            partner_id=c.partner_id,
            partner_name=pt_name,
            contribution_amount=round(c.contribution_amount, 2),
            share_percentage=round(c.share_percentage, 2),
            status=c.status,
            created_at=c.created_at
        ))

    min_req = fr.minimum_required if fr.minimum_required is not None else 10.0
    max_req = fr.maximum_required if fr.maximum_required is not None else (fr.requested_amount or 12.0)

    total_committed = round(total_committed, 2)
    total_share = round(total_share, 2)
    rem_min = max(0.0, round(min_req - total_committed, 2))
    rem_max = max(0.0, round(max_req - total_committed, 2))

    # Dynamic status calculation
    computed_status = fr.status
    if fr.status not in ["REJECTED", "FUNDING_CLOSED"]:
        if total_committed >= max_req or total_share >= 100.0:
            computed_status = "FULLY_FUNDED"
        elif total_committed > 0:
            computed_status = "PARTIALLY_FUNDED"
        else:
            computed_status = "REQUESTED"

    p_name = partner.name if partner else (", ".join(list(dict.fromkeys(partner_names))) if partner_names else "MSME / Industry Partner")

    return FundingRequestResponse(
        id=fr.id,
        project_id=fr.project_id,
        partner_id=fr.partner_id,
        minimum_required=min_req,
        maximum_required=max_req,
        justification=fr.justification or fr.purpose or "",
        supporting_documents_url=fr.supporting_documents_url or fr.evidence_url,
        status=computed_status,
        rejection_reason=fr.rejection_reason,
        created_at=fr.created_at,
        project_name=proj.project_name if proj else "",
        university_name=proj.institution.name if (proj and proj.institution) else "",
        challenge_title=proj.challenge.title if (proj and proj.challenge) else "",
        partner_name=p_name,
        requested_amount=max_req,
        approved_amount=total_committed if total_committed > 0 else fr.approved_amount,
        purpose=fr.purpose or "",
        description=fr.description or "",
        expected_outcome=fr.expected_outcome or "",
        evidence_url=fr.evidence_url,
        total_committed=total_committed,
        remaining_min=rem_min,
        remaining_max=rem_max,
        total_share_percentage=total_share,
        partners_count=len(partner_ids),
        contributions=contrib_responses
    )

@router.post("/funding-requests", response_model=FundingRequestResponse)
def create_funding_request(
    payload: FundingRequestCreate,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_current_user)
):
    if user and user.role == "CITIZEN":
        raise HTTPException(status_code=403, detail="Citizens cannot create funding requests.")

    proj = db.query(Project).filter(Project.id == payload.project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    if user and user.role == "UNIVERSITY" and user.institution_id and proj.institution_id != user.institution_id:
        raise HTTPException(
            status_code=403,
            detail="You can only submit funding requests for projects owned by your institution."
        )

    if proj.status == "RESOLVED":
        raise HTTPException(status_code=400, detail="Cannot request funding for a resolved project.")

    min_req = payload.minimum_required if payload.minimum_required is not None else payload.requested_amount
    max_req = payload.maximum_required if payload.maximum_required is not None else payload.requested_amount
    justification_text = payload.justification if payload.justification else payload.purpose

    if min_req is None or min_req <= 0:
        raise HTTPException(status_code=400, detail="Minimum funding required must be greater than ₹0.")

    if max_req is None or max_req < min_req:
        raise HTTPException(status_code=400, detail="Maximum funding required must be greater than or equal to minimum funding required.")

    if not justification_text or not justification_text.strip():
        raise HTTPException(status_code=400, detail="Funding justification is required.")

    # Check for duplicate active pending/requested request
    existing_active = db.query(FundingRequest).filter(
        FundingRequest.project_id == payload.project_id,
        FundingRequest.status.in_(["REQUESTED", "PENDING", "PARTIALLY_FUNDED"])
    ).first()
    if existing_active:
        raise HTTPException(
            status_code=400,
            detail="An active funding request already exists for this project."
        )

    freq = FundingRequest(
        project_id=payload.project_id,
        partner_id=payload.partner_id,
        minimum_required=min_req,
        maximum_required=max_req,
        justification=justification_text.strip(),
        supporting_documents_url=payload.supporting_documents_url or payload.evidence_url,
        requested_amount=max_req,
        purpose=justification_text.strip()[:200],
        description=justification_text.strip(),
        expected_outcome=payload.expected_outcome or "Successful deployment and implementation",
        evidence_url=payload.evidence_url or payload.supporting_documents_url,
        status="REQUESTED"
    )
    db.add(freq)

    # Notifications
    from app.services.notification_service import create_notification
    if user and user.id:
        create_notification(
            db,
            user_id=user.id,
            title="Funding Request Submitted",
            message=f"Funding request for ₹{min_req}–{max_req} Lakhs submitted for '{proj.project_name[:35]}'.",
            type="FUNDING",
            related_entity_type="FUNDING",
            related_entity_id=freq.id,
            link="/industry"
        )
    create_notification(
        db,
        user_role="UNIVERSITY",
        institution_id=proj.institution_id if proj else None,
        title="Funding request submitted",
        message=f"Funding request for ₹{min_req}–{max_req} Lakhs submitted for '{proj.project_name[:35]}'.",
        type="FUNDING",
        related_entity_type="FUNDING",
        related_entity_id=freq.id,
        link="/industry"
    )
    create_notification(
        db,
        user_role="INDUSTRY_PARTNER",
        title="New funding request received",
        message=f"{proj.institution.name if (proj and proj.institution) else 'University'} requested ₹{min_req}–{max_req} Lakhs for '{proj.project_name[:35]}'.",
        type="FUNDING",
        related_entity_type="FUNDING",
        related_entity_id=freq.id,
        link="/industry"
    )
    create_notification(
        db,
        user_role="GOVERNMENT_ADMIN",
        title="New MSME Funding Request",
        message=f"Project {proj.id} submitted funding request for ₹{min_req}–{max_req} Lakhs.",
        type="FUNDING",
        related_entity_type="FUNDING",
        related_entity_id=freq.id,
        link="/admin"
    )

    db.add(ActivityLog(
        project_id=proj.id,
        challenge_id=proj.challenge_id,
        action=f"Submitted funding request for ₹{min_req}–{max_req} Lakhs with justification",
        performed_by=proj.institution.name if (proj and proj.institution) else "University R&D"
    ))

    db.commit()
    db.refresh(freq)
    return format_funding_response(freq, db)

@router.get("/funding-requests", response_model=List[FundingRequestResponse])
def list_funding_requests(
    project_id: Optional[str] = None,
    partner_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_current_user)
):
    if user and user.role == "CITIZEN":
        raise HTTPException(status_code=403, detail="Citizens do not have permission to view MSME funding requests.")

    query = db.query(FundingRequest)

    if user and user.role == "UNIVERSITY" and user.institution_id:
        proj_ids = [p.id for p in db.query(Project).filter(Project.institution_id == user.institution_id).all()]
        query = query.filter(FundingRequest.project_id.in_(proj_ids))

    if project_id:
        query = query.filter(FundingRequest.project_id == project_id)
    if partner_id:
        query = query.filter(FundingRequest.partner_id == partner_id)
    if status:
        query = query.filter(FundingRequest.status == status.upper())

    requests = query.order_by(FundingRequest.created_at.desc()).all()
    return [format_funding_response(fr, db) for fr in requests]

@router.get("/funding-requests/{id}", response_model=FundingRequestResponse)
def get_funding_request_by_id(
    id: int,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_current_user)
):
    if user and user.role == "CITIZEN":
        raise HTTPException(status_code=403, detail="Forbidden")

    freq = db.query(FundingRequest).filter(FundingRequest.id == id).first()
    if not freq:
        raise HTTPException(status_code=404, detail="Funding request not found")

    return format_funding_response(freq, db)

def _process_funding_contribution(
    id: int,
    contribution_amount: Optional[float],
    share_percentage: Optional[float],
    requested_partner_id: Optional[int],
    db: Session,
    user: Optional[User]
) -> FundingRequestResponse:
    freq = db.query(FundingRequest).filter(FundingRequest.id == id).first()
    if not freq:
        raise HTTPException(status_code=404, detail="Funding request not found")

    if freq.status in ["REJECTED", "FUNDING_CLOSED"]:
        raise HTTPException(status_code=400, detail="Cannot contribute to a closed or rejected funding request.")

    # Determine partner
    partner_id = None
    if requested_partner_id:
        partner_id = requested_partner_id
    elif user and getattr(user, "partner_id", None):
        partner_id = user.partner_id
    else:
        first_partner = db.query(IndustryPartner).first()
        if first_partner:
            partner_id = first_partner.id

    if not partner_id:
        raise HTTPException(status_code=400, detail="An accredited industry partner ID is required to contribute funding.")

    partner = db.query(IndustryPartner).filter(IndustryPartner.id == partner_id).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Industry partner not found.")

    target_base = freq.maximum_required if (freq.maximum_required and freq.maximum_required > 0) else (freq.requested_amount or 12.0)

    contrib_amt: Optional[float] = contribution_amount
    share_pct: Optional[float] = share_percentage

    if contrib_amt is not None and contrib_amt > 0:
        contrib_amt = round(contrib_amt, 2)
        share_pct = round((contrib_amt / target_base) * 100, 2)
    elif share_pct is not None and share_pct > 0:
        share_pct = round(share_pct, 2)
        contrib_amt = round((share_pct / 100) * target_base, 2)
    else:
        existing_list = db.query(FundingContribution).filter(
            FundingContribution.funding_request_id == freq.id,
            FundingContribution.status == "APPROVED"
        ).all()
        already_committed = sum(c.contribution_amount for c in existing_list)
        contrib_amt = max(0.5, round(target_base - already_committed, 2))
        share_pct = round((contrib_amt / target_base) * 100, 2)

    if contrib_amt <= 0 or share_pct <= 0:
        raise HTTPException(status_code=400, detail="Contribution amount and share percentage must be greater than 0.")

    # Check duplicate entry by same partner on this request
    existing_partner_contrib = db.query(FundingContribution).filter(
        FundingContribution.funding_request_id == freq.id,
        FundingContribution.partner_id == partner_id,
        FundingContribution.status == "APPROVED"
    ).first()
    if existing_partner_contrib:
        raise HTTPException(
            status_code=400,
            detail=f"{partner.name} has already contributed ₹{existing_partner_contrib.contribution_amount} Lakhs ({existing_partner_contrib.share_percentage}%) to this project."
        )

    # Check allocation limits
    existing_all = db.query(FundingContribution).filter(
        FundingContribution.funding_request_id == freq.id,
        FundingContribution.status == "APPROVED"
    ).all()
    current_committed = sum(c.contribution_amount for c in existing_all)
    current_share = sum(c.share_percentage for c in existing_all)

    if current_share + share_pct > 100.001:
        rem_share = max(0.0, round(100.0 - current_share, 1))
        raise HTTPException(
            status_code=400,
            detail=f"Total funding share cannot exceed 100%. Remaining available share is {rem_share}%."
        )

    if current_committed + contrib_amt > target_base + 0.001:
        rem_amt = max(0.0, round(target_base - current_committed, 2))
        raise HTTPException(
            status_code=400,
            detail=f"Total committed funding cannot exceed maximum target (₹{target_base} Lakhs). Remaining available requirement is ₹{rem_amt} Lakhs."
        )

    # Create FundingContribution
    new_contrib = FundingContribution(
        funding_request_id=freq.id,
        project_id=freq.project_id,
        partner_id=partner_id,
        contribution_amount=contrib_amt,
        share_percentage=share_pct,
        status="APPROVED"
    )
    db.add(new_contrib)

    # Update request status
    total_after = current_committed + contrib_amt
    total_share_after = current_share + share_pct
    if total_after >= target_base or total_share_after >= 100.0:
        freq.status = "FULLY_FUNDED"
    else:
        freq.status = "PARTIALLY_FUNDED"

    freq.approved_amount = total_after

    proj = db.query(Project).filter(Project.id == freq.project_id).first()

    # Create notifications
    from app.services.notification_service import create_notification
    create_notification(
        db,
        user_role="UNIVERSITY",
        institution_id=proj.institution_id if proj else None,
        title="New MSME Funding Contribution",
        message=f"{partner.name} committed ₹{contrib_amt} Lakhs ({share_pct}%) for '{proj.project_name[:35] if proj else 'your project'}'.",
        type="FUNDING",
        related_entity_type="FUNDING",
        related_entity_id=freq.id,
        link="/industry"
    )
    create_notification(
        db,
        user_role="INDUSTRY_PARTNER",
        title="Funding Contribution Recorded",
        message=f"Successfully committed ₹{contrib_amt} Lakhs ({share_pct}%) for '{proj.project_name[:35] if proj else 'project'}'.",
        type="FUNDING",
        related_entity_type="FUNDING",
        related_entity_id=freq.id,
        link="/industry"
    )
    create_notification(
        db,
        user_role="GOVERNMENT_ADMIN",
        title="Major Funding Commitment",
        message=f"{partner.name} committed ₹{contrib_amt} Lakhs ({share_pct}%) to '{proj.project_name[:35] if proj else 'project'}'.",
        type="FUNDING",
        related_entity_type="FUNDING",
        related_entity_id=freq.id,
        link="/admin"
    )

    if freq.status == "FULLY_FUNDED":
        create_notification(
            db,
            user_role="UNIVERSITY",
            institution_id=proj.institution_id if proj else None,
            title="Project Fully Funded!",
            message=f"Funding target of ₹{target_base} Lakhs reached for '{proj.project_name[:35] if proj else 'project'}'.",
            type="FUNDING",
            related_entity_type="FUNDING",
            related_entity_id=freq.id,
            link="/industry"
        )
        create_notification(
            db,
            user_role="INDUSTRY_PARTNER",
            title="Project Fully Funded!",
            message=f"Funding target reached for '{proj.project_name[:35] if proj else 'project'}'.",
            type="FUNDING",
            related_entity_type="FUNDING",
            related_entity_id=freq.id,
            link="/industry"
        )

    if proj:
        from app.models import CSRFunding
        db.add(CSRFunding(
            project_id=freq.project_id,
            partner_id=partner_id,
            amount_in_lakhs=contrib_amt,
            purpose=f"Co-Funding Contribution ({share_pct}%)",
            status="APPROVED"
        ))

        db.add(ActivityLog(
            project_id=proj.id,
            challenge_id=proj.challenge_id,
            action=f"{partner.name} committed funding contribution of ₹{contrib_amt} Lakhs ({share_pct}%)",
            performed_by=partner.name
        ))

    db.commit()
    db.refresh(freq)
    return format_funding_response(freq, db)

@router.post("/funding-requests/{id}/contribute", response_model=FundingRequestResponse)
def add_funding_contribution_post(
    id: int,
    payload: Optional[FundingContributionCreate] = None,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_current_user)
):
    if user and user.role == "CITIZEN":
        raise HTTPException(status_code=403, detail="Citizens cannot contribute to funding requests.")
    contrib_amt = payload.contribution_amount if payload else None
    share_pct = payload.share_percentage if payload else None
    partner_id = payload.partner_id if payload else None
    return _process_funding_contribution(id, contrib_amt, share_pct, partner_id, db, user)

@router.patch("/funding-requests/{id}/approve", response_model=FundingRequestResponse)
def approve_funding_request_patch(
    id: int,
    payload: Optional[FundingRequestApprove] = None,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_current_user)
):
    if user and user.role == "CITIZEN":
        raise HTTPException(status_code=403, detail="Citizens cannot approve funding requests.")
    contrib_amt = payload.approved_amount if payload else None
    share_pct = payload.share_percentage if payload else None
    return _process_funding_contribution(id, contrib_amt, share_pct, None, db, user)

@router.patch("/funding-requests/{id}/reject", response_model=FundingRequestResponse)
def reject_funding_request(
    id: int,
    payload: Optional[FundingRequestReject] = None,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_current_user)
):
    if user and user.role == "CITIZEN":
        raise HTTPException(status_code=403, detail="Citizens cannot reject funding requests.")

    freq = db.query(FundingRequest).filter(FundingRequest.id == id).first()
    if not freq:
        raise HTTPException(status_code=404, detail="Funding request not found")

    freq.status = "REJECTED"
    reason = payload.rejection_reason if (payload and payload.rejection_reason) else "Insufficient budget allocation"
    freq.rejection_reason = reason

    proj = db.query(Project).filter(Project.id == freq.project_id).first()

    # Notifications
    from app.services.notification_service import create_notification
    create_notification(
        db,
        user_role="UNIVERSITY",
        institution_id=proj.institution_id if proj else None,
        title="Funding Request Rejected",
        message=f"Funding request rejected for '{proj.project_name[:35] if proj else 'project'}'. Reason: {reason}.",
        type="FUNDING",
        related_entity_type="FUNDING",
        related_entity_id=freq.id,
        link="/industry"
    )
    create_notification(
        db,
        user_role="INDUSTRY_PARTNER",
        title="Funding Request Rejected",
        message=f"Rejected funding request for '{proj.project_name[:35] if proj else 'project'}'.",
        type="FUNDING",
        related_entity_type="FUNDING",
        related_entity_id=freq.id,
        link="/industry"
    )

    if proj:
        db.add(ActivityLog(
            project_id=proj.id,
            challenge_id=proj.challenge_id,
            action=f"MSME / Industry rejected funding request. Reason: {reason}",
            performed_by=user.name if user else "MSME Partner"
        ))

    db.commit()
    db.refresh(freq)
    return format_funding_response(freq, db)


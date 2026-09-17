import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import IndustryPartner, CSRFunding, MentorshipOffer, TechTransfer, Project, User, Notification, ActivityLog
from app.schemas import (
    IndustryPartnerCreate, IndustryPartnerResponse,
    CSRFundingCreate, CSRFundingResponse,
    MentorshipOfferCreate, MentorshipOfferResponse,
    TechTransferCreate, TechTransferResponse
)

router = APIRouter(prefix="/api", tags=["industry"])

def format_partner_response(partner: IndustryPartner) -> IndustryPartnerResponse:
    try:
        domains = json.loads(partner.focus_domains)
    except Exception:
        domains = []
    return IndustryPartnerResponse(
        id=partner.id,
        name=partner.name,
        entity_type=partner.entity_type,
        sector=partner.sector,
        contact_email=partner.contact_email,
        website=partner.website,
        csr_budget=partner.csr_budget,
        focus_domains=domains,
        mentorship_available=partner.mentorship_available,
        created_at=partner.created_at
    )

@router.get("/industry/partners", response_model=List[IndustryPartnerResponse])
def list_industry_partners(db: Session = Depends(get_db)):
    partners = db.query(IndustryPartner).all()
    return [format_partner_response(p) for p in partners]

@router.post("/industry/partners", response_model=IndustryPartnerResponse)
def register_industry_partner(
    payload: IndustryPartnerCreate,
    db: Session = Depends(get_db)
):
    partner = IndustryPartner(
        name=payload.name,
        entity_type=payload.entity_type,
        sector=payload.sector,
        contact_email=payload.contact_email,
        website=payload.website,
        csr_budget=payload.csr_budget,
        focus_domains=json.dumps(payload.focus_domains),
        mentorship_available=payload.mentorship_available
    )
    db.add(partner)
    db.commit()
    db.refresh(partner)
    return format_partner_response(partner)

# CSR Funding
@router.post("/projects/{project_id}/csr-funding", response_model=CSRFundingResponse)
def add_csr_funding(
    project_id: str,
    payload: CSRFundingCreate,
    db: Session = Depends(get_db)
):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    
    partner = db.query(IndustryPartner).filter(IndustryPartner.id == payload.partner_id).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Industry partner not found")

    funding = CSRFunding(
        project_id=project_id,
        partner_id=payload.partner_id,
        amount_in_lakhs=payload.amount_in_lakhs,
        purpose=payload.purpose,
        status="PROPOSED"
    )
    db.add(funding)

    # Activity Log & Notification
    db.add(ActivityLog(
        project_id=project_id,
        challenge_id=proj.challenge_id,
        action=f"CSR Funding of ₹{payload.amount_in_lakhs} Lakhs proposed by {partner.name}",
        performed_by=partner.name
    ))

    db.add(Notification(
        user_role="UNIVERSITY",
        title="CSR Funding Proposal Received",
        message=f"{partner.name} offered ₹{payload.amount_in_lakhs} Lakhs CSR funding for project {proj.project_name}",
        link=f"/projects/{proj.id}"
    ))

    db.commit()
    db.refresh(funding)

    return CSRFundingResponse(
        id=funding.id,
        project_id=funding.project_id,
        partner_id=funding.partner_id,
        partner_name=partner.name,
        amount_in_lakhs=funding.amount_in_lakhs,
        purpose=funding.purpose,
        status=funding.status,
        created_at=funding.created_at
    )

# Mentorship
@router.post("/projects/{project_id}/mentorship", response_model=MentorshipOfferResponse)
def add_mentorship_offer(
    project_id: str,
    payload: MentorshipOfferCreate,
    db: Session = Depends(get_db)
):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    
    partner = db.query(IndustryPartner).filter(IndustryPartner.id == payload.partner_id).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Industry partner not found")

    offer = MentorshipOffer(
        project_id=project_id,
        partner_id=payload.partner_id,
        mentor_name=payload.mentor_name,
        expertise_domain=payload.expertise_domain,
        contact_email=payload.contact_email,
        status="ACTIVE"
    )
    db.add(offer)

    db.add(ActivityLog(
        project_id=project_id,
        challenge_id=proj.challenge_id,
        action=f"Industry Mentor {payload.mentor_name} ({partner.name}) assigned to project",
        performed_by=partner.name
    ))

    db.commit()
    db.refresh(offer)

    return MentorshipOfferResponse(
        id=offer.id,
        project_id=offer.project_id,
        partner_id=offer.partner_id,
        partner_name=partner.name,
        mentor_name=offer.mentor_name,
        expertise_domain=offer.expertise_domain,
        contact_email=offer.contact_email,
        status=offer.status,
        created_at=offer.created_at
    )

# Tech Transfer
@router.post("/projects/{project_id}/tech-transfer", response_model=TechTransferResponse)
def add_tech_transfer(
    project_id: str,
    payload: TechTransferCreate,
    db: Session = Depends(get_db)
):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    partner = db.query(IndustryPartner).filter(IndustryPartner.id == payload.partner_id).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Industry partner not found")

    transfer = TechTransfer(
        project_id=project_id,
        partner_id=payload.partner_id,
        ip_type=payload.ip_type,
        licensing_terms=payload.licensing_terms,
        status="UNDER_NEGOTIATION"
    )
    db.add(transfer)

    db.add(ActivityLog(
        project_id=project_id,
        challenge_id=proj.challenge_id,
        action=f"Tech Transfer / IP agreement initiated with {partner.name}",
        performed_by=partner.name
    ))

    db.commit()
    db.refresh(transfer)

    return TechTransferResponse(
        id=transfer.id,
        project_id=transfer.project_id,
        partner_id=transfer.partner_id,
        partner_name=partner.name,
        ip_type=transfer.ip_type,
        licensing_terms=transfer.licensing_terms,
        status=transfer.status,
        created_at=transfer.created_at
    )

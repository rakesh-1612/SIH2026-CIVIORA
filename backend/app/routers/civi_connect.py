from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models import (
    Project, ProjectConversation, ProjectParticipant, ProjectMessage, User,
    CSRFunding, MentorshipOffer, TechTransfer, FundingRequest, FundingContribution, Notification
)
from app.schemas import (
    CiviConnectConversationResponse, CiviConnectParticipantResponse,
    CiviConnectMessageCreate, CiviConnectMessageResponse
)
from app.services.auth_service import get_current_user, get_optional_current_user

router = APIRouter(prefix="/api", tags=["civi-connect"])


def check_civi_connect_authorization(user: Optional[User], proj: Project, db: Session) -> str:
    """
    Validates if user has permission to join/participate in project CIVI-CONNECT conversation.
    Returns the resolved role label string for display (CITIZEN, UNIVERSITY, MSME / INDUSTRY, GOVERNMENT).
    """
    if not user:
        return "CITIZEN"

    role = user.role.upper() if user.role else "CITIZEN"

    if role == "GOVERNMENT_ADMIN":
        return "GOVERNMENT"

    if role == "CITIZEN":
        return "CITIZEN"

    if role == "UNIVERSITY":
        if user.institution_id and proj.institution_id == user.institution_id:
            return "UNIVERSITY"
        if user.email.startswith("nitt") or user.email.startswith("bit"):
            return "UNIVERSITY"
        return "UNIVERSITY"

    if role in ["INDUSTRY_PARTNER", "EXPERT"]:
        return "MSME / INDUSTRY"

    return "CITIZEN"


def get_or_create_conversation(proj: Project, db: Session) -> ProjectConversation:
    conv = db.query(ProjectConversation).filter(ProjectConversation.project_id == proj.id).first()
    if not conv:
        conv = ProjectConversation(project_id=proj.id)
        db.add(conv)
        db.commit()
        db.refresh(conv)

        # Seed initial system welcome message
        welcome_msg = ProjectMessage(
            conversation_id=conv.id,
            sender_id=None,
            sender_name="SYSTEM",
            sender_role="SYSTEM",
            message=f"CIVI-CONNECT Collaboration Room initiated for {proj.project_name} ({proj.id}).",
            is_system_message=True
        )
        db.add(welcome_msg)
        db.commit()

    return conv


def ensure_participant_registered(conv: ProjectConversation, user: User, display_role: str, db: Session):
    existing = db.query(ProjectParticipant).filter(
        ProjectParticipant.conversation_id == conv.id,
        ProjectParticipant.user_id == user.id
    ).first()

    if not existing:
        part = ProjectParticipant(
            conversation_id=conv.id,
            user_id=user.id,
            role=display_role
        )
        db.add(part)
        db.commit()


def insert_system_message(project_id: str, text: str, db: Session):
    """
    Helper function to insert automated system messages into CIVI-CONNECT for project lifecycle events.
    """
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        return
    conv = get_or_create_conversation(proj, db)
    sys_msg = ProjectMessage(
        conversation_id=conv.id,
        sender_id=None,
        sender_name="SYSTEM",
        sender_role="SYSTEM",
        message=text,
        is_system_message=True
    )
    db.add(sys_msg)
    db.commit()


@router.get("/projects/{project_id}/civi-connect", response_model=CiviConnectConversationResponse)
def get_civi_connect_room(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Solution Project not found")

    display_role = check_civi_connect_authorization(current_user, proj, db)
    conv = get_or_create_conversation(proj, db)
    if current_user:
        ensure_participant_registered(conv, current_user, display_role, db)

    # Format participant list
    participants = []
    part_records = db.query(ProjectParticipant).filter(ProjectParticipant.conversation_id == conv.id).all()
    for p in part_records:
        u_name = p.user.name if p.user else "Project Stakeholder"
        participants.append(CiviConnectParticipantResponse(
            user_id=p.user_id,
            name=u_name,
            role=p.role,
            joined_at=p.joined_at
        ))

    challenge_title = proj.challenge.title if proj.challenge else proj.project_name

    return CiviConnectConversationResponse(
        id=conv.id,
        project_id=proj.id,
        project_name=proj.project_name,
        challenge_title=challenge_title,
        created_at=conv.created_at,
        participants=participants,
        active_participant_count=max(len(participants), 4)
    )


@router.get("/projects/{project_id}/civi-connect/messages", response_model=List[CiviConnectMessageResponse])
def get_civi_connect_messages(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Solution Project not found")

    check_civi_connect_authorization(current_user, proj, db)
    conv = get_or_create_conversation(proj, db)

    msgs = db.query(ProjectMessage).filter(
        ProjectMessage.conversation_id == conv.id
    ).order_by(ProjectMessage.created_at.asc()).all()

    return [
        CiviConnectMessageResponse(
            id=m.id,
            conversation_id=m.conversation_id,
            sender_id=m.sender_id,
            sender_name=m.sender_name,
            sender_role=m.sender_role,
            message=m.message,
            attachment_url=m.attachment_url,
            is_system_message=m.is_system_message,
            created_at=m.created_at,
            edited_at=m.edited_at
        )
        for m in msgs
    ]


@router.post("/projects/{project_id}/civi-connect/messages", response_model=CiviConnectMessageResponse)
def send_civi_connect_message(
    project_id: str,
    payload: CiviConnectMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Solution Project not found")

    display_role = check_civi_connect_authorization(current_user, proj, db)
    conv = get_or_create_conversation(proj, db)
    ensure_participant_registered(conv, current_user, display_role, db)

    if not payload.message or not payload.message.strip():
        if not payload.attachment_url:
            raise HTTPException(status_code=400, detail="Message content or attachment is required")

    sender_name = current_user.name
    if display_role == "UNIVERSITY" and current_user.institution:
        sender_name = current_user.institution.name
    elif display_role == "GOVERNMENT":
        sender_name = "Jharkhand Government Admin"
    elif display_role == "MSME / INDUSTRY":
        sender_name = current_user.name if ("Steel" in current_user.name or "Foundation" in current_user.name) else f"{current_user.name} (Industry Partner)"

    new_msg = ProjectMessage(
        conversation_id=conv.id,
        sender_id=current_user.id,
        sender_name=sender_name,
        sender_role=display_role,
        message=payload.message.strip(),
        attachment_url=payload.attachment_url,
        is_system_message=False
    )
    db.add(new_msg)
    db.commit()
    db.refresh(new_msg)

    # Generate Notification for other project participants (excluding sender)
    from app.services.notification_service import create_notification
    part_records = db.query(ProjectParticipant).filter(ProjectParticipant.conversation_id == conv.id).all()
    notified_user_ids = set()

    for p in part_records:
        if p.user_id and p.user_id != current_user.id and p.user_id not in notified_user_ids:
            create_notification(
                db,
                user_id=p.user_id,
                title="New CIVI-CONNECT message",
                message=f"{sender_name} sent a message in '{proj.project_name[:35]}'.",
                type="MESSAGE",
                related_entity_type="PROJECT",
                related_entity_id=proj.id,
                link=f"/projects?id={proj.id}&tab=civi-connect"
            )
            notified_user_ids.add(p.user_id)

    # Fallback to ensure project owner citizen receives message notification if not in participant table
    if proj.challenge and proj.challenge.citizen_id and proj.challenge.citizen_id != current_user.id and proj.challenge.citizen_id not in notified_user_ids:
        create_notification(
            db,
            user_id=proj.challenge.citizen_id,
            title="New CIVI-CONNECT message",
            message=f"{sender_name} sent a message in '{proj.project_name[:35]}'.",
            type="MESSAGE",
            related_entity_type="PROJECT",
            related_entity_id=proj.id,
            link=f"/projects?id={proj.id}&tab=civi-connect"
        )
        notified_user_ids.add(proj.challenge.citizen_id)

    # Also notify University team if sender is not University
    if display_role != "UNIVERSITY":
        create_notification(
            db,
            user_role="UNIVERSITY",
            institution_id=proj.institution_id,
            title="New CIVI-CONNECT message",
            message=f"{sender_name} sent a message in '{proj.project_name[:35]}'.",
            type="MESSAGE",
            related_entity_type="PROJECT",
            related_entity_id=proj.id,
            link=f"/projects?id={proj.id}&tab=civi-connect",
            exclude_user_id=current_user.id
        )

    db.commit()

    return CiviConnectMessageResponse(
        id=new_msg.id,
        conversation_id=new_msg.conversation_id,
        sender_id=new_msg.sender_id,
        sender_name=new_msg.sender_name,
        sender_role=new_msg.sender_role,
        message=new_msg.message,
        attachment_url=new_msg.attachment_url,
        is_system_message=new_msg.is_system_message,
        created_at=new_msg.created_at,
        edited_at=new_msg.edited_at
    )

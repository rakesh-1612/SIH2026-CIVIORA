from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models import Project, Milestone, Challenge, ActivityLog, User
from app.schemas import ProjectResponse, MilestoneCreate, MilestoneResponse, ProjectStatusUpdate, ProjectCommentCreate, ProjectCommentResponse

from app.routers.institutions import format_project_response
from app.services.auth_service import require_roles

router = APIRouter(prefix="/api", tags=["projects"])

VALID_LIFECYCLE = [
    "SUBMITTED", "AI_ANALYZED", "UNDER_REVIEW", "MATCHED",
    "ACCEPTED", "IN_PROGRESS", "PROTOTYPE", "PILOT_TESTING", "DEPLOYED", "RESOLVED"
]

@router.get("/projects", response_model=List[ProjectResponse])
def list_projects(db: Session = Depends(get_db)):
    projects = db.query(Project).all()
    return [format_project_response(p, db) for p in projects]

@router.get("/projects/{id}", response_model=ProjectResponse)
def get_project_by_id(id: str, db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.id == id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    return format_project_response(proj, db)

@router.patch("/projects/{id}/status", response_model=ProjectResponse)
def update_project_status(
    id: str,
    payload: ProjectStatusUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["UNIVERSITY", "GOVERNMENT_ADMIN"]))
):
    proj = db.query(Project).filter(Project.id == id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    if user.role == "UNIVERSITY" and proj.institution_id != user.institution_id:
        raise HTTPException(
            status_code=403,
            detail=f"Restricted Action. You can only manage projects belonging to your assigned institution (ID #{user.institution_id})."
        )

    new_status = payload.status.upper()
    if new_status not in VALID_LIFECYCLE:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {VALID_LIFECYCLE}")

    old_status = proj.status
    proj.status = new_status
    if proj.challenge:
        proj.challenge.status = new_status

    # Log activity
    db.add(ActivityLog(
        challenge_id=proj.challenge_id,
        project_id=proj.id,
        action=f"Project status updated to {new_status}",
        performed_by=proj.institution.name if proj.institution else "Project Lead"
    ))

    # Trigger CIVI-CONNECT System Message
    try:
        from app.routers.civi_connect import insert_system_message
        insert_system_message(proj.id, f"Project status moved from {old_status.replace('_', ' ').title()} → {new_status.replace('_', ' ').title()}", db)
    except Exception as e:
        print(f"[CIVI-CONNECT System Message Error]: {e}")

    # Generate Real Stakeholder Notifications
    from app.services.notification_service import create_notification
    st_title = f"Project enters {new_status.replace('_', ' ').title()}"
    st_msg = f"Project '{proj.project_name[:40]}' status changed to {new_status.replace('_', ' ').title()}."

    if proj.challenge and proj.challenge.citizen_id:
        create_notification(
            db,
            user_id=proj.challenge.citizen_id,
            title="Project Status Changed",
            message=st_msg,
            type="PROJECT",
            related_entity_type="PROJECT",
            related_entity_id=proj.id,
            link=f"/projects?id={proj.id}"
        )

    create_notification(
        db,
        user_role="UNIVERSITY",
        institution_id=proj.institution_id,
        title="Project Status Updated",
        message=st_msg,
        type="PROJECT",
        related_entity_type="PROJECT",
        related_entity_id=proj.id,
        link=f"/projects?id={proj.id}"
    )

    create_notification(
        db,
        user_role="GOVERNMENT_ADMIN",
        title="Project Status Changed",
        message=f"Project {proj.id} '{proj.project_name[:35]}' moved to {new_status.replace('_', ' ').title()}.",
        type="PROJECT",
        related_entity_type="PROJECT",
        related_entity_id=proj.id,
        link="/admin"
    )

    create_notification(
        db,
        user_role="INDUSTRY_PARTNER",
        title="Project Status Changed",
        message=f"Project {proj.id} '{proj.project_name[:35]}' moved to {new_status.replace('_', ' ').title()}.",
        type="PROJECT",
        related_entity_type="PROJECT",
        related_entity_id=proj.id,
        link="/industry"
    )

    db.commit()
    db.refresh(proj)
    return format_project_response(proj, db)


@router.post("/projects/{id}/milestones", response_model=MilestoneResponse)
def add_milestone(
    id: str,
    payload: MilestoneCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["UNIVERSITY", "GOVERNMENT_ADMIN"]))
):
    proj = db.query(Project).filter(Project.id == id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    if user.role == "UNIVERSITY" and proj.institution_id != user.institution_id:
        raise HTTPException(
            status_code=403,
            detail=f"Restricted Action. You can only add milestones to projects belonging to your assigned institution (ID #{user.institution_id})."
        )

    ms = Milestone(
        project_id=proj.id,
        title=payload.title,
        description=payload.description,
        due_date=payload.due_date,
        is_completed=False
    )
    db.add(ms)
    db.commit()
    db.refresh(ms)

    # Recalculate progress
    recalculate_project_progress(proj.id, db)

    return MilestoneResponse(
        id=ms.id,
        project_id=ms.project_id,
        title=ms.title,
        description=ms.description,
        due_date=ms.due_date,
        is_completed=ms.is_completed,
        completed_at=ms.completed_at
    )

@router.patch("/milestones/{id}/toggle", response_model=MilestoneResponse)
def toggle_milestone(
    id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["UNIVERSITY", "GOVERNMENT_ADMIN"]))
):
    ms = db.query(Milestone).filter(Milestone.id == id).first()
    if not ms:
        raise HTTPException(status_code=404, detail="Milestone not found")

    proj = db.query(Project).filter(Project.id == ms.project_id).first()
    if user.role == "UNIVERSITY" and proj and proj.institution_id != user.institution_id:
        raise HTTPException(
            status_code=403,
            detail=f"Restricted Action. You can only toggle milestones on projects belonging to your assigned institution (ID #{user.institution_id})."
        )

    ms.is_completed = not ms.is_completed
    ms.completed_at = datetime.utcnow() if ms.is_completed else None
    
    db.commit()
    db.refresh(ms)

    # Recalculate project progress
    recalculate_project_progress(ms.project_id, db)

    # Generate Notification
    from app.services.notification_service import create_notification
    status_str = "completed" if ms.is_completed else "reopened"
    ms_msg = f"Milestone '{ms.title[:30]}' for '{proj.project_name[:30]}' was {status_str}."

    if proj and proj.challenge and proj.challenge.citizen_id:
        create_notification(
            db,
            user_id=proj.challenge.citizen_id,
            title="Project Milestone Updated",
            message=ms_msg,
            type="MILESTONE",
            related_entity_type="PROJECT",
            related_entity_id=proj.id,
            link=f"/projects?id={proj.id}"
        )

    if proj:
        create_notification(
            db,
            user_role="UNIVERSITY",
            institution_id=proj.institution_id,
            title="Milestone Updated",
            message=ms_msg,
            type="MILESTONE",
            related_entity_type="PROJECT",
            related_entity_id=proj.id,
            link=f"/projects?id={proj.id}"
        )

    return MilestoneResponse(
        id=ms.id,
        project_id=ms.project_id,
        title=ms.title,
        description=ms.description,
        due_date=ms.due_date,
        is_completed=ms.is_completed,
        completed_at=ms.completed_at
    )

@router.post("/projects/{id}/comments", response_model=ProjectCommentResponse)
def add_project_comment(
    id: str,
    payload: ProjectCommentCreate,
    db: Session = Depends(get_db)
):
    proj = db.query(Project).filter(Project.id == id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    from app.models import ProjectComment
    from app.services.notification_service import create_notification
    comment = ProjectComment(
        project_id=id,
        author_name=payload.author_name,
        author_role=payload.author_role.upper(),
        content=payload.content
    )
    db.add(comment)

    # Notify stakeholders
    create_notification(
        db,
        user_role="ALL",
        title=f"New comment on {proj.project_name[:35]}",
        message=f"{payload.author_name} ({payload.author_role}): '{payload.content[:60]}...'",
        type="PROJECT",
        related_entity_type="PROJECT",
        related_entity_id=proj.id,
        link=f"/projects?id={proj.id}"
    )

    db.commit()
    db.refresh(comment)

    return ProjectCommentResponse(
        id=comment.id,
        project_id=comment.project_id,
        author_name=comment.author_name,
        author_role=comment.author_role,
        content=comment.content,
        created_at=comment.created_at
    )

def recalculate_project_progress(project_id: str, db: Session):
    ms_list = db.query(Milestone).filter(Milestone.project_id == project_id).all()
    if not ms_list:
        return
    
    completed_cnt = sum(1 for m in ms_list if m.is_completed)
    total_cnt = len(ms_list)
    new_progress = round((completed_cnt / total_cnt) * 100.0, 1)

    proj = db.query(Project).filter(Project.id == project_id).first()
    if proj:
        proj.progress = new_progress
        # Auto update project status based on progress
        if new_progress >= 100.0:
            proj.status = "RESOLVED"
            if proj.challenge:
                proj.challenge.status = "RESOLVED"
        elif new_progress >= 75.0:
            proj.status = "PILOT_TESTING"
            if proj.challenge:
                proj.challenge.status = "PILOT_TESTING"
        elif new_progress >= 50.0:
            proj.status = "PROTOTYPE"
            if proj.challenge:
                proj.challenge.status = "PROTOTYPE"
        elif new_progress >= 25.0:
            proj.status = "IN_PROGRESS"
            if proj.challenge:
                proj.challenge.status = "IN_PROGRESS"
                
        db.commit()


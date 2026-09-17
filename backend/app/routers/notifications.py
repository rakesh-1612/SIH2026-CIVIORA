from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models import Notification, User
from app.schemas import NotificationResponse, UnreadCountResponse
from app.services.auth_service import get_optional_current_user, get_current_user

router = APIRouter(prefix="/api", tags=["notifications"])

@router.get("/notifications", response_model=List[NotificationResponse])
def get_notifications(
    role: Optional[str] = None,
    type: Optional[str] = None,
    is_read: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """
    Fetch notifications.
    - If user is authenticated, retrieves notifications targeting their user_id or matching role.
    - Supports filtering by notification type (CHALLENGE, PROJECT, FUNDING, MESSAGE, MILESTONE, SYSTEM, SOCIAL) and read state.
    """
    query = db.query(Notification)

    if current_user:
        query = query.filter(
            (Notification.user_id == current_user.id) |
            (Notification.user_id.is_(None) & Notification.user_role.in_([current_user.role, "ALL"]))
        )
    elif role:
        query = query.filter(Notification.user_role.in_([role.upper(), "ALL"]))

    if type and type.upper() != "ALL":
        # Handle type filters including aliases (e.g., PROJECTS -> PROJECT, MESSAGES -> MESSAGE, etc.)
        t_clean = type.upper().rstrip("S")
        if t_clean == "PROJECT":
            query = query.filter(Notification.type.in_(["PROJECT", "MILESTONE"]))
        elif t_clean == "CHALLENGE":
            query = query.filter(Notification.type.in_(["CHALLENGE", "SOCIAL"]))
        elif t_clean in ["FUNDING", "MESSAGE", "MILESTONE", "SYSTEM", "SOCIAL"]:
            query = query.filter(Notification.type == t_clean)
        else:
            query = query.filter(Notification.type == type.upper())

    if is_read is not None:
        query = query.filter(Notification.is_read == is_read)

    notifications = query.order_by(Notification.created_at.desc()).all()
    return notifications

@router.get("/notifications/unread-count", response_model=UnreadCountResponse)
def get_unread_count(
    role: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """
    Returns total count of unread notifications for authenticated user.
    """
    query = db.query(Notification).filter(Notification.is_read == False)

    if current_user:
        query = query.filter(
            (Notification.user_id == current_user.id) |
            (Notification.user_id.is_(None) & Notification.user_role.in_([current_user.role, "ALL"]))
        )
    elif role:
        query = query.filter(Notification.user_role.in_([role.upper(), "ALL"]))
    else:
        return UnreadCountResponse(unread_count=0)

    count = query.count()
    return UnreadCountResponse(unread_count=count)

@router.patch("/notifications/{id}/read", response_model=NotificationResponse)
def mark_notification_read(
    id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """
    Marks specific notification as read in database.
    """
    notif = db.query(Notification).filter(Notification.id == id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")

    if current_user and notif.user_id and notif.user_id != current_user.id:
        if notif.user_role not in [current_user.role, "ALL"]:
            raise HTTPException(status_code=403, detail="Unauthorized notification access.")

    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif

@router.post("/notifications/mark-all-read")
def mark_all_read(
    role: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """
    Marks all notifications for current user/role as read in database.
    """
    query = db.query(Notification)

    if current_user:
        query = query.filter(
            (Notification.user_id == current_user.id) |
            (Notification.user_id.is_(None) & Notification.user_role.in_([current_user.role, "ALL"]))
        )
    elif role:
        query = query.filter(Notification.user_role.in_([role.upper(), "ALL"]))

    notifications = query.all()
    for n in notifications:
        n.is_read = True

    db.commit()
    return {"message": "All notifications marked as read"}

from sqlalchemy.orm import Session
from typing import Optional, List
from app.models import Notification, User

def create_notification(
    db: Session,
    title: str,
    message: str,
    type: str = "SYSTEM",
    related_entity_type: Optional[str] = None,
    related_entity_id: Optional[str] = None,
    link: Optional[str] = None,
    user_id: Optional[int] = None,
    user_role: Optional[str] = None,
    institution_id: Optional[int] = None,
    exclude_user_id: Optional[int] = None
) -> List[Notification]:
    """
    Central helper for creating persistent DB notification records.
    - If user_id is provided, creates a notification for that specific user.
    - If user_role is provided, creates individual notifications for all users with that role
      (and optional institution_id filter).
    - If user_role is 'ALL', creates notifications for all registered users except exclude_user_id.
    """
    created_notifs = []

    if user_id is not None:
        if exclude_user_id and user_id == exclude_user_id:
            return []
        user = db.query(User).filter(User.id == user_id).first()
        role_label = user.role if user else (user_role or "ALL")
        notif = Notification(
            user_id=user_id,
            user_role=role_label,
            title=title,
            message=message,
            type=type,
            related_entity_type=related_entity_type,
            related_entity_id=str(related_entity_id) if related_entity_id is not None else None,
            link=link,
            is_read=False
        )
        db.add(notif)
        created_notifs.append(notif)
    elif user_role:
        query = db.query(User)
        if user_role.upper() != "ALL":
            query = query.filter(User.role == user_role.upper())
        if institution_id is not None:
            query = query.filter(User.institution_id == institution_id)
        
        target_users = query.all()
        if target_users:
            for u in target_users:
                if exclude_user_id and u.id == exclude_user_id:
                    continue
                notif = Notification(
                    user_id=u.id,
                    user_role=u.role,
                    title=title,
                    message=message,
                    type=type,
                    related_entity_type=related_entity_type,
                    related_entity_id=str(related_entity_id) if related_entity_id is not None else None,
                    link=link,
                    is_read=False
                )
                db.add(notif)
                created_notifs.append(notif)
        else:
            # Fallback for role when no users exist yet
            notif = Notification(
                user_id=None,
                user_role=user_role.upper(),
                title=title,
                message=message,
                type=type,
                related_entity_type=related_entity_type,
                related_entity_id=str(related_entity_id) if related_entity_id is not None else None,
                link=link,
                is_read=False
            )
            db.add(notif)
            created_notifs.append(notif)
    else:
        # Generic role fallback
        notif = Notification(
            user_id=None,
            user_role="ALL",
            title=title,
            message=message,
            type=type,
            related_entity_type=related_entity_type,
            related_entity_id=str(related_entity_id) if related_entity_id is not None else None,
            link=link,
            is_read=False
        )
        db.add(notif)
        created_notifs.append(notif)

    return created_notifs

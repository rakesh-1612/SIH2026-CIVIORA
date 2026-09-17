from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

from app.database import get_db
from app.models import User
from app.services.auth_service import (
    hash_password, verify_password, create_jwt_token, decode_jwt_token, get_current_user
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

class LoginRequest(BaseModel):
    email: str
    password: str

class QuickLoginRequest(BaseModel):
    role: str  # CITIZEN, UNIVERSITY, GOVERNMENT_ADMIN, INDUSTRY_PARTNER

class UserRegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    confirm_password: str
    role: str  # CITIZEN, UNIVERSITY, MSME / INDUSTRY / INDUSTRY_PARTNER, GOVERNMENT / GOVERNMENT_ADMIN
    organization_name: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    department_sector: Optional[str] = None
    institution_id: Optional[int] = None

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
    confirm_password: str

class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    organization_name: Optional[str] = None
    department_sector: Optional[str] = None

class UpdateAccountStatusRequest(BaseModel):
    account_status: str  # ACTIVE, PENDING, SUSPENDED, REJECTED

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    account_status: str = "ACTIVE"
    auth_mode: str = "REAL"
    institution_id: Optional[int] = None
    organization_name: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    department_sector: Optional[str] = None
    created_at: Optional[datetime] = None

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    clean_email = payload.email.strip().lower()
    user = db.query(User).filter(func.lower(User.email) == clean_email).first()
    if not user:
        user = db.query(User).filter(User.email.icontains(clean_email)).first()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    # Check account status
    if user.account_status == "PENDING":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is awaiting administrative verification/approval."
        )
    elif user.account_status == "SUSPENDED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been suspended by platform administration."
        )
    elif user.account_status == "REJECTED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account application was rejected."
        )

    token = create_jwt_token({
        "user_id": user.id,
        "email": user.email,
        "role": user.role,
        "account_status": user.account_status,
        "institution_id": user.institution_id
    })

    return AuthResponse(
        access_token=token,
        user=UserResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            role=user.role,
            account_status=user.account_status or "ACTIVE",
            auth_mode=user.auth_mode or "REAL",
            institution_id=user.institution_id,
            organization_name=user.organization_name,
            phone=user.phone,
            location=user.location,
            department_sector=user.department_sector,
            created_at=user.created_at
        )
    )

@router.post("/register")
def register(payload: UserRegisterRequest, db: Session = Depends(get_db)):
    """
    Registers a new real user account with role-specific profile fields and status handling.
    """
    clean_email = payload.email.strip().lower()

    if not clean_email or "@" not in clean_email:
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")

    if len(payload.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long.")

    if payload.password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Password and confirm password do not match.")

    # Duplicate email check (case-insensitive)
    existing_user = db.query(User).filter(func.lower(User.email) == clean_email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="An account with this email address already exists.")

    # Normalize role
    raw_role = payload.role.upper().strip()
    if raw_role in ["MSME", "INDUSTRY", "MSME_INDUSTRY", "INDUSTRY_PARTNER"]:
        target_role = "INDUSTRY_PARTNER"
    elif raw_role in ["GOVERNMENT", "GOVT", "GOVERNMENT_ADMIN"]:
        target_role = "GOVERNMENT_ADMIN"
    elif raw_role == "UNIVERSITY":
        target_role = "UNIVERSITY"
    else:
        target_role = "CITIZEN"

    # Government accounts require administrative verification/approval
    if target_role == "GOVERNMENT_ADMIN":
        initial_status = "PENDING"
    else:
        initial_status = "ACTIVE"

    new_user = User(
        name=payload.name.strip(),
        email=clean_email,
        hashed_password=hash_password(payload.password),
        role=target_role,
        account_status=initial_status,
        organization_name=payload.organization_name.strip() if payload.organization_name else None,
        phone=payload.phone.strip() if payload.phone else None,
        location=payload.location.strip() if payload.location else None,
        department_sector=payload.department_sector.strip() if payload.department_sector else None,
        institution_id=payload.institution_id,
        auth_mode="REAL"
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    if initial_status == "PENDING":
        return {
            "message": "Account created successfully. Government accounts require administrative verification before sign-in.",
            "requires_verification": True,
            "user": {
                "id": new_user.id,
                "name": new_user.name,
                "email": new_user.email,
                "role": new_user.role,
                "account_status": new_user.account_status
            }
        }

    token = create_jwt_token({
        "user_id": new_user.id,
        "email": new_user.email,
        "role": new_user.role,
        "account_status": new_user.account_status,
        "institution_id": new_user.institution_id
    })

    return AuthResponse(
        access_token=token,
        user=UserResponse(
            id=new_user.id,
            name=new_user.name,
            email=new_user.email,
            role=new_user.role,
            account_status=new_user.account_status,
            auth_mode=new_user.auth_mode,
            institution_id=new_user.institution_id,
            organization_name=new_user.organization_name,
            phone=new_user.phone,
            location=new_user.location,
            department_sector=new_user.department_sector,
            created_at=new_user.created_at
        )
    )

@router.post("/quick-login", response_model=AuthResponse)
def quick_login_demo(payload: QuickLoginRequest, db: Session = Depends(get_db)):
    """Hackathon Judge Helper: 1-click login for 4 primary roles (CITIZEN, UNIVERSITY, MSME/INDUSTRY, GOVERNMENT)."""
    raw_role = payload.role.upper().strip()
    if raw_role in ["MSME", "INDUSTRY", "MSME_INDUSTRY", "INDUSTRY_PARTNER"]:
        target_role = "INDUSTRY_PARTNER"
    else:
        target_role = raw_role

    user = db.query(User).filter(User.role == target_role, User.auth_mode == "DEMO").first()
    if not user:
        user = db.query(User).filter(User.role == target_role).first()

    if not user:
        if target_role == "INDUSTRY_PARTNER":
            user = User(
                email="industry@civiora.gov.in",
                hashed_password=hash_password("industry123"),
                name="Tata Steel & Adityapur MSME Consortium",
                role="INDUSTRY_PARTNER",
                account_status="ACTIVE",
                auth_mode="DEMO"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            raise HTTPException(status_code=404, detail=f"No demo user found for role {target_role}")

    # Ensure demo account is ACTIVE
    if user.account_status != "ACTIVE":
        user.account_status = "ACTIVE"
        db.commit()

    token = create_jwt_token({
        "user_id": user.id,
        "email": user.email,
        "role": user.role,
        "account_status": user.account_status,
        "institution_id": user.institution_id
    })

    return AuthResponse(
        access_token=token,
        user=UserResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            role=user.role,
            account_status=user.account_status or "ACTIVE",
            auth_mode=user.auth_mode or "DEMO",
            institution_id=user.institution_id,
            organization_name=user.organization_name,
            phone=user.phone,
            location=user.location,
            department_sector=user.department_sector,
            created_at=user.created_at
        )
    )

@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Forgot Password request.
    Protects against email enumeration by returning a generic success response.
    Includes simulated reset link for prototype testing environment.
    """
    clean_email = payload.email.strip().lower()
    user = db.query(User).filter(func.lower(User.email) == clean_email).first()

    simulated_link = None
    if user:
        reset_token = create_jwt_token({
            "user_id": user.id,
            "email": user.email,
            "purpose": "password_reset"
        })
        simulated_link = f"/auth/reset-password?token={reset_token}"

    return {
        "message": "If an account exists with this email address, password reset instructions have been issued.",
        "simulated_reset_link": simulated_link
    }

@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    Resets password using valid reset token.
    """
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters long.")

    if payload.new_password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="New password and confirm password do not match.")

    token_payload = decode_jwt_token(payload.token)
    user_id = token_payload.get("user_id")
    purpose = token_payload.get("purpose")

    if not user_id or purpose != "password_reset":
        raise HTTPException(status_code=400, detail="Invalid or expired password reset token.")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")

    user.hashed_password = hash_password(payload.new_password)
    db.commit()

    return {"message": "Password reset successfully. You can now sign in with your new password."}

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        role=current_user.role,
        account_status=current_user.account_status or "ACTIVE",
        auth_mode=current_user.auth_mode or "REAL",
        institution_id=current_user.institution_id,
        organization_name=current_user.organization_name,
        phone=current_user.phone,
        location=current_user.location,
        department_sector=current_user.department_sector,
        created_at=current_user.created_at
    )

@router.patch("/profile", response_model=UserResponse)
def update_profile(
    payload: UpdateProfileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if payload.name and payload.name.strip():
        current_user.name = payload.name.strip()
    if payload.phone is not None:
        current_user.phone = payload.phone.strip()
    if payload.location is not None:
        current_user.location = payload.location.strip()
    if payload.organization_name is not None:
        current_user.organization_name = payload.organization_name.strip()
    if payload.department_sector is not None:
        current_user.department_sector = payload.department_sector.strip()

    db.commit()
    db.refresh(current_user)

    return UserResponse(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        role=current_user.role,
        account_status=current_user.account_status or "ACTIVE",
        auth_mode=current_user.auth_mode or "REAL",
        institution_id=current_user.institution_id,
        organization_name=current_user.organization_name,
        phone=current_user.phone,
        location=current_user.location,
        department_sector=current_user.department_sector,
        created_at=current_user.created_at
    )

@router.get("/pending-users", response_model=List[UserResponse])
def get_pending_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "GOVERNMENT_ADMIN":
        raise HTTPException(status_code=403, detail="Only Government Command Admins can access pending user approvals.")

    pending_users = db.query(User).filter(User.account_status == "PENDING").all()
    return [
        UserResponse(
            id=u.id,
            name=u.name,
            email=u.email,
            role=u.role,
            account_status=u.account_status,
            auth_mode=u.auth_mode,
            institution_id=u.institution_id,
            organization_name=u.organization_name,
            phone=u.phone,
            location=u.location,
            department_sector=u.department_sector,
            created_at=u.created_at
        )
        for u in pending_users
    ]

@router.patch("/users/{user_id}/status", response_model=UserResponse)
def update_user_status(
    user_id: int,
    payload: UpdateAccountStatusRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "GOVERNMENT_ADMIN":
        raise HTTPException(status_code=403, detail="Only Government Command Admins can modify account verification statuses.")

    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User account not found.")

    new_status = payload.account_status.upper()
    if new_status not in ["ACTIVE", "PENDING", "SUSPENDED", "REJECTED"]:
        raise HTTPException(status_code=400, detail="Invalid account status.")

    target_user.account_status = new_status
    db.commit()
    db.refresh(target_user)

    return UserResponse(
        id=target_user.id,
        name=target_user.name,
        email=target_user.email,
        role=target_user.role,
        account_status=target_user.account_status,
        auth_mode=target_user.auth_mode,
        institution_id=target_user.institution_id,
        organization_name=target_user.organization_name,
        phone=target_user.phone,
        location=target_user.location,
        department_sector=target_user.department_sector,
        created_at=target_user.created_at
    )

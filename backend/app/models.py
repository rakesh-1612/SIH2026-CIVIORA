from sqlalchemy import Column, Integer, String, Float, Text, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="CITIZEN")  # CITIZEN, UNIVERSITY, GOVERNMENT_ADMIN, INDUSTRY_PARTNER, EXPERT
    account_status = Column(String, default="ACTIVE", nullable=False)  # PENDING, ACTIVE, SUSPENDED, REJECTED
    organization_name = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    location = Column(String, nullable=True)
    department_sector = Column(String, nullable=True)
    auth_mode = Column(String, default="REAL", nullable=False)  # REAL, DEMO
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    institution = relationship("Institution", foreign_keys=[institution_id])
    challenges = relationship("Challenge", back_populates="citizen")

class Institution(Base):
    __tablename__ = "institutions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    city = Column(String, nullable=False)
    state = Column(String, nullable=False)
    departments = Column(Text, nullable=False)  # JSON string
    research_expertise = Column(Text, nullable=False)  # JSON string
    technologies = Column(Text, nullable=False)  # JSON string
    capabilities = Column(Text, nullable=False)  # JSON string
    relevant_domains = Column(Text, nullable=False)  # JSON string
    contact_email = Column(String, nullable=False)
    rating = Column(Float, default=4.8)

    matches = relationship("ChallengeMatch", back_populates="institution")
    projects = relationship("Project", back_populates="institution")

class Challenge(Base):
    __tablename__ = "challenges"

    id = Column(String, primary_key=True, index=True)  # e.g., CIV-2026-001
    citizen_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String, nullable=False)
    subcategory = Column(String, nullable=True)
    location = Column(String, nullable=False)
    district = Column(String, nullable=False)
    state = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    location_source = Column(String, default="MANUAL_SELECTION", nullable=True)  # CURRENT_LOCATION or MANUAL_SELECTION
    urgency_level = Column(String, default="MEDIUM")  # LOW, MEDIUM, HIGH, CRITICAL
    submitter_type = Column(String, default="CITIZEN_INDIVIDUAL")  # CITIZEN_INDIVIDUAL, COMMUNITY_GROUP, URBAN_LOCAL_BODY, PANCHAYAT_RAJ
    submitter_org = Column(String, nullable=True)
    media_files = Column(Text, nullable=True)  # JSON string array of media objects
    image_url = Column(String, nullable=True)
    language = Column(String, default="en", nullable=True)
    status = Column(String, default="SUBMITTED")  # SUBMITTED, AI_ANALYZED, UNDER_REVIEW, MATCHED, ACCEPTED, IN_PROGRESS, PROTOTYPE, PILOT_TESTING, DEPLOYED, RESOLVED
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    citizen = relationship("User", back_populates="challenges")
    analysis = relationship("ChallengeAnalysis", back_populates="challenge", uselist=False)
    similarities = relationship("ChallengeSimilarity", foreign_keys="ChallengeSimilarity.challenge_id", back_populates="challenge")
    matches = relationship("ChallengeMatch", back_populates="challenge")
    projects = relationship("Project", back_populates="challenge")
    activities = relationship("ActivityLog", back_populates="challenge")
    likes = relationship("ChallengeLike", back_populates="challenge", cascade="all, delete-orphan")
    reposts = relationship("ChallengeRepost", back_populates="challenge", cascade="all, delete-orphan")
    shares = relationship("ChallengeShare", back_populates="challenge", cascade="all, delete-orphan")
    comments = relationship("ChallengeComment", back_populates="challenge", cascade="all, delete-orphan")

class ChallengeAnalysis(Base):
    __tablename__ = "challenge_analyses"

    id = Column(Integer, primary_key=True, index=True)
    challenge_id = Column(String, ForeignKey("challenges.id"), nullable=False, unique=True)
    predicted_category = Column(String, nullable=False)
    subcategory = Column(String, nullable=False)
    keywords = Column(Text, nullable=False)  # JSON string list
    affected_stakeholders = Column(Text, nullable=False)  # JSON string list
    severity_score = Column(Float, nullable=False)  # 1-10 scale
    urgency_score = Column(Float, nullable=False)   # 1-10 scale
    impact_score = Column(Float, nullable=False)    # 1-10 scale
    recurrence_score = Column(Float, nullable=False) # 1-10 scale
    priority_score = Column(Float, nullable=False)  # 0-100 scale
    priority_level = Column(String, nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    priority_reason = Column(Text, nullable=False)
    suggested_impact_areas = Column(Text, nullable=False)  # JSON string list

    challenge = relationship("Challenge", back_populates="analysis")

class ChallengeSimilarity(Base):
    __tablename__ = "challenge_similarities"

    id = Column(Integer, primary_key=True, index=True)
    challenge_id = Column(String, ForeignKey("challenges.id"), nullable=False)
    similar_challenge_id = Column(String, ForeignKey("challenges.id"), nullable=False)
    similarity_score = Column(Float, nullable=False)
    classification = Column(String, nullable=False)  # Potential Duplicate, Related Challenge, Different Challenge

    challenge = relationship("Challenge", foreign_keys=[challenge_id], back_populates="similarities")
    target_challenge = relationship("Challenge", foreign_keys=[similar_challenge_id])

class ChallengeMatch(Base):
    __tablename__ = "challenge_matches"

    id = Column(Integer, primary_key=True, index=True)
    challenge_id = Column(String, ForeignKey("challenges.id"), nullable=False)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=False)
    match_percentage = Column(Float, nullable=False)
    relevant_expertise = Column(Text, nullable=False)  # JSON string list
    explanation = Column(Text, nullable=False)
    status = Column(String, default="RECOMMENDED")  # RECOMMENDED, ACCEPTED, DECLINED

    challenge = relationship("Challenge", back_populates="matches")
    institution = relationship("Institution", back_populates="matches")

class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, index=True)  # PRJ-2026-001
    project_name = Column(String, nullable=False)
    challenge_id = Column(String, ForeignKey("challenges.id"), nullable=False)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String, default="ACCEPTED")  # MATCHED, ACCEPTED, IN_PROGRESS, PROTOTYPE, PILOT_TESTING, DEPLOYED, RESOLVED
    progress = Column(Float, default=10.0)  # 0-100 %
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    challenge = relationship("Challenge", back_populates="projects")
    institution = relationship("Institution", back_populates="projects")
    milestones = relationship("Milestone", back_populates="project")
    activities = relationship("ActivityLog", back_populates="project")
    comments = relationship("ProjectComment", back_populates="project")
    csr_fundings = relationship("CSRFunding", back_populates="project")
    mentorships = relationship("MentorshipOffer", back_populates="project")
    tech_transfers = relationship("TechTransfer", back_populates="project")
    funding_requests = relationship("FundingRequest", back_populates="project")

class FundingRequest(Base):
    __tablename__ = "funding_requests"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    partner_id = Column(Integer, ForeignKey("industry_partners.id"), nullable=True)

    # Range and justification
    minimum_required = Column(Float, nullable=False, default=10.0)
    maximum_required = Column(Float, nullable=False, default=12.0)
    justification = Column(Text, nullable=True)
    supporting_documents_url = Column(String, nullable=True)

    # Backward-compatible fields
    requested_amount = Column(Float, nullable=False, default=12.0)
    approved_amount = Column(Float, nullable=True)
    purpose = Column(Text, nullable=True, default="")
    description = Column(Text, nullable=True, default="")
    expected_outcome = Column(Text, nullable=True, default="")
    evidence_url = Column(String, nullable=True)

    status = Column(String, default="REQUESTED")  # REQUESTED, PARTIALLY_FUNDED, FULLY_FUNDED, FUNDING_CLOSED, REJECTED, PENDING, APPROVED
    rejection_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("Project", back_populates="funding_requests")
    partner = relationship("IndustryPartner")
    contributions = relationship("FundingContribution", back_populates="funding_request", cascade="all, delete-orphan")

class FundingContribution(Base):
    __tablename__ = "funding_contributions"

    id = Column(Integer, primary_key=True, index=True)
    funding_request_id = Column(Integer, ForeignKey("funding_requests.id"), nullable=False)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    partner_id = Column(Integer, ForeignKey("industry_partners.id"), nullable=False)

    contribution_amount = Column(Float, nullable=False)
    share_percentage = Column(Float, nullable=False)
    status = Column(String, default="APPROVED")
    created_at = Column(DateTime, default=datetime.utcnow)
    approved_at = Column(DateTime, default=datetime.utcnow)

    funding_request = relationship("FundingRequest", back_populates="contributions")
    project = relationship("Project")
    partner = relationship("IndustryPartner")

class Milestone(Base):
    __tablename__ = "milestones"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    due_date = Column(String, nullable=True)
    is_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)

    project = relationship("Project", back_populates="milestones")

class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    challenge_id = Column(String, ForeignKey("challenges.id"), nullable=True)
    project_id = Column(String, ForeignKey("projects.id"), nullable=True)
    action = Column(String, nullable=False)
    performed_by = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

    challenge = relationship("Challenge", back_populates="activities")
    project = relationship("Project", back_populates="activities")

class IndustryPartner(Base):
    __tablename__ = "industry_partners"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    entity_type = Column(String, nullable=False)  # STARTUP, MSME, ENTERPRISE, CSR_FOUNDATION, RESEARCH_HUB
    sector = Column(String, nullable=False)
    contact_email = Column(String, nullable=False)
    website = Column(String, nullable=True)
    csr_budget = Column(Float, default=0.0)  # INR in Lakhs
    focus_domains = Column(Text, nullable=False)  # JSON string list
    mentorship_available = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    csr_fundings = relationship("CSRFunding", back_populates="partner")
    mentorships = relationship("MentorshipOffer", back_populates="partner")
    tech_transfers = relationship("TechTransfer", back_populates="partner")

class CSRFunding(Base):
    __tablename__ = "csr_fundings"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    partner_id = Column(Integer, ForeignKey("industry_partners.id"), nullable=False)
    amount_in_lakhs = Column(Float, nullable=False)
    purpose = Column(Text, nullable=False)
    status = Column(String, default="PROPOSED")  # PROPOSED, APPROVED, DISBURSED
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="csr_fundings")
    partner = relationship("IndustryPartner", back_populates="csr_fundings")

class MentorshipOffer(Base):
    __tablename__ = "mentorship_offers"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    partner_id = Column(Integer, ForeignKey("industry_partners.id"), nullable=False)
    mentor_name = Column(String, nullable=False)
    expertise_domain = Column(String, nullable=False)
    contact_email = Column(String, nullable=False)
    status = Column(String, default="ACTIVE")  # PROPOSED, ACTIVE, COMPLETED
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="mentorships")
    partner = relationship("IndustryPartner", back_populates="mentorships")

class TechTransfer(Base):
    __tablename__ = "tech_transfers"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    partner_id = Column(Integer, ForeignKey("industry_partners.id"), nullable=False)
    ip_type = Column(String, nullable=False)  # PATENT, PROPRIETARY_TECH, OPEN_SOURCE, PILOT_DEPLOYMENT
    licensing_terms = Column(Text, nullable=False)
    status = Column(String, default="UNDER_NEGOTIATION")  # UNDER_NEGOTIATION, AGREEMENT_SIGNED, EXECUTED
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="tech_transfers")
    partner = relationship("IndustryPartner", back_populates="tech_transfers")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    user_role = Column(String, default="ALL", nullable=False)  # CITIZEN, UNIVERSITY, GOVERNMENT_ADMIN, INDUSTRY_PARTNER, ALL
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String, default="SYSTEM", nullable=False)  # CHALLENGE, PROJECT, FUNDING, MESSAGE, MILESTONE, SYSTEM, SOCIAL
    related_entity_type = Column(String, nullable=True)  # CHALLENGE, PROJECT, FUNDING, MESSAGE
    related_entity_id = Column(String, nullable=True)
    link = Column(String, nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")


class ProjectComment(Base):
    __tablename__ = "project_comments"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    author_name = Column(String, nullable=False)
    author_role = Column(String, nullable=False)  # CITIZEN, UNIVERSITY, GOVERNMENT_ADMIN, INDUSTRY_PARTNER
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="comments")

class ChallengeLike(Base):
    __tablename__ = "challenge_likes"
    __table_args__ = (UniqueConstraint('challenge_id', 'user_id', name='_challenge_user_like_uc'),)

    id = Column(Integer, primary_key=True, index=True)
    challenge_id = Column(String, ForeignKey("challenges.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    challenge = relationship("Challenge", back_populates="likes")
    user = relationship("User")

class ChallengeRepost(Base):
    __tablename__ = "challenge_reposts"
    __table_args__ = (UniqueConstraint('challenge_id', 'user_id', name='_challenge_user_repost_uc'),)

    id = Column(Integer, primary_key=True, index=True)
    challenge_id = Column(String, ForeignKey("challenges.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    user_name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    challenge = relationship("Challenge", back_populates="reposts")
    user = relationship("User")

class ChallengeShare(Base):
    __tablename__ = "challenge_shares"
    __table_args__ = (UniqueConstraint('challenge_id', 'user_id', name='_challenge_user_share_uc'),)

    id = Column(Integer, primary_key=True, index=True)
    challenge_id = Column(String, ForeignKey("challenges.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    challenge = relationship("Challenge", back_populates="shares")
    user = relationship("User")

class ChallengeComment(Base):
    __tablename__ = "challenge_comments"

    id = Column(Integer, primary_key=True, index=True)
    challenge_id = Column(String, ForeignKey("challenges.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    author_name = Column(String, nullable=False)
    author_role = Column(String, default="CITIZEN", nullable=False)
    content = Column(Text, nullable=False)
    is_reported = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    challenge = relationship("Challenge", back_populates="comments")
    user = relationship("User")


class ProjectConversation(Base):
    __tablename__ = "project_conversations"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False, unique=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", backref="conversation")
    messages = relationship("ProjectMessage", back_populates="conversation", cascade="all, delete-orphan")
    participants = relationship("ProjectParticipant", back_populates="conversation", cascade="all, delete-orphan")


class ProjectParticipant(Base):
    __tablename__ = "project_participants"
    __table_args__ = (UniqueConstraint('conversation_id', 'user_id', name='_project_user_participant_uc'),)

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("project_conversations.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(String, nullable=False)  # CITIZEN, UNIVERSITY, MSME / INDUSTRY, GOVERNMENT
    joined_at = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("ProjectConversation", back_populates="participants")
    user = relationship("User")


class ProjectMessage(Base):
    __tablename__ = "project_messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("project_conversations.id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Null for SYSTEM messages
    sender_name = Column(String, nullable=False)
    sender_role = Column(String, nullable=False)  # CITIZEN, UNIVERSITY, MSME / INDUSTRY, GOVERNMENT, SYSTEM
    message = Column(Text, nullable=False)
    attachment_url = Column(String, nullable=True)
    is_system_message = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    edited_at = Column(DateTime, nullable=True)

    conversation = relationship("ProjectConversation", back_populates="messages")
    sender = relationship("User")




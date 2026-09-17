from pydantic import BaseModel, Field
from typing import List, Optional, Any
from datetime import datetime

# Challenge Submission Request
class ChallengeCreate(BaseModel):
    title: str = Field(..., example="Severe flooding near Anna Nagar subway")
    description: str = Field(..., example="Subway underpass overflows during heavy rain blocking emergency vehicles.")
    category: Optional[str] = None
    location: str = Field(..., example="Anna Nagar Subway, Chennai")
    district: str = Field(..., example="Chennai")
    state: str = Field(..., example="Tamil Nadu")
    latitude: float = Field(..., example=13.0850)
    longitude: float = Field(..., example=80.2100)
    location_source: Optional[str] = "MANUAL_SELECTION"
    urgency_level: str = Field("MEDIUM", example="HIGH")
    submitter_type: Optional[str] = "CITIZEN_INDIVIDUAL"  # CITIZEN_INDIVIDUAL, COMMUNITY_GROUP, URBAN_LOCAL_BODY, PANCHAYAT_RAJ
    submitter_org: Optional[str] = None
    media_files: Optional[List[dict]] = None
    image_url: Optional[str] = None
    language: Optional[str] = "en"

class ChallengeAnalysisResponse(BaseModel):
    predicted_category: str
    subcategory: str
    keywords: List[str]
    affected_stakeholders: List[str]
    severity_score: float
    urgency_score: float
    impact_score: float
    entity_weight: Optional[float] = 1.0
    recurrence_score: Optional[float] = 0.0
    base_priority_score: Optional[float] = None
    community_boost: Optional[float] = 0.0
    priority_score: float
    priority_level: str
    priority_reason: str
    suggested_impact_areas: List[str]

class SimilarChallengeResponse(BaseModel):
    id: str
    title: str
    category: str
    district: str
    similarity_score: float
    classification: str
    status: str

class InstitutionMatchResponse(BaseModel):
    institution_id: int
    institution_name: str
    city: str
    state: str
    match_percentage: float
    relevant_expertise: List[str]
    explanation: str
    status: Optional[str] = "RECOMMENDED"

class ChallengeCommentResponse(BaseModel):
    id: int
    challenge_id: str
    user_id: int
    author_name: str
    author_role: str
    content: str
    is_reported: bool = False
    created_at: datetime

class ChallengeDetailResponse(BaseModel):
    id: str
    citizen_id: Optional[int] = None
    submitter_name: Optional[str] = "Citizen"
    title: str
    description: str
    category: str
    subcategory: Optional[str]
    location: str
    district: str
    state: str
    latitude: float
    longitude: float
    location_source: Optional[str] = "MANUAL_SELECTION"
    urgency_level: str
    submitter_type: Optional[str] = "CITIZEN_INDIVIDUAL"
    submitter_org: Optional[str] = None
    media_files: Optional[List[dict]] = []
    image_url: Optional[str]
    language: Optional[str] = "en"
    status: str
    created_at: datetime
    analysis: Optional[ChallengeAnalysisResponse] = None
    similar_challenges: List[SimilarChallengeResponse] = []
    recommended_institutions: List[InstitutionMatchResponse] = []
    project_id: Optional[str] = None
    likes_count: int = 0
    reposts_count: int = 0
    shares_count: int = 0
    comments_count: int = 0
    user_liked: bool = False
    user_reposted: bool = False
    user_shared: bool = False
    comments: List[ChallengeCommentResponse] = []

class MilestoneBase(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[str] = None

class MilestoneCreate(MilestoneBase):
    pass

class MilestoneResponse(MilestoneBase):
    id: int
    project_id: str
    is_completed: bool
    completed_at: Optional[datetime] = None

class ProjectCreate(BaseModel):
    challenge_id: str
    institution_id: int

class ProjectCommentCreate(BaseModel):
    author_name: str
    author_role: str
    content: str

class ProjectCommentResponse(BaseModel):
    id: int
    project_id: str
    author_name: str
    author_role: str
    content: str
    created_at: datetime

class CSRFundingCreate(BaseModel):
    partner_id: int
    amount_in_lakhs: float
    purpose: str

class CSRFundingResponse(BaseModel):
    id: int
    project_id: str
    partner_id: int
    partner_name: str
    amount_in_lakhs: float
    purpose: str
    status: str
    created_at: datetime

class MentorshipOfferCreate(BaseModel):
    partner_id: int
    mentor_name: str
    expertise_domain: str
    contact_email: str

class MentorshipOfferResponse(BaseModel):
    id: int
    project_id: str
    partner_id: int
    partner_name: str
    mentor_name: str
    expertise_domain: str
    contact_email: str
    status: str
    created_at: datetime

class TechTransferCreate(BaseModel):
    partner_id: int
    ip_type: str
    licensing_terms: str

class TechTransferResponse(BaseModel):
    id: int
    project_id: str
    partner_id: int
    partner_name: str
    ip_type: str
    licensing_terms: str
    status: str
    created_at: datetime

class FundingContributionCreate(BaseModel):
    funding_request_id: Optional[int] = None
    partner_id: Optional[int] = None
    contribution_amount: Optional[float] = None
    share_percentage: Optional[float] = None

class FundingContributionResponse(BaseModel):
    id: int
    funding_request_id: int
    project_id: str
    partner_id: int
    partner_name: str
    contribution_amount: float
    share_percentage: float
    status: str
    created_at: datetime

class FundingRequestCreate(BaseModel):
    project_id: str
    partner_id: Optional[int] = None
    minimum_required: Optional[float] = None
    maximum_required: Optional[float] = None
    justification: Optional[str] = None
    supporting_documents_url: Optional[str] = None
    # Backward compatibility fields
    requested_amount: Optional[float] = None
    purpose: Optional[str] = None
    description: Optional[str] = None
    expected_outcome: Optional[str] = None
    evidence_url: Optional[str] = None

class FundingRequestApprove(BaseModel):
    approved_amount: Optional[float] = None
    share_percentage: Optional[float] = None

class FundingRequestReject(BaseModel):
    rejection_reason: Optional[str] = None

class FundingRequestResponse(BaseModel):
    id: int
    project_id: str
    partner_id: Optional[int] = None
    minimum_required: float
    maximum_required: float
    justification: str
    supporting_documents_url: Optional[str] = None
    status: str
    rejection_reason: Optional[str] = None
    created_at: datetime
    project_name: Optional[str] = None
    university_name: Optional[str] = None
    challenge_title: Optional[str] = None
    partner_name: Optional[str] = None
    # Backward compatibility fields
    requested_amount: float
    approved_amount: Optional[float] = None
    purpose: Optional[str] = None
    description: Optional[str] = None
    expected_outcome: Optional[str] = None
    evidence_url: Optional[str] = None
    # Aggregated co-funding fields
    total_committed: float = 0.0
    remaining_min: float = 0.0
    remaining_max: float = 0.0
    total_share_percentage: float = 0.0
    partners_count: int = 0
    contributions: List[FundingContributionResponse] = []

class ProjectResponse(BaseModel):
    id: str
    project_name: str
    challenge_id: str
    challenge_title: str
    challenge_category: Optional[str] = None
    challenge_location: Optional[str] = None
    challenge_district: Optional[str] = None
    challenge_state: Optional[str] = None
    institution_id: int
    institution_name: str
    description: str
    status: str
    progress: float
    created_at: datetime
    updated_at: datetime
    milestones: List[MilestoneResponse] = []
    comments: List[ProjectCommentResponse] = []
    csr_fundings: List[CSRFundingResponse] = []
    mentorships: List[MentorshipOfferResponse] = []
    tech_transfers: List[TechTransferResponse] = []
    funding_requests: List[FundingRequestResponse] = []

class ProjectStatusUpdate(BaseModel):
    status: str

class AcceptChallengeRequest(BaseModel):
    institution_id: Optional[int] = None

class IndustryPartnerCreate(BaseModel):
    name: str
    entity_type: str  # STARTUP, MSME, ENTERPRISE, CSR_FOUNDATION, RESEARCH_HUB
    sector: str
    contact_email: str
    website: Optional[str] = None
    csr_budget: float = 0.0
    focus_domains: List[str]
    mentorship_available: bool = True

class IndustryPartnerResponse(BaseModel):
    id: int
    name: str
    entity_type: str
    sector: str
    contact_email: str
    website: Optional[str]
    csr_budget: float
    focus_domains: List[str]
    mentorship_available: bool
    created_at: datetime

class NotificationResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    user_role: str
    title: str
    message: str
    type: str = "SYSTEM"
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[str] = None
    link: Optional[str] = None
    is_read: bool
    created_at: datetime

class UnreadCountResponse(BaseModel):
    unread_count: int


class InstitutionResponse(BaseModel):
    id: int
    name: str
    city: str
    state: str
    departments: List[str]
    research_expertise: List[str]
    technologies: List[str]
    capabilities: List[str]
    relevant_domains: List[str]
    contact_email: str
    rating: float

class ActivityLogResponse(BaseModel):
    id: int
    challenge_id: Optional[str]
    project_id: Optional[str]
    action: str
    performed_by: str
    timestamp: datetime

class DashboardMetricsResponse(BaseModel):
    total_challenges: int
    new_challenges: int
    active_projects: int = 0
    high_critical_challenges: int
    in_progress_projects: int
    resolved_challenges: int
    projects_at_risk_count: int = 0
    total_funding_committed: float = 0.0
    avg_project_progress: float
    lifecycle_counts: dict = {}
    lifecycle_stages: dict = {}
    institution_performance: List[dict] = []
    projects_requiring_attention: List[dict] = []
    funding_overview: dict = {}
    project_funding_analytics: List[dict] = []
    category_distribution: List[dict]
    priority_distribution: List[dict]
    status_distribution: List[dict]
    district_distribution: List[dict]
    institution_participation: List[dict]
    recent_activities: List[ActivityLogResponse]
    social_engagement_overview: Optional[dict] = {}
    most_reposted_challenges: Optional[List[dict]] = []
    highest_community_boost: Optional[List[dict]] = []

class HotspotResponse(BaseModel):
    id: str
    name: str
    center_lat: float
    center_lng: float
    challenge_count: int
    high_priority_count: int
    district: str
    primary_category: str
    challenges: List[dict]

class PublicOverviewResponse(BaseModel):
    total_challenges: int
    high_critical_challenges: int
    in_progress_projects: int
    resolved_challenges: int

class SocialCommentCreate(BaseModel):
    content: str

class UserActivityResponse(BaseModel):
    my_challenges: List[ChallengeDetailResponse] = []
    liked_challenges: List[ChallengeDetailResponse] = []
    reposted_challenges: List[ChallengeDetailResponse] = []
    my_comments: List[dict] = []


class CiviConnectParticipantResponse(BaseModel):
    user_id: int
    name: str
    role: str
    joined_at: datetime

class CiviConnectMessageCreate(BaseModel):
    message: str
    attachment_url: Optional[str] = None

class CiviConnectMessageResponse(BaseModel):
    id: int
    conversation_id: int
    sender_id: Optional[int] = None
    sender_name: str
    sender_role: str
    message: str
    attachment_url: Optional[str] = None
    is_system_message: bool = False
    created_at: datetime
    edited_at: Optional[datetime] = None

class CiviConnectConversationResponse(BaseModel):
    id: int
    project_id: str
    project_name: str
    challenge_title: str
    created_at: datetime
    participants: List[CiviConnectParticipantResponse] = []
    active_participant_count: int = 0





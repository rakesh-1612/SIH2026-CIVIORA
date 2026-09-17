const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
export const API_BASE_URL = rawApiUrl.endsWith("/api") ? rawApiUrl : `${rawApiUrl.replace(/\/$/, "")}/api`;
export const BACKEND_SERVER_URL = rawApiUrl.replace(/\/api\/?$/, "");

export interface ChallengeAnalysis {
  predicted_category: string;
  subcategory: string;
  keywords: string[];
  affected_stakeholders: string[];
  severity_score: number;
  urgency_score: number;
  impact_score: number;
  entity_weight?: number;
  recurrence_score?: number;
  base_priority_score?: number;
  community_boost?: number;
  priority_score: number;
  priority_level: string;
  priority_reason: string;
  suggested_impact_areas: string[];
}

export interface ChallengeCommentItem {
  id: number;
  challenge_id: string;
  user_id: number;
  author_name: string;
  author_role: string;
  content: string;
  is_reported?: boolean;
  created_at: string;
}

export interface SimilarChallenge {
  id: string;
  title: string;
  category: string;
  district: string;
  similarity_score: number;
  classification: string;
  status: string;
}

export interface InstitutionMatch {
  institution_id: number;
  institution_name: string;
  city: string;
  state: string;
  match_percentage: number;
  relevant_expertise: string[];
  explanation: string;
  status?: string;
}

export interface ChallengeDetail {
  id: string;
  citizen_id?: number;
  submitter_name?: string;
  title: string;
  description: string;
  category: string;
  subcategory: string;
  location: string;
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  location_source?: "CURRENT_LOCATION" | "MANUAL_SELECTION";
  urgency_level: string;
  submitter_type?: string;
  submitter_org?: string;
  media_files?: { name: string; type: string; url: string }[];
  image_url?: string;
  language?: string;
  status: string;
  created_at: string;
  analysis?: ChallengeAnalysis;
  similar_challenges: SimilarChallenge[];
  recommended_institutions: InstitutionMatch[];
  project_id?: string;
  likes_count?: number;
  reposts_count?: number;
  shares_count?: number;
  comments_count?: number;
  user_liked?: boolean;
  user_reposted?: boolean;
  user_shared?: boolean;
  comments?: ChallengeCommentItem[];
}

export interface UserActivityData {
  my_challenges: ChallengeDetail[];
  liked_challenges: ChallengeDetail[];
  reposted_challenges: ChallengeDetail[];
  my_comments: { id: number; challenge_id: string; challenge_title: string; content: string; created_at: string }[];
}

export interface ChallengeCreatePayload {
  title: string;
  description: string;
  category?: string;
  location: string;
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  location_source?: "CURRENT_LOCATION" | "MANUAL_SELECTION";
  urgency_level: string;
  submitter_type?: string;
  submitter_org?: string;
  media_files?: { name: string; type: string; url: string }[];
  image_url?: string;
  language?: string;
}

export interface Institution {
  id: number;
  name: string;
  city: string;
  state: string;
  departments: string[];
  research_expertise: string[];
  technologies: string[];
  capabilities: string[];
  relevant_domains: string[];
  contact_email: string;
  rating: number;
}

export interface Milestone {
  id: number;
  project_id: string;
  title: string;
  description?: string;
  due_date?: string;
  is_completed: boolean;
  completed_at?: string;
}

export interface ProjectComment {
  id: number;
  project_id: string;
  author_name: string;
  author_role: string;
  content: string;
  created_at: string;
}

export interface CSRFunding {
  id: number;
  project_id: string;
  partner_id: number;
  partner_name: string;
  amount_in_lakhs: number;
  purpose: string;
  status: string;
  created_at: string;
}

export interface MentorshipOffer {
  id: number;
  project_id: string;
  partner_id: number;
  partner_name: string;
  mentor_name: string;
  expertise_domain: string;
  contact_email: string;
  status: string;
  created_at: string;
}

export interface TechTransfer {
  id: number;
  project_id: string;
  partner_id: number;
  partner_name: string;
  ip_type: string;
  licensing_terms: string;
  status: string;
  created_at: string;
}

export interface FundingContributionItem {
  id: number;
  funding_request_id: number;
  project_id: string;
  partner_id: number;
  partner_name: string;
  contribution_amount: number;
  share_percentage: number;
  status: string;
  created_at: string;
}

export interface FundingRequestItem {
  id: number;
  project_id: string;
  partner_id?: number | null;
  minimum_required?: number;
  maximum_required?: number;
  justification?: string;
  supporting_documents_url?: string | null;
  requested_amount: number;
  approved_amount?: number | null;
  purpose: string;
  description: string;
  expected_outcome: string;
  evidence_url?: string | null;
  status: string;
  rejection_reason?: string | null;
  created_at: string;
  project_name?: string;
  university_name?: string;
  challenge_title?: string;
  partner_name?: string;
  total_committed?: number;
  remaining_min?: number;
  remaining_max?: number;
  total_share_percentage?: number;
  partners_count?: number;
  contributions?: FundingContributionItem[];
}

export interface Project {
  id: string;
  project_name: string;
  challenge_id: string;
  challenge_title: string;
  challenge_category?: string;
  challenge_location?: string;
  challenge_district?: string;
  challenge_state?: string;
  institution_id: number;
  institution_name: string;
  description: string;
  status: string;
  progress: number;
  created_at: string;
  updated_at: string;
  milestones: Milestone[];
  comments?: ProjectComment[];
  csr_fundings?: CSRFunding[];
  mentorships?: MentorshipOffer[];
  tech_transfers?: TechTransfer[];
  funding_requests?: FundingRequestItem[];
}

export interface IndustryPartner {
  id: number;
  name: string;
  entity_type: string;
  sector: string;
  contact_email: string;
  website?: string;
  csr_budget: number;
  focus_domains: string[];
  mentorship_available: boolean;
  created_at: string;
}

export interface NotificationItem {
  id: number;
  user_id?: number | null;
  user_role: string;
  title: string;
  message: string;
  type: string;
  related_entity_type?: string | null;
  related_entity_id?: string | null;
  link?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface InstitutionPerformanceItem {
  institution_id: number;
  institution_name: string;
  city: string;
  state: string;
  rating: number;
  contact_email: string;
  departments: string[];
  research_expertise: string[];
  total_projects: number;
  in_progress: number;
  pilot: number;
  deployed: number;
  resolved: number;
  avg_progress: number;
}

export interface ProjectAttentionItem {
  project_id: string;
  project_name: string;
  challenge_id: string;
  challenge_title: string;
  institution_id: number;
  institution_name: string;
  district: string;
  priority: string;
  status: string;
  progress: number;
  reasons: string[];
  reason_summary: string;
}

export interface FundingPartnerItem {
  partner_id: number;
  partner_name: string;
  contribution_amount: number;
  share_percentage: number;
  status: string;
}

export interface ProjectFundingAnalyticItem {
  funding_request_id: number;
  project_id: string;
  project_name: string;
  university_name: string;
  minimum_required: number;
  maximum_required: number;
  committed_amount: number;
  remaining_amount: number;
  status: string;
  partners: FundingPartnerItem[];
}

export interface DashboardMetrics {
  total_challenges: number;
  new_challenges: number;
  active_projects: number;
  high_critical_challenges: number;
  in_progress_projects: number;
  resolved_challenges: number;
  projects_at_risk_count: number;
  total_funding_committed: number;
  avg_project_progress: number;
  lifecycle_counts: Record<string, number>;
  lifecycle_stages: Record<string, number>;
  institution_performance: InstitutionPerformanceItem[];
  projects_requiring_attention: ProjectAttentionItem[];
  funding_overview: {
    total_funding_requested: number;
    total_funding_committed: number;
    fully_funded_projects: number;
    partially_funded_projects: number;
    total_requested?: number;
    total_committed?: number;
  };
  project_funding_analytics: ProjectFundingAnalyticItem[];
  category_distribution: { category: string; count: number }[];
  priority_distribution: { level: string; count: number }[];
  status_distribution: { status: string; count: number }[];
  district_distribution: { district: string; count: number }[];
  institution_participation: { institution: string; projects_count: number }[];
  recent_activities: {
    id: number;
    challenge_id?: string;
    project_id?: string;
    action: string;
    performed_by: string;
    timestamp: string;
  }[];
  social_engagement_overview?: {
    total_likes: number;
    total_reposts: number;
    total_shares: number;
    total_comments: number;
  };
  most_reposted_challenges?: unknown[];
}


export interface Hotspot {
  id: string;
  name: string;
  center_lat: number;
  center_lng: number;
  challenge_count: number;
  high_priority_count: number;
  district: string;
  primary_category: string;
  challenges: {
    id: string;
    title: string;
    latitude: number;
    longitude: number;
    priority: string;
    status: string;
  }[];
}

function getAuthHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { ...customHeaders };
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("civiora_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return headers;
}

// Fetch helper with retry for network resilience & dev reload recovery
async function fetchWithRetry(url: string, options?: RequestInit, retries = 3, delayMs = 400): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      return res;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return fetch(url, options);
}

// API Helper Functions
export async function submitChallenge(payload: ChallengeCreatePayload): Promise<ChallengeDetail> {
  const res = await fetchWithRetry(`${API_BASE_URL}/challenges`, {
    method: "POST",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "Failed to submit challenge");
  }
  return res.json();
}

export async function getChallenges(params?: {
  category?: string;
  priority?: string;
  status?: string;
  search?: string;
  citizen_id?: number;
}): Promise<ChallengeDetail[]> {
  const query = new URLSearchParams();
  if (params?.category) query.append("category", params.category);
  if (params?.priority) query.append("priority", params.priority);
  if (params?.status) query.append("status", params.status);
  if (params?.search) query.append("search", params.search);
  if (params?.citizen_id) query.append("citizen_id", params.citizen_id.toString());

  const res = await fetchWithRetry(`${API_BASE_URL}/challenges?${query.toString()}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error("Failed to fetch challenges");
  return res.json();
}

export async function getChallengeById(id: string): Promise<ChallengeDetail> {
  const res = await fetchWithRetry(`${API_BASE_URL}/challenges/${id}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error("Failed to fetch challenge detail");
  return res.json();
}

export async function getInstitutions(): Promise<Institution[]> {
  const res = await fetchWithRetry(`${API_BASE_URL}/institutions`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error("Failed to fetch institutions");
  return res.json();
}

export async function getRecommendedChallenges(institutionId: number): Promise<ChallengeDetail[]> {
  const res = await fetchWithRetry(`${API_BASE_URL}/institutions/${institutionId}/recommended`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "Failed to fetch recommended challenges");
  }
  return res.json();
}

export async function acceptChallenge(challengeId: string, institutionId?: number): Promise<Project> {
  const res = await fetchWithRetry(`${API_BASE_URL}/challenges/${challengeId}/accept`, {
    method: "POST",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(institutionId ? { institution_id: institutionId } : {})
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "Failed to accept challenge");
  }
  return res.json();
}

export async function declineChallenge(challengeId: string): Promise<{ message: string; status: string }> {
  const res = await fetchWithRetry(`${API_BASE_URL}/challenges/${challengeId}/decline`, {
    method: "POST",
    headers: getAuthHeaders({ "Content-Type": "application/json" })
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "Failed to decline challenge");
  }
  return res.json();
}

export async function getProjects(): Promise<Project[]> {
  const res = await fetchWithRetry(`${API_BASE_URL}/projects`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error("Failed to fetch projects");
  return res.json();
}

export async function getProjectById(id: string): Promise<Project> {
  const res = await fetchWithRetry(`${API_BASE_URL}/projects/${id}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error("Failed to fetch project detail");
  return res.json();
}

export async function updateProjectStatus(id: string, status: string): Promise<Project> {
  const res = await fetchWithRetry(`${API_BASE_URL}/projects/${id}/status`, {
    method: "PATCH",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ status })
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "Failed to update project status");
  }
  return res.json();
}

export async function addMilestone(projectId: string, title: string, description?: string): Promise<Milestone> {
  const res = await fetchWithRetry(`${API_BASE_URL}/projects/${projectId}/milestones`, {
    method: "POST",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ title, description })
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "Failed to add milestone");
  }
  return res.json();
}

export async function toggleMilestone(milestoneId: number): Promise<Milestone> {
  const res = await fetchWithRetry(`${API_BASE_URL}/milestones/${milestoneId}/toggle`, {
    method: "PATCH",
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "Failed to toggle milestone");
  }
  return res.json();
}

// Project Discussion Comments
export async function addProjectComment(projectId: string, authorName: string, authorRole: string, content: string): Promise<ProjectComment> {
  const res = await fetchWithRetry(`${API_BASE_URL}/projects/${projectId}/comments`, {
    method: "POST",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ author_name: authorName, author_role: authorRole, content })
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "Failed to add comment");
  }
  return res.json();
}

// Industry & CSR APIs
export async function getIndustryPartners(): Promise<IndustryPartner[]> {
  const res = await fetchWithRetry(`${API_BASE_URL}/industry/partners`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error("Failed to fetch industry partners");
  return res.json();
}

export async function addCSRFunding(projectId: string, partnerId: number, amountInLakhs: number, purpose: string): Promise<CSRFunding> {
  const res = await fetchWithRetry(`${API_BASE_URL}/projects/${projectId}/csr-funding`, {
    method: "POST",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ partner_id: partnerId, amount_in_lakhs: amountInLakhs, purpose })
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "Failed to submit CSR funding offer");
  }
  return res.json();
}

export async function addMentorshipOffer(projectId: string, partnerId: number, mentorName: string, expertiseDomain: string, contactEmail: string): Promise<MentorshipOffer> {
  const res = await fetchWithRetry(`${API_BASE_URL}/projects/${projectId}/mentorship`, {
    method: "POST",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ partner_id: partnerId, mentor_name: mentorName, expertise_domain: expertiseDomain, contact_email: contactEmail })
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "Failed to submit mentorship offer");
  }
  return res.json();
}

export async function addTechTransfer(projectId: string, partnerId: number, ipType: string, licensingTerms: string): Promise<TechTransfer> {
  const res = await fetchWithRetry(`${API_BASE_URL}/projects/${projectId}/tech-transfer`, {
    method: "POST",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ partner_id: partnerId, ip_type: ipType, licensing_terms: licensingTerms })
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "Failed to submit tech transfer proposal");
  }
  return res.json();
}

// Notifications APIs
export async function getNotifications(params?: {
  role?: string;
  type?: string;
  is_read?: boolean;
} | string): Promise<NotificationItem[]> {
  let query = "";
  if (typeof params === "string") {
    query = params ? `?role=${params}` : "";
  } else if (params) {
    const searchParams = new URLSearchParams();
    if (params.role) searchParams.append("role", params.role);
    if (params.type) searchParams.append("type", params.type);
    if (params.is_read !== undefined) searchParams.append("is_read", params.is_read.toString());
    query = `?${searchParams.toString()}`;
  }

  const res = await fetchWithRetry(`${API_BASE_URL}/notifications${query}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error("Failed to fetch notifications");
  return res.json();
}

export async function getUnreadCount(role?: string): Promise<number> {
  const query = role ? `?role=${role}` : "";
  const res = await fetchWithRetry(`${API_BASE_URL}/notifications/unread-count${query}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) return 0;
  const data = await res.json();
  return data.unread_count || 0;
}

export async function markNotificationRead(id: number): Promise<NotificationItem> {
  const res = await fetchWithRetry(`${API_BASE_URL}/notifications/${id}/read`, {
    method: "PATCH",
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error("Failed to mark notification read");
  return res.json();
}

export async function markAllNotificationsRead(role?: string): Promise<void> {
  const query = role ? `?role=${role}` : "";
  await fetchWithRetry(`${API_BASE_URL}/notifications/mark-all-read${query}`, {
    method: "POST",
    headers: getAuthHeaders()
  });
}

export interface PublicOverview {
  total_challenges: number;
  high_critical_challenges: number;
  in_progress_projects: number;
  resolved_challenges: number;
}

export async function getPublicOverview(): Promise<PublicOverview> {
  const res = await fetchWithRetry(`${API_BASE_URL}/overview`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "Failed to fetch public overview");
  }
  return res.json();
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const res = await fetchWithRetry(`${API_BASE_URL}/analytics/dashboard`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "Failed to fetch dashboard metrics");
  }
  return res.json();
}

export async function getHotspots(): Promise<Hotspot[]> {
  const res = await fetchWithRetry(`${API_BASE_URL}/analytics/hotspots`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "Failed to fetch spatial hotspots");
  }
  return res.json();
}

export async function uploadEvidenceFile(file: File): Promise<{ name: string; type: string; url: string }> {
  const token = typeof window !== "undefined" ? localStorage.getItem("civiora_token") : null;
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetchWithRetry(`${API_BASE_URL}/upload`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "Failed to upload evidence file");
  }
  return res.json();
}

export async function clearAllChallenges(): Promise<{ message: string }> {
  const res = await fetchWithRetry(`${API_BASE_URL}/challenges/clear-all`, {
    method: "DELETE",
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "Failed to clear challenges");
  }
  return res.json();
}

export async function createFundingRequest(data: {
  project_id: string;
  partner_id?: number | null;
  minimum_required?: number;
  maximum_required?: number;
  justification?: string;
  supporting_documents_url?: string;
  requested_amount?: number;
  purpose?: string;
  description?: string;
  expected_outcome?: string;
  evidence_url?: string;
}): Promise<FundingRequestItem> {
  const res = await fetchWithRetry(`${API_BASE_URL}/funding-requests`, {
    method: "POST",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "Failed to submit funding request");
  }
  return res.json();
}

export async function addFundingContribution(id: number, data: {
  contribution_amount?: number;
  share_percentage?: number;
  partner_id?: number;
}): Promise<FundingRequestItem> {
  const res = await fetchWithRetry(`${API_BASE_URL}/funding-requests/${id}/contribute`, {
    method: "POST",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "Failed to record funding contribution");
  }
  return res.json();
}

export async function getFundingRequests(params?: {
  project_id?: string;
  partner_id?: number;
  status?: string;
}): Promise<FundingRequestItem[]> {
  const query = new URLSearchParams();
  if (params?.project_id) query.append("project_id", params.project_id);
  if (params?.partner_id) query.append("partner_id", params.partner_id.toString());
  if (params?.status) query.append("status", params.status);

  const res = await fetchWithRetry(`${API_BASE_URL}/funding-requests?${query.toString()}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "Failed to fetch funding requests");
  }
  return res.json();
}

export async function getFundingRequestById(id: number): Promise<FundingRequestItem> {
  const res = await fetchWithRetry(`${API_BASE_URL}/funding-requests/${id}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "Failed to fetch funding request detail");
  }
  return res.json();
}

export async function approveFundingRequest(id: number, approved_amount?: number, share_percentage?: number): Promise<FundingRequestItem> {
  const res = await fetchWithRetry(`${API_BASE_URL}/funding-requests/${id}/approve`, {
    method: "PATCH",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ approved_amount, share_percentage })
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "Failed to approve funding request");
  }
  return res.json();
}

export async function rejectFundingRequest(id: number, rejection_reason?: string): Promise<FundingRequestItem> {
  const res = await fetchWithRetry(`${API_BASE_URL}/funding-requests/${id}/reject`, {
    method: "PATCH",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ rejection_reason })
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "Failed to reject funding request");
  }
  return res.json();
}

// ----------------------------------------------------------------------
// CIVIC SOCIAL FEED & ENGAGEMENT API ENDPOINTS
// ----------------------------------------------------------------------

export async function getCivicFeed(params?: {
  tab?: "for_you" | "trending" | "nearby" | "recent";
  latitude?: number;
  longitude?: number;
  category?: string;
  search?: string;
  district?: string;
}): Promise<ChallengeDetail[]> {
  const query = new URLSearchParams();
  if (params?.tab) query.append("tab", params.tab);
  if (params?.latitude !== undefined) query.append("latitude", params.latitude.toString());
  if (params?.longitude !== undefined) query.append("longitude", params.longitude.toString());
  if (params?.category) query.append("category", params.category);
  if (params?.search) query.append("search", params.search);
  if (params?.district) query.append("district", params.district);

  const res = await fetchWithRetry(`${API_BASE_URL}/challenges/feed?${query.toString()}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "Failed to fetch civic feed");
  }
  return res.json();
}

export async function getUserActivity(): Promise<UserActivityData> {
  const res = await fetchWithRetry(`${API_BASE_URL}/challenges/my-activity`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "Failed to fetch user activity");
  }
  return res.json();
}

export async function toggleLikeChallenge(id: string): Promise<{
  user_liked: boolean;
  likes_count: number;
  base_priority: number;
  community_boost: number;
  priority_score: number;
  priority_level: string;
}> {
  const res = await fetchWithRetry(`${API_BASE_URL}/challenges/${id}/like`, {
    method: "POST",
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "Failed to like challenge");
  }
  return res.json();
}

export async function repostChallenge(id: string): Promise<{
  user_reposted: boolean;
  reposts_count: number;
  base_priority?: number;
  community_boost?: number;
  priority_score?: number;
  message?: string;
}> {
  const res = await fetchWithRetry(`${API_BASE_URL}/challenges/${id}/repost`, {
    method: "POST",
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "Failed to repost challenge");
  }
  return res.json();
}

export async function undoRepostChallenge(id: string): Promise<{
  user_reposted: boolean;
  reposts_count: number;
  base_priority?: number;
  community_boost?: number;
  priority_score?: number;
}> {
  const res = await fetchWithRetry(`${API_BASE_URL}/challenges/${id}/repost`, {
    method: "DELETE",
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "Failed to undo repost");
  }
  return res.json();
}

export async function recordShareChallenge(id: string): Promise<{
  user_shared: boolean;
  shares_count: number;
  community_boost: number;
  priority_score: number;
}> {
  const res = await fetchWithRetry(`${API_BASE_URL}/challenges/${id}/share`, {
    method: "POST",
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "Failed to record share action");
  }
  return res.json();
}

export async function getChallengeComments(id: string): Promise<ChallengeCommentItem[]> {
  const res = await fetchWithRetry(`${API_BASE_URL}/challenges/${id}/comments`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "Failed to fetch challenge comments");
  }
  return res.json();
}

export async function addChallengeComment(id: string, content: string): Promise<ChallengeCommentItem> {
  const res = await fetchWithRetry(`${API_BASE_URL}/challenges/${id}/comments`, {
    method: "POST",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ content })
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "Failed to add comment");
  }
  return res.json();
}

export async function deleteChallengeComment(id: string, commentId: number): Promise<{ message: string }> {
  const res = await fetchWithRetry(`${API_BASE_URL}/challenges/${id}/comments/${commentId}`, {
    method: "DELETE",
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "Failed to delete comment");
  }
  return res.json();
}

export async function reportChallengeComment(id: string, commentId: number): Promise<{ message: string }> {
  const res = await fetchWithRetry(`${API_BASE_URL}/challenges/${id}/comments/${commentId}/report`, {
    method: "POST",
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "Failed to report comment");
  }
  return res.json();
}

// ----------------------------------------------------------------------
// CIVI-CONNECT UNIFIED PROJECT COLLABORATION API HELPER FUNCTIONS
// ----------------------------------------------------------------------

export interface CiviConnectParticipant {
  user_id: number;
  name: string;
  role: string;
  joined_at: string;
}

export interface CiviConnectMessage {
  id: number;
  conversation_id: number;
  sender_id?: number | null;
  sender_name: string;
  sender_role: string;
  message: string;
  attachment_url?: string | null;
  is_system_message: boolean;
  created_at: string;
  edited_at?: string | null;
}

export interface CiviConnectRoom {
  id: number;
  project_id: string;
  project_name: string;
  challenge_title: string;
  created_at: string;
  participants: CiviConnectParticipant[];
  active_participant_count: number;
}

export async function getCiviConnectRoom(projectId: string): Promise<CiviConnectRoom> {
  const res = await fetchWithRetry(`${API_BASE_URL}/projects/${projectId}/civi-connect`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "Failed to fetch CIVI-CONNECT collaboration room");
  }
  return res.json();
}

export async function getCiviConnectMessages(projectId: string): Promise<CiviConnectMessage[]> {
  const res = await fetchWithRetry(`${API_BASE_URL}/projects/${projectId}/civi-connect/messages`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "Failed to fetch CIVI-CONNECT messages");
  }
  return res.json();
}

export async function sendCiviConnectMessage(
  projectId: string,
  message: string,
  attachment_url?: string
): Promise<CiviConnectMessage> {
  const res = await fetchWithRetry(`${API_BASE_URL}/projects/${projectId}/civi-connect/messages`, {
    method: "POST",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ message, attachment_url })
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "Failed to send CIVI-CONNECT message");
  }
  return res.json();
}

// ----------------------------------------------------------------------
// ACCOUNT VERIFICATION & ADMIN MANAGEMENT API HELPERS
// ----------------------------------------------------------------------

export async function getPendingUsers(): Promise<unknown[]> {
  const res = await fetchWithRetry(`${API_BASE_URL}/auth/pending-users`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "Failed to fetch pending user accounts");
  }
  return res.json();
}

export async function updateUserStatus(userId: number, account_status: string): Promise<unknown> {
  const res = await fetchWithRetry(`${API_BASE_URL}/auth/users/${userId}/status`, {
    method: "PATCH",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ account_status })
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "Failed to update account status");
  }
  return res.json();
}





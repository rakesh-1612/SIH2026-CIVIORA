"use client";

import { useEffect, useState, useCallback, Suspense, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Kanban, CheckSquare, Square, Plus, CheckCircle2, MessageSquare,
  DollarSign, Send, Clock, X, FileText, AlertCircle, Upload,
  Building2, MapPin, Tag, ShieldCheck, Eye, XCircle
} from "lucide-react";
import {
  getProjects, updateProjectStatus, toggleMilestone, addMilestone,
  addProjectComment, getIndustryPartners, createFundingRequest,
  approveFundingRequest, rejectFundingRequest, uploadEvidenceFile,
  Project, IndustryPartner, FundingRequestItem
} from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { FadeIn } from "@/components/animations/MotionWrapper";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/lib/auth";
import ProtectedRoute from "@/components/ProtectedRoute";
import { CiviConnectChat } from "@/components/CiviConnectChat";

import { useSearchParams } from "next/navigation";

const LIFECYCLE_STAGES = [
  "SUBMITTED",
  "AI_ANALYZED",
  "UNDER_REVIEW",
  "MATCHED",
  "ACCEPTED",
  "IN_PROGRESS",
  "PROTOTYPE",
  "PILOT_TESTING",
  "DEPLOYED",
  "RESOLVED"
];

export default function SolutionProjectsPage() {
  return (
    <ProtectedRoute allowedRoles={["UNIVERSITY", "GOVERNMENT_ADMIN", "CITIZEN", "INDUSTRY_PARTNER"]}>
      <Suspense fallback={<div className="p-8 text-center text-slate-500 font-medium">Loading monitoring projects...</div>}>
        <SolutionProjectsContent />
      </Suspense>
    </ProtectedRoute>
  );
}

function SolutionProjectsContent() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  
  const paramProject = searchParams.get("project");
  const paramStage = searchParams.get("stage");
  const paramDistrict = searchParams.get("district");
  const paramInstitution = searchParams.get("institution");

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [searchQuery, setSearchQuery] = useState(paramDistrict || paramInstitution || "");
  const [selectedStage, setSelectedStage] = useState(paramStage ? paramStage.toUpperCase() : "ALL");

  // New milestone form state
  const [newTitle, setNewTitle] = useState("");
  const [addingMs, setAddingMs] = useState(false);

  // Comment thread state
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  // Funding Request Modal State (University -> Industry)
  const [fundingModalOpen, setFundingModalOpen] = useState(false);
  const [partnersList, setPartnersList] = useState<IndustryPartner[]>([]);
  const [reqPartnerId, setReqPartnerId] = useState<number | undefined>(undefined);
  const [reqMinAmountStr, setReqMinAmountStr] = useState<string>("10");
  const [reqMaxAmountStr, setReqMaxAmountStr] = useState<string>("12");
  const [reqJustification, setReqJustification] = useState<string>("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [submittingFundingReq, setSubmittingFundingReq] = useState(false);

  // MSME Funding Review Modal State (Industry -> Approve/Reject)
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [targetReq, setTargetReq] = useState<FundingRequestItem | null>(null);
  const [confirmApproveAmountStr, setConfirmApproveAmountStr] = useState<string>("10.0");
  const [rejectionReasonText, setRejectionReasonText] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const canEditProject = user?.role === "UNIVERSITY";
  const isGovUser = user?.role === "GOVERNMENT_ADMIN";
  const isMsmeUser = user?.role === "INDUSTRY_PARTNER";

  useEffect(() => {
    async function loadPartners() {
      try {
        const pts = await getIndustryPartners();
        setPartnersList(pts);
        if (pts.length > 0) setReqPartnerId(pts[0].id);
      } catch (err) {
        console.error(err);
      }
    }
    loadPartners();
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      let data = await getProjects();
      if (user?.role === "UNIVERSITY" && user.institution_id) {
        data = data.filter((p) => p.institution_id === user.institution_id);
      }
      setProjects(data);
      if (data.length > 0) {
        if (paramProject) {
          const match = data.find((p) => p.id === paramProject);
          if (match) setSelectedProject(match);
          else setSelectedProject(data[0]);
        } else if (paramStage) {
          const match = data.find((p) => (p.status || "").toUpperCase() === paramStage.toUpperCase());
          if (match) setSelectedProject(match);
          else setSelectedProject(data[0]);
        } else {
          setSelectedProject((prev) => (prev ? data.find((p) => p.id === prev.id) || data[0] : data[0]));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user, paramProject, paramStage]);

  useEffect(() => {
    queueMicrotask(() => {
      fetchProjects();
    });
  }, [fetchProjects]);

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedProject || !canEditProject) return;
    try {
      await updateProjectStatus(selectedProject.id, newStatus);
      showToast(`Lifecycle status updated to ${newStatus}`, "success");
      await fetchProjects();
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Unable to update project status";
      showToast(msg, "error");
    }
  };

  const handleToggleMs = async (msId: number) => {
    if (!canEditProject) return;
    try {
      await toggleMilestone(msId);
      await fetchProjects();
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Unable to toggle milestone";
      showToast(msg, "error");
    }
  };

  const handleAddMsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !newTitle.trim() || !canEditProject) return;
    try {
      setAddingMs(true);
      await addMilestone(selectedProject.id, newTitle.trim());
      setNewTitle("");
      showToast("New milestone added", "success");
      await fetchProjects();
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Failed to add milestone";
      showToast(msg, "error");
    } finally {
      setAddingMs(false);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !commentText.trim()) return;
    try {
      setSubmittingComment(true);
      await addProjectComment(
        selectedProject.id,
        user?.name || "Civic Stakeholder",
        user?.role || "CITIZEN",
        commentText.trim()
      );
      setCommentText("");
      showToast("Comment logged to stakeholder thread", "success");
      await fetchProjects();
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Failed to post comment";
      showToast(msg, "error");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleFundingReqSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    const minVal = Number(reqMinAmountStr.trim());
    const maxVal = Number(reqMaxAmountStr.trim());

    if (isNaN(minVal) || minVal <= 0) {
      showToast("Minimum funding required must be greater than ₹0.", "error");
      return;
    }

    if (isNaN(maxVal) || maxVal < minVal) {
      showToast("Maximum funding required must be greater than or equal to minimum funding required.", "error");
      return;
    }

    if (!reqJustification.trim()) {
      showToast("Funding justification is required.", "error");
      return;
    }

    try {
      setSubmittingFundingReq(true);
      let evUrl: string | undefined = undefined;
      if (evidenceFile) {
        const up = await uploadEvidenceFile(evidenceFile);
        evUrl = up.url;
      }
      await createFundingRequest({
        project_id: selectedProject.id,
        partner_id: reqPartnerId,
        minimum_required: minVal,
        maximum_required: maxVal,
        justification: reqJustification.trim(),
        supporting_documents_url: evUrl,
        requested_amount: maxVal,
        purpose: reqJustification.trim().substring(0, 200),
        description: reqJustification.trim(),
        expected_outcome: "Successful project execution and outcome delivery",
        evidence_url: evUrl
      });
      showToast("Funding request submitted successfully to Accredited Industry Partners", "success");
      setFundingModalOpen(false);
      setReqJustification("");
      setEvidenceFile(null);
      await fetchProjects();
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Failed to submit funding request";
      showToast(msg, "error");
    } finally {
      setSubmittingFundingReq(false);
    }
  };

  const handleApproveFundingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetReq) return;

    const raw = confirmApproveAmountStr.trim();
    if (!raw) {
      showToast("Please enter an approved amount.", "error");
      return;
    }

    const val = Number(raw);
    if (isNaN(val)) {
      showToast("Please enter a valid amount.", "error");
      return;
    }

    if (val <= 0) {
      showToast("Approved amount must be greater than ₹0.", "error");
      return;
    }

    try {
      setActionLoading(true);
      await approveFundingRequest(targetReq.id, val);
      showToast(`Funding of ₹${val} Lakhs approved successfully!`, "success");
      setApproveModalOpen(false);
      setTargetReq(null);
      await fetchProjects();
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Failed to approve funding request";
      showToast(msg, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectFundingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetReq) return;
    try {
      setActionLoading(true);
      await rejectFundingRequest(targetReq.id, rejectionReasonText.trim());
      showToast("Funding request rejected", "info");
      setRejectModalOpen(false);
      setTargetReq(null);
      setRejectionReasonText("");
      await fetchProjects();
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Failed to reject funding request";
      showToast(msg, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredProjectsList = useMemo(() => {
    return projects.filter((p: Project) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match = p.project_name.toLowerCase().includes(q) ||
                      p.challenge_title.toLowerCase().includes(q) ||
                      p.id.toLowerCase().includes(q) ||
                      (p.challenge_district || "").toLowerCase().includes(q) ||
                      p.institution_name.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (selectedStage !== "ALL" && (p.status || "").toUpperCase() !== selectedStage.toUpperCase()) {
        return false;
      }
      return true;
    });
  }, [projects, searchQuery, selectedStage]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      
      {/* Header */}
      <FadeIn direction="down">
        <div className="border-b border-slate-200 pb-6 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-extrabold">
            <Kanban className="w-3.5 h-3.5 text-teal-700" />
            {isMsmeUser
              ? "MSME & Industry Solution Projects Workspace"
              : isGovUser
              ? "Government Command Centre Monitoring Hub"
              : "University Solution Execution Workspace"}
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Solution Execution & Monitoring</h1>
          <p className="text-sm text-slate-600 font-semibold">
            Track real-world project execution milestones, stage transitions, industry funding requests, and stakeholder collaboration.
          </p>
        </div>
      </FadeIn>

      {loading ? (
        <div className="text-center py-20 text-slate-500 font-semibold">Loading Solution Projects...</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 space-y-4 shadow-sm">
          <p className="text-base text-slate-800 font-bold">No Active Solution Projects Found</p>
          <p className="text-xs text-slate-500">Solution projects created by accredited universities will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Projects Selector Sidebar */}
          <FadeIn direction="right">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Solution Projects ({filteredProjectsList.length})</h2>
                {(searchQuery || selectedStage !== "ALL") && (
                  <button
                    onClick={() => { setSearchQuery(""); setSelectedStage("ALL"); }}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    Clear Filters
                  </button>
                )}
              </div>

              {/* Sidebar Search & Stage Filters */}
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Search project title, ID, district..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium shadow-xs"
                />
                <select
                  value={selectedStage}
                  onChange={(e) => setSelectedStage(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl bg-white border border-slate-200 font-bold text-slate-700"
                >
                  <option value="ALL">All Lifecycle Stages</option>
                  <option value="ACCEPTED">Accepted</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="PROTOTYPE">Prototype</option>
                  <option value="PILOT_TESTING">Pilot Testing</option>
                  <option value="DEPLOYED">Deployed</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
              </div>

              <div className="space-y-3">
                {filteredProjectsList.map((proj: Project) => {
                  const isSel = selectedProject?.id === proj.id;
                  const totalMs = proj.milestones?.length || 0;
                  const compMs = proj.milestones?.filter((m: any) => m.is_completed).length || 0;
                  const currMs = proj.milestones?.find((m: any) => !m.is_completed)?.title || (totalMs > 0 ? "Completed" : "In Initiation");

                  const activeFundReq = proj.funding_requests?.[0];
                  let fundBadge = { label: "Not Requested", bg: "bg-slate-100 text-slate-600 border-slate-200" };
                  if (activeFundReq?.status === "APPROVED") {
                    fundBadge = { label: `Approved ₹${activeFundReq.approved_amount || activeFundReq.requested_amount}L`, bg: "bg-emerald-50 text-emerald-800 border-emerald-300" };
                  } else if (activeFundReq?.status === "PENDING") {
                    fundBadge = { label: `Pending ₹${activeFundReq.requested_amount}L`, bg: "bg-amber-50 text-amber-800 border-amber-300" };
                  } else if (activeFundReq?.status === "REJECTED") {
                    fundBadge = { label: "Funding Rejected", bg: "bg-rose-50 text-rose-800 border-rose-200" };
                  }

                  return (
                    <button
                      key={proj.id}
                      onClick={() => setSelectedProject(proj)}
                      className={`w-full p-4 rounded-2xl border text-left space-y-3 transition-all ${
                        isSel
                          ? "bg-white border-indigo-600 shadow-md ring-2 ring-indigo-600/20"
                          : "bg-white hover:bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-mono text-indigo-700 font-bold">{proj.id}</span>
                        <StatusBadge status={proj.status} />
                      </div>
                      
                      <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{proj.project_name}</h3>
                      
                      <div className="text-[11px] text-slate-500 font-semibold space-y-1">
                        <div className="flex items-center gap-1.5 line-clamp-1">
                          <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{proj.institution_name}</span>
                        </div>
                        {proj.challenge_location && (
                          <div className="flex items-center gap-1.5 line-clamp-1">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{proj.challenge_location}</span>
                          </div>
                        )}
                      </div>

                      {/* Progress & Milestones summary badge */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
                        <span className="text-[11px] text-slate-600">
                          {compMs}/{totalMs} Milestones ({currMs})
                        </span>
                        <span className="font-mono text-emerald-600 font-bold">{proj.progress}%</span>
                      </div>

                      {/* Funding badge */}
                      <div className="flex items-center justify-between text-[10px] font-bold">
                        <span className={`px-2 py-0.5 rounded-md border ${fundBadge.bg}`}>
                          {fundBadge.label}
                        </span>
                        {proj.challenge_category && (
                          <span className="text-slate-400 uppercase font-mono">
                            {proj.challenge_category}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </FadeIn>

          {/* Selected Project Main Detail & Roadmap View */}
          {selectedProject && (() => {
            const pendingReq = selectedProject.funding_requests?.find((fr) => fr.status === "PENDING");
            const approvedReq = selectedProject.funding_requests?.find((fr) => fr.status === "APPROVED");
            const rejectedReq = selectedProject.funding_requests?.find((fr) => fr.status === "REJECTED");
            const latestReq = selectedProject.funding_requests?.[0];

            const totalMs = selectedProject.milestones?.length || 0;
            const completedMs = selectedProject.milestones?.filter((m) => m.is_completed).length || 0;

            return (
              <FadeIn direction="left" delay={0.1} className="lg:col-span-2 space-y-6">
                
                {/* Main Card */}
                <div className="p-8 rounded-3xl bg-white border border-slate-200 space-y-8 shadow-sm">
                  
                  {/* Read-Only Informational Banner for MSME / Industry */}
                  {isMsmeUser && (
                    <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-bold flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>MSME Read-Only Project Monitoring Workspace — Monitoring project execution, funding, and university milestone progress.</span>
                    </div>
                  )}

                  {/* SECTION 1: PROJECT OVERVIEW */}
                  <div className="space-y-4 border-b border-slate-200 pb-6">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-mono text-indigo-700 font-extrabold">
                        {selectedProject.id} • Challenge: {selectedProject.challenge_id}
                      </span>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={selectedProject.status} />
                        {selectedProject.status !== "RESOLVED" && canEditProject && (
                          <button
                            onClick={() => setFundingModalOpen(true)}
                            disabled={!!pendingReq}
                            className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-extrabold text-xs shadow-md shadow-purple-600/20 flex items-center gap-1.5 transition-all"
                          >
                            <DollarSign className="w-3.5 h-3.5 text-white" />
                            {pendingReq ? "Funding Request Pending" : "Request Funding"}
                          </button>
                        )}
                      </div>
                    </div>

                    <h2 className="text-2xl font-extrabold text-slate-900 leading-snug">{selectedProject.project_name}</h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                      <div>
                        <span className="text-slate-500 font-medium block">Lead University R&D Team:</span>
                        <span className="font-bold text-slate-900 flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3.5 h-3.5 text-indigo-600" /> {selectedProject.institution_name}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium block">Societal Challenge Category:</span>
                        <span className="font-bold text-slate-900 flex items-center gap-1 mt-0.5">
                          <Tag className="w-3.5 h-3.5 text-indigo-600" /> {selectedProject.challenge_category || "Civic Infrastructure"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium block">Challenge Location:</span>
                        <span className="font-bold text-slate-900 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-indigo-600" /> {selectedProject.challenge_location || [selectedProject.challenge_district, selectedProject.challenge_state].filter(Boolean).join(", ") || "Jharkhand"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium block">Original Challenge Title:</span>
                        <span className="font-bold text-slate-900 line-clamp-1 mt-0.5">{selectedProject.challenge_title || selectedProject.project_name}</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed font-medium">{selectedProject.description}</p>
                  </div>

                  {/* SECTION 2: FUNDING DETAILS */}
                  <div className="space-y-4 border-b border-slate-200 pb-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                        <DollarSign className="w-4.5 h-4.5 text-indigo-600" /> Funding Overview
                      </h3>
                      {latestReq && (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                          latestReq.status === "FULLY_FUNDED" || latestReq.status === "APPROVED" ? "bg-emerald-100 text-emerald-800 border-emerald-300" :
                          latestReq.status === "PARTIALLY_FUNDED" ? "bg-purple-100 text-purple-800 border-purple-300" :
                          latestReq.status === "REQUESTED" || latestReq.status === "PENDING" ? "bg-amber-100 text-amber-800 border-amber-300" :
                          "bg-rose-100 text-rose-800 border-rose-300"
                        }`}>
                          {latestReq.status.replace("_", " ")}
                        </span>
                      )}
                    </div>

                    {!latestReq ? (
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-500 font-medium text-center">
                        No formal R&D funding request submitted yet for this project.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Funding Range & Aggregated Stats */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                          <div>
                            <span className="text-slate-500 font-medium block">Required Range:</span>
                            <span className="font-mono font-bold text-indigo-700 mt-0.5 block text-sm">
                              ₹{latestReq.minimum_required ?? latestReq.requested_amount}–{latestReq.maximum_required ?? latestReq.requested_amount} Lakhs
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 font-medium block">Committed Funding:</span>
                            <span className="font-mono font-bold text-emerald-600 mt-0.5 block text-sm">
                              ₹{latestReq.total_committed ?? latestReq.approved_amount ?? 0} Lakhs
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 font-medium block">Remaining Requirement:</span>
                            <span className="font-mono font-bold text-amber-700 mt-0.5 block text-sm">
                              ₹{latestReq.remaining_min ?? 0}–{latestReq.remaining_max ?? 0} Lakhs
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 font-medium block">Total Funded:</span>
                            <span className="font-extrabold text-purple-700 mt-0.5 block text-sm">
                              {Math.min(100, Math.round(((latestReq.total_committed ?? (latestReq.approved_amount ?? 0)) / (latestReq.maximum_required ?? (latestReq.requested_amount || 1))) * 100))}%
                            </span>
                          </div>
                        </div>

                        {/* Visual Progress Bar */}
                        <div className="space-y-1.5 px-1">
                          <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                            <span>Funding Progress</span>
                            <span>{Math.min(100, Math.round(((latestReq.total_committed ?? (latestReq.approved_amount ?? 0)) / (latestReq.maximum_required ?? (latestReq.requested_amount || 1))) * 100))}% Funded</span>
                          </div>
                          <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden p-0.5 border border-slate-300/60">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, Math.round(((latestReq.total_committed ?? (latestReq.approved_amount ?? 0)) / (latestReq.maximum_required ?? (latestReq.requested_amount || 1))) * 100))}%` }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                              className="bg-gradient-to-r from-indigo-500 via-purple-600 to-emerald-500 h-full rounded-full"
                            />
                          </div>
                        </div>

                        {/* Justification & Details */}
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                          <div className="flex justify-between text-slate-500 font-semibold text-[11px]">
                            <span>Submitted By: {latestReq.university_name || selectedProject.institution_name}</span>
                            <span>Date: {new Date(latestReq.created_at).toLocaleDateString()}</span>
                          </div>
                          {(latestReq.justification || latestReq.description) && (
                            <p className="text-slate-700 leading-relaxed">
                              <span className="font-bold text-slate-900 block mb-0.5">Funding Justification:</span>
                              {latestReq.justification || latestReq.description}
                            </p>
                          )}
                          {latestReq.supporting_documents_url && (
                            <div className="pt-1">
                              <a
                                href={latestReq.supporting_documents_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 font-extrabold text-[11px] underline"
                              >
                                View Supporting Budget / Cost Document
                              </a>
                            </div>
                          )}
                          {latestReq.status === "REJECTED" && (
                            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 font-medium">
                              <span className="font-bold">Rejection Reason:</span> {latestReq.rejection_reason || "Insufficient funding allocation"}
                            </div>
                          )}
                        </div>

                        {/* Funding Partners Breakdown List */}
                        {latestReq.contributions && latestReq.contributions.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold text-slate-800 flex items-center justify-between">
                              <span>Funding Partners ({latestReq.partners_count || latestReq.contributions.length})</span>
                              <span className="text-[11px] text-slate-500 font-normal">Total Share: {latestReq.total_share_percentage ?? 0}%</span>
                            </h4>
                            <div className="divide-y divide-slate-200 border border-slate-200 rounded-2xl overflow-hidden bg-white text-xs">
                              {latestReq.contributions.map((c) => (
                                <div key={c.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                                  <div className="space-y-0.5">
                                    <div className="font-extrabold text-slate-900">{c.partner_name}</div>
                                    <div className="text-[11px] text-slate-500">Contributed on {new Date(c.created_at).toLocaleDateString()}</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-mono font-bold text-emerald-600">₹{c.contribution_amount} Lakhs</div>
                                    <div className="text-[11px] font-extrabold text-purple-700">{c.share_percentage}% Share</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* MSME Action: Contribute / Fund Active Request */}
                        {isMsmeUser && (latestReq.status === "REQUESTED" || latestReq.status === "PARTIALLY_FUNDED" || latestReq.status === "PENDING") && (
                          <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-between gap-4">
                            <div className="space-y-0.5 text-xs text-purple-900">
                              <div className="font-extrabold flex items-center gap-1">
                                <Clock className="w-4 h-4 text-purple-600" /> Active Funding Opportunity
                              </div>
                              <p className="text-[11px] text-purple-700">
                                Requirement: ₹{latestReq.minimum_required ?? latestReq.requested_amount}–{latestReq.maximum_required ?? latestReq.requested_amount} Lakhs. Remaining available: ₹{latestReq.remaining_max ?? 0} Lakhs.
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => {
                                  setTargetReq(latestReq);
                                  setConfirmApproveAmountStr((latestReq.remaining_max ?? 5.0).toString());
                                  setApproveModalOpen(true);
                                }}
                                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold shadow-md shadow-purple-600/20 transition-all flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-white" /> Contribute Funding
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* SECTION 3: PROJECT PROGRESS & MILESTONE TIMELINE */}
                  <div className="space-y-5 border-b border-slate-200 pb-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                        <CheckSquare className="w-4.5 h-4.5 text-emerald-600" /> Project Progress & Milestone Timeline
                      </h3>
                      <span className="text-xs font-semibold text-slate-500">
                        {completedMs} of {totalMs} Completed ({selectedProject.progress}%)
                      </span>
                    </div>

                    {/* Overall Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold text-slate-700">
                        <span>Overall Project Progress:</span>
                        <span className="font-mono text-emerald-600 text-sm">{selectedProject.progress}%</span>
                      </div>
                      <div className="w-full h-3 rounded-full bg-slate-100 border border-slate-300 overflow-hidden p-0.5">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${selectedProject.progress}%` }}
                          transition={{ duration: 0.8 }}
                          className="h-full rounded-full bg-gradient-to-r from-indigo-600 via-blue-600 to-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Milestone Timeline List */}
                    <div className="space-y-2.5">
                      {selectedProject.milestones.map((ms, idx) => {
                        const isDone = ms.is_completed;
                        return (
                          <div
                            key={ms.id}
                            className={`w-full p-4 rounded-2xl border flex items-center justify-between text-left transition-all ${
                              isDone ? "bg-slate-50 border-slate-200" : "bg-white border-slate-300 shadow-2xs"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <span className={`w-6 h-6 rounded-full text-xs font-extrabold flex items-center justify-center shrink-0 mt-0.5 ${
                                isDone ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-indigo-100 text-indigo-800 border border-indigo-200"
                              }`}>
                                {idx + 1}
                              </span>
                              <div className="space-y-0.5">
                                <span className={`text-xs font-bold block ${isDone ? "text-slate-500 line-through" : "text-slate-900"}`}>
                                  {ms.title}
                                </span>
                                {ms.description && (
                                  <p className="text-[11px] text-slate-500 leading-normal">{ms.description}</p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <span className={`text-[10px] font-mono font-extrabold px-2.5 py-1 rounded-full border ${
                                isDone ? "bg-emerald-50 text-emerald-800 border-emerald-300" : "bg-blue-50 text-blue-800 border-blue-200"
                              }`}>
                                {isDone ? "COMPLETED" : "IN PROGRESS"}
                              </span>

                              {/* University / Admin interactive toggle button */}
                              {canEditProject && (
                                <button
                                  onClick={() => handleToggleMs(ms.id)}
                                  className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-indigo-600 transition-colors"
                                  title="Toggle Milestone Status"
                                >
                                  {isDone ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <Square className="w-5 h-5 text-slate-400" />}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Add Custom Milestone Form (University / Admin only) */}
                    {canEditProject && (
                      <form onSubmit={handleAddMsSubmit} className="flex gap-2 pt-2">
                        <input
                          type="text"
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          placeholder="Add new project milestone..."
                          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs focus:outline-none focus:border-indigo-600 font-medium"
                        />
                        <button
                          type="submit"
                          disabled={addingMs}
                          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
                        >
                          <Plus className="w-4 h-4 text-white" /> Add Milestone
                        </button>
                      </form>
                    )}

                    {/* Lifecycle Stage Controls (University / Admin only) */}
                    {canEditProject && (
                      <div className="space-y-2 pt-2">
                        <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">Update Lifecycle Stage Status:</label>
                        <div className="flex flex-wrap gap-2">
                          {LIFECYCLE_STAGES.slice(4).map((stg) => (
                            <button
                              key={stg}
                              onClick={() => handleStatusChange(stg)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                selectedProject.status === stg
                                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                                  : "bg-slate-100 border border-slate-300 text-slate-700 hover:border-indigo-500"
                              }`}
                            >
                              {stg}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* SECTION 4: INDUSTRY PARTICIPATION */}
                  <div className="space-y-4 border-b border-slate-200 pb-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                        <Building2 className="w-4.5 h-4.5 text-indigo-600" /> Industry Participation & Support
                      </h3>
                      <Link href="/industry" className="text-xs text-indigo-700 font-bold hover:underline">
                        Funding Requests Workspace →
                      </Link>
                    </div>

                    {((selectedProject.csr_fundings && selectedProject.csr_fundings.length > 0) ||
                      (selectedProject.mentorships && selectedProject.mentorships.length > 0) ||
                      (selectedProject.tech_transfers && selectedProject.tech_transfers.length > 0)) ? (
                      <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-3 text-xs">
                        <div className="font-bold text-indigo-900">Active Industry Commitments:</div>
                        <div className="flex flex-wrap gap-2">
                          {selectedProject.csr_fundings?.map((csr) => (
                            <span key={csr.id} className="px-3 py-1.5 rounded-xl bg-white border border-indigo-200 text-indigo-900 font-bold flex items-center gap-1.5 shadow-2xs">
                              <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> ₹{csr.amount_in_lakhs}L CSR Sponsorship ({csr.partner_name})
                            </span>
                          ))}
                          {selectedProject.mentorships?.map((m) => (
                            <span key={m.id} className="px-3 py-1.5 rounded-xl bg-white border border-indigo-200 text-indigo-900 font-bold flex items-center gap-1.5 shadow-2xs">
                              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" /> Mentor: {m.mentor_name} ({m.partner_name})
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-500 font-medium text-center space-y-2">
                        <span>No CSR sponsorship or technical mentorship attached to this project yet.</span>
                        {isMsmeUser && (
                          <div>
                            <Link href="/industry" className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs inline-flex items-center gap-1.5 shadow-sm">
                              <Building2 className="w-3.5 h-3.5" /> Partner on Project in Industry Portal
                            </Link>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* SECTION 5: CIVI-CONNECT UNIFIED STAKEHOLDER COLLABORATION */}
                  <div className="space-y-4 pt-2">
                    <CiviConnectChat
                      projectId={selectedProject.id}
                      projectName={selectedProject.project_name}
                      challengeTitle={selectedProject.challenge_category}
                    />
                  </div>

                  {/* SECTION 6: MULTI-STAKEHOLDER DISCUSSION THREAD */}
                  <div className="space-y-4">

                    <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <MessageSquare className="w-4.5 h-4.5 text-indigo-600" /> Multi-Stakeholder Discussion Feed
                    </h3>

                    <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                      {(!selectedProject.comments || selectedProject.comments.length === 0) ? (
                        <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-slate-200">
                          No comments logged yet. Start the conversation below!
                        </div>
                      ) : (
                        selectedProject.comments.map((c) => (
                          <div key={c.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900">{c.author_name}</span>
                                <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-mono text-[10px] font-extrabold">
                                  {c.author_role}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-xs text-slate-700 leading-relaxed">{c.content}</p>
                          </div>
                        ))
                      )}
                    </div>

                    <form onSubmit={handleCommentSubmit} className="flex gap-2 pt-2">
                      <input
                        type="text"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder={`Post an update or question as ${user?.name || 'Stakeholder'}...`}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs focus:outline-none focus:border-indigo-600 font-medium"
                      />
                      <button
                        type="submit"
                        disabled={submittingComment}
                        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
                      >
                        <Send className="w-4 h-4 text-white" /> Post
                      </button>
                    </form>
                  </div>

                </div>

              </FadeIn>
            );
          })()}

        </div>
      )}

      {/* REQUEST FUNDING MODAL (University Role) */}
      {fundingModalOpen && selectedProject && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5 overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2 text-indigo-700 font-extrabold text-base">
                <DollarSign className="w-5 h-5 text-indigo-600" /> Request Funding
              </div>
              <button
                onClick={() => setFundingModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFundingReqSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target MSME / Industry Partner</label>
                <select
                  value={reqPartnerId}
                  onChange={(e) => setReqPartnerId(parseInt(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-medium"
                >
                  {partnersList.map((pt) => (
                    <option key={pt.id} value={pt.id}>{pt.name} ({pt.entity_type.replace("_", " ")})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Minimum Funding Required (₹ Lakhs) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={reqMinAmountStr}
                    onKeyDown={(e) => { if (["-", "+", "e", "E"].includes(e.key)) e.preventDefault(); }}
                    onChange={(e) => setReqMinAmountStr(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Maximum Funding Required (₹ Lakhs) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={reqMaxAmountStr}
                    onKeyDown={(e) => { if (["-", "+", "e", "E"].includes(e.key)) e.preventDefault(); }}
                    onChange={(e) => setReqMaxAmountStr(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-bold"
                  />
                </div>
              </div>

              {/* Dynamic Funding Range Display */}
              <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-between text-xs font-bold text-indigo-900">
                <span>Resulting Requirement:</span>
                <span className="font-mono text-sm text-indigo-700 font-extrabold">
                  Funding Range: ₹{reqMinAmountStr || "0"}–{reqMaxAmountStr || "0"} Lakhs
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Funding Justification *</label>
                <textarea
                  required
                  rows={4}
                  value={reqJustification}
                  onChange={(e) => setReqJustification(e.target.value)}
                  placeholder="Explain why funding is required, key activities (procurement, testing, pilot deployment), major cost areas, and expected ROI/outcomes..."
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Supporting Documents (Optional)</label>
                <span className="text-[11px] text-slate-500 block mb-1">Cost estimate, Proposal, Budget document, or Tech spec</span>
                <input
                  type="file"
                  onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>

              {/* Funding Request Summary Box */}
              <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2 text-xs">
                <div className="text-xs font-extrabold text-indigo-400 uppercase tracking-wider">Funding Request Summary</div>
                <div className="flex justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-slate-400">Funding Requested:</span>
                  <span className="font-mono font-bold text-emerald-400">₹{reqMinAmountStr || "0"}–{reqMaxAmountStr || "0"} Lakhs</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-slate-400">Project:</span>
                  <span className="font-bold text-slate-200 truncate max-w-[200px]">{selectedProject.project_name}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-slate-400">University:</span>
                  <span className="font-bold text-slate-200">{user?.name || selectedProject.institution_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Justification Preview:</span>
                  <p className="text-slate-300 text-[11px] line-clamp-2 italic">{reqJustification || "Enter justification above..."}</p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setFundingModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingFundingReq}
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-extrabold text-xs shadow-md shadow-purple-600/20 flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4 text-white" /> Submit Funding Request
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* APPROVE FUNDING MODAL (MSME Role) */}
      {approveModalOpen && targetReq && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Approve Funding Request
              </h3>
              <button onClick={() => setApproveModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApproveFundingSubmit} className="space-y-4">
              <p className="text-xs text-slate-600 font-semibold">
                Approving R&D funding for <span className="text-slate-900 font-bold">{targetReq.university_name || targetReq.project_name}</span>.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Confirmed Approved Amount (₹ in Lakhs)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={confirmApproveAmountStr}
                  onKeyDown={(e) => {
                    if (["-", "+", "e", "E"].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  onChange={(e) => setConfirmApproveAmountStr(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-bold"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setApproveModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-white" /> Confirm Approval
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* REJECT FUNDING MODAL (MSME Role) */}
      {rejectModalOpen && targetReq && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-600" /> Reject Funding Request
              </h3>
              <button onClick={() => setRejectModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRejectFundingSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Rejection Reason</label>
                <textarea
                  required
                  rows={3}
                  value={rejectionReasonText}
                  onChange={(e) => setRejectionReasonText(e.target.value)}
                  placeholder="Provide a clear reason for rejecting this request..."
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-medium"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold shadow-md shadow-rose-600/20 flex items-center gap-1.5"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
}




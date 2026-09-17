"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Briefcase, ShieldCheck, DollarSign, CheckCircle2, XCircle, Eye, Clock, X, Send, ExternalLink } from "lucide-react";
import { getIndustryPartners, getFundingRequests, approveFundingRequest, rejectFundingRequest, addFundingContribution, IndustryPartner, FundingRequestItem } from "@/lib/api";
import { FadeIn, FadeInStagger, FadeInStaggerItem } from "@/components/animations/MotionWrapper";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/lib/auth";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function IndustryHubPage() {
  return (
    <ProtectedRoute allowedRoles={["INDUSTRY_PARTNER", "UNIVERSITY", "GOVERNMENT_ADMIN"]}>
      <IndustryHubContent />
    </ProtectedRoute>
  );
}

function IndustryHubContent() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [fundingRequests, setFundingRequests] = useState<FundingRequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [detailModalReq, setDetailModalReq] = useState<FundingRequestItem | null>(null);
  const [approveModalReq, setApproveModalReq] = useState<FundingRequestItem | null>(null);
  const [rejectModalReq, setRejectModalReq] = useState<FundingRequestItem | null>(null);

  const [confirmAmountStr, setConfirmAmountStr] = useState<string>("5.0");
  const [confirmShareStr, setConfirmShareStr] = useState<string>("50");
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!user || !["INDUSTRY_PARTNER", "UNIVERSITY", "GOVERNMENT_ADMIN"].includes(user.role)) {
      setLoading(false);
      return;
    }
    try {
      const freqs = await getFundingRequests();
      setFundingRequests(freqs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAmountChange = (newAmtStr: string) => {
    setConfirmAmountStr(newAmtStr);
    if (!approveModalReq) return;
    const target = approveModalReq.maximum_required || approveModalReq.requested_amount || 12.0;
    const val = Number(newAmtStr);
    if (!isNaN(val) && val > 0 && target > 0) {
      const calcShare = roundVal((val / target) * 100, 1);
      setConfirmShareStr(calcShare.toString());
    }
  };

  const handleShareChange = (newShareStr: string) => {
    setConfirmShareStr(newShareStr);
    if (!approveModalReq) return;
    const target = approveModalReq.maximum_required || approveModalReq.requested_amount || 12.0;
    const val = Number(newShareStr);
    if (!isNaN(val) && val > 0 && target > 0) {
      const calcAmt = roundVal((val / 100) * target, 2);
      setConfirmAmountStr(calcAmt.toString());
    }
  };

  const roundVal = (num: number, dec: number) => {
    return Math.round(num * Math.pow(10, dec)) / Math.pow(10, dec);
  };

  const handleApproveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approveModalReq) return;

    const rawAmt = confirmAmountStr.trim();
    const rawShare = confirmShareStr.trim();
    const amtVal = Number(rawAmt);
    const shareVal = Number(rawShare);

    if (isNaN(amtVal) || amtVal <= 0) {
      showToast("Contribution amount must be a positive number greater than ₹0.", "error");
      return;
    }

    if (isNaN(shareVal) || shareVal <= 0 || shareVal > 100) {
      showToast("Funding share percentage must be between 0.1% and 100%.", "error");
      return;
    }

    try {
      setActionLoading(true);
      await addFundingContribution(approveModalReq.id, {
        contribution_amount: amtVal,
        share_percentage: shareVal
      });
      showToast(`Successfully committed funding of ₹${amtVal} Lakhs (${shareVal}%)!`, "success");
      setApproveModalReq(null);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to record funding contribution";
      showToast(msg, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalReq) return;
    try {
      setActionLoading(true);
      await rejectFundingRequest(rejectModalReq.id, rejectionReason.trim());
      showToast("Funding request rejected", "info");
      setRejectModalReq(null);
      setRejectionReason("");
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reject request";
      showToast(msg, "error");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-slate-500 font-bold">Loading Funding Requests...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Header */}
      <FadeIn direction="down">
        <div className="border-b border-slate-200 pb-6 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-extrabold">
            <DollarSign className="w-3.5 h-3.5 text-indigo-600" />
            MSME / Industry CSR Funding Hub
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Funding & Impact Requests</h1>
          <p className="text-sm text-slate-600 font-semibold">
            Review and evaluate funding requests submitted by accepted University R&D solution projects.
          </p>
        </div>
      </FadeIn>

      {/* FUNDING REQUESTS WORKFLOW SECTION */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-xl font-extrabold text-slate-900">Active Requests ({fundingRequests.length})</h2>
        </div>

        {fundingRequests.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-2 shadow-2xs">
            <DollarSign className="w-10 h-10 text-slate-400 mx-auto" />
            <div className="text-sm font-extrabold text-slate-900">No Funding Requests Submitted Yet</div>
            <div className="text-xs text-slate-500 font-medium">University projects accepted for execution can request funding here.</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {fundingRequests.map((req) => {
              const targetBase = req.maximum_required || req.requested_amount || 12.0;
              const committed = req.total_committed ?? req.approved_amount ?? 0;
              const progressPct = Math.min(100, Math.round((committed / targetBase) * 100));
              const isClosedOrFull = req.status === "FULLY_FUNDED" || req.status === "FUNDING_CLOSED" || req.status === "REJECTED";

              return (
                <motion.div
                  key={req.id}
                  whileHover={{ y: -2 }}
                  className="p-6 rounded-3xl bg-white border border-slate-200 space-y-4 shadow-2xs hover:border-amber-400 transition-all flex flex-col justify-between portal-industry-card"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-mono text-indigo-700 font-bold">{req.project_id}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                        req.status === "FULLY_FUNDED" || req.status === "APPROVED"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                          : req.status === "PARTIALLY_FUNDED"
                          ? "bg-purple-50 text-purple-800 border-purple-300"
                          : req.status === "REJECTED"
                          ? "bg-red-50 text-red-800 border-red-300"
                          : "bg-amber-50 text-amber-800 border-amber-300"
                      }`}>
                        {req.status.replace("_", " ")}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-extrabold text-base text-slate-900 leading-snug">{req.project_name}</h3>
                      <div className="text-xs text-indigo-700 font-bold mt-0.5">{req.university_name}</div>
                      <div className="text-xs text-slate-500 font-medium line-clamp-1 mt-1">Challenge: {req.challenge_title}</div>
                    </div>

                    {/* Funding Summary Card Info */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-slate-700">
                        <div>
                          <span className="text-[11px] text-slate-500 font-medium block">Project Requirement:</span>
                          <span className="font-mono font-extrabold text-slate-900">
                            ₹{req.minimum_required ?? req.requested_amount}–{req.maximum_required ?? req.requested_amount} Lakhs
                          </span>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-500 font-medium block">Already Committed:</span>
                          <span className="font-mono font-extrabold text-emerald-600">
                            ₹{committed} Lakhs
                          </span>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-500 font-medium block">Remaining Requirement:</span>
                          <span className="font-mono font-extrabold text-amber-700">
                            ₹{req.remaining_min ?? 0}–{req.remaining_max ?? 0} Lakhs
                          </span>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-500 font-medium block">Funding Partners:</span>
                          <span className="font-extrabold text-purple-700">
                            {req.partners_count ?? (req.contributions?.length || 0)}
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="pt-1 space-y-1">
                        <div className="flex justify-between text-[11px] font-bold text-slate-700">
                          <span>Progress</span>
                          <span>{progressPct}% Funded</span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPct}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="bg-gradient-to-r from-indigo-500 to-emerald-500 h-full"
                          />
                        </div>
                      </div>

                      {(req.justification || req.purpose) && (
                        <p className="text-slate-600 line-clamp-2 leading-relaxed text-[11px] pt-1">
                          <span className="font-semibold text-slate-800">Justification:</span> {req.justification || req.purpose}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                    <button
                      onClick={() => setDetailModalReq(req)}
                      className={`px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all ${
                        user?.role === "INDUSTRY_PARTNER"
                          ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                          : "w-full bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 shadow-2xs"
                      }`}
                    >
                      <Eye className="w-4 h-4 text-indigo-600" /> View Complete Funding Breakdown
                    </button>

                    {user?.role === "INDUSTRY_PARTNER" && !isClosedOrFull && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setRejectModalReq(req);
                            setRejectionReason("");
                          }}
                          className="px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-extrabold text-xs transition-colors"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => {
                            const target = req.maximum_required || req.requested_amount || 12.0;
                            const rem = req.remaining_max ?? target;
                            const defaultAmt = Math.min(rem, target);
                            const defaultShare = Math.min(100, Math.round((defaultAmt / target) * 100));
                            setConfirmAmountStr(defaultAmt.toString());
                            setConfirmShareStr(defaultShare.toString());
                            setApproveModalReq(req);
                          }}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1"
                        >
                          <DollarSign className="w-3.5 h-3.5 text-white" /> Contribute Funding
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* VIEW COMPLETE FUNDING BREAKDOWN MODAL */}
      {detailModalReq && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-5 overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-indigo-600" />
                <div className="font-extrabold text-base text-slate-900">Complete Funding Breakdown & Company Partner Details</div>
              </div>
              <button onClick={() => setDetailModalReq(null)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5 overflow-y-auto pr-1 text-xs text-slate-700 flex-1">
              {/* Project & Institution Summary Header */}
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-mono text-indigo-700 font-extrabold">{detailModalReq.project_id}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                    detailModalReq.status === "FULLY_FUNDED" || detailModalReq.status === "APPROVED"
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                      : detailModalReq.status === "PARTIALLY_FUNDED"
                      ? "bg-purple-100 text-purple-800 border-purple-300"
                      : detailModalReq.status === "REJECTED"
                      ? "bg-red-100 text-red-800 border-red-300"
                      : "bg-amber-100 text-amber-800 border-amber-300"
                  }`}>
                    {detailModalReq.status.replace("_", " ")}
                  </span>
                </div>
                <h3 className="font-extrabold text-base text-slate-900">{detailModalReq.project_name}</h3>
                <div className="text-indigo-800 font-bold flex items-center gap-2">
                  <span>Lead Institution: {detailModalReq.university_name}</span>
                  {detailModalReq.created_at && (
                    <span className="text-slate-500 font-medium text-[11px]">• Submitted {new Date(detailModalReq.created_at).toLocaleDateString()}</span>
                  )}
                </div>
                {detailModalReq.challenge_title && (
                  <div className="text-slate-600 font-medium text-[11px]">Civic Challenge: {detailModalReq.challenge_title}</div>
                )}
              </div>

              {/* Comprehensive Financial Breakdown Grid */}
              <div className="space-y-2">
                <div className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Financial Overview</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-500 font-medium block">Required Range:</span>
                    <span className="font-mono font-extrabold text-slate-900 mt-0.5 block text-sm">
                      ₹{detailModalReq.minimum_required ?? detailModalReq.requested_amount}–{detailModalReq.maximum_required ?? detailModalReq.requested_amount} Lakhs
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block">Committed Funding:</span>
                    <span className="font-mono font-extrabold text-emerald-600 mt-0.5 block text-sm">
                      ₹{detailModalReq.total_committed ?? detailModalReq.approved_amount ?? 0} Lakhs
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block">Remaining Requirement:</span>
                    <span className="font-mono font-extrabold text-amber-700 mt-0.5 block text-sm">
                      ₹{detailModalReq.remaining_min ?? 0}–{detailModalReq.remaining_max ?? 0} Lakhs
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block">Total Share Allocated:</span>
                    <span className="font-extrabold text-purple-700 mt-0.5 block text-sm">
                      {detailModalReq.total_share_percentage ?? 0}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Company Partner Breakdown Table ("Literally Everything") */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                    Contributing Companies & Funding Partner Breakdown ({detailModalReq.contributions?.length || 0})
                  </div>
                </div>

                {(!detailModalReq.contributions || detailModalReq.contributions.length === 0) ? (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-500 text-center font-medium">
                    No company funding contributions logged yet. This request is currently seeking industry sponsorship.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-extrabold">
                          <th className="p-3">Contributing Company / Partner</th>
                          <th className="p-3">Amount Committed</th>
                          <th className="p-3">Share Percentage</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Date Committed</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800">
                        {detailModalReq.contributions.map((c) => (
                          <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-3 font-bold text-indigo-900">{c.partner_name}</td>
                            <td className="p-3 font-mono font-extrabold text-emerald-600">₹{c.contribution_amount} Lakhs</td>
                            <td className="p-3 font-extrabold text-purple-700">{c.share_percentage}% Share</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-extrabold text-[10px] border border-emerald-200">
                                {c.status || "COMMITTED"}
                              </span>
                            </td>
                            <td className="p-3 text-slate-500 font-mono text-[11px]">
                              {new Date(c.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Purpose & Justification */}
              <div className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                {detailModalReq.purpose && (
                  <div>
                    <div className="font-extrabold text-slate-900">Purpose of Funding:</div>
                    <p className="mt-0.5 leading-relaxed text-slate-700">{detailModalReq.purpose}</p>
                  </div>
                )}

                {(detailModalReq.justification || detailModalReq.description) && (
                  <div>
                    <div className="font-extrabold text-slate-900">Funding Justification & Budget Usage:</div>
                    <p className="mt-0.5 leading-relaxed text-slate-700">{detailModalReq.justification || detailModalReq.description}</p>
                  </div>
                )}

                {detailModalReq.expected_outcome && (
                  <div>
                    <div className="font-extrabold text-slate-900">Expected Technical / Societal Outcome:</div>
                    <p className="mt-0.5 leading-relaxed text-slate-700">{detailModalReq.expected_outcome}</p>
                  </div>
                )}

                {detailModalReq.rejection_reason && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900">
                    <span className="font-bold block mb-0.5">Rejection Reason:</span>
                    {detailModalReq.rejection_reason}
                  </div>
                )}

                {(detailModalReq.supporting_documents_url || detailModalReq.evidence_url) && (
                  <div>
                    <div className="font-extrabold text-slate-900 mb-1">Supporting Cost Estimate / Budget Proposal:</div>
                    <a
                      href={detailModalReq.supporting_documents_url || detailModalReq.evidence_url || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-100 hover:bg-indigo-200 text-indigo-800 font-extrabold transition-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> View Uploaded Budget Proposal Document
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end shrink-0">
              <button
                onClick={() => setDetailModalReq(null)}
                className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs shadow-md"
              >
                Close Breakdown
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* CONTRIBUTE / FUND MODAL */}
      {approveModalReq && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="font-extrabold text-base text-purple-900 flex items-center gap-1.5">
                <DollarSign className="w-5 h-5 text-purple-600" /> Commit Funding Contribution
              </div>
              <button onClick={() => setApproveModalReq(null)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApproveSubmit} className="space-y-4">
              <p className="text-xs text-slate-600">
                Contributing R&D funding for <strong className="text-slate-900">{approveModalReq.project_name}</strong> by {approveModalReq.university_name}.
              </p>

              <div className="p-3 rounded-2xl bg-purple-50 border border-purple-200 text-xs space-y-1 text-purple-950 font-medium">
                <div className="flex justify-between">
                  <span>Project Funding Target:</span>
                  <span className="font-mono font-bold">₹{approveModalReq.maximum_required ?? approveModalReq.requested_amount} Lakhs</span>
                </div>
                <div className="flex justify-between">
                  <span>Already Committed:</span>
                  <span className="font-mono font-bold text-emerald-700">₹{approveModalReq.total_committed ?? 0} Lakhs ({approveModalReq.total_share_percentage ?? 0}%)</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-purple-200 font-bold">
                  <span>Remaining Available Requirement:</span>
                  <span className="font-mono text-indigo-700">₹{approveModalReq.remaining_max ?? (approveModalReq.maximum_required ?? approveModalReq.requested_amount)} Lakhs</span>
                </div>
              </div>

              {/* Bi-directional Amount vs Share Percentage Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Contribution Amount (₹ Lakhs)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={confirmAmountStr}
                    onKeyDown={(e) => { if (["-", "+", "e", "E"].includes(e.key)) e.preventDefault(); }}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-bold focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Funding Share (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="100"
                    required
                    value={confirmShareStr}
                    onKeyDown={(e) => { if (["-", "+", "e", "E"].includes(e.key)) e.preventDefault(); }}
                    onChange={(e) => handleShareChange(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-bold focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex justify-between font-semibold">
                <span>Calculated Commitment:</span>
                <span className="font-bold text-slate-900 font-mono">₹{confirmAmountStr || "0"} Lakhs = {confirmShareStr || "0"}% Share</span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setApproveModalReq(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-white" /> Confirm Contribution
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* REJECT MODAL */}
      {rejectModalReq && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="font-extrabold text-base text-red-800 flex items-center gap-1.5">
                <XCircle className="w-5 h-5 text-red-600" /> Reject Funding Request
              </div>
              <button onClick={() => setRejectModalReq(null)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <p className="text-xs text-slate-600">
                Rejecting funding request for <strong className="text-slate-900">{rejectModalReq.project_name}</strong>.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Optional Rejection Reason</label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Provide feedback or reason for rejection..."
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRejectModalReq(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs shadow-md shadow-red-600/20"
                >
                  Reject Request
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
}

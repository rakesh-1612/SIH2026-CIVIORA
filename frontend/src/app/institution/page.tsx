"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Building2, Sparkles, CheckCircle2, XCircle } from "lucide-react";
import { getInstitutions, getRecommendedChallenges, acceptChallenge, declineChallenge, Institution, ChallengeDetail } from "@/lib/api";
import { PriorityBadge } from "@/components/PriorityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { FadeIn, FadeInStagger, FadeInStaggerItem } from "@/components/animations/MotionWrapper";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/lib/auth";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function InstitutionHubPage() {
  return (
    <ProtectedRoute allowedRoles={["UNIVERSITY", "GOVERNMENT_ADMIN"]}>
      <InstitutionHubContent />
    </ProtectedRoute>
  );
}

function InstitutionHubContent() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedInst, setSelectedInst] = useState<Institution | null>(null);
  const [recommended, setRecommended] = useState<ChallengeDetail[]>([]);
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!user || !["UNIVERSITY", "GOVERNMENT_ADMIN"].includes(user.role)) return;
      try {
        const insts = await getInstitutions();
        setInstitutions(insts);
        
        let targetInst = insts[0];
        if (user?.role === "UNIVERSITY" && user.institution_id) {
          const matched = insts.find((i) => i.id === user.institution_id);
          if (matched) targetInst = matched;
        }

        if (targetInst) {
          setSelectedInst(targetInst);
          loadRecommended(targetInst.id);
        }
      } catch (err) {
        console.error(err);
      }
    }
    load();
  }, [user]);

  async function loadRecommended(instId: number) {
    try {
      const recs = await getRecommendedChallenges(instId);
      setRecommended(recs);
    } catch (err) {
      console.error(err);
    }
  }

  const handleSelectInstitution = (inst: Institution) => {
    if (user?.role === "UNIVERSITY") return;
    setSelectedInst(inst);
    loadRecommended(inst.id);
  };

  const handleAccept = async (chId: string) => {
    if (!selectedInst) return;
    try {
      setActionId(chId);
      const proj = await acceptChallenge(chId);
      showToast(`Challenge accepted successfully! Project instantiated (${proj.id})`, "success");
      await loadRecommended(selectedInst.id);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Unable to accept this challenge. Please try again.";
      showToast(msg, "error");
    } finally {
      setActionId(null);
    }
  };

  const handleDecline = async (chId: string) => {
    if (!selectedInst) return;
    try {
      setActionId(chId);
      const res = await declineChallenge(chId);
      showToast(res.message || "Challenge declined successfully.", "info");
      await loadRecommended(selectedInst.id);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Unable to decline this challenge. Please try again.";
      showToast(msg, "error");
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Header */}
      <FadeIn direction="down">
        <div className="border-b border-slate-200 pb-6 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-extrabold">
            <Building2 className="w-3.5 h-3.5 text-teal-700" />
            University R&D Solution Hub
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Institution Solution Workspace</h1>
          <p className="text-sm text-slate-600 font-semibold">
            Institutions review societal challenges, inspect domain relevance, and instantiate solution projects for execution.
          </p>
        </div>
      </FadeIn>

      {/* Institution Selector for GOVERNMENT_ADMIN ONLY */}
      {user?.role === "GOVERNMENT_ADMIN" && (
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
          <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">
            Select Institution View (Admin Portal Override)
          </label>
          <div className="flex flex-wrap gap-2">
            {institutions.map((inst) => (
              <button
                key={inst.id}
                onClick={() => handleSelectInstitution(inst)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedInst?.id === inst.id
                    ? "bg-teal-700 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {inst.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected Institution Expertise Details */}
      {selectedInst && (
        <FadeIn direction="up" delay={0.1}>
          <div className="p-6 rounded-3xl bg-gradient-to-r from-teal-50/50 via-white to-indigo-50/50 border border-teal-200/80 space-y-4 shadow-2xs portal-university-card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-extrabold text-slate-900">{selectedInst.name}</h2>
                  {user?.role === "UNIVERSITY" && (
                    <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-300 text-[10px] font-bold">
                      Authenticated Profile
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 font-semibold">{selectedInst.city}, {selectedInst.state} • Rating: ⭐ {selectedInst.rating}</p>
              </div>
              <div className="text-xs text-indigo-700 font-mono font-bold">
                Contact: {selectedInst.contact_email}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-teal-100">
              <span className="text-xs text-slate-700 font-bold">Specialized Expertise:</span>
              {selectedInst.research_expertise.map((exp, i) => (
                <span key={i} className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {exp}
                </span>
              ))}
            </div>
          </div>
        </FadeIn>
      )}

      {/* Available Challenges List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-slate-900">
            Available Societal Challenges ({recommended.length})
          </h2>
        </div>

        {recommended.length === 0 ? (
          <div className="text-center py-12 text-slate-500 bg-white rounded-3xl border border-slate-200 font-semibold shadow-2xs">
            No active challenges currently available for institution review.
          </div>
        ) : (
          <FadeInStagger className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {recommended.map((ch) => {
              const matchRec = ch.recommended_institutions?.find((r) => r.institution_id === selectedInst?.id);
              const userDecisionStatus = matchRec?.status;
              const isAccepted = userDecisionStatus === "ACCEPTED" || ch.status === "ACCEPTED" || ch.status === "RESOLVED" || ch.status === "IN_PROGRESS";
              const isDeclined = userDecisionStatus === "DECLINED";
              const displayStatus = isDeclined ? "DECLINED" : isAccepted ? "ACCEPTED" : ch.status;

              return (
                <FadeInStaggerItem key={ch.id}>
                  <motion.div
                    whileHover={{ y: -2 }}
                    className="p-6 rounded-3xl bg-white border border-slate-200 space-y-4 shadow-2xs flex flex-col justify-between h-full hover:border-teal-400 transition-all portal-university-card"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-teal-700 font-bold">{ch.id}</span>
                        <StatusBadge status={displayStatus} />
                      </div>

                      <h3 className="text-base font-bold text-slate-900 leading-snug">{ch.title}</h3>

                      {ch.analysis && (
                        <PriorityBadge level={ch.analysis.priority_level} score={ch.analysis.priority_score} />
                      )}

                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed font-medium">{ch.description}</p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
                      <Link href={`/explorer/${ch.id}`} className="text-xs text-teal-700 font-bold hover:underline">
                        Inspect Details →
                      </Link>

                      {user?.role === "UNIVERSITY" && (
                        <div className="flex items-center gap-2">
                          {isAccepted ? (
                            <button
                              disabled
                              className="px-4 py-2 rounded-xl bg-teal-800 text-white font-extrabold text-xs shadow-2xs flex items-center gap-1.5 cursor-not-allowed opacity-90"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-white" /> Accepted & Active
                            </button>
                          ) : isDeclined ? (
                            <span className="px-3.5 py-2 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-bold flex items-center gap-1.5">
                              <XCircle className="w-3.5 h-3.5 text-rose-600" /> DECLINED
                            </span>
                          ) : (
                            <>
                              <motion.button
                                whileTap={{ scale: 0.96 }}
                                onClick={() => handleDecline(ch.id)}
                                disabled={actionId === ch.id}
                                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-rose-700 border border-slate-200 text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                              >
                                {actionId === ch.id ? "Processing..." : "Decline"}
                              </motion.button>
                              <motion.button
                                whileTap={{ scale: 0.96 }}
                                onClick={() => handleAccept(ch.id)}
                                disabled={actionId === ch.id}
                                className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white font-extrabold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-[0.98]"
                              >
                                {actionId === ch.id ? (
                                  <>
                                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Instantiating...
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="w-3.5 h-3.5 text-white" /> Accept Challenge
                                  </>
                                )}
                              </motion.button>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                  </motion.div>
                </FadeInStaggerItem>
              );
            })}
          </FadeInStagger>
        )}
      </div>

    </div>
  );
}

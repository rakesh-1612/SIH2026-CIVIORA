"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, MapPin, Brain, Layers, Building2, CheckCircle2, ArrowLeft, ExternalLink, Sparkles, Activity, XCircle, Kanban, Image as ImageIcon, Video, FileText, X, MessageSquare } from "lucide-react";

import { getChallengeById, acceptChallenge, declineChallenge, ChallengeDetail, BACKEND_SERVER_URL } from "@/lib/api";
import { PriorityBadge } from "@/components/PriorityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { FadeIn, ScaleUp } from "@/components/animations/MotionWrapper";
import { CountUpNumber } from "@/components/ui/CountUpNumber";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/lib/auth";
import { CivicSocialCard } from "@/components/CivicSocialCard";

export default function ChallengeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const { user } = useAuth();
  const id = params.id as string;

  const [challenge, setChallenge] = useState<ChallengeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [activeMediaModal, setActiveMediaModal] = useState<{ name: string; type: string; url: string } | null>(null);
  const [failedFiles, setFailedFiles] = useState<Record<string, boolean>>({});

  const resolveMediaUrl = (url?: string) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:") || url.startsWith("blob:")) {
      return url;
    }
    return `${BACKEND_SERVER_URL}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  const handleMediaClick = (mf: { name: string; type: string; url?: string }) => {
    const targetUrl = resolveMediaUrl(mf.url);
    if (!targetUrl) {
      showToast("Evidence file URL unavailable", "error");
      setFailedFiles((prev) => ({ ...prev, [mf.name]: true }));
      return;
    }

    const typeUpper = (mf.type || "").toUpperCase();
    const ext = mf.name.split(".").pop()?.toLowerCase() || "";

    if (typeUpper === "IMAGE" || ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext) || targetUrl.startsWith("data:image")) {
      setActiveMediaModal({ name: mf.name, type: "IMAGE", url: targetUrl });
    } else if (typeUpper === "VIDEO" || ["mp4", "webm", "avi", "mov"].includes(ext)) {
      setActiveMediaModal({ name: mf.name, type: "VIDEO", url: targetUrl });
    } else {
      window.open(targetUrl, "_blank", "noopener,noreferrer");
    }
  };

  useEffect(() => {
    async function load() {
      try {
        const chData = await getChallengeById(id);
        setChallenge(chData);
      } catch (err) {
        console.error("Error loading challenge details", err);
      } finally {
        setLoading(false);
      }
    }
    if (id) load();
  }, [id]);

  const handleAccept = async () => {
    if (!challenge) return;
    try {
      setAccepting(true);
      const proj = await acceptChallenge(challenge.id);
      showToast(`Challenge accepted successfully! Project instantiated (${proj.id})`, "success");
      router.push(`/projects`);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Unable to accept this challenge. Please try again.";
      showToast(msg, "error");
      setAccepting(false);
    }
  };

  const handleDecline = async () => {
    if (!challenge) return;
    try {
      setDeclining(true);
      const res = await declineChallenge(challenge.id);
      showToast(res.message || "Challenge declined successfully.", "info");
      const updated = await getChallengeById(id);
      setChallenge(updated);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Unable to decline this challenge. Please try again.";
      showToast(msg, "error");
    } finally {
      setDeclining(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-slate-500 flex items-center justify-center gap-2 font-semibold">
        <Activity className="w-5 h-5 animate-spin text-indigo-600" />
        Processing AI Intelligence & SQLite records...
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-red-600 font-bold">
        Challenge record not found.
      </div>
    );
  }

  const an = challenge.analysis;
  const instMatch = user?.institution_id
    ? challenge.recommended_institutions?.find((r) => r.institution_id === user.institution_id)
    : null;
  const userDecisionStatus = instMatch?.status;

  const isAccepted =
    userDecisionStatus === "ACCEPTED" ||
    challenge.status === "ACCEPTED" ||
    challenge.status === "RESOLVED" ||
    challenge.status === "IN_PROGRESS" ||
    challenge.status === "PROTOTYPE" ||
    challenge.status === "PILOT_TESTING" ||
    challenge.status === "DEPLOYED";

  const isDeclined = userDecisionStatus === "DECLINED";

  const displayStatus = isDeclined
    ? "DECLINED"
    : isAccepted
    ? "ACCEPTED"
    : challenge.status;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      
      {/* Back Link & Header */}
      <FadeIn direction="down">
        <div className="space-y-4 border-b border-slate-200 pb-6">
          <Link href="/explorer" className="inline-flex items-center gap-1 text-xs text-indigo-600 font-bold hover:underline">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Explorer Catalog
          </Link>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-100 text-indigo-700 font-extrabold border border-slate-300">
                  {challenge.id}
                </span>
                <StatusBadge status={displayStatus} />
                {challenge.submitter_type && (
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-bold font-mono">
                    {challenge.submitter_type.replace("_", " ")}
                  </span>
                )}
                <span className="text-xs text-slate-500 font-semibold">
                  Submitted {new Date(challenge.created_at).toLocaleDateString()}
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">{challenge.title}</h1>
              <div className="flex items-center gap-2 text-xs text-slate-700 font-semibold">
                <MapPin className="w-4 h-4 text-indigo-600" />
                <span>{challenge.location || [challenge.district, challenge.state].filter(Boolean).join(", ")}</span>
              </div>
            </div>

            {an && (
              <ScaleUp>
                <div className="p-5 rounded-3xl bg-white border border-amber-300 backdrop-blur text-center space-y-1 min-w-[220px] shadow-sm">
                  <div className="text-[11px] text-slate-600 font-bold uppercase tracking-wider">Explainable Priority Score</div>
                  <div className="text-4xl font-extrabold text-amber-600">
                    <CountUpNumber value={an.priority_score} decimals={0} />
                    <span className="text-sm text-slate-500 font-semibold"> / 100</span>
                  </div>
                  <PriorityBadge level={an.priority_level} showScore={false} />
                </div>
              </ScaleUp>
            )}
          </div>
        </div>
      </FadeIn>

      {/* Main Content Flow */}
      <div className="space-y-8">
        
        {/* Submitter Report Card */}
        <FadeIn direction="up" delay={0.1}>
          <div className="p-6 rounded-3xl bg-white border border-slate-200 space-y-4 shadow-sm">
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-600" /> Submitter Report & Description
            </h2>
            {challenge.submitter_org && (
              <div className="text-xs font-bold text-slate-700 bg-slate-100 p-2.5 rounded-xl border border-slate-200">
                Submitted by Organization / Authority: <span className="text-indigo-700 font-extrabold">{challenge.submitter_org}</span>
              </div>
            )}
            <p className="text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-line">
              {challenge.description}
            </p>

            {/* Attached Media Files */}
            {challenge.media_files && challenge.media_files.length > 0 && (
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <label className="block text-xs font-bold text-slate-700">Attached Multimedia Evidence:</label>
                <div className="flex flex-wrap gap-3">
                  {challenge.media_files.map((mf, i) => {
                    const isUnavailable = failedFiles[mf.name] || !mf.url;
                    const targetUrl = resolveMediaUrl(mf.url);
                    const ext = mf.name.split(".").pop()?.toLowerCase() || "";
                    const isImg = mf.type === "IMAGE" || ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext) || targetUrl.startsWith("data:image");
                    const isVideo = mf.type === "VIDEO" || ["mp4", "webm", "mov", "avi"].includes(ext);
                    const isPdf = mf.type === "PDF" || ext === "pdf";

                    const Icon = isVideo ? Video : isPdf ? FileText : ImageIcon;

                    if (isUnavailable) {
                      return (
                        <div
                          key={i}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-400 flex items-center gap-1.5 cursor-not-allowed opacity-75"
                          title="File no longer available on server"
                        >
                          <X className="w-3.5 h-3.5 text-slate-400" />
                          <span>{mf.name} (Evidence Unavailable)</span>
                        </div>
                      );
                    }

                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleMediaClick(mf)}
                        className="p-2 rounded-2xl bg-indigo-50/60 hover:bg-indigo-100/90 border border-indigo-200 hover:border-indigo-400 text-xs font-extrabold text-indigo-900 flex items-center gap-2.5 transition-all cursor-pointer shadow-2xs group text-left max-w-sm"
                        title={`Click to view ${mf.type || 'file'} evidence`}
                      >
                        {isImg && targetUrl ? (
                          <img
                            src={targetUrl}
                            alt={mf.name}
                            className="w-12 h-12 object-cover rounded-xl border border-indigo-200 group-hover:scale-105 transition-transform shrink-0"
                            onError={() => setFailedFiles((prev) => ({ ...prev, [mf.name]: true }))}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-white border border-indigo-200 flex items-center justify-center shrink-0">
                            <Icon className="w-5 h-5 text-indigo-600 group-hover:scale-110 transition-transform shrink-0" />
                          </div>
                        )}
                        <div className="min-w-0 pr-1">
                          <div className="flex items-center gap-1">
                            <span className="truncate max-w-[180px] font-bold text-slate-900 group-hover:text-indigo-700">{mf.name}</span>
                            <ExternalLink className="w-3 h-3 text-indigo-400 opacity-60 group-hover:opacity-100 shrink-0" />
                          </div>
                          <span className="text-[10px] text-indigo-600 font-semibold uppercase">{mf.type || "EVIDENCE"}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </FadeIn>

        {/* Public Challenge Journey Stepper */}
        <FadeIn direction="up">
          <div className="p-6 rounded-3xl bg-white border border-slate-200 space-y-4 shadow-sm">
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Kanban className="w-5 h-5 text-indigo-600" /> Public Challenge Resolution Journey
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
              {[
                { stage: "SUBMITTED", label: "Reported" },
                { stage: "AI_ANALYZED", label: "AI Analysed" },
                { stage: "ACCEPTED", label: "Accepted" },
                { stage: "IN_PROGRESS", label: "Project" },
                { stage: "PROTOTYPE", label: "Prototype" },
                { stage: "PILOT_TESTING", label: "Pilot" },
                { stage: "DEPLOYED", label: "Deployed" },
                { stage: "RESOLVED", label: "Resolved" }
              ].map((st, idx) => {
                const stagesList = ["SUBMITTED", "AI_ANALYZED", "ACCEPTED", "IN_PROGRESS", "PROTOTYPE", "PILOT_TESTING", "DEPLOYED", "RESOLVED"];
                const activeIdx = stagesList.indexOf(challenge.status);
                const isCurrent = challenge.status === st.stage;
                const isPast = activeIdx >= idx;

                return (
                  <div
                    key={st.stage}
                    className={`p-3 rounded-2xl border text-center space-y-1 transition-all ${
                      isCurrent
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-md scale-105"
                        : isPast
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200 font-bold"
                        : "bg-slate-50 text-slate-400 border-slate-200"
                    }`}
                  >
                    <div className="text-[10px] font-mono font-extrabold uppercase">{idx + 1}. {st.label}</div>
                    <div className="text-[9px] font-semibold">{isCurrent ? "Active" : isPast ? "Completed" : "Pending"}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </FadeIn>

        {/* Social Action Card */}
        <FadeIn direction="up">
          <CivicSocialCard challenge={challenge} />
        </FadeIn>

        {/* AI Intelligence Engine Breakdown */}
        {an && (
          <FadeIn direction="up" delay={0.2}>
            <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-50/50 via-white to-slate-50 border border-indigo-200 space-y-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-indigo-100 pb-4">
                <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  <Brain className="w-6 h-6 text-indigo-600 animate-pulse" />
                  AI Challenge Intelligence Engine
                </h2>
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold border border-emerald-300">
                  all-MiniLM-L6-v2 Embeddings
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-1 shadow-2xs">
                  <div className="text-xs text-slate-600 font-semibold">Predicted Primary Domain Category</div>
                  <div className="text-base font-extrabold text-slate-900">{an.predicted_category}</div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-1 shadow-2xs">
                  <div className="text-xs text-slate-600 font-semibold">Specific Subcategory Focus</div>
                  <div className="text-base font-extrabold text-indigo-700">{an.subcategory}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Extracted Semantic Keywords:</div>
                <div className="flex flex-wrap gap-2">
                  {an.keywords.map((kw, i) => (
                    <span key={i} className="px-3 py-1 rounded-xl text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                      #{kw}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-indigo-100">
                <div className="flex items-center justify-between text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                  <span>Explainable Priority Formula: <code className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-mono text-[11px] font-bold">P = 0.35(S) + 0.35(U × W_entity) + 0.30(I_norm)</code></span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center text-xs">
                  <div className="p-3 rounded-xl bg-white border border-slate-200 font-semibold shadow-2xs">
                    <div className="text-slate-500 text-[10px] uppercase font-bold">Severity (S)</div>
                    <div className="font-extrabold text-indigo-600 font-mono text-sm">{an.severity_score} / 10</div>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-slate-200 font-semibold shadow-2xs">
                    <div className="text-slate-500 text-[10px] uppercase font-bold">Urgency (U)</div>
                    <div className="font-extrabold text-amber-600 font-mono text-sm">{an.urgency_score} / 10</div>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-slate-200 font-semibold shadow-2xs">
                    <div className="text-slate-500 text-[10px] uppercase font-bold">Entity Weight (W)</div>
                    <div className="font-extrabold text-emerald-600 font-mono text-sm">{an.entity_weight ?? 1.0}x</div>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-slate-200 font-semibold shadow-2xs">
                    <div className="text-slate-500 text-[10px] uppercase font-bold">Impact (I_norm)</div>
                    <div className="font-extrabold text-blue-600 font-mono text-sm">{an.impact_score} / 10</div>
                  </div>
                  <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 font-semibold shadow-2xs col-span-2 sm:col-span-1">
                    <div className="text-indigo-800 text-[10px] uppercase font-bold">Final Priority (P)</div>
                    <div className="font-extrabold text-indigo-700 font-mono text-sm">{an.priority_score} / 100</div>
                  </div>
                </div>
              </div>

            </div>
          </FadeIn>
        )}

        {/* Semantic Duplicate Detection Visualizer */}
        {challenge.similar_challenges && challenge.similar_challenges.length > 0 && (
          <FadeIn direction="up" delay={0.3}>
            <div className="p-6 rounded-3xl bg-white border border-slate-200 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-600" /> Semantic Duplicate & Cluster Detection
                </h2>
                <span className="text-xs text-indigo-700 font-mono font-bold">Cosine Match Threshold ≥ 70%</span>
              </div>

              <div className="space-y-3">
                {challenge.similar_challenges.map((sim) => (
                  <div key={sim.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <Link href={`/explorer/${sim.id}`} className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">
                        {sim.id} — {sim.title} <ExternalLink className="w-3 h-3" />
                      </Link>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border font-mono ${
                        sim.similarity_score >= 85
                          ? "bg-red-100 text-red-800 border-red-200"
                          : "bg-amber-100 text-amber-800 border-amber-200"
                      }`}>
                        {sim.similarity_score}% Match ({sim.classification})
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 font-medium">Category: {sim.category} • District: {sim.district}</div>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        )}

        {/* Role-Based Actions & Status Container */}
        <FadeIn direction="up" delay={0.4}>
          <div className="p-6 rounded-3xl bg-white border border-indigo-200 space-y-6 shadow-sm">
            
            {/* Lifecycle Progress Status Banner for Accepted Challenges */}
            {isAccepted && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
                <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Solution Project Active
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  This challenge has been accepted by an accredited university R&D team and is actively undergoing field solution execution.
                </p>
                {challenge.project_id && (
                  <div className="pt-1">
                    <Link
                      href={`/projects?project=${challenge.project_id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-extrabold text-indigo-700 bg-white px-3 py-1.5 rounded-xl border border-indigo-200 shadow-2xs hover:bg-indigo-50 transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-600" /> Open CIVI-CONNECT Project Collaboration Room →
                    </Link>
                  </div>
                )}
              </div>

            )}

            {/* STRICT RBAC CONTROL SECTION */}
            {user?.role === "CITIZEN" && !isAccepted && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1">
                <div className="text-xs font-bold text-slate-800 flex items-center justify-center gap-1.5">
                  <Shield className="w-4 h-4 text-indigo-600" /> Citizen Review Mode
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Your challenge report has been published. You will be notified when an institution accepts and initiates project implementation.
                </p>
              </div>
            )}

            {/* UNIVERSITY ROLE: Only allow Accept / Decline controls */}
            {user?.role === "UNIVERSITY" && (
              <div className="space-y-3">
                <div className="text-xs font-extrabold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                  Authenticated University Actions
                </div>

                {isAccepted ? (
                  <button
                    disabled
                    className="w-full py-3.5 rounded-2xl bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold text-xs flex items-center justify-center gap-2 cursor-not-allowed"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Accepted & Active
                  </button>
                ) : isDeclined ? (
                  <button
                    disabled
                    className="w-full py-3 rounded-2xl bg-rose-50 text-rose-700 border border-rose-200 font-extrabold text-xs flex items-center justify-center gap-2 cursor-not-allowed"
                  >
                    <XCircle className="w-4 h-4 text-rose-500" />
                    Challenge Declined
                  </button>
                ) : (
                  <div className="space-y-2">
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={handleAccept}
                      disabled={accepting || declining}
                      className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2"
                    >
                      {accepting ? (
                        <Activity className="w-4 h-4 animate-spin text-white" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-white" />
                      )}
                      Accept & Instantiate Solution Project
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={handleDecline}
                      disabled={accepting || declining}
                      className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-red-600 border border-slate-300 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                    >
                      {declining ? <Activity className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                      Decline Challenge
                    </motion.button>
                  </div>
                )}
              </div>
            )}

            {/* GOVERNMENT_ADMIN ROLE: Read-only monitoring summary */}
            {user?.role === "GOVERNMENT_ADMIN" && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1">
                <div className="text-xs font-bold text-slate-800 flex items-center justify-center gap-1.5">
                  <Shield className="w-4 h-4 text-indigo-600" /> Government Administrative Monitor
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Monitoring status across university R&D partners.
                </p>
              </div>
            )}

          </div>
        </FadeIn>

      </div>

      {/* Multimedia Evidence Lightbox Preview Modal */}
      <AnimatePresence>
        {activeMediaModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveMediaModal(null)}
            className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col relative"
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold shrink-0">
                    {activeMediaModal.type === "VIDEO" ? <Video className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <div className="font-extrabold text-sm text-slate-900 truncate">{activeMediaModal.name}</div>
                    <div className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider">
                      VERIFIED CIVIORA MULTIMEDIA EVIDENCE • {activeMediaModal.type}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setActiveMediaModal(null)}
                  className="p-2 rounded-xl bg-slate-200/80 hover:bg-slate-300 text-slate-700 font-bold text-xs transition-colors flex items-center gap-1"
                  title="Close preview"
                >
                  <X className="w-5 h-5 text-slate-700" />
                </button>
              </div>

              {/* Modal Body Preview */}
              <div className="p-6 overflow-auto flex items-center justify-center bg-slate-950/90 min-h-[350px]">
                {activeMediaModal.type === "IMAGE" ? (
                  <img
                    src={activeMediaModal.url}
                    alt={activeMediaModal.name}
                    className="max-h-[70vh] w-auto max-w-full object-contain rounded-2xl shadow-xl"
                    onError={() => {
                      showToast("File could not be loaded from server", "error");
                      setFailedFiles((prev) => ({ ...prev, [activeMediaModal.name]: true }));
                      setActiveMediaModal(null);
                    }}
                  />
                ) : activeMediaModal.type === "VIDEO" ? (
                  <video
                    controls
                    autoPlay
                    src={activeMediaModal.url}
                    className="max-h-[70vh] w-full rounded-2xl shadow-xl"
                    onError={() => {
                      showToast("Video stream could not be loaded", "error");
                      setFailedFiles((prev) => ({ ...prev, [activeMediaModal.name]: true }));
                      setActiveMediaModal(null);
                    }}
                  />
                ) : (
                  <div className="text-center text-white space-y-3">
                    <FileText className="w-12 h-12 text-indigo-400 mx-auto" />
                    <p className="text-sm font-bold">{activeMediaModal.name}</p>
                    <a
                      href={activeMediaModal.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md hover:bg-indigo-700"
                    >
                      Open Document in New Tab →
                    </a>
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Click outside or press ✕ to close preview</span>
                <a
                  href={activeMediaModal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 font-bold text-slate-700 flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-indigo-600" /> Open Full File in New Tab
                </a>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

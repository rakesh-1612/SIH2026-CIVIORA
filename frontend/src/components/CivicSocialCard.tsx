"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, Repeat, Share2, MessageSquare, MapPin, Sparkles, User,
  Trash2, Flag, Send, Image as ImageIcon, Video, FileText, X, Globe,
  CheckCircle2, ArrowUpRight, Tag
} from "lucide-react";
import {
  ChallengeDetail, ChallengeCommentItem,
  toggleLikeChallenge, repostChallenge, undoRepostChallenge,
  recordShareChallenge, addChallengeComment, deleteChallengeComment, reportChallengeComment,
  API_BASE_URL, BACKEND_SERVER_URL, resolveMediaUrl
} from "@/lib/api";
import { PriorityBadge } from "@/components/PriorityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/lib/LanguageContext";

interface CivicSocialCardProps {
  challenge: ChallengeDetail;
  onUpdate?: () => void;
  repostedBy?: string;
}

function getInitials(name?: string) {
  if (!name) return "C";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function formatRelativeTime(dateString: string) {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch (e) {
    return dateString;
  }
}

export function CivicSocialCard({ challenge: initialCh, onUpdate, repostedBy }: CivicSocialCardProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { t, language } = useTranslation();

  const [ch, setCh] = useState<ChallengeDetail>(initialCh);
  const [liked, setLiked] = useState<boolean>(Boolean(initialCh.user_liked));
  const [likesCount, setLikesCount] = useState<number>(initialCh.likes_count || 0);

  const [reposted, setReposted] = useState<boolean>(Boolean(initialCh.user_reposted));
  const [repostsCount, setRepostsCount] = useState<number>(initialCh.reposts_count || 0);

  const [shared, setShared] = useState<boolean>(Boolean(initialCh.user_shared));
  const [sharesCount, setSharesCount] = useState<number>(initialCh.shares_count || 0);

  const [showComments, setShowComments] = useState<boolean>(false);
  const [comments, setComments] = useState<ChallengeCommentItem[]>(initialCh.comments || []);
  const [commentsCount, setCommentsCount] = useState<number>(initialCh.comments_count || (initialCh.comments?.length || 0));
  const [newCommentText, setNewCommentText] = useState<string>("");
  const [postingComment, setPostingComment] = useState<boolean>(false);

  const [activeMediaModal, setActiveMediaModal] = useState<{ name: string; type: string; url: string } | null>(null);

  // Dynamic priority state
  const [priorityScore, setPriorityScore] = useState<number>(ch.analysis?.priority_score || 50);
  const [priorityLevel, setPriorityLevel] = useState<string>(ch.analysis?.priority_level || "MEDIUM");
  const [basePriority, setBasePriority] = useState<number>(ch.analysis?.base_priority_score || ch.analysis?.priority_score || 50);
  const [communityBoost, setCommunityBoost] = useState<number>(ch.analysis?.community_boost || 0);

  const handleLike = async () => {
    if (!user) {
      showToast("Please sign in as a Citizen to engage with challenges", "info");
      return;
    }
    const prevLiked = liked;
    const prevCount = likesCount;
    setLiked(!prevLiked);
    setLikesCount(prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1);

    try {
      const res = await toggleLikeChallenge(ch.id);
      setLiked(res.user_liked);
      setLikesCount(res.likes_count);
      setBasePriority(res.base_priority);
      setCommunityBoost(res.community_boost);
      setPriorityScore(res.priority_score);
      setPriorityLevel(res.priority_level);
      if (onUpdate) onUpdate();
    } catch (err: unknown) {
      setLiked(prevLiked);
      setLikesCount(prevCount);
      const msg = err instanceof Error ? err.message : "Failed to toggle like";
      showToast(msg, "error");
    }
  };

  const handleRepost = async () => {
    if (!user) {
      showToast("Please sign in to repost challenges", "info");
      return;
    }
    try {
      if (reposted) {
        const res = await undoRepostChallenge(ch.id);
        setReposted(res.user_reposted);
        setRepostsCount(res.reposts_count);
        if (res.base_priority !== undefined) setBasePriority(res.base_priority);
        if (res.community_boost !== undefined) setCommunityBoost(res.community_boost);
        if (res.priority_score !== undefined) setPriorityScore(res.priority_score);
        showToast("Challenge removed from your reposts", "info");
      } else {
        const res = await repostChallenge(ch.id);
        setReposted(res.user_reposted);
        setRepostsCount(res.reposts_count);
        if (res.base_priority !== undefined) setBasePriority(res.base_priority);
        if (res.community_boost !== undefined) setCommunityBoost(res.community_boost);
        if (res.priority_score !== undefined) setPriorityScore(res.priority_score);
        showToast("Challenge reposted to your civic feed!", "success");
      }
      if (onUpdate) onUpdate();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to repost challenge";
      showToast(msg, "error");
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/explorer/${ch.id}`;
    let shareRecorded = false;

    if (navigator.share) {
      try {
        await navigator.share({
          title: ch.title,
          text: `Check out this civic challenge on CIVIORA: ${ch.title}`,
          url: shareUrl
        });
        shareRecorded = true;
      } catch (err) {
        // Cancelled or unsupported
      }
    }

    if (!shareRecorded) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        showToast("Challenge link copied to clipboard!", "success");
        shareRecorded = true;
      } catch (err) {
        showToast(`Share link: ${shareUrl}`, "info");
      }
    }

    if (shareRecorded) {
      try {
        const res = await recordShareChallenge(ch.id);
        setShared(res.user_shared);
        setSharesCount(res.shares_count);
        setCommunityBoost(res.community_boost);
        setPriorityScore(res.priority_score);
        if (onUpdate) onUpdate();
      } catch (err) {
        // Silent catch
      }
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast("Please sign in to add comments", "info");
      return;
    }
    if (!newCommentText.trim()) return;

    setPostingComment(true);
    try {
      const added = await addChallengeComment(ch.id, newCommentText);
      setComments((prev) => [...prev, added]);
      setCommentsCount((prev) => prev + 1);
      setNewCommentText("");
      showToast("Comment posted!", "success");
      if (onUpdate) onUpdate();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to post comment";
      showToast(msg, "error");
    } finally {
      setPostingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      await deleteChallengeComment(ch.id, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setCommentsCount((prev) => Math.max(0, prev - 1));
      showToast("Comment deleted", "info");
      if (onUpdate) onUpdate();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete comment";
      showToast(msg, "error");
    }
  };

  const handleReportComment = async (commentId: number) => {
    try {
      await reportChallengeComment(ch.id, commentId);
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, is_reported: true } : c))
      );
      showToast("Comment reported to platform moderators", "info");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to report comment";
      showToast(msg, "error");
    }
  };

  const submitterDisplayName = ch.submitter_name || ch.submitter_org || "Citizen Reporter";
function getCategoryColor(category?: string) {
  const cat = (category || "").toLowerCase();
  if (cat.includes("disaster")) return "bg-orange-50 text-orange-600 border-orange-200";
  if (cat.includes("water") || cat.includes("sanitation")) return "bg-sky-50 text-sky-600 border-sky-200";
  if (cat.includes("road") || cat.includes("transport") || cat.includes("infrastructure")) return "bg-indigo-50 text-indigo-600 border-indigo-200";
  if (cat.includes("waste")) return "bg-green-50 text-green-600 border-green-200";
  if (cat.includes("health")) return "bg-rose-50 text-rose-600 border-rose-200";
  if (cat.includes("education")) return "bg-purple-50 text-purple-600 border-purple-200";
  if (cat.includes("environment")) return "bg-emerald-50 text-emerald-600 border-emerald-200";
  if (cat.includes("energy")) return "bg-amber-50 text-amber-600 border-amber-200";
  if (cat.includes("safety")) return "bg-red-50 text-red-600 border-red-200";
  return "bg-indigo-50 text-indigo-700 border-indigo-200";
}

function getRoleBadgeColor(role?: string) {
  const r = (role || "").toUpperCase();
  if (r.includes("GOVERNMENT")) return "bg-blue-50 text-blue-700 border-blue-200";
  if (r.includes("UNIVERSITY") || r.includes("INSTITUTION")) return "bg-indigo-50 text-indigo-700 border-indigo-200";
  if (r.includes("INDUSTRY") || r.includes("MSME")) return "bg-teal-50 text-teal-700 border-teal-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

  const initials = getInitials(submitterDisplayName);
  const categoryStyle = getCategoryColor(ch.category);
  const roleBadgeStyle = getRoleBadgeColor(ch.submitter_type);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden hover:shadow-md hover:border-indigo-300 transition-all cursor-default group"
    >
      {/* Repost Header Banner */}
      {repostedBy && (
        <div className="bg-purple-50 px-6 py-2 border-b border-purple-100 flex items-center gap-2 text-xs font-bold text-purple-700">
          <Repeat className="w-3.5 h-3.5 text-purple-600 animate-repost-spin" />
          <span>Reposted by {repostedBy}</span>
        </div>
      )}

      <div className="p-5 sm:p-7 space-y-5">
        
        {/* POST AUTHOR HEADER */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Circular Avatar with Initial Fallback */}
            <div className="relative">
              <div className="w-11 h-11 rounded-full bg-indigo-600 text-white flex items-center justify-center font-extrabold text-sm shadow-xs border-2 border-white shrink-0">
                {initials}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white text-[8px]" title="Active Reporter">
                ✓
              </span>
            </div>

            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-extrabold text-slate-900 text-sm hover:text-indigo-600 transition-colors">
                  {submitterDisplayName}
                </span>
                {ch.submitter_type && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${roleBadgeStyle}`}>
                    {ch.submitter_type.replace("_", " ")}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 font-semibold pt-0.5">
                <span className="flex items-center gap-1 text-slate-600">
                  <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                  {ch.district}, {ch.state}
                </span>
                <span>•</span>
                <span>{formatRelativeTime(ch.created_at)}</span>
              </div>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <StatusBadge status={ch.status} />
          </div>
        </div>

        {/* POST TITLE */}
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <Link href={`/explorer/${ch.id}`} className="group/title flex-1">
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 group-hover/title:text-indigo-600 transition-colors leading-snug tracking-tight">
                {ch.title}
              </h2>
            </Link>
          </div>

          {/* Category & Topic Pills */}
          <div className="flex items-center gap-2 flex-wrap text-xs pt-0.5">
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full font-extrabold border text-xs ${categoryStyle}`}>
              <Tag className="w-3 h-3" />
              {ch.category}
            </span>
            {ch.subcategory && (
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 font-bold border border-slate-200 text-xs">
                {ch.subcategory}
              </span>
            )}
            <span className="font-mono text-slate-400 text-[11px] font-semibold ml-auto">
              ID: {ch.id}
            </span>
          </div>
        </div>

        {/* DESCRIPTION BODY */}
        <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-normal whitespace-pre-line">
          {ch.description}
        </p>

        {/* MEDIA EVIDENCE ATTACHMENTS */}
        {ch.media_files && ch.media_files.length > 0 && (
          <div className="space-y-2 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {ch.media_files.map((mf, idx) => {
                const targetUrl = resolveMediaUrl(mf.url);
                const ext = mf.name.split(".").pop()?.toLowerCase() || "";
                const isImg = mf.type === "IMAGE" || ["jpg", "jpeg", "png", "gif", "webp"].includes(ext) || targetUrl.startsWith("data:image");
                const isVideo = mf.type === "VIDEO" || ["mp4", "webm", "mov"].includes(ext);

                return (
                  <div
                    key={idx}
                    onClick={() => setActiveMediaModal({ name: mf.name, type: isImg ? "IMAGE" : isVideo ? "VIDEO" : "DOCUMENT", url: targetUrl })}
                    className="relative group rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 aspect-[16/9] cursor-pointer flex items-center justify-center shadow-xs"
                  >
                    {isImg && targetUrl ? (
                      <img src={targetUrl} alt={mf.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : isVideo && targetUrl ? (
                      <video src={targetUrl} className="w-full h-full object-cover" />
                    ) : (
                      <div className="p-3 text-center text-slate-300 space-y-1">
                        <FileText className="w-6 h-6 mx-auto text-amber-400" />
                        <div className="text-[10px] font-bold truncate max-w-[140px] text-white">{mf.name}</div>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5 backdrop-blur-[2px]">
                      {isImg ? <ImageIcon className="w-4 h-4" /> : isVideo ? <Video className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                      <span>View Media</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* AI PRIORITY & COMMUNITY IMPACT STRIP */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-800 font-semibold flex-wrap">
            <span className="inline-flex items-center gap-1 text-indigo-700 font-extrabold bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-100">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> AI Priority
            </span>
            <span>Base: <strong className="font-mono text-slate-900">{basePriority.toFixed(1)}</strong></span>
            <span>+</span>
            <span className="text-emerald-600 font-bold">Community Boost: +{communityBoost.toFixed(1)}</span>
          </div>

          <div className="shrink-0">
            <PriorityBadge level={priorityLevel} score={priorityScore} />
          </div>
        </div>

        {/* COLORFUL SOCIAL ACTION BAR */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          
          <div className="flex items-center gap-1 sm:gap-2">
            {/* LIKE BUTTON (Coral / Pink #F43F5E) */}
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={handleLike}
              className={`px-3 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                liked
                  ? "bg-rose-50 text-rose-600 border border-rose-200 shadow-xs"
                  : "bg-slate-50 hover:bg-rose-50 hover:text-rose-600 text-slate-600 border border-slate-200"
              }`}
            >
              <Heart className={`w-4 h-4 transition-transform ${liked ? "fill-rose-500 text-rose-500 animate-heart-pop scale-110" : "text-slate-400 group-hover:text-rose-500"}`} />
              <span>{likesCount}</span>
            </motion.button>

            {/* COMMENT BUTTON (Sky Blue #0EA5E9) */}
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={() => setShowComments(!showComments)}
              className={`px-3 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                showComments
                  ? "bg-sky-50 text-sky-600 border border-sky-200 shadow-xs"
                  : "bg-slate-50 hover:bg-sky-50 hover:text-sky-600 text-slate-600 border border-slate-200"
              }`}
            >
              <MessageSquare className={`w-4 h-4 ${showComments ? "text-sky-600" : "text-slate-400"}`} />
              <span>{commentsCount}</span>
            </motion.button>

            {/* REPOST BUTTON (Violet #8B5CF6) */}
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={handleRepost}
              className={`px-3 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                reposted
                  ? "bg-purple-50 text-purple-600 border border-purple-200 shadow-xs"
                  : "bg-slate-50 hover:bg-purple-50 hover:text-purple-600 text-slate-600 border border-slate-200"
              }`}
            >
              <Repeat className={`w-4 h-4 ${reposted ? "text-purple-600 animate-repost-spin" : "text-slate-400"}`} />
              <span>{repostsCount}</span>
            </motion.button>

            {/* SHARE BUTTON (Teal #14B8A6) */}
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={handleShare}
              className="px-3 py-1.5 rounded-full text-xs font-extrabold bg-slate-50 hover:bg-teal-50 hover:text-teal-600 text-slate-600 border border-slate-200 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Share Challenge"
            >
              <Share2 className="w-4 h-4 text-slate-400 hover:text-teal-600" />
              <span className="hidden sm:inline">{sharesCount}</span>
            </motion.button>
          </div>

          {/* VIEW DETAILS LINK (Indigo #4F46E5) */}
          <Link
            href={`/explorer/${ch.id}`}
            className="px-4 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold transition-all flex items-center gap-1 cursor-pointer shadow-xs active:scale-[0.98]"
          >
            <span>Details</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-indigo-200" />
          </Link>
        </div>

        {/* EXPANDABLE COMMENT SECTION */}
        <AnimatePresence>
          {showComments && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="pt-4 border-t border-slate-100 space-y-4 overflow-hidden"
            >
              <div className="text-xs font-extrabold text-slate-900 flex items-center justify-between">
                <span className="text-sky-700 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-sky-600" />
                  Community Discussion ({comments.length})
                </span>
                <span className="text-[11px] text-slate-400 font-normal">Moderated civic forum</span>
              </div>

              {/* Comment Input */}
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder="Add a constructive civic comment..."
                  className="flex-1 px-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-medium text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:border-sky-500 transition-all"
                />
                <button
                  type="submit"
                  disabled={postingComment || !newCommentText.trim()}
                  className="px-4 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-extrabold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" /> Post
                </button>
              </form>

              {/* Comments List */}
              {comments.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 font-medium bg-slate-50 rounded-2xl border border-slate-100">
                  No comments yet. Start the discussion!
                </div>
              ) : (
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {comments.map((comm) => {
                    const isMine = user && comm.user_id === user.id;
                    const commInitials = getInitials(comm.author_name);

                    return (
                      <div key={comm.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold flex items-center justify-center">
                              {commInitials}
                            </div>
                            <span className="font-extrabold text-slate-900">{comm.author_name}</span>
                            <span className="px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 text-[9px] font-mono font-bold">
                              {comm.author_role}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            {isMine && (
                              <button
                                onClick={() => handleDeleteComment(comm.id)}
                                className="text-slate-400 hover:text-red-500 p-1 cursor-pointer"
                                title="Delete comment"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleReportComment(comm.id)}
                              className={`p-1 cursor-pointer ${comm.is_reported ? "text-amber-600 font-bold" : "text-slate-400 hover:text-amber-500"}`}
                              title={comm.is_reported ? "Reported" : "Report comment"}
                            >
                              <Flag className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <p className="text-slate-700 font-normal pl-8">{comm.content}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Media Lightbox Modal */}
      <AnimatePresence>
        {activeMediaModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#07152A]/80 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
            onClick={() => setActiveMediaModal(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative bg-[#0B1F3A] rounded-3xl max-w-3xl w-full p-4 overflow-hidden border border-[#DDD6C8]/40 shadow-2xl cursor-default text-white"
            >
              <button
                onClick={() => setActiveMediaModal(null)}
                className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-[#183B63] text-white flex items-center justify-center hover:bg-[#07152A] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="p-2 space-y-3">
                <div className="text-xs font-bold text-slate-300">{activeMediaModal.name}</div>
                {activeMediaModal.type === "IMAGE" ? (
                  <img src={activeMediaModal.url} alt={activeMediaModal.name} className="max-h-[70vh] mx-auto rounded-2xl object-contain" />
                ) : (
                  <video src={activeMediaModal.url} controls autoPlay className="max-h-[70vh] mx-auto rounded-2xl w-full" />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}

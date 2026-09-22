"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  getChallenges, getCivicFeed, getUserActivity, ChallengeDetail, UserActivityData
} from "@/lib/api";
import { PriorityBadge } from "@/components/PriorityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { FadeIn } from "@/components/animations/MotionWrapper";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/ui/ToastProvider";
import { CivicSocialCard } from "@/components/CivicSocialCard";
import { useTranslation } from "@/lib/LanguageContext";
import { WelcomeLoginView } from "@/components/WelcomeLoginView";
import { 
  Flame, Compass, Clock, Heart, Repeat, MessageSquare, Filter, Search, Navigation, 
  Sparkles, User, MapPin, PlusCircle, ArrowRight, ShieldCheck, Building2, Landmark, GraduationCap, Loader2 
} from "lucide-react";

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Automatic redirect for logged-in non-citizen roles
  useEffect(() => {
    if (!loading && user) {
      if (user.role === "UNIVERSITY") {
        router.push("/institution");
      } else if (user.role === "GOVERNMENT_ADMIN") {
        router.push("/admin");
      } else if (user.role === "INDUSTRY_PARTNER") {
        router.push("/industry");
      }
    }
  }, [user, loading, router]);

  // Loading state while verifying auth session
  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-slate-500 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        <span className="text-sm font-semibold">Verifying Security Session & Permissions...</span>
      </div>
    );
  }

  // 1. UNAUTHENTICATED WELCOME / LOGIN VIEW
  if (!user) {
    return <WelcomeLoginView />;
  }

  // 2. AUTHENTICATED CITIZEN VIEW
  if (user.role === "CITIZEN") {
    return <CitizenDashboardView />;
  }

  // Redirecting spinner for other authenticated roles
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-slate-500 gap-3">
      <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      <span className="text-sm font-semibold">Redirecting to {user.role.replace("_", " ")} Workspace...</span>
    </div>
  );
}

// ----------------------------------------------------------------------
// 2. AUTHENTICATED CITIZEN SOCIAL FEED & MY ACTIVITY WORKSPACE
// ----------------------------------------------------------------------




// ----------------------------------------------------------------------
// 2. AUTHENTICATED CITIZEN SOCIAL FEED & MY ACTIVITY WORKSPACE
// ----------------------------------------------------------------------
function CitizenDashboardView() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation();

  const [activeMainTab, setActiveMainTab] = useState<"FEED" | "ACTIVITY">("FEED");
  const [activeFeedTab, setActiveFeedTab] = useState<"for_you" | "trending" | "nearby" | "recent">("for_you");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Location for Nearby Tab
  const [coords, setCoords] = useState<{ lat?: number; lng?: number }>({});
  const [locating, setLocating] = useState<boolean>(false);

  // Feed State
  const [feedItems, setFeedItems] = useState<ChallengeDetail[]>([]);
  const [loadingFeed, setLoadingFeed] = useState<boolean>(true);

  // Activity State
  const [activityData, setActivityData] = useState<UserActivityData | null>(null);
  const [activeActivityTab, setActiveActivityTab] = useState<"my_challenges" | "liked" | "reposted" | "comments">("my_challenges");
  const [loadingActivity, setLoadingActivity] = useState<boolean>(false);

  const CATEGORIES = [
    "ALL",
    "Disaster Management",
    "Water & Sanitation",
    "Infrastructure & Roads",
    "Public Safety",
    "Environmental Hazard",
    "Urban Governance"
  ];

  const LIFECYCLE_STAGES = [
    "SUBMITTED", "AI_ANALYZED", "UNDER_REVIEW", "MATCHED",
    "ACCEPTED", "IN_PROGRESS", "PROTOTYPE", "PILOT_TESTING", "DEPLOYED", "RESOLVED"
  ];

  const getInitials = (name?: string) => {
    if (!name) return "C";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const userInitials = getInitials(user?.name);

  // Request location explicitly
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      showToast("Geolocation is not supported by your browser", "error");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
        setActiveFeedTab("nearby");
        showToast(`Geolocated near Ranchi (${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)})`, "success");
      },
      (err) => {
        setLocating(false);
        showToast("Unable to fetch location. Showing default regional feed.", "info");
      }
    );
  };

  // Load Feed Data
  const fetchFeed = async () => {
    setLoadingFeed(true);
    try {
      const items = await getCivicFeed({
        tab: activeFeedTab,
        latitude: coords.lat,
        longitude: coords.lng,
        category: selectedCategory,
        search: searchQuery
      });
      setFeedItems(items);
    } catch (err) {
      console.error("Failed to fetch feed", err);
    } finally {
      setLoadingFeed(false);
    }
  };

  useEffect(() => {
    if (activeMainTab === "FEED") {
      requestAnimationFrame(() => fetchFeed());
    }
  }, [activeMainTab, activeFeedTab, selectedCategory, searchQuery, coords]);

  // Load Activity Data
  const fetchActivity = async () => {
    setLoadingActivity(true);
    try {
      const data = await getUserActivity();
      setActivityData(data);
    } catch (err) {
      console.error("Failed to load activity", err);
    } finally {
      setLoadingActivity(false);
    }
  };

  useEffect(() => {
    if (activeMainTab === "ACTIVITY") {
      requestAnimationFrame(() => fetchActivity());
    }
  }, [activeMainTab]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Citizen Social Feed Header */}
      <FadeIn direction="down">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center font-extrabold text-base shadow-xs shrink-0">
              {userInitials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  Welcome, {user?.name?.split(" ")[0] || "Citizen"} 👋
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-extrabold">
                  {user?.location || "Jharkhand"}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium pt-0.5">
                Public Civic Social Feed & Real-time Community Reports
              </p>
            </div>
          </div>
        </div>
      </FadeIn>

      {/* CREATE POST QUICK BAR */}
      {activeMainTab === "FEED" && (
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-extrabold text-xs shrink-0 shadow-xs">
              {userInitials}
            </div>
            <Link
              href="/submit"
              className="flex-1 py-3 px-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 text-xs font-medium transition-colors cursor-pointer flex items-center justify-between"
            >
              <span>What civic problem or community challenge are you witnessing today, {user?.name?.split(" ")[0]}?</span>
            </Link>
            <Link
              href="/submit"
              className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-xs flex items-center justify-center transition-all cursor-pointer active:scale-[0.98] shrink-0"
            >
              <span>Create Post</span>
            </Link>
          </div>
        </div>
      )}

      {/* MAIN VIEW SWITCHER: PUBLIC CIVIC FEED vs MY ACTIVITY */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveMainTab("FEED")}
            className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
              activeMainTab === "FEED"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Sparkles className="w-4 h-4 text-indigo-200" /> Public Civic Feed
          </button>

          <button
            onClick={() => setActiveMainTab("ACTIVITY")}
            className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
              activeMainTab === "ACTIVITY"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <User className="w-4 h-4" /> My Activity
          </button>
        </div>

        {activeMainTab === "FEED" && (
          <div className="text-xs text-slate-500 font-semibold">
            {feedItems.length} challenges in feed
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 1. PUBLIC CIVIC SOCIAL FEED VIEW (RESPONSIVE GRID) */}
      {/* ------------------------------------------------------------------ */}
      {activeMainTab === "FEED" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* MAIN FEED COLUMN (8 Cols on Desktop) */}
          <div className="lg:col-span-8 space-y-5">
            
            {/* Social Feed Tabs: For You (Indigo) | Trending (Orange) | Nearby (Green) | Recent (Blue) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-3xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                
                {/* For You → Indigo (#4F46E5) */}
                <button
                  onClick={() => setActiveFeedTab("for_you")}
                  className={`px-4 py-2 rounded-2xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                    activeFeedTab === "for_you"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 hover:bg-indigo-50 hover:text-indigo-600"
                  }`}
                >
                  <Compass className={`w-3.5 h-3.5 ${activeFeedTab === "for_you" ? "text-indigo-200" : "text-indigo-600"}`} /> For You
                </button>

                {/* Trending → Orange (#F97316) */}
                <button
                  onClick={() => setActiveFeedTab("trending")}
                  className={`px-4 py-2 rounded-2xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                    activeFeedTab === "trending"
                      ? "bg-orange-500 text-white shadow-xs"
                      : "text-slate-600 hover:bg-orange-50 hover:text-orange-600"
                  }`}
                >
                  <Flame className={`w-3.5 h-3.5 ${activeFeedTab === "trending" ? "text-orange-200 animate-flame-pulse" : "text-orange-500"}`} /> Trending
                </button>

                {/* Nearby → Emerald Green (#10B981) */}
                <button
                  onClick={() => {
                    if (!coords.lat) {
                      handleUseMyLocation();
                    } else {
                      setActiveFeedTab("nearby");
                    }
                  }}
                  className={`px-4 py-2 rounded-2xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                    activeFeedTab === "nearby"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-600"
                  }`}
                >
                  <MapPin className={`w-3.5 h-3.5 ${activeFeedTab === "nearby" ? "text-emerald-200" : "text-emerald-600"}`} /> Nearby
                </button>

                {/* Recent → Blue (#3B82F6) */}
                <button
                  onClick={() => setActiveFeedTab("recent")}
                  className={`px-4 py-2 rounded-2xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                    activeFeedTab === "recent"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 hover:bg-blue-50 hover:text-blue-600"
                  }`}
                >
                  <Clock className={`w-3.5 h-3.5 ${activeFeedTab === "recent" ? "text-blue-200" : "text-blue-600"}`} /> Recent
                </button>

              </div>

              {/* Geolocation Button for Nearby tab */}
              {activeFeedTab === "nearby" && (
                <button
                  onClick={handleUseMyLocation}
                  disabled={locating}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-xs flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Navigation className={`w-3.5 h-3.5 text-emerald-600 ${locating ? "animate-spin" : ""}`} />
                  {locating ? "Locating..." : coords.lat ? "Refetch Location" : "Use Location"}
                </button>
              )}
            </div>

            {/* Search & Category Controls */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="🔎 Search challenges by title, keyword, or district..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-indigo-600 shadow-xs transition-all"
                />
              </div>

              {/* Horizontally Scrollable Category Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat;
                  let colorClasses = "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50";
                  if (isSelected) {
                    if (cat === "Disaster Management") colorClasses = "bg-orange-500 text-white shadow-xs";
                    else if (cat === "Water & Sanitation") colorClasses = "bg-sky-500 text-white shadow-xs";
                    else if (cat === "Infrastructure & Roads") colorClasses = "bg-indigo-600 text-white shadow-xs";
                    else if (cat === "Public Safety") colorClasses = "bg-red-600 text-white shadow-xs";
                    else if (cat === "Environmental Hazard") colorClasses = "bg-emerald-600 text-white shadow-xs";
                    else if (cat === "Urban Governance") colorClasses = "bg-teal-600 text-white shadow-xs";
                    else colorClasses = "bg-indigo-600 text-white shadow-xs";
                  }
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${colorClasses}`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Social Feed List */}
            {loadingFeed ? (
              <div className="space-y-5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="p-7 rounded-3xl bg-white border border-slate-200 animate-pulse space-y-4">
                    <div className="h-4 bg-slate-200 rounded w-1/4" />
                    <div className="h-6 bg-slate-200 rounded w-3/4" />
                    <div className="h-16 bg-slate-200 rounded w-full" />
                  </div>
                ))}
              </div>
            ) : feedItems.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3 shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                  <Compass className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-extrabold text-slate-900">No Challenges Found</h3>
                  <p className="text-xs text-slate-500 font-medium">Try clearing search filters or changing the feed tab.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {feedItems.map((ch: any) => (
                  <CivicSocialCard key={ch.id} challenge={ch} onUpdate={fetchFeed} />
                ))}
              </div>
            )}

          </div>

          {/* SECONDARY SIDEBAR (4 Cols on Desktop - Hidden on Mobile/Tablet) */}
          <div className="hidden lg:block lg:col-span-4 space-y-5 sticky top-20">
            
            {/* Community Impact Card */}
            <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <h3 className="font-extrabold text-sm text-slate-900">Community Impact</h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-100 text-center space-y-0.5">
                  <div className="text-lg font-black text-indigo-700">{feedItems.length}</div>
                  <div className="text-[10px] text-indigo-600 font-bold uppercase">Feed Reports</div>
                </div>

                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100 text-center space-y-0.5">
                  <div className="text-lg font-black text-emerald-700">4</div>
                  <div className="text-[10px] text-emerald-600 font-bold uppercase">Active Roles</div>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 font-medium leading-snug">
                🤝 <strong className="text-slate-900">CIVIORA Quad-Helix Model:</strong> Citizens report issues, Universities prototype solutions, MSMEs provide funding, and Government tracks real-world deployment.
              </div>
            </div>

            {/* Quick Filter Categories Sidebar */}
            <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3">
              <h3 className="font-extrabold text-sm text-slate-900 border-b border-slate-100 pb-2">
                Explore Topics
              </h3>
              <div className="flex flex-wrap gap-1.5 text-xs">
                {CATEGORIES.filter(c => c !== "ALL").map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                      selectedCategory === cat
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    #{cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Platform Quick Links */}
            <div className="p-5 rounded-3xl bg-[#0B1F3A] text-white border border-[#183B63] space-y-3 shadow-md">
              <div className="text-xs font-bold text-[#C89B3C] uppercase tracking-wide">Civic Resolution Lifecycle</div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-[#C89B3C]"></span>
                  <span>1. Citizen Report & AI Priority</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-white"></span>
                  <span>2. Sentence-BERT Duplicate Check</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-[#C89B3C]"></span>
                  <span>3. University R&D Matching</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-[#3F7D5A]"></span>
                  <span>4. Industry Co-Funding & Deployment</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 2. MY ACTIVITY & PERSONAL CHALLENGE TRACKER WORKSPACE */}
      {/* ------------------------------------------------------------------ */}
      {activeMainTab === "ACTIVITY" && (
        <div className="space-y-6">
          
          {/* Sub-tabs: My Challenges | Liked | Reposted | My Comments */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[#DDD6C8]">
            <button
              onClick={() => setActiveActivityTab("my_challenges")}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                activeActivityTab === "my_challenges"
                  ? "bg-[#0B1F3A] text-white shadow-xs"
                  : "bg-[#EFE9DC] text-[#536174] hover:bg-[#E5DDCB]"
              }`}
            >
              My Challenges ({activityData?.my_challenges.length || 0})
            </button>

            <button
              onClick={() => setActiveActivityTab("liked")}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                activeActivityTab === "liked"
                  ? "bg-[#B94A48] text-white shadow-xs"
                  : "bg-[#EFE9DC] text-[#536174] hover:bg-[#E5DDCB]"
              }`}
            >
              <Heart className="w-3.5 h-3.5 inline mr-1" /> Liked ({activityData?.liked_challenges.length || 0})
            </button>

            <button
              onClick={() => setActiveActivityTab("reposted")}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                activeActivityTab === "reposted"
                  ? "bg-[#0B1F3A] text-white shadow-xs"
                  : "bg-[#EFE9DC] text-[#536174] hover:bg-[#E5DDCB]"
              }`}
            >
              <Repeat className="w-3.5 h-3.5 inline mr-1 text-[#C89B3C]" /> Reposted ({activityData?.reposted_challenges.length || 0})
            </button>

            <button
              onClick={() => setActiveActivityTab("comments")}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                activeActivityTab === "comments"
                  ? "bg-[#183B63] text-white shadow-xs"
                  : "bg-[#EFE9DC] text-[#536174] hover:bg-[#E5DDCB]"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 inline mr-1" /> My Comments ({activityData?.my_comments.length || 0})
            </button>
          </div>

          {loadingActivity ? (
            <div className="space-y-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="p-6 rounded-3xl bg-white border border-slate-200 animate-pulse space-y-3">
                  <div className="h-4 bg-slate-200 rounded w-1/4" />
                  <div className="h-6 bg-slate-200 rounded w-3/4" />
                </div>
              ))}
            </div>
          ) : (
            <div>
              
              {/* SUB-TAB 1: MY SUBMITTED CHALLENGES & TRACKER */}
              {activeActivityTab === "my_challenges" && (
                <div className="space-y-6">
                  {activityData?.my_challenges.length === 0 ? (
                    <div className="p-10 text-center bg-white rounded-3xl border border-slate-200 space-y-3 shadow-xs">
                      <PlusCircle className="w-8 h-8 text-indigo-600 mx-auto" />
                      <div className="text-sm font-extrabold text-slate-900">No Challenges Submitted Yet</div>
                      <Link
                        href="/submit"
                        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-extrabold text-xs shadow-xs hover:bg-indigo-700"
                      >
                        Submit Your First Challenge →
                      </Link>
                    </div>
                  ) : (
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    activityData?.my_challenges.map((ch: any) => {
                      const currentStageIndex = LIFECYCLE_STAGES.indexOf(ch.status);
                      const stagePct = currentStageIndex >= 0 ? Math.round(((currentStageIndex + 1) / LIFECYCLE_STAGES.length) * 100) : 20;

                      return (
                        <motion.div
                          key={ch.id}
                          whileHover={{ y: -2 }}
                          className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 space-y-5 shadow-xs hover:border-indigo-300 transition-all"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="text-xs font-mono text-indigo-700 font-extrabold px-2.5 py-1 bg-indigo-50 border border-indigo-200 rounded-lg">
                                {ch.id}
                              </span>
                              <StatusBadge status={ch.status} />
                              <span className="text-xs text-slate-500 font-medium">
                                Submitted {new Date(ch.created_at).toLocaleDateString()}
                              </span>
                            </div>

                            {ch.analysis && (
                              <PriorityBadge level={ch.analysis.priority_level} score={ch.analysis.priority_score} />
                            )}
                          </div>

                          <div className="space-y-2">
                            <h3 className="text-lg font-extrabold text-slate-900">{ch.title}</h3>
                            <p className="text-xs text-slate-600 leading-relaxed font-medium line-clamp-2">{ch.description}</p>
                          </div>

                          {/* Lifecycle Tracker Bar */}
                          <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                              <span>Lifecycle Stage: <span className="text-indigo-600 font-extrabold">{ch.status.replace("_", " ")}</span></span>
                              <span className="font-mono text-emerald-600">{stagePct}% Complete</span>
                            </div>
                            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                                style={{ width: `${stagePct}%` }}
                              />
                            </div>
                          </div>

                          <div className="flex justify-end pt-1">
                            <Link
                              href={`/explorer/${ch.id}`}
                              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-xs flex items-center gap-1.5"
                            >
                              Open Individual Tracker →
                            </Link>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              )}

              {/* SUB-TAB 2: LIKED CHALLENGES */}
              {activeActivityTab === "liked" && (
                <div className="space-y-6">
                  {activityData?.liked_challenges.length === 0 ? (
                    <div className="p-10 text-center bg-white rounded-3xl border border-slate-200 text-xs text-slate-500 font-medium">
                      You haven&apos;t liked any challenges yet.
                    </div>
                  ) : (
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    activityData?.liked_challenges.map((ch: any) => (
                      <CivicSocialCard key={ch.id} challenge={ch} onUpdate={fetchActivity} />
                    ))
                  )}
                </div>
              )}

              {/* SUB-TAB 3: REPOSTED CHALLENGES */}
              {activeActivityTab === "reposted" && (
                <div className="space-y-6">
                  {activityData?.reposted_challenges.length === 0 ? (
                    <div className="p-10 text-center bg-white rounded-3xl border border-slate-200 text-xs text-slate-500 font-medium">
                      You haven&apos;t reposted any challenges yet.
                    </div>
                  ) : (
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    activityData?.reposted_challenges.map((ch: any) => (
                      <CivicSocialCard key={ch.id} challenge={ch} onUpdate={fetchActivity} repostedBy={user?.name} />
                    ))
                  )}
                </div>
              )}

              {/* SUB-TAB 4: MY COMMENTS */}
              {activeActivityTab === "comments" && (
                <div className="space-y-4">
                  {activityData?.my_comments.length === 0 ? (
                    <div className="p-10 text-center bg-white rounded-3xl border border-slate-200 text-xs text-slate-500 font-medium">
                      You haven&apos;t posted any comments yet.
                    </div>
                  ) : (
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    activityData?.my_comments.map((comm: any) => (
                      <div key={comm.id} className="p-5 rounded-3xl bg-white border border-slate-200 space-y-2 shadow-xs">
                        <div className="flex items-center justify-between text-xs">
                          <Link href={`/explorer/${comm.challenge_id}`} className="font-extrabold text-indigo-600 hover:underline">
                            {comm.challenge_title}
                          </Link>
                          <span className="text-[11px] text-slate-400 font-mono">{new Date(comm.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-slate-800 font-medium bg-slate-50 p-3 rounded-2xl border border-slate-200">
                          &quot;{comm.content}&quot;
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}

            </div>
          )}

        </div>
      )}

    </div>
  );
}


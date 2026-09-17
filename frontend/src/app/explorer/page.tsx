"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, Filter, MapPin, ArrowUpRight, Compass, RefreshCw, Layers } from "lucide-react";
import { getChallenges, ChallengeDetail } from "@/lib/api";
import { PriorityBadge } from "@/components/PriorityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { FadeIn, FadeInStagger, FadeInStaggerItem } from "@/components/animations/MotionWrapper";
import { SkeletonCard } from "@/components/ui/SkeletonLoaders";

const CATEGORIES = [
  "ALL",
  "Disaster Management",
  "Infrastructure",
  "Environment",
  "Water Management",
  "Waste Management",
  "Public Safety",
  "Healthcare",
  "Education"
];

const PRIORITIES = ["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"];
const STATUSES = ["ALL", "SUBMITTED", "AI_ANALYZED", "MATCHED", "ACCEPTED", "IN_PROGRESS", "PROTOTYPE", "PILOT_TESTING", "DEPLOYED", "RESOLVED"];

export default function ChallengeExplorerPage() {
  const [challenges, setChallenges] = useState<ChallengeDetail[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("ALL");
  const [selectedPrio, setSelectedPrio] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  useEffect(() => {
    fetchData();
  }, [selectedCat, selectedPrio, selectedStatus]);

  async function fetchData() {
    setLoading(true);
    try {
      const data = await getChallenges({
        category: selectedCat,
        priority: selectedPrio,
        status: selectedStatus,
        search: search.trim()
      });
      setChallenges(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Header */}
      <FadeIn direction="down">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-extrabold mb-2">
              <Compass className="w-3.5 h-3.5 text-teal-700" />
              Civic Challenge Explorer Catalog
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Challenge Catalog</h1>
            <p className="text-sm text-slate-600 font-semibold">Search, filter, and inspect AI intelligence & duplicate scores across all reported societal challenges.</p>
          </div>
          <Link
            href="/submit"
            className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-extrabold shadow-xs transition-all active:scale-[0.98] inline-flex items-center gap-2 self-start md:self-auto"
          >
            + Submit New Challenge
          </Link>
        </div>
      </FadeIn>

      {/* Filter Bar */}
      <FadeIn direction="up">
        <div className="p-6 rounded-3xl bg-white border border-slate-200 space-y-4 shadow-2xs">
          <form onSubmit={handleSearchSubmit} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by keywords, subway, flooding, potholes, district..."
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs focus:outline-none focus:border-teal-700 font-medium"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-extrabold flex items-center gap-2 shadow-xs cursor-pointer active:scale-[0.98] transition-all"
            >
              Search
            </button>
          </form>

          {/* Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Category Domain</label>
              <select
                value={selectedCat}
                onChange={(e) => setSelectedCat(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:border-teal-700"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Priority Level</label>
              <select
                value={selectedPrio}
                onChange={(e) => setSelectedPrio(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:border-teal-700"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Lifecycle Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:border-teal-700"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </FadeIn>

      {/* Challenge Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : challenges.length === 0 ? (
        <div className="text-center py-16 px-6 bg-white rounded-3xl border border-slate-200 space-y-4 shadow-2xs max-w-2xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center mx-auto shadow-inner">
            <Compass className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-slate-900">No Challenges in Catalog Yet</h3>
            <p className="text-sm text-slate-600 font-medium max-w-md mx-auto">
              The database is clean and ready for real data. Submit your first real civic challenge anywhere in the world to see live AI analysis & map geotagging!
            </p>
          </div>
          <Link
            href="/submit"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-extrabold shadow-xs transition-all active:scale-[0.98]"
          >
            + Submit Real Challenge Now
          </Link>
        </div>
      ) : (
        <FadeInStagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {challenges.map((ch) => (
            <FadeInStaggerItem key={ch.id}>
              <motion.div
                whileHover={{ y: -3 }}
                transition={{ duration: 0.2 }}
                className="p-6 rounded-3xl bg-white border border-slate-200 flex flex-col justify-between space-y-4 hover:border-teal-400 transition-all shadow-2xs group h-full portal-citizen-card"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono text-teal-700 font-bold">{ch.id}</span>
                    <StatusBadge status={ch.status} />
                  </div>

                  <h3 className="text-base font-bold text-slate-900 group-hover:text-teal-700 transition-colors leading-snug">
                    {ch.title}
                  </h3>

                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed font-medium">
                    {ch.description}
                  </p>

                  {ch.analysis && (
                    <div className="pt-2">
                      <PriorityBadge level={ch.analysis.priority_level} score={ch.analysis.priority_score} />
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-semibold">
                  <span className="flex items-center gap-1 line-clamp-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {ch.location || `${ch.district}, ${ch.state}`}
                  </span>
                  <Link
                    href={`/explorer/${ch.id}`}
                    className="text-teal-700 font-bold hover:underline flex items-center gap-0.5"
                  >
                    AI Intelligence <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

              </motion.div>
            </FadeInStaggerItem>
          ))}
        </FadeInStagger>
      )}

    </div>
  );
}

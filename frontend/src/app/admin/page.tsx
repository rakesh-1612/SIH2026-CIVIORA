"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Activity,
  Building2,
  Layers,
  Trash2,
  ShieldAlert,
  DollarSign,
  CheckCircle2,
  Clock,
  Eye,
  ChevronRight,
  Shield,
  Layers3,
  Sparkles,
  Users,
  ArrowUpRight,
  PieChart as PieChartIcon,
  MapPin,
  Flame
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from "recharts";
import {
  getDashboardMetrics,
  getProjects,
  clearAllChallenges,
  getPendingUsers,
  updateUserStatus,
  DashboardMetrics,
  Project
} from "@/lib/api";
import { useToast } from "@/components/ui/ToastProvider";
import { FadeIn, FadeInStagger, FadeInStaggerItem } from "@/components/animations/MotionWrapper";
import { CountUpNumber } from "@/components/ui/CountUpNumber";
import { SkeletonMetric } from "@/components/ui/SkeletonLoaders";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/lib/auth";

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: "#dc2626",
  HIGH: "#f59e0b",
  MEDIUM: "#0d9488",
  LOW: "#64748b"
};

const CATEGORY_COLORS = ["#0d9488", "#6366f1", "#f59e0b", "#f97316", "#16a34a", "#0f766e", "#4f46e5"];

const STAGE_ORDER = ["ACCEPTED", "IN_PROGRESS", "PROTOTYPE", "PILOT_TESTING", "DEPLOYED", "RESOLVED"];

const STAGE_LABELS: Record<string, string> = {
  ACCEPTED: "Accepted",
  IN_PROGRESS: "In Progress",
  PROTOTYPE: "Prototype",
  PILOT_TESTING: "Pilot Testing",
  DEPLOYED: "Deployed",
  RESOLVED: "Resolved"
};

const STAGE_BADGES: Record<string, string> = {
  ACCEPTED: "bg-slate-100 text-slate-700 border-slate-300",
  IN_PROGRESS: "bg-amber-50 text-amber-800 border-amber-200",
  PROTOTYPE: "bg-orange-50 text-orange-800 border-orange-200",
  PILOT_TESTING: "bg-teal-50 text-teal-800 border-teal-200",
  DEPLOYED: "bg-emerald-50 text-emerald-800 border-emerald-200",
  RESOLVED: "bg-emerald-100 text-emerald-900 border-emerald-300"
};

export default function AdminDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={["GOVERNMENT_ADMIN"]}>
      <AdminDashboardContent />
    </ProtectedRoute>
  );
}

interface PendingUser {
  id: number;
  name: string;
  email: string;
  role: string;
  location?: string;
  organization_name?: string;
  department_sector?: string;
  account_status?: string;
}

interface RechartsClickPayload {
  district?: string;
  fullName?: string;
  rawStage?: string;
  payload?: {
    district?: string;
    fullName?: string;
    rawStage?: string;
  };
}

function AdminDashboardContent() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const { showToast } = useToast();
  const { user } = useAuth();

  const axisStroke = "#64748b";
  const tooltipStyle = {
    backgroundColor: "#ffffff",
    borderColor: "#cbd5e1",
    color: "#0f172a",
    borderRadius: "12px",
    fontSize: "12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
  };

  const loadPendingUsers = async () => {
    try {
      const data = (await getPendingUsers()) as PendingUser[];
      setPendingUsers(data);
    } catch (err) {
      console.error("Failed to fetch pending users", err);
    }
  };

  const handleUpdateStatus = async (userId: number, newStatus: string) => {
    try {
      await updateUserStatus(userId, newStatus);
      showToast(`User account status updated to ${newStatus}`, "success");
      loadPendingUsers();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to update user status";
      showToast(errorMsg, "error");
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [m, p] = await Promise.all([getDashboardMetrics(), getProjects()]);
      setMetrics(m);
      setProjects(p);
      await loadPendingUsers();
    } catch (err) {
      console.error(err);
      showToast("Failed to fetch Government Command Centre metrics", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || user.role !== "GOVERNMENT_ADMIN") {
      return;
    }
    requestAnimationFrame(() => loadData());
  }, [user]);

  const handleClearAllData = async () => {
    if (!window.confirm("Are you sure you want to clear all challenge records? This will remove all demo data so you can enter real data.")) {
      return;
    }
    try {
      setClearing(true);
      await clearAllChallenges();
      showToast("All demo data cleared! System is ready for real data input.", "success");
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to clear data";
      showToast(msg, "error");
    } finally {
      setClearing(false);
    }
  };

  // Fail-Safe Dual-Source Stage Counts Aggregation
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ACCEPTED: 0,
      IN_PROGRESS: 0,
      PROTOTYPE: 0,
      PILOT_TESTING: 0,
      DEPLOYED: 0,
      RESOLVED: 0
    };

    projects.forEach((p) => {
      const st = (p.status || "").toUpperCase();
      if (st in counts) {
        counts[st] += 1;
      }
    });

    const backendCounts = metrics?.lifecycle_stages || metrics?.lifecycle_counts || {};
    Object.keys(counts).forEach((st) => {
      if (backendCounts[st] && backendCounts[st] > counts[st]) {
        counts[st] = backendCounts[st];
      }
    });

    return counts;
  }, [projects, metrics]);

  const totalLifecycleProjects = useMemo(() => {
    return Object.values(stageCounts).reduce((a, b) => a + b, 0);
  }, [stageCounts]);

  // Lifecycle Bar Chart Data
  const lifecycleChartData = useMemo(() => {
    return STAGE_ORDER.map((stg) => ({
      stage: STAGE_LABELS[stg],
      rawStage: stg,
      count: stageCounts[stg] || 0
    }));
  }, [stageCounts]);

  // District Activity Data
  const districtActivityData = useMemo(() => {
    if (metrics?.district_distribution && metrics.district_distribution.length > 0) {
      return metrics.district_distribution.map((d) => {
        const districtProjs = projects.filter((p) => (p.challenge_district || "").toLowerCase() === d.district.toLowerCase()).length;
        return {
          district: d.district,
          challenges: d.count,
          projects: districtProjs
        };
      });
    }
    const map: Record<string, { challenges: number; projects: number }> = {};
    projects.forEach((p) => {
      const dst = p.challenge_district || "Ranchi";
      if (!map[dst]) map[dst] = { challenges: 0, projects: 0 };
      map[dst].projects += 1;
    });
    return Object.keys(map).map((dst) => ({
      district: dst,
      challenges: map[dst].challenges || map[dst].projects,
      projects: map[dst].projects
    }));
  }, [metrics, projects]);

  // Institution Compact Chart Data
  const institutionChartData = useMemo(() => {
    if (metrics?.institution_performance && metrics.institution_performance.length > 0) {
      return metrics.institution_performance.slice(0, 5).map((inst) => ({
        name: inst.institution_name.replace("Indian Institute of Technology (ISM) Dhanbad", "IIT (ISM) Dhanbad")
                                  .replace("National Institute of Technology Jamshedpur (NIT Jamshedpur)", "NIT Jamshedpur")
                                  .replace("Birla Institute of Technology (BIT Mesra), Ranchi", "BIT Mesra")
                                  .replace("Indian Institute of Information Technology (IIIT) Ranchi", "IIIT Ranchi")
                                  .replace("All India Institute of Medical Sciences (AIIMS) Deoghar", "AIIMS Deoghar"),
        fullName: inst.institution_name,
        projects: inst.total_projects,
        avgProgress: inst.avg_progress,
        resolved: inst.resolved
      }));
    }
    const map: Record<string, { total: number; sumProg: number; resolved: number }> = {};
    projects.forEach((p) => {
      const instName = p.institution_name || "University R&D";
      if (!map[instName]) map[instName] = { total: 0, sumProg: 0, resolved: 0 };
      map[instName].total += 1;
      map[instName].sumProg += p.progress || 0;
      if (p.status === "RESOLVED") map[instName].resolved += 1;
    });
    return Object.keys(map).slice(0, 5).map((instName) => ({
      name: instName.split(" ")[0] + " Univ",
      fullName: instName,
      projects: map[instName].total,
      avgProgress: Math.round(map[instName].sumProg / map[instName].total),
      resolved: map[instName].resolved
    }));
  }, [metrics, projects]);

  // Top At-Risk Projects (Top 3-5)
  const topAtRiskProjects = useMemo(() => {
    if (metrics?.projects_requiring_attention && metrics.projects_requiring_attention.length > 0) {
      return metrics.projects_requiring_attention.slice(0, 4);
    }
    return projects
      .filter((p) => p.progress < 30 || p.status === "PROTOTYPE")
      .slice(0, 4)
      .map((p) => ({
        project_id: p.id,
        project_name: p.project_name,
        institution_name: p.institution_name,
        status: p.status,
        progress: p.progress,
        reasons: [`R&D progress at ${p.progress}% requiring milestone verification`],
        reason_summary: `Progress at ${p.progress}%`
      }));
  }, [metrics, projects]);

  // Funding Snapshot Calculations
  const fundingSnapshot = useMemo(() => {
    const requested = metrics?.funding_overview?.total_funding_requested || metrics?.funding_overview?.total_requested || 30.5;
    const committed = metrics?.funding_overview?.total_funding_committed || metrics?.funding_overview?.total_committed || 43.0;
    const remaining = Math.max(0, requested - committed);
    const commPct = requested > 0 ? Math.min(100, Math.round((committed / requested) * 100)) : 100;
    return { requested, committed, remaining, commPct };
  }, [metrics]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonMetric key={i} />)}
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="py-20 text-center space-y-4">
        <div className="text-slate-600 font-bold text-sm">Unable to load command center metrics at this moment.</div>
        <button
          onClick={loadData}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md transition-all"
        >
          Retry Analytics Connection
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      
      {/* Executive Command Dashboard Header */}
      <FadeIn direction="down">
        <div className="border-b border-slate-200 pb-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-md">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-extrabold uppercase tracking-wide">
                  <Shield className="w-3.5 h-3.5 text-indigo-600" />
                  State Government Executive Command Dashboard
                </div>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Civic Operations & Analytics Overview</h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Live Database Synchronized
              </div>
              <button
                onClick={handleClearAllData}
                disabled={clearing}
                className="px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
                {clearing ? "Clearing Data..." : "Clear Demo Data"}
              </button>
            </div>
          </div>

          <p className="text-sm text-slate-600 font-semibold max-w-4xl">
            High-level executive dashboard aggregating civic challenges, institutional R&D progress, district density, and multi-company funding commitments across Jharkhand.
          </p>

          {/* Quick Nav Links to Detail Hubs */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => router.push("/projects")}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-indigo-900 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Layers3 className="w-3.5 h-3.5" /> Open Project Monitoring Hub →
            </button>
            <button
              onClick={() => router.push("/industry")}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <DollarSign className="w-3.5 h-3.5" /> Open Funding & Impact Hub →
            </button>
            <button
              onClick={() => router.push("/institution")}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-extrabold flex items-center gap-1.5 transition-all"
            >
              <Building2 className="w-3.5 h-3.5" /> Open Institution Hub →
            </button>
          </div>
        </div>
      </FadeIn>

      {/* PENDING GOVERNMENT / ORGANIZATIONAL ACCOUNT VERIFICATIONS */}
      {pendingUsers.length > 0 && (
        <FadeIn direction="up">
          <div className="p-6 rounded-3xl bg-amber-50/80 border border-amber-200 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-amber-200/60 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-amber-900 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-600 animate-pulse" /> Pending Account Authorization Queue ({pendingUsers.length})
                </h3>
                <p className="text-xs text-amber-800 font-medium pt-0.5">
                  Review and verify registered Government, University, or MSME accounts requiring administrative authorization.
                </p>
              </div>
              <button
                onClick={loadPendingUsers}
                className="text-xs font-bold text-amber-900 hover:underline"
              >
                Refresh List 🔄
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingUsers.map((u: PendingUser) => (
                <div key={u.id} className="p-4 rounded-2xl bg-white border border-amber-200 space-y-3 shadow-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-mono font-extrabold text-slate-500">ID #{u.id} • {u.role.replace("_", " ")}</div>
                      <div className="text-sm font-extrabold text-slate-900">{u.name}</div>
                      <div className="text-xs text-indigo-700 font-bold">{u.email}</div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 text-[10px] font-extrabold border border-amber-300">
                      PENDING VERIFICATION
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 space-y-0.5 font-medium bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {u.organization_name && <div>🏛️ <strong>Organization:</strong> {u.organization_name}</div>}
                    {u.location && <div>📍 <strong>Location:</strong> {u.location}</div>}
                    {u.department_sector && <div>🔬 <strong>Domain/Sector:</strong> {u.department_sector}</div>}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => handleUpdateStatus(u.id, "REJECTED")}
                      className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-extrabold border border-red-200 transition-colors"
                    >
                      Reject Account
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(u.id, "ACTIVE")}
                      className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-xs transition-colors flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approve Account
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      )}

      {/* 5. TOP 6 EXECUTIVE KEY METRICS GRID */}
      <FadeInStagger className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        
        <FadeInStaggerItem>
          <motion.div whileHover={{ y: -4 }} className="p-5 rounded-2xl bg-white border border-slate-200 text-center space-y-1 shadow-sm">
            <div className="text-xs text-slate-500 font-bold flex items-center justify-center gap-1">
              <Layers3 className="w-3.5 h-3.5 text-indigo-500" /> Total Challenges
            </div>
            <div className="text-3xl font-extrabold text-slate-900">
              <CountUpNumber value={metrics.total_challenges} />
            </div>
            <div className="text-[10px] text-slate-400 font-semibold">Logged in Database</div>
          </motion.div>
        </FadeInStaggerItem>

        <FadeInStaggerItem>
          <motion.div whileHover={{ y: -4 }} className="p-5 rounded-2xl bg-white border border-slate-200 text-center space-y-1 shadow-sm">
            <div className="text-xs text-slate-500 font-bold flex items-center justify-center gap-1">
              <Activity className="w-3.5 h-3.5 text-blue-500" /> Active Projects
            </div>
            <div className="text-3xl font-extrabold text-blue-600">
              <CountUpNumber value={Math.max(projects.length, metrics.active_projects)} />
            </div>
            <div className="text-[10px] text-blue-500 font-semibold">Under R&D / Testing</div>
          </motion.div>
        </FadeInStaggerItem>

        <FadeInStaggerItem>
          <motion.div whileHover={{ y: -4 }} className="p-5 rounded-2xl bg-white border border-slate-200 text-center space-y-1 shadow-sm">
            <div className="text-xs text-slate-500 font-bold flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Resolved / Deployed
            </div>
            <div className="text-3xl font-extrabold text-emerald-600">
              <CountUpNumber value={stageCounts["RESOLVED"] || metrics.resolved_challenges} />
            </div>
            <div className="text-[10px] text-emerald-600 font-semibold">Field Solutions</div>
          </motion.div>
        </FadeInStaggerItem>

        <FadeInStaggerItem>
          <motion.div whileHover={{ y: -4 }} className="p-5 rounded-2xl bg-white border border-slate-200 text-center space-y-1 shadow-sm">
            <div className="text-xs text-slate-500 font-bold flex items-center justify-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500" /> High / Critical
            </div>
            <div className="text-3xl font-extrabold text-red-600">
              <CountUpNumber value={metrics.high_critical_challenges} />
            </div>
            <div className="text-[10px] text-red-500 font-semibold">Urgent Priority</div>
          </motion.div>
        </FadeInStaggerItem>

        <FadeInStaggerItem>
          <motion.div whileHover={{ y: -4 }} className="p-5 rounded-2xl bg-white border border-slate-200 text-center space-y-1 shadow-sm">
            <div className="text-xs text-slate-500 font-bold flex items-center justify-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500" /> Projects At Risk
            </div>
            <div className="text-3xl font-extrabold text-amber-600">
              <CountUpNumber value={topAtRiskProjects.length || metrics.projects_at_risk_count} />
            </div>
            <div className="text-[10px] text-amber-600 font-semibold">Requires Attention</div>
          </motion.div>
        </FadeInStaggerItem>

        <FadeInStaggerItem>
          <motion.div whileHover={{ y: -4 }} className="p-5 rounded-2xl bg-white border border-slate-200 text-center space-y-1 shadow-sm">
            <div className="text-xs text-slate-500 font-bold flex items-center justify-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Total Funding
            </div>
            <div className="text-3xl font-extrabold text-emerald-600">
              ₹<CountUpNumber value={fundingSnapshot.committed} decimals={1} />L
            </div>
            <div className="text-[10px] text-slate-400 font-semibold">MSME & CSR Committed</div>
          </motion.div>
        </FadeInStaggerItem>

      </FadeInStagger>

      {/* ROW 1: PROJECT LIFECYCLE CHART & CHALLENGE CATEGORY DONUT CHART */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* 6. Project Lifecycle Distribution Chart */}
        <FadeIn direction="up">
          <div className="p-6 rounded-3xl bg-white border border-slate-200 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600" /> Project Lifecycle Stage Distribution
                </h3>
                <p className="text-xs text-slate-500 font-medium">Click any stage bar to open filtered Project Monitoring.</p>
              </div>
              <button
                onClick={() => router.push("/projects")}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
              >
                View Hub <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={lifecycleChartData}>
                  <XAxis dataKey="stage" stroke={axisStroke} fontSize={10} tickLine={false} />
                  <YAxis stroke={axisStroke} fontSize={10} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar
                    dataKey="count"
                    fill="#4f46e5"
                    radius={[6, 6, 0, 0]}
                    onClick={(data: RechartsClickPayload) => {
                      const stage = data?.rawStage || data?.payload?.rawStage;
                      if (stage) {
                        router.push(`/projects?stage=${stage}`);
                      }
                    }}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </FadeIn>

        {/* 7. Societal Challenge Category Donut Chart */}
        <FadeIn direction="up" delay={0.1}>
          <div className="p-6 rounded-3xl bg-white border border-slate-200 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5 text-emerald-600" /> Societal Challenge Distribution
                </h3>
                <p className="text-xs text-slate-500 font-medium">Breakdown of reported civic issues by domain category.</p>
              </div>
              <button
                onClick={() => router.push("/projects")}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
              >
                View Details <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="h-64 w-full flex items-center justify-center">
              {metrics.category_distribution && metrics.category_distribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={metrics.category_distribution}
                      dataKey="count"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      label={({ name, percent }: { name?: string; percent?: number }) => `${name || ""} ${((percent || 0) * 100).toFixed(0)}%`}
                    >
                      {metrics.category_distribution.map((entry, idx) => (
                        <Cell key={entry.category} fill={CATEGORY_COLORS[idx % CATEGORY_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-slate-400 font-bold text-xs">No category data recorded.</div>
              )}
            </div>
          </div>
        </FadeIn>

      </div>

      {/* ROW 2: DISTRICT ACTIVITY CHART & CONCISE FUNDING SNAPSHOT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* 8. District Challenge & Project Activity Chart */}
        <FadeIn direction="up">
          <div className="p-6 rounded-3xl bg-white border border-slate-200 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-emerald-600" /> District Challenge & Project Activity
                </h3>
                <p className="text-xs text-slate-500 font-medium">Activity density per district across Jharkhand. Hover for details, click to inspect.</p>
              </div>
              <button
                onClick={() => router.push("/map")}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
              >
                Open GIS Map <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="h-64 w-full">
              {districtActivityData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={districtActivityData}>
                    <XAxis dataKey="district" stroke={axisStroke} fontSize={10} tickLine={false} />
                    <YAxis stroke={axisStroke} fontSize={10} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar
                      dataKey="challenges"
                      name="Challenges Logged"
                      fill="#059669"
                      radius={[4, 4, 0, 0]}
                      onClick={(data: RechartsClickPayload) => {
                        const dist = data?.district || data?.payload?.district;
                        if (dist) {
                          router.push(`/projects?district=${encodeURIComponent(dist)}`);
                        }
                      }}
                      className="cursor-pointer"
                    />
                    <Bar
                      dataKey="projects"
                      name="Active R&D Projects"
                      fill="#4f46e5"
                      radius={[4, 4, 0, 0]}
                      onClick={(data: RechartsClickPayload) => {
                        const dist = data?.district || data?.payload?.district;
                        if (dist) {
                          router.push(`/projects?district=${encodeURIComponent(dist)}`);
                        }
                      }}
                      className="cursor-pointer"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs font-bold">No district data logged.</div>
              )}
            </div>
          </div>
        </FadeIn>

        {/* 9. Concise Funding Snapshot */}
        <FadeIn direction="up" delay={0.1}>
          <div
            onClick={() => router.push("/industry")}
            className="p-6 rounded-3xl bg-white border border-slate-200 space-y-5 shadow-xs hover:border-purple-300 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2 group-hover:text-purple-600 transition-colors">
                  <DollarSign className="w-5 h-5 text-purple-600" /> Multi-Company CSR Funding Overview
                </h3>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-xs text-slate-500 font-medium">Aggregated co-funding contributions across MSMEs and industry partners.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-100">
                <div className="text-[10px] font-bold text-slate-500 uppercase">Total Funding Requested</div>
                <div className="text-xl font-extrabold text-slate-900">₹{fundingSnapshot.requested} Lakhs</div>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                <div className="text-[10px] font-bold text-slate-500 uppercase">Total Committed</div>
                <div className="text-xl font-extrabold text-emerald-700">₹{fundingSnapshot.committed} Lakhs</div>
              </div>
            </div>
          </div>
        </FadeIn>

      </div>

      {/* ROW 3: CIVIC SOCIAL ENGAGEMENT & REPOST ANALYTICS */}
      <FadeIn direction="up">
        <div className="p-6 rounded-3xl bg-white border border-slate-200 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-extrabold">
                <Flame className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                COMMUNITY SOCIAL ENGAGEMENT ANALYTICS
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight pt-1">
                Citizen Social Feed & Repost Signal Monitoring
              </h3>
              <p className="text-xs text-slate-600 font-semibold pt-0.5">
                Track how citizen engagement (Likes, Reposts, Shares, Comments) generates explainable Community Priority Boosts.
              </p>
            </div>

            <div className="flex items-center gap-3 font-mono text-xs font-bold text-slate-700 bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <div>Total Likes: <strong className="text-rose-600">{metrics.social_engagement_overview?.total_likes || 0}</strong></div>
              <div>•</div>
              <div>Total Reposts: <strong className="text-emerald-600">{metrics.social_engagement_overview?.total_reposts || 0}</strong></div>
              <div>•</div>
              <div>Total Comments: <strong className="text-indigo-600">{metrics.social_engagement_overview?.total_comments || 0}</strong></div>
            </div>
          </div>

          {/* Most Reposted & Highest Boosted Challenges */}
          <div className="space-y-4">
            <h4 className="text-sm font-extrabold text-slate-900">Highest Community-Engaged & Reposted Challenges</h4>
            {!metrics.most_reposted_challenges || metrics.most_reposted_challenges.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 font-medium bg-slate-50 rounded-2xl border border-slate-200">
                No social repost activity logged yet in feed.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {metrics.most_reposted_challenges.map((ch: any) => (
                  <div key={ch.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-extrabold text-indigo-700 px-2 py-0.5 bg-indigo-50 border border-indigo-200 rounded">
                          {ch.id}
                        </span>
                        <span className="text-xs font-extrabold text-slate-900">{ch.title}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-semibold">
                        📍 {ch.district} • Category: {ch.category}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 flex-wrap shrink-0">
                      <div className="text-xs font-mono font-bold text-slate-700 bg-white px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-3">
                        <span>❤️ {ch.likes_count}</span>
                        <span>🔄 {ch.reposts_count}</span>
                        <span>💬 {ch.comments_count}</span>
                      </div>

                      <div className="text-xs font-bold bg-white p-2.5 rounded-xl border border-amber-300 text-right">
                        <div className="text-[10px] text-slate-500 uppercase">Explainable Breakdown</div>
                        <div className="text-slate-700 font-mono">
                          Base: {ch.base_priority?.toFixed(1)} + <span className="text-emerald-600 font-bold">Boost: +{ch.community_boost?.toFixed(1)}</span> = <strong className="text-indigo-700">{ch.final_priority?.toFixed(1)}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </FadeIn>




      {/* ROW 3: INSTITUTION PERFORMANCE COMPACT VISUAL & AT-RISK SUMMARY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* 10. Compact Institution Project Activity */}
        <FadeIn direction="up">
          <div className="p-6 rounded-3xl bg-white border border-slate-200 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-600" /> Institution Project Activity
                </h3>
                <p className="text-xs text-slate-500 font-medium">Comparing active R&D projects & avg progress across lead universities.</p>
              </div>
              <button
                onClick={() => router.push("/institution")}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
              >
                Institution Hub <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="h-64 w-full">
              {institutionChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={institutionChartData}>
                    <XAxis dataKey="name" stroke={axisStroke} fontSize={10} tickLine={false} />
                    <YAxis stroke={axisStroke} fontSize={10} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar
                      dataKey="projects"
                      name="Active Projects"
                      fill="#4f46e5"
                      radius={[4, 4, 0, 0]}
                      onClick={(data: RechartsClickPayload) => {
                        const fn = data?.fullName || data?.payload?.fullName;
                        if (fn) {
                          router.push(`/projects?institution=${encodeURIComponent(fn)}`);
                        }
                      }}
                      className="cursor-pointer"
                    />
                    <Bar
                      dataKey="avgProgress"
                      name="Avg Progress %"
                      fill="#d97706"
                      radius={[4, 4, 0, 0]}
                      onClick={(data: RechartsClickPayload) => {
                        const fn = data?.fullName || data?.payload?.fullName;
                        if (fn) {
                          router.push(`/projects?institution=${encodeURIComponent(fn)}`);
                        }
                      }}
                      className="cursor-pointer"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs font-bold">No institution activity recorded.</div>
              )}
            </div>
          </div>
        </FadeIn>

        {/* 11. Projects Requiring Attention (Compact Risk Summary) */}
        <FadeIn direction="up" delay={0.1}>
          <div className="p-6 rounded-3xl bg-white border border-slate-200 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-600 animate-pulse" /> Projects Requiring Attention
                </h3>
                <p className="text-xs text-slate-500 font-medium">Automated risk detection flags based on stored milestone & funding data.</p>
              </div>
              <button
                onClick={() => router.push("/projects")}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
              >
                Project Monitoring <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {topAtRiskProjects.length > 0 ? (
                topAtRiskProjects.map((item) => (
                  <motion.div
                    key={item.project_id}
                    whileHover={{ x: 4 }}
                    onClick={() => router.push(`/projects?project=${item.project_id}`)}
                    className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200 flex items-center justify-between gap-3 text-xs cursor-pointer hover:bg-amber-100/60 transition-all"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold text-slate-500">{item.project_id}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${STAGE_BADGES[item.status] || "bg-slate-100 text-slate-700"}`}>
                          {STAGE_LABELS[item.status] || item.status} — {item.progress}%
                        </span>
                      </div>
                      <div className="font-bold text-slate-900 line-clamp-1">{item.project_name}</div>
                      <div className="text-[11px] text-amber-800 font-medium line-clamp-1">
                        ⚠️ {item.reason_summary || item.reasons?.[0]}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-amber-600 shrink-0" />
                  </motion.div>
                ))
              ) : (
                <div className="p-6 text-center text-slate-400 font-bold text-xs bg-slate-50 rounded-2xl border border-slate-200">
                  No projects currently flagged for administrative attention.
                </div>
              )}
            </div>
          </div>
        </FadeIn>

      </div>

      {/* ROW 4: RECENT CIVIORA ACTIVITY AUDIT TIMELINE */}
      <FadeIn direction="up">
        <div className="p-6 rounded-3xl bg-white border border-slate-200 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-600 animate-pulse" /> Recent CIVIORA Audit Activity Log
            </h3>
            <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200">
              Live Database Actions
            </span>
          </div>

          <div className="space-y-2">
            {metrics.recent_activities && metrics.recent_activities.length > 0 ? (
              metrics.recent_activities.map((act) => (
                <motion.div
                  key={act.id}
                  whileHover={{ x: 4 }}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-slate-900">{act.action}</div>
                    <div className="text-[11px] text-slate-500 font-semibold">Performed By: {act.performed_by}</div>
                  </div>
                  <span className="font-mono text-[10px] text-slate-500 shrink-0 font-bold">
                    {act.timestamp ? new Date(act.timestamp).toLocaleTimeString() : ""}
                  </span>
                </motion.div>
              ))
            ) : (
              <div className="py-4 text-center text-slate-400 text-xs font-bold">No activity logs recorded yet.</div>
            )}
          </div>
        </div>
      </FadeIn>

    </div>
  );
}

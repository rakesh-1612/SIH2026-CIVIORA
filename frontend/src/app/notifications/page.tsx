"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCircle2, Filter, ExternalLink, ArrowRight, MessageSquare, DollarSign, Kanban, AlertTriangle, Sparkles, Flag } from "lucide-react";
import { getNotifications, markNotificationRead, markAllNotificationsRead, NotificationItem } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { FadeIn, FadeInStagger, FadeInStaggerItem } from "@/components/animations/MotionWrapper";

type FilterTab = "ALL" | "UNREAD" | "PROJECTS" | "FUNDING" | "MESSAGES" | "CHALLENGES";

export default function NotificationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("ALL");

  useEffect(() => {
    async function load() {
      try {
        const data = await getNotifications();
        setNotifications(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [user]);

  const handleRead = async (id: number) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead(user?.role);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleItemClick = async (n: NotificationItem) => {
    if (!n.is_read) {
      await handleRead(n.id);
    }
    if (n.link) {
      router.push(n.link);
    }
  };

  const filtered = notifications.filter((n) => {
    if (filter === "UNREAD") return !n.is_read;
    if (filter === "PROJECTS") return n.type === "PROJECT" || n.type === "MILESTONE" || n.related_entity_type === "PROJECT";
    if (filter === "FUNDING") return n.type === "FUNDING" || n.related_entity_type === "FUNDING";
    if (filter === "MESSAGES") return n.type === "MESSAGE" || n.related_entity_type === "MESSAGE";
    if (filter === "CHALLENGES") return n.type === "CHALLENGE" || n.type === "SOCIAL" || n.related_entity_type === "CHALLENGE";
    return true;
  });

  const getBadgeStyle = (type: string) => {
    switch (type?.toUpperCase()) {
      case "PROJECT":
        return { bg: "bg-teal-50 text-teal-800 border-teal-200", icon: Kanban, label: "PROJECT" };
      case "MILESTONE":
        return { bg: "bg-indigo-50 text-indigo-800 border-indigo-200", icon: Flag, label: "MILESTONE" };
      case "FUNDING":
        return { bg: "bg-amber-50 text-amber-800 border-amber-200", icon: DollarSign, label: "FUNDING" };
      case "MESSAGE":
        return { bg: "bg-teal-50 text-teal-800 border-teal-200", icon: MessageSquare, label: "CIVI-CONNECT" };
      case "CHALLENGE":
        return { bg: "bg-amber-50 text-amber-800 border-amber-200", icon: AlertTriangle, label: "CHALLENGE" };
      case "SOCIAL":
        return { bg: "bg-orange-50 text-orange-800 border-orange-200", icon: Sparkles, label: "SOCIAL" };
      default:
        return { bg: "bg-slate-100 text-slate-800 border-slate-200", icon: Bell, label: "SYSTEM" };
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-slate-500 font-bold">Loading Notifications Center...</div>;
  }

  const unreadTotal = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Header */}
      <FadeIn direction="down">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-extrabold">
              <Bell className="w-3.5 h-3.5 text-teal-700" /> Real-Time Stakeholder Notifications
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Notifications Inbox</h1>
            <p className="text-xs text-slate-600">Track project milestones, CSR funding offers, CIVI-CONNECT messages, and challenge updates across CIVIORA.</p>
          </div>

          {unreadTotal > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-4 py-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-xs border border-teal-200 transition-all shrink-0 flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-teal-700" /> Mark All as Read
            </button>
          )}
        </div>
      </FadeIn>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        {(["ALL", "UNREAD", "PROJECTS", "FUNDING", "MESSAGES", "CHALLENGES"] as FilterTab[]).map((t) => {
          const count = notifications.filter((n) => {
            if (t === "UNREAD") return !n.is_read;
            if (t === "PROJECTS") return n.type === "PROJECT" || n.type === "MILESTONE" || n.related_entity_type === "PROJECT";
            if (t === "FUNDING") return n.type === "FUNDING" || n.related_entity_type === "FUNDING";
            if (t === "MESSAGES") return n.type === "MESSAGE" || n.related_entity_type === "MESSAGE";
            if (t === "CHALLENGES") return n.type === "CHALLENGE" || n.type === "SOCIAL" || n.related_entity_type === "CHALLENGE";
            return true;
          }).length;

          return (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                filter === t
                  ? "bg-teal-700 text-white shadow-xs"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              {t.charAt(0) + t.slice(1).toLowerCase()}
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                filter === t ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Notification Items List */}
      <FadeInStagger className="space-y-3">
        {filtered.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-500 text-sm font-semibold">
            No notifications match your current filter.
          </div>
        ) : (
          filtered.map((n) => {
            const badge = getBadgeStyle(n.type);
            const BadgeIcon = badge.icon;
            return (
              <FadeInStaggerItem key={n.id}>
                <div
                  onClick={() => handleItemClick(n)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-4 ${
                    n.is_read
                      ? "bg-white border-slate-200 hover:border-slate-300"
                      : "bg-indigo-50/70 border-indigo-200 shadow-xs hover:border-indigo-300"
                  }`}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-extrabold flex items-center gap-1 ${badge.bg}`}>
                        <BadgeIcon className="w-3 h-3" />
                        {badge.label}
                      </span>
                      <span className="font-extrabold text-sm text-slate-900">{n.title}</span>
                      {!n.is_read && (
                        <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[9px] font-extrabold animate-pulse">
                          NEW
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed">{n.message}</p>

                    <div className="flex items-center gap-3 pt-1 text-[10px] text-slate-400 font-mono">
                      <span>Target Role: {n.user_role}</span>
                      <span>•</span>
                      <span>{new Date(n.created_at).toLocaleString()}</span>
                    </div>
                  </div>

                  {n.link && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleItemClick(n);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shrink-0 flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      View <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </FadeInStaggerItem>
            );
          })
        )}
      </FadeInStagger>

    </div>
  );
}

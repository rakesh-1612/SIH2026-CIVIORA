"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, ComponentType } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Compass, Building2, Kanban, BarChart3, Map, Menu, X, User, LogOut, Lock, Briefcase, Bell, Cpu, DollarSign } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { getNotifications, markNotificationRead, markAllNotificationsRead, NotificationItem } from "@/lib/api";
import { UserProfileModal } from "@/components/UserProfileModal";
import { useTranslation } from "@/lib/LanguageContext";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    if (!user) return;

    async function fetchNotifs() {
      try {
        const data = await getNotifications();
        setNotifications(data);
      } catch (err) {
        console.error(err);
      }
    }
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 5000);
    return () => clearInterval(interval);
  }, [user]);

  const activeNotifications = user ? notifications : [];
  const unreadCount = activeNotifications.filter((n) => !n.is_read).length;

  const handleMarkRead = async (id: number) => {
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

  const handleNotificationClick = async (n: NotificationItem) => {
    if (!n.is_read) {
      await handleMarkRead(n.id);
    }
    setNotificationsOpen(false);
    if (n.link) {
      router.push(n.link);
    }
  };

  // Dynamic Role-Based Nav Items
  let navItems: { name: string; href: string; icon: ComponentType<{ className?: string }> }[] = [];

  if (user?.role === "CITIZEN") {
    navItems = [];
  } else if (user?.role === "UNIVERSITY") {
    navItems = [
      { name: t("nav.institutionHub", "Institution Hub"), href: "/institution", icon: Building2 },
      { name: t("nav.projects", "Solution Projects"), href: "/projects", icon: Kanban },
      { name: t("nav.funding", "Funding Requests"), href: "/industry", icon: DollarSign },
      { name: t("nav.explore", "Catalog Explorer"), href: "/explorer", icon: Compass },
    ];
  } else if (user?.role === "GOVERNMENT_ADMIN") {
    navItems = [
      { name: t("nav.commandCenter", "Command Center"), href: "/admin", icon: BarChart3 },
      { name: t("nav.map", "Geospatial Map"), href: "/map", icon: Map },
      { name: t("nav.institutionHub", "Institution Hub"), href: "/institution", icon: Building2 },
      { name: t("nav.projects", "Project Monitoring"), href: "/projects", icon: Kanban },
      { name: t("nav.funding", "Funding & Impact"), href: "/industry", icon: DollarSign },
    ];
  } else if (user?.role === "INDUSTRY_PARTNER") {
    navItems = [
      { name: t("nav.funding", "Funding Requests"), href: "/industry", icon: DollarSign },
      { name: t("nav.projects", "Solution Projects"), href: "/projects", icon: Kanban },
      { name: t("nav.explore", "Catalog Explorer"), href: "/explorer", icon: Compass },
    ];
  }

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 text-slate-900 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group shrink-0">
          <motion.div
            whileHover={{ scale: 1.04 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
            className="w-10 h-10 rounded-xl bg-indigo-600 p-0.5 shadow-sm"
          >
            <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center">
              <Shield className="w-5 h-5 text-indigo-600" />
            </div>
          </motion.div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight text-slate-900">
                CIVIORA
              </span>
              <span className="px-2 py-0.5 text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></span>
                LIVE
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-semibold">{t("nav.logoSubtitle", "Civic Intelligence Digital Platform")}</p>
          </div>
        </Link>

        {/* Navigation Links Desktop */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative px-3.5 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 text-slate-600 hover:text-slate-900"
              >
                {isActive && (
                  <motion.div
                    layoutId="navbar-active-pill"
                    className="absolute inset-0 bg-indigo-50 border border-indigo-200 rounded-lg shadow-xs"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
                <Icon className={`w-4 h-4 relative z-10 ${isActive ? "text-indigo-600" : "text-slate-500 group-hover:text-slate-900"}`} />
                <span className={`relative z-10 ${isActive ? "text-indigo-700 font-extrabold" : ""}`}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Active Auth Role & Notification Bell */}
        <div className="hidden lg:flex items-center gap-3">
          
          {user && (
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 transition-colors cursor-pointer"
                title="Notifications"
              >
                <Bell className={`w-4 h-4 text-slate-700 ${unreadCount > 0 ? "animate-bounce" : ""}`} />
                {unreadCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 15 }}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-extrabold flex items-center justify-center shadow-xs"
                  >
                    {unreadCount}
                  </motion.span>
                )}
              </motion.button>

              {/* Notification Dropdown Panel */}
              <AnimatePresence>
                {notificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-slate-200 shadow-xl z-50 overflow-hidden"
                  >
                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-indigo-600" />
                        <span className="font-bold text-sm text-slate-900">Notifications</span>
                        {unreadCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 text-xs font-extrabold border border-rose-200">
                            {unreadCount} new
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                      {activeNotifications.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-500">No notifications available.</div>
                      ) : (
                        activeNotifications.slice(0, 5).map((n) => (
                          <div
                            key={n.id}
                            onClick={() => handleNotificationClick(n)}
                            className={`p-3.5 text-xs transition-colors cursor-pointer ${
                              n.is_read ? "bg-white hover:bg-slate-50" : "bg-indigo-50/50 hover:bg-indigo-50"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="font-bold text-slate-900">{n.title}</div>
                              {!n.is_read && <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-1" />}
                            </div>
                            <p className="text-slate-600 text-[11px] mt-1 leading-snug">{n.message}</p>
                            {n.link && (
                              <span className="text-[10px] text-indigo-600 font-bold mt-1.5 inline-flex items-center gap-1 hover:underline">
                                View Details →
                              </span>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-center">
                      <Link
                        href="/notifications"
                        onClick={() => setNotificationsOpen(false)}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                      >
                        View All Notifications Inbox →
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {user ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setProfileModalOpen(true)}
                title="View & Edit Profile"
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs flex items-center gap-2 transition-all group cursor-pointer"
              >
                <User className="w-3.5 h-3.5 text-indigo-600 group-hover:scale-110 transition-transform" />
                <div className="text-left">
                  <div className="font-bold text-slate-900 leading-none">{user.name.split(" ")[0]}</div>
                  <div className="text-[10px] font-mono text-indigo-600 font-extrabold">{user.role}</div>
                </div>
              </button>

              <button
                onClick={logout}
                title="Sign Out"
                className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign Out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs hover:-translate-y-0.5 active:scale-[0.98] transition-all flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5 text-white" /> Sign In
            </Link>
          )}
        </div>

        {/* Mobile Controls */}
        <div className="flex items-center gap-2 lg:hidden">
          <Link href="/notifications" className="p-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 relative">
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 text-white text-[8px] rounded-full flex items-center justify-center">{unreadCount}</span>}
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

      </div>

      {/* Global User Profile Modal */}
      <UserProfileModal isOpen={profileModalOpen} onClose={() => setProfileModalOpen(false)} />

      {/* Mobile Dropdown Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="md:hidden bg-[#FFFDF7] border-b border-[#DDD6C8] px-4 py-4 space-y-3"
          >

            {user && (
              <div className="p-3 rounded-xl bg-[#EFE9DC] border border-[#DDD6C8] flex items-center justify-between text-xs mb-2">
                <div>
                  <span className="font-bold text-[#0B1F3A] block">{user.name}</span>
                  <span className="font-mono text-[#183B63] font-bold text-[10px]">{user.role}</span>
                </div>
                <button
                  onClick={() => {
                    setProfileModalOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-[#FFFDF7] hover:bg-[#EFE9DC] border border-[#DDD6C8] text-[#0B1F3A] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <User className="w-3.5 h-3.5 text-[#0B1F3A]" /> View Profile
                </button>
              </div>
            )}

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    isActive
                      ? "bg-[#EFE9DC] text-[#0B1F3A] border border-[#DDD6C8]"
                      : "text-[#536174] hover:bg-[#EFE9DC]/60"
                  }`}
                >
                  <Icon className="w-4 h-4 text-[#0B1F3A]" />
                  {item.name}
                </Link>
              );
            })}

            <div className="pt-2 border-t border-[#DDD6C8] flex items-center justify-end">
              {user ? (
                <button onClick={logout} className="text-xs text-[#B94A48] font-bold flex items-center gap-1 cursor-pointer">
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-xs text-[#0B1F3A] font-bold hover:underline"
                >
                  Sign In to CIVIORA →
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

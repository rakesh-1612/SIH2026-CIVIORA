"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { User, Mail, Shield, Building2, MapPin, Phone, Check, X, Edit3, Loader2, Home, ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/ui/ToastProvider";
import { useTranslation } from "@/lib/LanguageContext";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const router = useRouter();
  const { user, updateProfile } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [departmentSector, setDepartmentSector] = useState("");
  const [saving, setSaving] = useState(false);

  // Synchronize internal state whenever modal opens or user updates
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setPhone(user.phone || "");
      setLocation(user.location || "");
      setOrganizationName(user.organization_name || "");
      setDepartmentSector(user.department_sector || "");
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handleStartEdit = () => {
    setName(user.name || "");
    setPhone(user.phone || "");
    setLocation(user.location || "");
    setOrganizationName(user.organization_name || "");
    setDepartmentSector(user.department_sector || "");
    setEditing(true);
  };

  const handleCancelEdit = () => {
    setName(user.name || "");
    setPhone(user.phone || "");
    setLocation(user.location || "");
    setOrganizationName(user.organization_name || "");
    setDepartmentSector(user.department_sector || "");
    setEditing(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({
        name,
        phone,
        location,
        organization_name: organizationName,
        department_sector: departmentSector
      });
      showToast("Profile details updated successfully!", "success");
      setEditing(false);
    } catch (err: any) {
      showToast(err.message || "Failed to update profile", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleGoHome = () => {
    onClose();
    router.push("/");
  };

  return (
    <AnimatePresence>
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07152A]/60 backdrop-blur-sm cursor-pointer"
      >
        <motion.div
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.18 }}
          className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden cursor-default"
        >
          {/* Header */}
          <div className="p-6 bg-indigo-600 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
                <User className="w-5 h-5 text-indigo-200" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold tracking-tight">{t("nav.profile", "Profile & Settings")}</h2>
                <p className="text-xs text-indigo-100">{t("footer.platformName", "CIVIORA Platform")} Account</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* CLEAR "HOME" / "BACK TO HOME" BUTTON */}
              <button
                onClick={handleGoHome}
                className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/20 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Return to Citizen Home Feed"
              >
                <Home className="w-3.5 h-3.5 text-indigo-200" />
                <span>Home</span>
              </button>

              {/* Close (X) Button */}
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Close Profile"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
            {/* Status Pills */}
            <div className="flex items-center gap-2 flex-wrap pb-2 border-b border-slate-100">
              <span className="px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-extrabold">
                Role: {user.role.replace("_", " ")}
              </span>

              <span
                className={`px-3 py-1 rounded-full border text-xs font-extrabold ${
                  user.account_status === "ACTIVE"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-700 border-amber-200 animate-pulse"
                }`}
              >
                Status: {user.account_status || "ACTIVE"}
              </span>

              <span className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-mono font-bold">
                Auth: {user.auth_mode || "REAL"}
              </span>
            </div>

            {!editing ? (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                    <span className="text-slate-400 font-semibold block text-[10px]">FULL NAME</span>
                    <div className="font-extrabold text-slate-900 text-sm">{user.name}</div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                    <span className="text-slate-400 font-semibold block text-[10px]">EMAIL ADDRESS</span>
                    <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span className="truncate">{user.email}</span>
                    </div>
                  </div>

                  {user.organization_name && (
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1 sm:col-span-2">
                      <span className="text-slate-400 font-semibold block text-[10px]">ORGANIZATION / INSTITUTION</span>
                      <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        {user.organization_name}
                      </div>
                    </div>
                  )}

                  {user.department_sector && (
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                      <span className="text-slate-400 font-semibold block text-[10px]">DEPARTMENT / SECTOR</span>
                      <div className="font-extrabold text-slate-900">{user.department_sector}</div>
                    </div>
                  )}

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                    <span className="text-slate-400 font-semibold block text-[10px]">LOCATION</span>
                    <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      {user.location || "Jharkhand"}
                    </div>
                  </div>

                  {user.phone && (
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                      <span className="text-slate-400 font-semibold block text-[10px]">PHONE</span>
                      <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        {user.phone}
                      </div>
                    </div>
                  )}
                </div>

                {/* Profile Actions: Home & Edit Profile */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleGoHome}
                    className="flex-1 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-200 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                  >
                    <Home className="w-4 h-4 text-indigo-600" />
                    <span>← Back to Home Feed</span>
                  </button>

                  <button
                    onClick={handleStartEdit}
                    className="flex-1 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                  >
                    <Edit3 className="w-4 h-4 text-indigo-200" />
                    <span>Edit Profile</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-900 block">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-900 block">Phone Number</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 9876543210"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-900 focus:outline-none focus:border-indigo-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-900 block">City / Location</label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Ranchi, Jharkhand"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-900 focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-900 block">Organization / Company Name</label>
                  <input
                    type="text"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    placeholder="Organization name"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-900 block">Department / Sector</label>
                  <input
                    type="text"
                    value={departmentSector}
                    onChange={(e) => setDepartmentSector(e.target.value)}
                    placeholder="e.g., Urban Planning, R&D"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 text-indigo-200" />}
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}


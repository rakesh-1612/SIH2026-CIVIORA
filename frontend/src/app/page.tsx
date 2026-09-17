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
// 1. UNAUTHENTICATED WELCOME & PRODUCTION AUTH / DEMO LOGIN VIEW
// ----------------------------------------------------------------------
function WelcomeLoginView() {
  const { login, register, quickLoginDemo, forgotPassword, resetPassword } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation();

  const [authMode, setAuthMode] = useState<"SIGN_IN" | "SIGN_UP">("SIGN_IN");
  const [loadingRole, setLoadingRole] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccessNotice, setAuthSuccessNotice] = useState<string | null>(null);

  // Sign In State
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");

  // Sign Up State
  const [signUpRole, setSignUpRole] = useState<"CITIZEN" | "UNIVERSITY" | "INDUSTRY_PARTNER" | "GOVERNMENT_ADMIN">("CITIZEN");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [departmentSector, setDepartmentSector] = useState("");

  // Forgot Password Modal State
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);
  const [simulatedTokenNotice, setSimulatedTokenNotice] = useState<string | null>(null);

  // Quick Demo Login Handler
  const handleQuickLogin = async (role: "CITIZEN" | "UNIVERSITY" | "GOVERNMENT_ADMIN" | "INDUSTRY_PARTNER") => {
    setLoadingRole(role);
    setAuthError(null);
    try {
      await quickLoginDemo(role);
    } catch (e: any) {
      setAuthError(e.message || "Demo login failed");
    } finally {
      setLoadingRole(null);
    }
  };

  // Real Account Sign In Handler
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccessNotice(null);

    if (!signInEmail || !signInPassword) {
      setAuthError("Please enter both email and password.");
      return;
    }

    setAuthLoading(true);
    try {
      await login(signInEmail, signInPassword);
      showToast("Signed in successfully!", "success");
    } catch (err: any) {
      setAuthError(err.message || "Invalid email or password.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Real Account Sign Up Handler
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccessNotice(null);

    // Validation
    if (!name || !email || !password || !confirmPassword) {
      setAuthError("Please fill out all required fields.");
      return;
    }

    if (password.length < 8) {
      setAuthError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setAuthError("Passwords do not match. Please check and try again.");
      return;
    }

    if ((signUpRole === "UNIVERSITY" || signUpRole === "INDUSTRY_PARTNER" || signUpRole === "GOVERNMENT_ADMIN") && !organizationName) {
      setAuthError("Organization / Institution name is required for this role.");
      return;
    }

    setAuthLoading(true);
    try {
      const res = await register({
        name,
        email,
        password,
        confirmPassword,
        role: signUpRole,
        organizationName,
        phone,
        location,
        departmentSector
      });

      if (res.requiresVerification) {
        setAuthSuccessNotice(res.message);
        showToast("Account registered! Awaiting admin approval.", "info");
      } else {
        showToast("Account created successfully! Welcome to CIVIORA.", "success");
      }
    } catch (err: any) {
      setAuthError(err.message || "Registration failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Forgot Password Step 1
  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotMessage(null);
    setSimulatedTokenNotice(null);

    try {
      const res = await forgotPassword(forgotEmail);
      setForgotMessage(res.message);
      if (res.simulated_reset_link) {
        // Extract token from simulated link for smooth prototype experience
        const match = res.simulated_reset_link.match(/token=([^&]+)/);
        if (match && match[1]) {
          setResetToken(match[1]);
          setSimulatedTokenNotice(`Dev Helper: Reset Token copied -> ${match[1]}`);
        }
      }
      setForgotStep(2);
    } catch (err: any) {
      setForgotMessage(err.message || "Failed to process password reset request.");
    } finally {
      setForgotLoading(false);
    }
  };

  // Forgot Password Step 2
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetToken || !newPassword || !confirmNewPassword) {
      setForgotMessage("Please fill in all fields.");
      return;
    }
    if (newPassword.length < 8) {
      setForgotMessage("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setForgotMessage("New passwords do not match.");
      return;
    }

    setForgotLoading(true);
    try {
      const res = await resetPassword(resetToken, newPassword, confirmNewPassword);
      showToast(res.message || "Password reset successful!", "success");
      setIsForgotModalOpen(false);
      setAuthMode("SIGN_IN");
      setSignInEmail(forgotEmail);
    } catch (err: any) {
      setForgotMessage(err.message || "Failed to reset password.");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 py-8 px-4 sm:px-6">
      {/* Hero Header with Atmospheric Color Depth */}
      <div className="p-8 sm:p-14 rounded-3xl bg-slate-900 text-white shadow-xl space-y-6 relative overflow-hidden border border-slate-800">
        {/* Subtle Atmospheric Gradient Layer */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-24 -left-20 w-[500px] h-[500px] bg-teal-900/25 rounded-full blur-3xl animate-atmospheric-1" />
          <div className="absolute -bottom-28 -right-16 w-[500px] h-[500px] bg-indigo-950/40 rounded-full blur-3xl animate-atmospheric-2" />
        </div>

        {/* Content Staggered Entrance Animations */}
        <div className="relative z-10 space-y-4 max-w-4xl">
          {/* CIVIORA Label */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/15 border border-teal-400/30 text-teal-200 text-xs font-bold tracking-wide backdrop-blur-md"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>CIVIORA • CIVIC TECHNOLOGY PLATFORM</span>
          </motion.div>

          {/* Main Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25, ease: "easeOut" }}
            className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight text-white"
          >
            From Civic Problems to <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-200 via-emerald-100 to-indigo-200">Real Solutions</span>
          </motion.h1>

          {/* Supporting Description */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
            className="text-slate-300 text-sm sm:text-base max-w-2xl leading-relaxed font-normal pt-1"
          >
            A digital platform connecting citizens, universities, industry partners, and government to solve real-world societal challenges.
          </motion.p>
        </div>
      </div>

      {/* Main Authentication Grid: Real Account Auth & Demo Access */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Real Account Sign In / Sign Up Card (7 Cols) */}
        <FadeIn direction="up" delay={0.1} className="lg:col-span-7">
          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-md space-y-6">
            
            {/* Clean Section Title (Tab Switcher Removed) */}
            <div className="border-b border-slate-200 pb-4">
              <h2 className="text-xl font-extrabold text-slate-900">
                {authMode === "SIGN_IN" ? "Sign In to Real Account" : "Create CIVIORA Account"}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {authMode === "SIGN_IN"
                  ? "Enter your email and password to access your role workspace"
                  : "Register your verified account for Citizen, University, MSME, or Government"}
              </p>
            </div>

            {/* Global Error Banner */}
            {authError && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-start gap-2 animate-shake">
                <ShieldCheck className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>{authError}</div>
              </div>
            )}

            {/* Global Verification / Notice Banner */}
            {authSuccessNotice && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold space-y-1">
                <div className="font-extrabold text-amber-800 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-600" /> Account Created & Awaiting Approval
                </div>
                <div>{authSuccessNotice}</div>
              </div>
            )}

            {/* 1. SIGN IN FORM */}
            {authMode === "SIGN_IN" && (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g., citizen@example.com"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-teal-700 focus:bg-white transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700">Password</label>
                    <button
                      type="button"
                      onClick={() => { setIsForgotModalOpen(true); setForgotStep(1); setForgotMessage(null); }}
                      className="text-xs text-teal-700 hover:text-teal-900 font-extrabold cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-teal-700 focus:bg-white transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-xs shadow-xs active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {authLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Verifying Credentials...
                    </>
                  ) : (
                    "Sign In →"
                  )}
                </button>

                <div className="pt-2 text-center">
                  <span className="text-xs text-slate-500 font-medium">Don't have an account?</span>
                  <button
                    type="button"
                    onClick={() => { setAuthMode("SIGN_UP"); setAuthError(null); }}
                    className="text-xs text-teal-700 hover:text-teal-900 hover:underline font-semibold ml-1 cursor-pointer transition-colors"
                  >
                    Create Account
                  </button>
                </div>
              </form>
            )}

            {/* 2. CREATE ACCOUNT (SIGN UP) FORM */}
            {authMode === "SIGN_UP" && (
              <form onSubmit={handleSignUp} className="space-y-5">
                
                {/* Role Selection Pills */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">Select Your Persona / Account Role</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    
                    {/* Citizen */}
                    <button
                      type="button"
                      onClick={() => setSignUpRole("CITIZEN")}
                      className={`p-3 rounded-2xl border text-left flex flex-col items-center justify-center gap-1.5 transition-all ${
                        signUpRole === "CITIZEN"
                          ? "bg-indigo-50 border-indigo-600 text-indigo-700 font-extrabold shadow-xs"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 font-bold"
                      }`}
                    >
                      <User className="w-4 h-4" />
                      <span className="text-[11px]">Citizen</span>
                    </button>

                    {/* University */}
                    <button
                      type="button"
                      onClick={() => setSignUpRole("UNIVERSITY")}
                      className={`p-3 rounded-2xl border text-left flex flex-col items-center justify-center gap-1.5 transition-all ${
                        signUpRole === "UNIVERSITY"
                          ? "bg-purple-50 border-purple-600 text-purple-700 font-extrabold shadow-xs"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 font-bold"
                      }`}
                    >
                      <GraduationCap className="w-4 h-4" />
                      <span className="text-[11px]">University</span>
                    </button>

                    {/* MSME / Industry */}
                    <button
                      type="button"
                      onClick={() => setSignUpRole("INDUSTRY_PARTNER")}
                      className={`p-3 rounded-2xl border text-left flex flex-col items-center justify-center gap-1.5 transition-all ${
                        signUpRole === "INDUSTRY_PARTNER"
                          ? "bg-amber-50 border-amber-600 text-amber-700 font-extrabold shadow-xs"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 font-bold"
                      }`}
                    >
                      <Building2 className="w-4 h-4" />
                      <span className="text-[11px]">MSME / Industry</span>
                    </button>

                    {/* Government */}
                    <button
                      type="button"
                      onClick={() => setSignUpRole("GOVERNMENT_ADMIN")}
                      className={`p-3 rounded-2xl border text-left flex flex-col items-center justify-center gap-1.5 transition-all ${
                        signUpRole === "GOVERNMENT_ADMIN"
                          ? "bg-emerald-50 border-emerald-600 text-emerald-700 font-extrabold shadow-xs"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 font-bold"
                      }`}
                    >
                      <Landmark className="w-4 h-4" />
                      <span className="text-[11px]">Government</span>
                    </button>

                  </div>
                </div>

                {/* Government Verification Requirement Callout */}
                {signUpRole === "GOVERNMENT_ADMIN" && (
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Administrative Verification Required:</strong> New Government accounts are registered in <strong>PENDING</strong> status and must be verified by a Government Admin before accessing the Command Centre.
                    </div>
                  </div>
                )}

                {/* Common Primary Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">
                      {signUpRole === "CITIZEN" ? "Full Name" : "Contact Person Name"} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={signUpRole === "CITIZEN" ? "e.g., Rajesh Kumar" : "e.g., Dr. Ananya Sharma"}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium focus:outline-none focus:border-indigo-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">
                      {signUpRole === "CITIZEN" ? "Email Address" : "Official Email"} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder={signUpRole === "CITIZEN" ? "rajesh@example.com" : "contact@org.ac.in"}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>

                {/* Dynamic Role-Specific Fields */}
                {(signUpRole === "UNIVERSITY" || signUpRole === "INDUSTRY_PARTNER" || signUpRole === "GOVERNMENT_ADMIN") && (
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">
                      {signUpRole === "UNIVERSITY" && "Institution Name *"}
                      {signUpRole === "INDUSTRY_PARTNER" && "Company / MSME Name *"}
                      {signUpRole === "GOVERNMENT_ADMIN" && "Department / Organization *"}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={
                        signUpRole === "UNIVERSITY" ? "e.g., National Institute of Technology Jamshedpur" :
                        signUpRole === "INDUSTRY_PARTNER" ? "e.g., Tata Steel R&D Division" :
                        "e.g., Department of Urban Development, Govt of Jharkhand"
                      }
                      value={organizationName}
                      onChange={(e) => setOrganizationName(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Location / City {signUpRole !== "CITIZEN" && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Ranchi, Jharkhand"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium focus:outline-none focus:border-indigo-600"
                    />
                  </div>

                  {signUpRole === "CITIZEN" && (
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700">Phone Number (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g., +91 9876543210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                  )}

                  {(signUpRole === "UNIVERSITY" || signUpRole === "INDUSTRY_PARTNER") && (
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700">
                        {signUpRole === "UNIVERSITY" ? "Department / Research Domain" : "Industry / Sector"}
                      </label>
                      <input
                        type="text"
                        placeholder={signUpRole === "UNIVERSITY" ? "e.g., Environmental Engineering & AI" : "e.g., CleanTech & Water Treatment"}
                        value={departmentSector}
                        onChange={(e) => setDepartmentSector(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                  )}
                </div>

                {/* Password & Confirmation */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Password (min 8 chars) <span className="text-red-500">*</span></label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium focus:outline-none focus:border-indigo-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Confirm Password <span className="text-red-500">*</span></label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {authLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Creating Account...
                    </>
                  ) : (
                    `Register as ${signUpRole.replace("_", " ")} →`
                  )}
                </button>

                <div className="pt-2 text-center">
                  <span className="text-xs text-slate-500 font-medium">Already have an account? </span>
                  <button
                    type="button"
                    onClick={() => { setAuthMode("SIGN_IN"); setAuthError(null); }}
                    className="text-xs text-indigo-600 hover:underline font-extrabold"
                  >
                    Sign In
                  </button>
                </div>
              </form>
            )}

          </div>
        </FadeIn>

        {/* Right Column: Demo Access Persona Switcher (5 Cols) */}
        <FadeIn direction="up" delay={0.2} className="lg:col-span-5">
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 text-white shadow-xl space-y-6 border border-slate-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-[11px] font-extrabold">
                <Sparkles className="w-3 h-3 text-amber-400" /> Demo Access
              </div>
              <h2 className="text-xl font-extrabold text-white">Instant Demo Persona Sign In</h2>
              <p className="text-xs text-slate-400 font-medium">
                For testing and presentations — 1-click access to pre-populated mock workspaces without signup.
              </p>
            </div>

            <div className="space-y-3">
              {/* Citizen Persona */}
              <div
                onClick={() => handleQuickLogin("CITIZEN")}
                className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 hover:border-indigo-500 transition-all cursor-pointer flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-white">Citizen Demo</h3>
                    <p className="text-[10px] text-slate-400">Report & public civic social feed</p>
                  </div>
                </div>
                <button className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-[11px] font-extrabold group-hover:bg-indigo-500 transition-colors shrink-0">
                  {loadingRole === "CITIZEN" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Sign In →"}
                </button>
              </div>

              {/* University Persona */}
              <div
                onClick={() => handleQuickLogin("UNIVERSITY")}
                className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 hover:border-purple-500 transition-all cursor-pointer flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-white">University Demo</h3>
                    <p className="text-[10px] text-slate-400">NIT Jamshedpur / BIT Mesra R&D</p>
                  </div>
                </div>
                <button className="px-3 py-1.5 rounded-xl bg-purple-600 text-white text-[11px] font-extrabold group-hover:bg-purple-500 transition-colors shrink-0">
                  {loadingRole === "UNIVERSITY" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Sign In →"}
                </button>
              </div>

              {/* Govt Admin Persona */}
              <div
                onClick={() => handleQuickLogin("GOVERNMENT_ADMIN")}
                className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 hover:border-emerald-500 transition-all cursor-pointer flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Landmark className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-white">Government Demo</h3>
                    <p className="text-[10px] text-slate-400">Command Centre & Analytics</p>
                  </div>
                </div>
                <button className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-[11px] font-extrabold group-hover:bg-emerald-500 transition-colors shrink-0">
                  {loadingRole === "GOVERNMENT_ADMIN" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Sign In →"}
                </button>
              </div>

              {/* Industry Partner Persona */}
              <div
                onClick={() => handleQuickLogin("INDUSTRY_PARTNER")}
                className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 hover:border-amber-500 transition-all cursor-pointer flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-white">MSME / Industry Demo</h3>
                    <p className="text-[10px] text-slate-400">CSR Funding & Co-Creation</p>
                  </div>
                </div>
                <button className="px-3 py-1.5 rounded-xl bg-amber-600 text-white text-[11px] font-extrabold group-hover:bg-amber-500 transition-colors shrink-0">
                  {loadingRole === "INDUSTRY_PARTNER" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Sign In →"}
                </button>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700 text-[11px] text-slate-400 font-medium text-center">
              🔒 Demo accounts operate on cached mock data. Real user registrations use persistent SQLite database.
            </div>
          </div>
        </FadeIn>

      </div>

      {/* Forgot Password Modal */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 shadow-2xl space-y-5"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-extrabold text-slate-900">Forgot Password</h3>
              <button
                onClick={() => setIsForgotModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {forgotMessage && (
              <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-medium">
                {forgotMessage}
              </div>
            )}

            {simulatedTokenNotice && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-mono text-[10px] break-all">
                {simulatedTokenNotice}
              </div>
            )}

            {forgotStep === 1 ? (
              <form onSubmit={handleForgotRequest} className="space-y-4">
                <p className="text-xs text-slate-600 font-medium">
                  Enter your registered account email address. We will issue a password reset authorization token.
                </p>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Account Email</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g., user@civiora.in"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md disabled:opacity-50"
                >
                  {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Request Reset Token →"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetSubmit} className="space-y-4">
                <p className="text-xs text-slate-600 font-medium">
                  Enter your reset token and select a new secure password.
                </p>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Reset Token</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter reset token"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-mono font-medium focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">New Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md disabled:opacity-50"
                >
                  {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Set New Password →"}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      )}

    </div>
  );
}




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
      fetchFeed();
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
      fetchActivity();
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

          <Link
            href="/submit"
            className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98] shrink-0"
          >
            <PlusCircle className="w-4 h-4 text-indigo-200" />
            <span>Create Post</span>
          </Link>
        </div>
      </FadeIn>

      {/* CREATE POST QUICK BAR */}
      {activeMainTab === "FEED" && (
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-extrabold text-xs shrink-0 shadow-xs">
              {userInitials}
            </div>
            <Link
              href="/submit"
              className="flex-1 py-3 px-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 text-xs font-medium transition-colors cursor-pointer flex items-center justify-between"
            >
              <span>What civic problem or community challenge are you witnessing today, {user?.name?.split(" ")[0]}?</span>
              <PlusCircle className="w-4 h-4 text-indigo-600 shrink-0" />
            </Link>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs font-bold text-slate-600 overflow-x-auto">
            <Link href="/submit" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-slate-700 shrink-0">
              <PlusCircle className="w-4 h-4 text-indigo-600" />
              <span>Submit Report</span>
            </Link>
            <Link href="/submit" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 transition-colors text-slate-700 shrink-0">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>Location Tag</span>
            </Link>
            <Link href="/submit" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-purple-50 hover:text-purple-600 transition-colors text-slate-700 shrink-0">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>AI Priority Analysis</span>
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
                      You haven't liked any challenges yet.
                    </div>
                  ) : (
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
                      You haven't reposted any challenges yet.
                    </div>
                  ) : (
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
                      You haven't posted any comments yet.
                    </div>
                  ) : (
                    activityData?.my_comments.map((comm: any) => (
                      <div key={comm.id} className="p-5 rounded-3xl bg-white border border-slate-200 space-y-2 shadow-xs">
                        <div className="flex items-center justify-between text-xs">
                          <Link href={`/explorer/${comm.challenge_id}`} className="font-extrabold text-indigo-600 hover:underline">
                            {comm.challenge_title}
                          </Link>
                          <span className="text-[11px] text-slate-400 font-mono">{new Date(comm.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-slate-800 font-medium bg-slate-50 p-3 rounded-2xl border border-slate-200">
                          "{comm.content}"
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


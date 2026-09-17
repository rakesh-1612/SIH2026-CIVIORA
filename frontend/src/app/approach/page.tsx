"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Cpu,
  Layers,
  Sparkles,
  CheckCircle2,
  Brain,
  Building2,
  Briefcase,
  Bell,
  MapPin,
  FileCode2,
  Sliders,
  ShieldAlert,
  ArrowRight,
  Database,
  Search,
  Users,
  Check,
  Eye,
  Download
} from "lucide-react";

export default function ApproachPage() {
  const [activeTab, setActiveTab] = useState<"3d" | "slide" | "calculator" | "modules" | "pipeline">("3d");
  const [slideTheme, setSlideTheme] = useState<"dark" | "light" | "sih">("dark");

  // Calculator State
  const [severity, setSeverity] = useState<number>(8);
  const [urgency, setUrgency] = useState<number>(7);
  const [submitterWeight, setSubmitterWeight] = useState<number>(1.2); // ULB/PRI = 1.2
  const [population, setPopulation] = useState<number>(12500); // 12,500 residents

  // Formula Calculation
  const normSeverity = severity * 10;
  const normUrgency = urgency * 10 * submitterWeight;
  const normImpact = Math.min(100, (population / 20000) * 100);
  const priorityScore = Math.min(100, Math.round(0.35 * normSeverity + 0.35 * normUrgency + 0.30 * normImpact));

  const priorityLevel = priorityScore >= 75 ? "CRITICAL HIGH" : priorityScore >= 50 ? "MEDIUM" : "LOW";
  const priorityColor = priorityScore >= 75 ? "text-rose-600 bg-rose-50 border-rose-200" : priorityScore >= 50 ? "text-amber-600 bg-amber-50 border-amber-200" : "text-emerald-600 bg-emerald-50 border-emerald-200";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      
      {/* Header Banner */}
      <section className="bg-white text-slate-900 pt-12 pb-16 px-4 sm:px-6 lg:px-8 border-b border-slate-200 relative overflow-hidden">
        <div className="max-w-7xl mx-auto text-center relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold uppercase tracking-wider">
            <Cpu className="w-4 h-4 text-indigo-600 animate-spin-slow" />
            CIVIORA Architecture & Engineering Blueprint
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight max-w-4xl mx-auto leading-tight text-slate-900">
            Technical Approach & <span className="bg-gradient-to-r from-indigo-600 via-sky-600 to-emerald-600 bg-clip-text text-transparent">AI ML Pipeline</span>
          </h1>

          <p className="text-slate-600 max-w-2xl mx-auto text-sm sm:text-base font-medium">
            Explore the 4-tier micro-architecture, AI problem triage engine, real-time spatial deduplication, and multi-stakeholder governance model driving the CIVIORA platform.
          </p>

          {/* Tab Navigation Pill Header */}
          <div className="flex flex-wrap justify-center gap-2 pt-6">
            {[
              { id: "3d", label: "3D Isometric Architecture", icon: Layers },
              { id: "slide", label: "SIH Pitch Deck Slide 3", icon: FileCode2 },
              { id: "calculator", label: "Live AI Priority Simulator", icon: Sliders },
              { id: "modules", label: "5-Module Workflow Deep Dive", icon: Brain }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as "pipeline" | "calculator" | "modules")}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 ring-2 ring-indigo-500"
                      : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-xs"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">

        {/* TAB 1: 3D ISOMETRIC ARCHITECTURE */}
        {activeTab === "3d" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="bg-white rounded-3xl p-4 sm:p-8 border border-slate-200 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-indigo-600" />
                    3D Glassmorphism Master Infographic
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500">4-Tier Stack: Grassroots Intake → FastAPI Gateway → AI Triage Core → GIS Analytics</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 8K Presentation Render
                  </span>
                </div>
              </div>

              {/* 3D Image Container */}
              <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl group">
                <img
                  src="/brain/8b342098-9edc-4d55-aee1-23bba372552c/civiora_technical_approach_3d_masterpiece_1788846657174.jpg"
                  alt="CIVIORA 3D Master Infographic"
                  className="w-full h-auto object-cover group-hover:scale-[1.01] transition-transform duration-500"
                />
              </div>

              {/* 4 Tiers Breakdown Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
                <div className="p-5 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">T1</div>
                  <h3 className="font-extrabold text-sm text-slate-900">Grassroots Intake Layer</h3>
                  <p className="text-xs text-slate-600 leading-snug">Resident, RWA, ULB, & PRI persona evidence collector with geotagged media.</p>
                </div>

                <div className="p-5 rounded-2xl bg-sky-50/60 border border-sky-100 space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-xs">T2</div>
                  <h3 className="font-extrabold text-sm text-slate-900">FastAPI Gateway</h3>
                  <p className="text-xs text-slate-600 leading-snug">Stateless OAuth2 JWT auth, rate limiting, and async REST controller pipelines.</p>
                </div>

                <div className="p-5 rounded-2xl bg-purple-50/60 border border-purple-100 space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-xs">T3</div>
                  <h3 className="font-extrabold text-sm text-slate-900">AI ML Triage Core</h3>
                  <p className="text-xs text-slate-600 leading-snug">Sentence-BERT embeddings, 0.82 cosine similarity deduplication & priority scoring.</p>
                </div>

                <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-100 space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">T4</div>
                  <h3 className="font-extrabold text-sm text-slate-900">GIS & CSR Hub</h3>
                  <p className="text-xs text-slate-600 leading-snug">Leaflet spatial cluster heatmaps, industry CSR funding & tech transfer execution.</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 2: SIH PITCH DECK SLIDE GALLERY */}
        {activeTab === "slide" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-3xl p-4 sm:p-8 border border-slate-200 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
                    <FileCode2 className="w-6 h-6 text-indigo-600" />
                    SIH Pitch Deck Technical Approach Slide (Slide 3)
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500">Structured 5-module slide format matching Smart India Hackathon standards</p>
                </div>

                {/* Theme Switcher Buttons */}
                <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                  <button
                    onClick={() => setSlideTheme("dark")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      slideTheme === "dark" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Cyber Dark
                  </button>
                  <button
                    onClick={() => setSlideTheme("light")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      slideTheme === "light" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Corporate Light
                  </button>
                  <button
                    onClick={() => setSlideTheme("sih")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      slideTheme === "sih" ? "bg-amber-500 text-slate-950 shadow-xs" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Classic Cream
                  </button>
                </div>
              </div>

              {/* Active Slide Image */}
              <div className="relative rounded-2xl overflow-hidden border border-slate-300 shadow-xl bg-slate-950">
                {slideTheme === "dark" && (
                  <img
                    src="/brain/8b342098-9edc-4d55-aee1-23bba372552c/civiora_technical_approach_dark_theme_1788846375828.jpg"
                    alt="Cyber Dark Slide"
                    className="w-full h-auto object-cover"
                  />
                )}
                {slideTheme === "light" && (
                  <img
                    src="/brain/8b342098-9edc-4d55-aee1-23bba372552c/civiora_technical_approach_corporate_light_1788846401751.jpg"
                    alt="Corporate Light Slide"
                    className="w-full h-auto object-cover"
                  />
                )}
                {slideTheme === "sih" && (
                  <img
                    src="/brain/8b342098-9edc-4d55-aee1-23bba372552c/civiora_technical_approach_exact_sih_format_1788846228110.jpg"
                    alt="Classic Cream SIH Slide"
                    className="w-full h-auto object-cover"
                  />
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 3: LIVE AI PRIORITY CALCULATOR SIMULATOR */}
        {activeTab === "calculator" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-3xl p-4 sm:p-8 border border-slate-200 shadow-xl grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Controls Column */}
              <div className="lg:col-span-7 space-y-6">
                <div>
                  <span className="px-2.5 py-1 rounded-md bg-indigo-100 text-indigo-700 text-xs font-bold uppercase">
                    Interactive ML Engine Simulator
                  </span>
                  <h2 className="text-2xl font-black text-slate-900 mt-2">AI Priority Score Calculator</h2>
                  <p className="text-xs text-slate-500">Adjust the problem parameters below to observe real-time priority scoring and automated university routing.</p>
                </div>

                <div className="space-y-5 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                  
                  {/* Severity Slider */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span>Problem Severity (S)</span>
                      <span className="text-indigo-600 font-mono">{severity} / 10</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={severity}
                      onChange={(e) => setSeverity(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Minor inconvenience</span>
                      <span>Structural collapse / hazard</span>
                    </div>
                  </div>

                  {/* Urgency Slider */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span>Urgency Keywords (U)</span>
                      <span className="text-indigo-600 font-mono">{urgency} / 10</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={urgency}
                      onChange={(e) => setUrgency(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>

                  {/* Submitter Entity Weight Toggle */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 block">Submitter Entity Persona Weight (W_entity)</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Resident (1.0x)", value: 1.0 },
                        { label: "Community (1.1x)", value: 1.1 },
                        { label: "ULB / PRI (1.2x)", value: 1.2 }
                      ].map((item) => (
                        <button
                          key={item.value}
                          onClick={() => setSubmitterWeight(item.value)}
                          className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                            submitterWeight === item.value
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Population Density Slider */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span>Affected Population Density (I)</span>
                      <span className="text-indigo-600 font-mono">{population.toLocaleString()} residents</span>
                    </div>
                    <input
                      type="range"
                      min="500"
                      max="50000"
                      step="500"
                      value={population}
                      onChange={(e) => setPopulation(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>

                </div>
              </div>

              {/* Output Display Column */}
              <div className="lg:col-span-5 flex flex-col justify-between space-y-6 bg-slate-900 text-white p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-indigo-400 font-bold uppercase tracking-wider">AI Engine Output</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-black border ${priorityColor}`}>
                      {priorityLevel}
                    </span>
                  </div>

                  {/* Large Score Display */}
                  <div className="my-6 text-center">
                    <div className="text-6xl font-black tracking-tight text-white font-mono">
                      {priorityScore}<span className="text-2xl text-slate-500">/100</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-2">Calculated Priority Index Score</div>
                  </div>

                  {/* Mathematical Formula Breakdown */}
                  <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/80 text-xs font-mono space-y-2">
                    <div className="text-indigo-300 font-bold text-[11px]">PRIORITY SCORING FORMULA:</div>
                    <div className="text-slate-300 text-[11px]">
                      P = 0.35(S) + 0.35(U * W) + 0.30(I_norm)
                    </div>
                    <div className="text-slate-400 text-[10px] pt-1 border-t border-slate-700">
                      = 0.35({normSeverity}) + 0.35({normUrgency.toFixed(1)}) + 0.30({normImpact.toFixed(1)})
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-xs font-bold text-slate-300">Automated Triage Outcome:</div>
                  <div className="p-3 rounded-xl bg-indigo-950/80 border border-indigo-800/60 text-xs space-y-1">
                    <div className="font-bold text-indigo-200">AI Priority Classification:</div>
                    <div className="text-slate-300 font-medium">Critical Infrastructure Issue — Severity 8.5/10</div>
                    <div className="text-[10px] text-emerald-400 font-mono">Deduplicated against cluster CIV-2026-001</div>
                  </div>
                </div>
              </div>

            </div>
          </motion.div>
        )}

        {/* TAB 4: 5-MODULE WORKFLOW DEEP DIVE */}
        {activeTab === "modules" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-md space-y-4">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black">M1</div>
                <h3 className="text-lg font-bold text-slate-900">Intake & Evidence Module</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Enables Residents, RWAs, ULBs, and PRIs to upload geotagged multimedia evidence (photos, videos, spatial points) with auto-extracted EXIF metadata.
                </p>
                <div className="text-[11px] font-bold text-indigo-600">Features: Persona Weighting, GPS Tagging</div>
              </div>

              <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-md space-y-4">
                <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center font-black">M2</div>
                <h3 className="text-lg font-bold text-slate-900">AI Problem Triage Core</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Sentence-BERT semantic vectorization identifies duplicate problem reports within 500m spatial radius and computes explainable priority scores.
                </p>
                <div className="text-[11px] font-bold text-sky-600">Features: Cosine Deduplication, Priority Analysis</div>
              </div>

              <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-md space-y-4">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-black">M3</div>
                <h3 className="text-lg font-bold text-slate-900">Industry & CSR Hub</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Startups, MSMEs, Enterprises, and CSR Foundations pledge financial capital, assign technical mentors, and negotiate pilot tech transfer agreements.
                </p>
                <div className="text-[11px] font-bold text-purple-600">Features: CSR Pledges, Tech Transfer Contracts</div>
              </div>

              <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-md space-y-4">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-black">M4</div>
                <h3 className="text-lg font-bold text-slate-900">Notification Engine</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Top-navigation bell indicator, dedicated notifications inbox, and multi-stakeholder project comment feeds ensure end-to-end transparency.
                </p>
                <div className="text-[11px] font-bold text-amber-600">Features: Realtime Alerts, Comment Threads</div>
              </div>

              <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-md space-y-4 md:col-span-2">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black">M5</div>
                <h3 className="text-lg font-bold text-slate-900">GIS Analytics & Spatial Hotspots</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Interactive Leaflet map displaying real-time priority cluster heatmaps, ward-level problem density, category distribution, and audit log trails.
                </p>
                <div className="text-[11px] font-bold text-emerald-600">Features: Spatial Hotspot Heatmaps, Audit Ledger</div>
              </div>

            </div>
          </motion.div>
        )}

      </main>
    </div>
  );
}

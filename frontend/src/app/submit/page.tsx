"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Send, AlertTriangle, CheckCircle2, Loader2, Sparkles, Brain,
  Cpu, Layers, Building2, UploadCloud, Image as ImageIcon, UserCheck,
  Users, Landmark, Trees, Compass, Search, Trash2, Navigation,
  Map as MapIcon, RefreshCw, Pointer, X, Video, FileText
} from "lucide-react";
import { submitChallenge, uploadEvidenceFile, ChallengeCreatePayload } from "@/lib/api";
import { FadeIn } from "@/components/animations/MotionWrapper";
import { useToast } from "@/components/ui/ToastProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useTranslation } from "@/lib/LanguageContext";

const MapComponent = dynamic(() => import("@/components/MapComponent"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-48 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 gap-2 font-semibold text-xs">
      <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
      Loading Map Engine...
    </div>
  )
});

/**
 * Validates global geographic coordinates (-90 to 90 lat, -180 to 180 lng).
 */
export function isValidGlobalCoordinate(lat: number, lng: number): boolean {
  return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

const SUBMITTER_TYPES = [
  { id: "CITIZEN_INDIVIDUAL", label: "Individual Resident", desc: "Citizen, Commuter, or Local Resident", icon: UserCheck },
  { id: "COMMUNITY_GROUP", label: "Community / RWA", desc: "Neighborhood Welfare Association or Youth Club", icon: Users },
  { id: "URBAN_LOCAL_BODY", label: "Urban Local Body (ULB)", desc: "Municipal Corporation, Ward Committee, or City Board", icon: Landmark },
  { id: "PANCHAYAT_RAJ", label: "Panchayat Raj (PRI)", desc: "Gram Panchayat, Block Samiti, or Zila Parishad", icon: Trees },
];

export default function SubmitChallengePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { t } = useTranslation();
  
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);
  const [aiProcessingStage, setAiProcessingStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("auto");

  // Global Location Selection System State
  const [locationMode, setLocationMode] = useState<"none" | "gps" | "manual">("none");
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [tempPoint, setTempPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [tempAddress, setTempAddress] = useState<string>("");
  const [tempDistrict, setTempDistrict] = useState<string>("");
  const [manualSearchQuery, setManualSearchQuery] = useState("");
  const [manualGeocoding, setManualGeocoding] = useState(false);
  const [locationValidationError, setLocationValidationError] = useState<string | null>(null);

  const [form, setForm] = useState<ChallengeCreatePayload>({
    title: "",
    description: "",
    category: "Disaster Management",
    location: "",
    district: "General",
    state: "Tamil Nadu",
    latitude: 13.0827,
    longitude: 80.2707,
    urgency_level: "HIGH",
    submitter_type: "CITIZEN_INDIVIDUAL",
    submitter_org: "",
    media_files: [],
    image_url: ""
  });

  const [dragActive, setDragActive] = useState(false);

  // 1. USE MY CURRENT LOCATION (GLOBAL GEOLOCATION)
  const handleUseCurrentLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      showToast("Geolocation is not supported by your browser.", "error");
      return;
    }

    setLocationValidationError(null);
    setDetectingGps(true);
    showToast("Requesting location permission from your browser...", "info");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        if (!isValidGlobalCoordinate(lat, lng)) {
          setDetectingGps(false);
          const errMsg = "Invalid geographic location coordinates received.";
          setLocationValidationError(errMsg);
          showToast(errMsg, "error");
          return;
        }

        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
            headers: { "User-Agent": "CIVIORA-GPS-Intake/1.0" }
          });

          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            const streetName = addr.road || addr.suburb || addr.neighbourhood || addr.amenity || addr.village || addr.town || addr.city || data.display_name?.split(",")[0] || "Detected Location";
            const districtFound = addr.county || addr.state_district || addr.city || addr.town || addr.district || "District";
            const stateFound = addr.state || addr.region || "";
            const countryFound = addr.country || "";

            const formattedLocation = [streetName, districtFound, stateFound, countryFound].filter((p, i, a) => p && a.indexOf(p) === i).join(", ");

            setForm((prev) => ({
              ...prev,
              latitude: lat,
              longitude: lng,
              location: formattedLocation || streetName,
              district: districtFound,
              state: stateFound || countryFound || "India",
              location_source: "CURRENT_LOCATION"
            }));
            setLocationConfirmed(true);
            setLocationMode("gps");
            showToast(`Location acquired: ${formattedLocation || streetName}`, "success");
          } else {
            setForm((prev) => ({
              ...prev,
              latitude: lat,
              longitude: lng,
              location: "Current Device Location",
              district: "General",
              state: "India",
              location_source: "CURRENT_LOCATION"
            }));
            setLocationConfirmed(true);
            setLocationMode("gps");
          }
        } catch (err) {
          console.warn("Reverse geocoding warning", err);
          setForm((prev) => ({
            ...prev,
            latitude: lat,
            longitude: lng,
            location: "Current Device Location",
            district: "General",
            state: "India",
            location_source: "CURRENT_LOCATION"
          }));
          setLocationConfirmed(true);
          setLocationMode("gps");
        } finally {
          setDetectingGps(false);
        }
      },
      (err) => {
        setDetectingGps(false);
        let msg = "Could not retrieve device location.";
        if (err.code === err.PERMISSION_DENIED) {
          msg = "Location access was denied. Please use 'Choose Location Manually' to pick your location on the map.";
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = "Device location position unavailable. Please choose your location manually on the map.";
        } else if (err.code === err.TIMEOUT) {
          msg = "Location request timed out. Please choose your location manually on the map.";
        }
        setLocationValidationError(msg);
        showToast(msg, "error");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // 2. MANUAL LOCATION SELECTION (GLOBAL LEAFLET MAP)
  const handleManualPointSelect = async (lat: number, lng: number) => {
    setLocationValidationError(null);
    if (!isValidGlobalCoordinate(lat, lng)) {
      const errMsg = "Invalid geographic coordinates selected.";
      setLocationValidationError(errMsg);
      showToast(errMsg, "error");
      return;
    }

    setTempPoint({ lat, lng });

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
        headers: { "User-Agent": "CIVIORA-Manual-Intake/1.0" }
      });
      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};
        const streetName = addr.road || addr.suburb || addr.neighbourhood || addr.amenity || addr.village || addr.town || addr.city || data.display_name?.split(",")[0] || "Selected Map Location";
        const districtFound = addr.county || addr.state_district || addr.city || addr.town || addr.district || "District";
        const stateFound = addr.state || addr.region || "";
        const countryFound = addr.country || "";

        const fullLoc = [streetName, districtFound, stateFound, countryFound].filter((p, i, a) => p && a.indexOf(p) === i).join(", ");

        setTempAddress(fullLoc || streetName);
        setTempDistrict(districtFound);
      }
    } catch (err) {
      console.warn("Reverse geocode fallback", err);
      if (!tempAddress) setTempAddress("Selected Map Location");
    }
  };

  const handleManualSearch = async () => {
    if (!manualSearchQuery.trim()) return;
    setLocationValidationError(null);
    setManualGeocoding(true);

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(manualSearchQuery)}&limit=1`, {
        headers: { "User-Agent": "CIVIORA-Manual-Search/1.0" }
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);

          if (!isValidGlobalCoordinate(lat, lng)) {
            const errMsg = "Invalid coordinates returned for search query.";
            setLocationValidationError(errMsg);
            showToast(errMsg, "error");
            setManualGeocoding(false);
            return;
          }

          setTempPoint({ lat, lng });
          const displayName = data[0].display_name || manualSearchQuery;
          setTempAddress(displayName);
          
          showToast("Location pin updated on global map.", "info");
          setManualGeocoding(false);
          return;
        }
      }
      showToast("Address not found. Please click directly on the map to place a pin.", "error");
    } catch {
      showToast("Search failed. Please select a point directly on the map.", "error");
    } finally {
      setManualGeocoding(false);
    }
  };

  const confirmManualLocation = () => {
    if (!tempPoint) {
      showToast("Please select a location on the map first.", "error");
      return;
    }
    if (!isValidGlobalCoordinate(tempPoint.lat, tempPoint.lng)) {
      const errMsg = "Invalid geographic coordinates selected.";
      setLocationValidationError(errMsg);
      showToast(errMsg, "error");
      return;
    }

    const addrParts = (tempAddress || "Selected Map Location").split(",");
    const cityDist = tempDistrict || addrParts[1]?.trim() || addrParts[0]?.trim() || "General";
    const stateVal = addrParts[2]?.trim() || addrParts[1]?.trim() || "Region";

    setForm((prev) => ({
      ...prev,
      latitude: tempPoint.lat,
      longitude: tempPoint.lng,
      location: tempAddress || "Selected Map Location",
      district: cityDist,
      state: stateVal,
      location_source: "MANUAL_SELECTION"
    }));
    setLocationConfirmed(true);
    showToast("Location confirmed!", "success");
  };

  const handleClearForm = () => {
    setForm({
      title: "",
      description: "",
      category: "Disaster Management",
      location: "",
      district: "General",
      state: "Tamil Nadu",
      latitude: 13.0827,
      longitude: 80.2707,
      urgency_level: "HIGH",
      submitter_type: "CITIZEN_INDIVIDUAL",
      submitter_org: "",
      media_files: [],
      image_url: ""
    });
    setLocationConfirmed(false);
    setLocationMode("none");
    setTempPoint(null);
    setTempAddress("");
    setTempDistrict("");
    setLocationValidationError(null);
    setError(null);
    showToast("Form cleared for new challenge entry", "info");
  };

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const processFilesUpload = async (fileList: File[]) => {
    if (!fileList || fileList.length === 0) return;
    try {
      const uploadedItems = await Promise.all(
        fileList.map((f) => uploadEvidenceFile(f))
      );
      setForm((prev) => ({
        ...prev,
        media_files: [...(prev.media_files || []), ...uploadedItems]
      }));
      showToast(`${uploadedItems.length} evidence file(s) uploaded successfully!`, "success");
    } catch (err) {
      console.warn("Server upload failed, converting file to Data URL for persistent storage:", err);
      const fallbackItems = await Promise.all(
        fileList.map(async (f) => {
          const dataUrl = await readFileAsDataURL(f);
          const ext = f.name.split(".").pop()?.toLowerCase() || "";
          const fType = f.type.startsWith("image/") ? "IMAGE" : f.type.startsWith("video/") ? "VIDEO" : f.type.includes("pdf") || ext === "pdf" ? "PDF" : "DOCUMENT";
          return {
            name: f.name,
            type: fType,
            url: dataUrl
          };
        })
      );
      setForm((prev) => ({
        ...prev,
        media_files: [...(prev.media_files || []), ...fallbackItems]
      }));
      showToast(`${fallbackItems.length} evidence file(s) attached!`, "info");
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFilesUpload(Array.from(e.target.files));
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFilesUpload(Array.from(e.dataTransfer.files));
    }
  };

  const handleRemoveMedia = (index: number) => {
    setForm((prev) => ({
      ...prev,
      media_files: (prev.media_files || []).filter((_, i) => i !== index)
    }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      setError("Please fill out challenge title and description.");
      return;
    }

    if (!locationConfirmed) {
      setError("Please select and confirm a location for your challenge.");
      return;
    }

    if (!isValidGlobalCoordinate(form.latitude, form.longitude)) {
      setError("Please select a valid geographic location.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const stageInterval = setInterval(() => {
        setAiProcessingStage((prev) => (prev < 5 ? prev + 1 : prev));
      }, 500);

      const created = await submitChallenge(form);

      clearInterval(stageInterval);
      setAiProcessingStage(5);

      showToast(`Challenge ${created.id} submitted & GIS mapped successfully!`, "success");

      setTimeout(() => {
        router.push(`/explorer/${created.id}`);
      }, 800);

    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Failed to submit challenge.";
      setError(msg);
      setSubmitting(false);
    }
  };

  const AI_PIPELINE_STEPS = [
    { label: "Parsing challenge text embeddings", icon: Brain },
    { label: "Extracting NLP keywords & subcategory", icon: Sparkles },
    { label: "Calculating explainable priority score", icon: Cpu },
    { label: "Running semantic duplicate detection", icon: Layers },
    { label: "Matching university expertise network", icon: Building2 },
    { label: "Pipeline complete! Opening analysis...", icon: CheckCircle2 }
  ];

  return (
    <ProtectedRoute allowedRoles={["CITIZEN", "GOVERNMENT_ADMIN"]}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 relative">
      
      {/* AI Processing Overlay */}
      <AnimatePresence>
        {submitting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="p-8 rounded-3xl bg-white border border-indigo-200 shadow-2xl max-w-lg w-full space-y-6 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center mx-auto shadow-inner">
                <Brain className="w-8 h-8 animate-pulse" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-bold text-slate-900">Executing CIVIORA AI & GIS Pipeline</h3>
                <p className="text-xs text-slate-600">Geocoding coordinates & analyzing text embeddings...</p>
              </div>

              <div className="space-y-3 text-left bg-slate-50 p-5 rounded-2xl border border-slate-200">
                {AI_PIPELINE_STEPS.map((s, idx) => {
                  const isDone = idx < aiProcessingStage;
                  const isCurrent = idx === aiProcessingStage;

                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`flex items-center gap-3 text-xs font-semibold transition-all ${
                        isDone
                          ? "text-emerald-700"
                          : isCurrent
                          ? "text-indigo-700 font-bold"
                          : "text-slate-400"
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : isCurrent ? (
                        <Loader2 className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                      )}
                      <span>{s.label}</span>
                    </motion.div>
                  );
                })}
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <FadeIn direction="down">
        <div className="space-y-3 border-b border-[#DDD6C8] pb-6">
          <div className="flex items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAF4E8] border border-[#F2DEBA] text-[#0B1F3A] text-xs font-extrabold">
              <Sparkles className="w-3.5 h-3.5 text-[#C89B3C]" />
              Real-World Civic Challenge Intake
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClearForm}
                className="px-3 py-1.5 rounded-xl bg-[#EFE9DC] hover:bg-[#DDD6C8] border border-[#DDD6C8] text-[#0B1F3A] text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-[#536174]" />
                Clear Form
              </button>
              <Link
                href="/"
                className="px-3.5 py-1.5 rounded-xl bg-[#0B1F3A] hover:bg-[#07152A] text-white text-xs font-bold flex items-center gap-1 transition-all"
              >
                <Compass className="w-3.5 h-3.5 text-[#C89B3C]" />
                My Challenges
              </Link>
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-[#0B1F3A] tracking-tight">Submit Real Civic Challenge</h1>
          <p className="text-sm text-[#536174]">
            Submit a real civic, environmental, or infrastructure issue anywhere in the world. Pinpoint your location using GPS or the global GIS map.
          </p>
        </div>
      </FadeIn>

      {/* Stepper Indicator */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#FFFDF7] rounded-2xl border border-[#DDD6C8] shadow-2xs">
        <button
          onClick={() => setStep(1)}
          className={`flex items-center gap-2 text-xs font-bold transition-colors cursor-pointer ${
            step === 1 ? "text-[#0B1F3A]" : "text-[#536174]"
          }`}
        >
          <span className={`w-6 h-6 rounded-full flex items-center justify-center ${step === 1 ? "bg-[#0B1F3A] text-white" : "bg-[#EFE9DC] text-[#536174]"}`}>1</span>
          Entity & Description
        </button>
        <div className="h-0.5 flex-1 bg-[#DDD6C8] mx-4"></div>
        <button
          onClick={() => setStep(2)}
          className={`flex items-center gap-2 text-xs font-bold transition-colors cursor-pointer ${
            step === 2 ? "text-[#0B1F3A]" : "text-[#536174]"
          }`}
        >
          <span className={`w-6 h-6 rounded-full flex items-center justify-center ${step === 2 ? "bg-[#0B1F3A] text-white" : "bg-[#EFE9DC] text-[#536174]"}`}>2</span>
          Location & Media Evidence
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-[#FDF2F2] border border-[#F5C6CB] text-[#B94A48] text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[#B94A48] shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Form Box */}
      <form onSubmit={handleFormSubmit} className="space-y-8">
        
        {step === 1 && (
          <FadeIn key="step1" direction="up">
            <div className="space-y-6 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
              
              {/* Submitter Entity Type Selector */}
              <div className="space-y-3">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  {t("challenge.submitterTypeLabel", "Submitter Entity Type")}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {SUBMITTER_TYPES.map((type) => {
                    const TypeIcon = type.icon;
                    const isSelected = form.submitter_type === type.id;
                    return (
                      <button
                        type="button"
                        key={type.id}
                        onClick={() => setForm({ ...form, submitter_type: type.id })}
                        className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                          isSelected
                            ? "bg-indigo-50/80 border-indigo-600 shadow-sm"
                            : "bg-white border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className={`p-2 rounded-xl ${isSelected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                          <TypeIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className={`text-sm font-extrabold ${isSelected ? "text-indigo-900" : "text-slate-900"}`}>
                            {type.label}
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">
                            {type.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Language Selector Dropdown */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-900">
                  {t("challenge.languageLabel", "Submission Language")}
                </label>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-indigo-600 text-sm font-semibold"
                >
                  <option value="auto">Auto Detect ( Recommended )</option>
                  <option value="en">English</option>
                  <option value="hi">हिन्दी — Hindi</option>
                  <option value="ta">தமிழ் — Tamil</option>
                  <option value="te">తెలుగు — Telugu</option>
                  <option value="kn">ಕನ್ನಡ — Kannada</option>
                  <option value="ml">മലയാളം — Malayalam</option>
                  <option value="mr">मराठी — Marathi</option>
                  <option value="bn">বাংলা — Bengali</option>
                  <option value="gu">ગુજરાતી — Gujarati</option>
                  <option value="pa">ਪੰਜਾਬੀ — Punjabi</option>
                  <option value="or">ଓଡ଼ିଆ — Odia</option>
                  <option value="as">অসমীয়া — Assamese</option>
                  <option value="ur">اردو — Urdu</option>
                </select>
              </div>

              {form.submitter_type !== "CITIZEN_INDIVIDUAL" && (
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-900">
                    Organization / Entity Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.submitter_org || ""}
                    onChange={(e) => setForm({ ...form, submitter_org: e.target.value })}
                    placeholder="e.g. Ward 14 Sanitation Committee / Neighborhood Association"
                    className="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 text-sm"
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-900">
                  {t("challenge.titleLabel", "Challenge Title")} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder={t("challenge.titlePlaceholder", "e.g. Severe waterlogging near railway station underpass")}
                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 text-sm font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-900">
                  {t("challenge.descLabel", "Detailed Description")} <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={5}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder={t("challenge.descPlaceholder", "Describe the situation, impact on residents, frequency, and emergency concerns...")}
                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 text-sm leading-relaxed"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
                >
                  Next: Location & Media Evidence →
                </button>
              </div>
            </div>
          </FadeIn>
        )}

        {step === 2 && (
          <FadeIn key="step2" direction="up">
            <div className="space-y-6 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-900">Category Domain</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-indigo-600 text-sm font-medium"
                  >
                    <option value="Disaster Management">Disaster Management</option>
                    <option value="Infrastructure">Infrastructure</option>
                    <option value="Environment">Environment</option>
                    <option value="Water Management">Water Management</option>
                    <option value="Waste Management">Waste Management</option>
                    <option value="Public Safety">Public Safety</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Education">Education</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-900">Urgency Level</label>
                  <select
                    value={form.urgency_level}
                    onChange={(e) => setForm({ ...form, urgency_level: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-indigo-600 text-sm font-medium"
                  >
                    <option value="LOW">LOW — Routine civic request</option>
                    <option value="MEDIUM">MEDIUM — Moderate public impact</option>
                    <option value="HIGH">HIGH — Urgent hazard / disruption</option>
                    <option value="CRITICAL">CRITICAL — Emergency life-safety hazard</option>
                  </select>
                </div>
              </div>

              {/* TWO-OPTION GLOBAL LOCATION SYSTEM */}
              <div className="space-y-4 pt-2 border-t border-slate-100">
                
                {/* 1. Location Selection Choices (if not yet confirmed) */}
                {!locationConfirmed && locationMode === "none" && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="block text-sm font-bold text-slate-900">
                        Select Challenge Location <span className="text-red-500">*</span>
                      </label>
                      <p className="text-xs text-slate-500">
                        Choose how you would like to pinpoint the location anywhere in the world.
                      </p>
                    </div>

                    {locationValidationError && (
                      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold space-y-2">
                        <div className="flex items-center gap-2 font-bold text-amber-900">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>{locationValidationError}</span>
                        </div>
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setLocationValidationError(null);
                              setLocationMode("manual");
                              if (!tempPoint) {
                                setTempPoint({ lat: form.latitude || 13.0827, lng: form.longitude || 80.2707 });
                              }
                            }}
                            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-all"
                          >
                            <MapIcon className="w-3.5 h-3.5 text-white" />
                            🗺️ Choose Location Manually on Map
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      {/* Option 1: Current Location */}
                      <button
                        type="button"
                        onClick={handleUseCurrentLocation}
                        disabled={detectingGps}
                        className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50 to-emerald-50 hover:from-indigo-100 hover:to-emerald-100 border border-indigo-200/80 hover:border-indigo-400 text-left transition-all group flex flex-col justify-between space-y-4 shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                            {detectingGps ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <Navigation className="w-5 h-5 text-white" />
                            )}
                          </div>
                          <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                            GPS AUTOMATIC
                          </span>
                        </div>
                        <div>
                          <div className="text-base font-extrabold text-slate-900 group-hover:text-indigo-700 transition-colors">
                            📍 Use My Current Location
                          </div>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                            Request browser location permission and automatically detect your current position worldwide.
                          </p>
                        </div>
                      </button>

                      {/* Option 2: Choose Location Manually */}
                      <button
                        type="button"
                        onClick={() => {
                          setLocationValidationError(null);
                          setLocationMode("manual");
                          if (!tempPoint) {
                            setTempPoint({ lat: form.latitude || 13.0827, lng: form.longitude || 80.2707 });
                          }
                        }}
                        className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50 hover:from-slate-100 hover:to-indigo-100 border border-slate-200 hover:border-indigo-400 text-left transition-all group flex flex-col justify-between space-y-4 shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                            <MapIcon className="w-5 h-5 text-white" />
                          </div>
                          <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-300">
                            GLOBAL GIS MAP
                          </span>
                        </div>
                        <div>
                          <div className="text-base font-extrabold text-slate-900 group-hover:text-indigo-700 transition-colors">
                            🗺️ Choose Location Manually
                          </div>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                            Search any address or place/drag a pin marker directly on the interactive global Leaflet map.
                          </p>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. Manual Location Selection Mode */}
                {!locationConfirmed && locationMode === "manual" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapIcon className="w-5 h-5 text-indigo-600" />
                        <h3 className="text-sm font-bold text-slate-900">🗺️ Choose Location Manually on Global GIS Map</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setLocationMode("none");
                          setLocationValidationError(null);
                        }}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-700 underline"
                      >
                        ← Back to Location Options
                      </button>
                    </div>

                    {locationValidationError && (
                      <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                        <span>{locationValidationError}</span>
                      </div>
                    )}

                    {/* Address Search Bar */}
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={manualSearchQuery}
                          onChange={(e) => setManualSearchQuery(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleManualSearch();
                            }
                          }}
                          placeholder="Search any address or city worldwide (e.g. Chennai, Ranchi, Dubai, London, Karachi)"
                          className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm font-medium pr-10 focus:outline-none focus:border-indigo-600"
                        />
                        <button
                          type="button"
                          onClick={handleManualSearch}
                          disabled={manualGeocoding}
                          className="absolute right-2.5 top-2.5 text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                        >
                          {manualGeocoding ? <Loader2 className="w-4 h-4 animate-spin text-indigo-600" /> : <Search className="w-4 h-4" />}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={handleManualSearch}
                        disabled={manualGeocoding}
                        className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-all shrink-0"
                      >
                        {manualGeocoding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                        Search Address
                      </button>
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Pointer className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>Click anywhere on the map or drag the pin marker to set your location anywhere in the world.</span>
                    </div>

                    {/* Interactive Leaflet Map Canvas */}
                    <div className="h-80 rounded-2xl overflow-hidden border border-slate-300 shadow-md">
                      <MapComponent
                        markers={[]}
                        selectable={true}
                        selectedPoint={tempPoint}
                        onLocationSelect={handleManualPointSelect}
                        center={tempPoint ? [tempPoint.lat, tempPoint.lng] : [20.5937, 78.9629]}
                        zoom={tempPoint ? 13 : 4.5}
                      />
                    </div>

                    {/* Confirm Button Bar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-xs">
                        <div className="text-slate-500 font-bold">Selected Address preview:</div>
                        <div className="font-extrabold text-slate-900 text-sm">
                          📍 {tempAddress || "Selected Map Pin"}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={confirmManualLocation}
                        disabled={!tempPoint}
                        className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition-all"
                      >
                        <CheckCircle2 className="w-4 h-4 text-white" />
                        Confirm Location
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. Location Confirmed State */}
                {locationConfirmed && (
                  <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-white space-y-4 shadow-xl">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-extrabold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-indigo-400" />
                        LOCATION
                      </div>
                      <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Location selected successfully.
                      </span>
                    </div>

                    <div className="text-xl font-extrabold text-white flex items-start gap-2">
                      <span className="text-indigo-400 shrink-0">📍</span>
                      <span>
                        {form.location || `${form.district}, ${form.state}`}
                      </span>
                    </div>

                    {/* Map Preview of Confirmed Location */}
                    <div className="h-44 rounded-xl overflow-hidden border border-slate-700 shadow-inner">
                      <MapComponent
                        markers={[{
                          id: "CONFIRMED",
                          title: form.title || "Selected Challenge Location",
                          latitude: form.latitude,
                          longitude: form.longitude,
                          priority: form.urgency_level,
                          category: form.category || "Disaster Management",
                          status: "NEW",
                          location: form.location,
                          district: form.district
                        }]}
                        center={[form.latitude, form.longitude]}
                        zoom={13}
                      />
                    </div>

                    <div className="pt-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setLocationConfirmed(false);
                          setLocationMode("none");
                          setLocationValidationError(null);
                        }}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 flex items-center gap-1.5 transition-all"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Change Location
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Multimedia Evidence Drag & Drop Uploader */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <label className="block text-sm font-bold text-slate-900">
                  Multimedia Evidence Attachments (Photos, Field Docs, Videos)
                </label>

                <div
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                    dragActive ? "border-indigo-600 bg-indigo-50/50" : "border-slate-300 bg-slate-50 hover:bg-slate-100/80"
                  }`}
                >
                  <UploadCloud className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-800">
                    Drag and drop photo/video evidence or <label className="text-indigo-600 cursor-pointer underline">browse files<input type="file" multiple onChange={handleFileInputChange} className="hidden" /></label>
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">Supports JPG, PNG, MP4, PDF geotagged evidence files</p>
                </div>

                {form.media_files && form.media_files.length > 0 && (
                  <div className="flex flex-wrap gap-3 pt-2">
                    {form.media_files.map((mf, idx) => {
                      const ext = mf.name.split(".").pop()?.toLowerCase() || "";
                      const isImg = mf.type === "IMAGE" || ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext) || mf.url?.startsWith("data:image");
                      const isVid = mf.type === "VIDEO" || ["mp4", "webm", "mov", "avi"].includes(ext);

                      return (
                        <div key={idx} className="relative group p-2 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center gap-2.5 max-w-xs">
                          {isImg && mf.url ? (
                            <img src={mf.url} alt={mf.name} className="w-10 h-10 object-cover rounded-lg border border-slate-100 shrink-0" />
                          ) : isVid ? (
                            <Video className="w-6 h-6 text-purple-600 shrink-0" />
                          ) : (
                            <FileText className="w-6 h-6 text-indigo-600 shrink-0" />
                          )}
                          <div className="flex-1 min-w-0 pr-6">
                            <p className="text-xs font-bold text-slate-800 truncate">{mf.name}</p>
                            <span className="text-[10px] text-slate-500 font-semibold uppercase">{mf.type || "FILE"}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveMedia(idx)}
                            className="absolute top-1.5 right-1.5 p-1 rounded-full bg-slate-100 hover:bg-red-100 text-slate-400 hover:text-red-600 transition-colors"
                            title="Remove attachment"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-6 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm"
                >
                  ← Back
                </button>

                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={submitting}
                  className="px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-base shadow-lg shadow-indigo-600/30 flex items-center gap-2"
                >
                  <Send className="w-5 h-5 text-white" />
                  Submit & Map Challenge on GIS
                </motion.button>
              </div>

            </div>
          </FadeIn>
        )}

      </form>
    </div>
  </ProtectedRoute>
);
}

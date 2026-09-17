"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Map, AlertTriangle, Flame, Layers, MapPin, Activity } from "lucide-react";
import { getChallenges, getHotspots, ChallengeDetail, Hotspot } from "@/lib/api";
import { PriorityBadge } from "@/components/PriorityBadge";
import { FadeIn } from "@/components/animations/MotionWrapper";
import ProtectedRoute from "@/components/ProtectedRoute";

const MapComponent = dynamic(() => import("@/components/MapComponent"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[550px] rounded-3xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 gap-2 font-semibold">
      <Activity className="w-5 h-5 animate-spin text-teal-700" />
      Loading OpenStreetMap Engine...
    </div>
  )
});

export default function GeospatialMapPage() {
  return (
    <ProtectedRoute allowedRoles={["GOVERNMENT_ADMIN", "UNIVERSITY", "CITIZEN", "INDUSTRY_PARTNER"]}>
      <GeospatialMapContent />
    </ProtectedRoute>
  );
}

function GeospatialMapContent() {
  const [challenges, setChallenges] = useState<ChallengeDetail[]>([]);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChallenge, setSelectedChallenge] = useState<ChallengeDetail | null>(null);

  useEffect(() => {
    async function loadMapData() {
      try {
        const [chData, hsData] = await Promise.all([
          getChallenges(),
          getHotspots()
        ]);
        setChallenges(chData);
        setHotspots(hsData);
        if (chData.length > 0) setSelectedChallenge(chData[0]);
      } catch (err) {
        console.error("Failed to load map data", err);
      } finally {
        setLoading(false);
      }
    }
    loadMapData();
  }, []);

  const markers = challenges.map((ch) => ({
    id: ch.id,
    title: ch.title,
    latitude: Number(ch.latitude),
    longitude: Number(ch.longitude),
    priority: ch.analysis?.priority_level || "MEDIUM",
    category: ch.category,
    status: ch.status,
    location: ch.location,
    district: ch.district
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      
      {/* Header */}
      <FadeIn direction="down">
        <div className="border-b border-slate-200 pb-6 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-extrabold">
            <Map className="w-3.5 h-3.5 text-teal-700" />
            Geospatial Map & Hotspot Spatial Clustering
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Geospatial Intelligence Map</h1>
          <p className="text-sm text-slate-600 font-semibold">
            Real-time GIS map displaying reported challenge coordinates, priority markers, and spatial hotspot density clusters across India & worldwide.
          </p>
        </div>
      </FadeIn>

      {/* Map Stats Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-teal-700" />
            <div>
              <div className="text-xs text-slate-500 font-bold">Geocoded Markers</div>
              <div className="text-lg font-bold text-slate-900">{challenges.length} Pin Locations</div>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <Flame className="w-5 h-5 text-red-600" />
            <div>
              <div className="text-xs text-slate-500 font-bold">Spatial Hotspots</div>
              <div className="text-lg font-bold text-red-600">{hotspots.length} Density Clusters</div>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <div>
              <div className="text-xs text-slate-500 font-bold">Top Risk Cluster</div>
              <div className="text-sm font-bold text-amber-700 line-clamp-1">
                {hotspots.length > 0 ? hotspots[0].name : "None"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Map Container */}
      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-300 overflow-hidden shadow-md bg-white">
          {loading ? (
            <div className="w-full h-[550px] bg-slate-50 flex items-center justify-center text-slate-500 gap-2 font-semibold">
              <Activity className="w-5 h-5 animate-spin text-indigo-600" />
              Loading GIS Map Canvas...
            </div>
          ) : (
            <MapComponent markers={markers} hotspots={hotspots} />
          )}
        </div>

        {/* Hotspots Cluster List */}
        <FadeIn direction="up">
          <div className="p-6 rounded-3xl bg-white border border-slate-200 space-y-4 shadow-sm">
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Flame className="w-5 h-5 text-red-600" /> High-Density Spatial Hotspots ({hotspots.length})
            </h2>

            {hotspots.length === 0 ? (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs font-semibold text-slate-500">
                No significant hotspots detected yet. Map is ready for real challenge pin submissions across Jharkhand.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {hotspots.map((hs, i) => (
                  <motion.div
                    key={i}
                    whileHover={{ y: -3 }}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 line-clamp-1">{hs.name}</span>
                      <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-extrabold border border-red-200">
                        {hs.challenge_count} Challenges
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 font-semibold">
                      District: <strong>{hs.district}</strong> • Domain: <strong>{hs.primary_category}</strong>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </FadeIn>

      </div>

    </div>
  );
}

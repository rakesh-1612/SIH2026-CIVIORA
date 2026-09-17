"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default Leaflet icon assets in Next.js
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

export interface MarkerData {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  priority: string;
  category: string;
  status: string;
  location?: string;
  district?: string;
  priority_score?: number;
}

export interface HotspotData {
  id: string;
  name: string;
  center_lat: number;
  center_lng: number;
  challenge_count: number;
  high_priority_count: number;
  district: string;
  primary_category: string;
}

interface MapComponentProps {
  markers: MarkerData[];
  hotspots?: HotspotData[];
  center?: [number, number];
  zoom?: number;
  onMarkerClick?: (id: string) => void;
  selectable?: boolean;
  selectedPoint?: { lat: number; lng: number } | null;
  onLocationSelect?: (lat: number, lng: number) => void;
}

export default function MapComponent({
  markers,
  hotspots = [],
  center = [20.5937, 78.9629], // Global / India Center Default
  zoom = 5,
  onMarkerClick,
  selectable = false,
  selectedPoint = null,
  onLocationSelect
}: MapComponentProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  // Helper to validate coordinate sanity for global map rendering
  const isValidCoord = (lat: number, lng: number) => {
    return (
      !isNaN(lat) &&
      !isNaN(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    );
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map instance once
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: center,
        zoom: zoom,
        zoomControl: true,
        scrollWheelZoom: true,
        dragging: true,
        doubleClickZoom: true
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      const layerGroup = L.layerGroup().addTo(map);
      layerGroupRef.current = layerGroup;
      mapInstanceRef.current = map;

      // Invalidate size after load to prevent grey tile glitches
      setTimeout(() => {
        map.invalidateSize();
      }, 250);
    } else {
      mapInstanceRef.current.setView(center, zoom, { animate: true });
    }

    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    // Clear existing markers & cluster layers
    layerGroup.clearLayers();

    // 1. Render Hotspot Spatial Cluster Overlay Circles
    hotspots.forEach((hs) => {
      const lat = Number(hs.center_lat);
      const lng = Number(hs.center_lng);
      if (!isValidCoord(lat, lng)) return;

      const isHighRisk = hs.high_priority_count > 0;
      const strokeColor = isHighRisk ? "#ef4444" : "#f59e0b";
      const fillColor = isHighRisk ? "#f87171" : "#fbbf24";
      const radiusMeters = Math.max(1200, hs.challenge_count * 1500);

      const hotspotCircle = L.circle([lat, lng], {
        radius: radiusMeters,
        color: strokeColor,
        weight: 2,
        dashArray: "6, 6",
        fillColor: fillColor,
        fillOpacity: 0.18
      });

      const hsPopup = `
        <div style="font-family: system-ui, -apple-system, sans-serif; padding: 4px; max-width: 240px;">
          <div style="font-size: 10px; font-weight: bold; color: ${strokeColor}; text-transform: uppercase; tracking: 0.5px;">
            🔥 SPATIAL HOTSPOT CLUSTER
          </div>
          <div style="font-size: 14px; font-weight: 700; margin: 4px 0; color: #0f172a;">
            ${hs.name}
          </div>
          <div style="font-size: 11px; color: #334155; margin-bottom: 6px;">
            District: <strong>${hs.district}</strong><br/>
            Challenges in Cluster: <strong>${hs.challenge_count}</strong><br/>
            High Priority Hazards: <strong style="color: #dc2626;">${hs.high_priority_count}</strong>
          </div>
        </div>
      `;

      hotspotCircle.bindPopup(hsPopup);
      layerGroup.addLayer(hotspotCircle);
    });

    // 2. Render Individual Challenge Markers
    markers.forEach((m) => {
      const lat = Number(m.latitude);
      const lng = Number(m.longitude);
      if (!isValidCoord(lat, lng)) return;

      const priorityUpper = (m.priority || "MEDIUM").toUpperCase();

      let color = "#3b82f6"; // medium blue
      let radius = 8;
      if (priorityUpper === "CRITICAL") {
        color = "#ef4444";
        radius = 11;
      } else if (priorityUpper === "HIGH") {
        color = "#f59e0b";
        radius = 10;
      } else if (priorityUpper === "LOW") {
        color = "#64748b";
        radius = 7;
      }

      // Outer glow pulse circle
      const outerPulse = L.circleMarker([lat, lng], {
        radius: radius + 4,
        fillColor: color,
        color: "transparent",
        weight: 0,
        fillOpacity: 0.25
      });
      layerGroup.addLayer(outerPulse);

      // Main Circle Marker
      const circle = L.circleMarker([lat, lng], {
        radius: radius,
        fillColor: color,
        color: "#ffffff",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.95
      });

      const locDisplay = m.location ? m.location : m.district ? m.district : "Global Location";

      const popupContent = `
        <div style="font-family: system-ui, -apple-system, sans-serif; padding: 6px; max-width: 230px;">
          <div style="font-size: 10px; font-weight: bold; color: ${color}; text-transform: uppercase;">
            ${priorityUpper} PRIORITY • ${m.category}
          </div>
          <div style="font-size: 13px; font-weight: 700; margin: 4px 0; color: #0f172a; line-height: 1.3;">
            📍 ${m.title}
          </div>
          <div style="font-size: 11px; color: #475569; margin-bottom: 4px;">
            <strong>${locDisplay}</strong>
          </div>
          <div style="font-size: 11px; color: #475569; margin-bottom: 8px;">
            ID: <strong style="font-family: monospace;">${m.id}</strong> | Status: <strong>${m.status}</strong>
          </div>
          <a href="/explorer/${m.id}" style="display: inline-block; padding: 5px 10px; background: #4f46e5; color: white; border-radius: 6px; text-decoration: none; font-size: 11px; font-weight: 600;">
            Inspect Challenge AI →
          </a>
        </div>
      `;

      circle.bindPopup(popupContent);

      if (onMarkerClick) {
        circle.on("click", () => onMarkerClick(m.id));
      }

      layerGroup.addLayer(circle);
    });

    // 3. Render Draggable Selected Location Pin if selectable
    if (selectable && selectedPoint && isValidCoord(selectedPoint.lat, selectedPoint.lng)) {
      const selectedMarker = L.marker([selectedPoint.lat, selectedPoint.lng], {
        draggable: true,
        title: "Selected Challenge Pin"
      });

      if (onLocationSelect) {
        selectedMarker.on("dragend", (e: L.DragEndEvent) => {
          const pos = e.target.getLatLng();
          onLocationSelect(pos.lat, pos.lng);
        });
      }

      const popupHtml = `
        <div style="font-family: system-ui, sans-serif; padding: 4px; text-align: center;">
          <div style="font-size: 11px; font-weight: bold; color: #4f46e5;">📍 SELECTED LOCATION</div>
          <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Drag marker or click map to move</div>
        </div>
      `;
      selectedMarker.bindPopup(popupHtml);
      layerGroup.addLayer(selectedMarker);
    }

    // 4. Bind map click handler for manual selection
    map.off("click");
    if (selectable && onLocationSelect) {
      map.on("click", (e: L.LeafletMouseEvent) => {
        onLocationSelect(e.latlng.lat, e.latlng.lng);
      });
    }

  }, [markers, hotspots, center, zoom, onMarkerClick, selectable, selectedPoint, onLocationSelect]);

  return (
    <div className="w-full h-full min-h-[500px] rounded-3xl overflow-hidden shadow-2xl border border-slate-800 relative z-0">
      <div ref={mapContainerRef} className="w-full h-full min-h-[500px]" />
    </div>
  );
}

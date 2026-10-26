"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { MapPin, Search, Crosshair, Check, X, Loader2, Navigation } from "lucide-react";
import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap, Marker as LeafletMarker, LeafletMouseEvent } from "leaflet";
import type { SelectedLocation } from "@/components/zodiac/PlaceSearch";

interface MapLocationPickerProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: SelectedLocation;
  onConfirm: (location: SelectedLocation) => void;
}

interface PhotonFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    name?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    county?: string;
    country?: string;
  };
}

export function MapLocationPicker({
  isOpen,
  onClose,
  currentLocation,
  onConfirm,
}: MapLocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);

  const [pickedLocation, setPickedLocation] = useState<SelectedLocation>(currentLocation);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [mapTheme, setMapTheme] = useState<"dark" | "satellite" | "standard">("dark");

  // Reverse geocode coordinates to find city, state, country
  const handleMapCoordinateSelect = useCallback(async (lat: number, lng: number) => {
    setIsReverseGeocoding(true);
    let estimatedTz = 5.5;
    // Outside India boundary approximation
    if (lng < 68 || lng > 98 || lat < 6 || lat > 38) {
      estimatedTz = Math.round((lng / 15) * 2) / 2;
    }

    try {
      const res = await fetch(
        `https://photon.komoot.io/reverse?lon=${lng}&lat=${lat}`
      );
      if (res.ok) {
        const data: { features?: PhotonFeature[] } = await res.json();
        const feat = data?.features?.[0];
        const p = feat?.properties || {};

        const cityName =
          p.city ||
          p.town ||
          p.village ||
          p.county ||
          p.name ||
          `Location (${lat.toFixed(2)}°, ${lng.toFixed(2)}°)`;
        const stateName = p.state || "";
        const countryName = p.country || "India";

        if (countryName.toLowerCase() === "india") {
          estimatedTz = 5.5;
        }

        setPickedLocation({
          name: cityName,
          state: stateName,
          country: countryName,
          lat,
          lng,
          tz: estimatedTz,
        });
      } else {
        setPickedLocation({
          name: "Selected Coordinates",
          state: `${lat.toFixed(2)}°N, ${lng.toFixed(2)}°E`,
          country: "Unknown",
          lat,
          lng,
          tz: estimatedTz,
        });
      }
    } catch {
      setPickedLocation({
        name: "Selected Coordinates",
        state: `${lat.toFixed(2)}°N, ${lng.toFixed(2)}°E`,
        country: "Unknown",
        lat,
        lng,
        tz: estimatedTz,
      });
    } finally {
      setIsReverseGeocoding(false);
    }
  }, []);

  const curLat = currentLocation.lat;
  const curLng = currentLocation.lng;

  // Initialize and clean up Leaflet map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    let isMounted = true;

    async function initMap() {
      // Dynamic import to prevent SSR 'window is not defined'
      const L = (await import("leaflet")).default;

      if (!isMounted || !mapContainerRef.current) return;

      // Clean up previous map if exists
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // Initial center from currentLocation
      const initialLat = curLat || 28.6139;
      const initialLng = curLng || 77.209;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 7,
        zoomControl: true,
        // Tile providers require visible attribution (plan.md F5).
        attributionControl: true,
      });
      map.attributionControl.setPrefix(false);

      // 100% reliable tile layer (OpenStreetMap / Carto) with fallback
      const tileUrl =
        mapTheme === "satellite"
          ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          : mapTheme === "standard"
            ? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

      const attribution =
        mapTheme === "satellite"
          ? "Tiles &copy; Esri"
          : mapTheme === "standard"
            ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
      L.tileLayer(tileUrl, {
        attribution,
        maxZoom: 19,
        subdomains: mapTheme === "satellite" ? "" : mapTheme === "standard" ? "abc" : "abcd",
      }).addTo(map);

      // Custom Luxury Gold Pin Icon (Pure SVG with zero image asset dependency)
      const goldIcon = L.divIcon({
        className: "custom-gold-marker",
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: grab; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.6));">
            <div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #F5D77F, #C4A044); display: flex; align-items: center; justify-content: center; box-shadow: 0 0 16px rgba(212,175,55,0.8); border: 2.5px solid #ffffff;">
              <div style="width: 10px; height: 10px; border-radius: 50%; background: #0b0a0f;"></div>
            </div>
            <div style="width: 3px; height: 12px; background: #C4A044; margin-top: -2px; border-radius: 2px;"></div>
            <div style="width: 8px; height: 3px; border-radius: 50%; background: rgba(0,0,0,0.5); margin-top: 1px;"></div>
          </div>
        `,
        iconSize: [32, 45],
        iconAnchor: [16, 43],
      });

      const marker = L.marker([initialLat, initialLng], {
        draggable: true,
        icon: goldIcon,
      }).addTo(map);

      markerRef.current = marker;
      mapInstanceRef.current = map;

      // Invalidate size across multiple animation frames to ensure tiles render perfectly
      const timers = [
        setTimeout(() => map.invalidateSize(), 50),
        setTimeout(() => map.invalidateSize(), 150),
        setTimeout(() => map.invalidateSize(), 300),
      ];

      // Reverse geocode when marker dragged
      marker.on("dragend", () => {
        const coords = marker.getLatLng();
        handleMapCoordinateSelect(coords.lat, coords.lng);
      });

      // Move marker and reverse geocode when map clicked
      map.on("click", (e: LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        handleMapCoordinateSelect(lat, lng);
      });

      return () => {
        timers.forEach(clearTimeout);
      };
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen, curLat, curLng, mapTheme, handleMapCoordinateSelect]);

  // Search inside map
  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim() || !mapInstanceRef.current || !markerRef.current) return;

    setIsSearching(true);
    try {
      const res = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(searchQuery.trim())}&limit=1`
      );
      if (res.ok) {
        const data: { features?: PhotonFeature[] } = await res.json();
        const feat = data?.features?.[0];
        if (feat) {
          const coords = feat.geometry?.coordinates || [77.209, 28.6139];
          const lng = coords[0] ?? 77.209;
          const lat = coords[1] ?? 28.6139;
          const p = feat.properties || {};

          const cityName = p.name || p.city || p.town || searchQuery;
          const stateName = p.state || "";
          const countryName = p.country || "India";

          let tz = 5.5;
          if (countryName.toLowerCase() !== "india" && (lng < 68 || lng > 98 || lat < 6 || lat > 38)) {
            tz = Math.round((lng / 15) * 2) / 2;
          }

          const newLoc: SelectedLocation = {
            name: cityName,
            state: stateName,
            country: countryName,
            lat,
            lng,
            tz,
          };

          setPickedLocation(newLoc);
          markerRef.current.setLatLng([lat, lng]);
          mapInstanceRef.current.flyTo([lat, lng], 11, { duration: 1.2 });
        }
      }
    } catch {
      // Ignored
    } finally {
      setIsSearching(false);
    }
  }

  // Detect Current Location using browser GPS
  function handleDetectGps() {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setIsDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        if (mapInstanceRef.current && markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
          mapInstanceRef.current.flyTo([lat, lng], 13, { duration: 1.2 });
        }
        handleMapCoordinateSelect(lat, lng);
        setIsDetectingGps(false);
      },
      () => {
        setIsDetectingGps(false);
        alert("Unable to retrieve your location. Please pick location manually on the map.");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      {/* Fallback critical CSS in case of any styling delay */}
      <style>{`
        .leaflet-container {
          width: 100%;
          height: 100%;
          position: relative;
          outline: 0;
          background: #14121c;
          font-family: inherit;
        }
        .leaflet-pane, .leaflet-tile, .leaflet-marker-icon, .leaflet-marker-shadow, .leaflet-tile-container {
          position: absolute;
          left: 0;
          top: 0;
        }
        .leaflet-tile {
          user-select: none;
          -webkit-user-select: none;
          border: none !important;
          outline: none !important;
        }
        .map-dark-filter .leaflet-tile {
          filter: brightness(0.65) invert(1) contrast(2.2) hue-rotate(190deg) saturate(0.25) brightness(0.75);
        }
        .leaflet-tile-container {
          pointer-events: none;
        }
        .leaflet-zoom-animated {
          transform-origin: 0 0;
        }
      `}</style>

      <div className="relative flex w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/20 bg-surface/95 shadow-2xl backdrop-blur-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-full border border-gold/40 bg-gold/15 text-gold">
              <MapPin className="size-4" />
            </div>
            <div>
              <h3 className="font-display text-lg text-fg">Select Birth Location on Map</h3>
              <p className="text-[0.7rem] text-muted">
                Click anywhere on the map or drag the gold pin for exact coordinates
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-muted hover:bg-white/10 hover:text-fg transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Search Bar + Controls */}
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-surface/50 p-3">
          <form onSubmit={handleSearch} className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search city, town, or address on map..."
              className="surface h-10 w-full rounded-xl border border-white/15 pl-9 pr-9 text-xs text-fg placeholder:text-muted/50 focus:border-gold focus:outline-none"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-gold" />
            )}
          </form>

          {/* Theme switcher */}
          <div className="flex items-center rounded-xl border border-white/15 bg-white/5 p-1 text-[0.68rem]">
            <button
              type="button"
              onClick={() => setMapTheme("dark")}
              className={`rounded-lg px-2.5 py-1 transition-colors cursor-pointer ${
                mapTheme === "dark" ? "bg-gold text-obsidian font-semibold" : "text-muted hover:text-fg"
              }`}
            >
              Dark
            </button>
            <button
              type="button"
              onClick={() => setMapTheme("standard")}
              className={`rounded-lg px-2.5 py-1 transition-colors cursor-pointer ${
                mapTheme === "standard" ? "bg-gold text-obsidian font-semibold" : "text-muted hover:text-fg"
              }`}
            >
              Street
            </button>
            <button
              type="button"
              onClick={() => setMapTheme("satellite")}
              className={`rounded-lg px-2.5 py-1 transition-colors cursor-pointer ${
                mapTheme === "satellite" ? "bg-gold text-obsidian font-semibold" : "text-muted hover:text-fg"
              }`}
            >
              Satellite
            </button>
          </div>

          <button
            type="button"
            onClick={handleDetectGps}
            disabled={isDetectingGps}
            title="Use current GPS location"
            className="flex h-10 items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 text-xs font-medium text-fg hover:bg-white/10 hover:border-gold/50 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isDetectingGps ? (
              <Loader2 className="size-3.5 animate-spin text-gold" />
            ) : (
              <Crosshair className="size-3.5 text-gold" />
            )}
            <span className="hidden sm:inline">My Location</span>
          </button>
        </div>

        {/* Leaflet Map Canvas */}
        <div className={`relative h-80 sm:h-96 w-full bg-obsidian ${mapTheme === "dark" ? "map-dark-filter" : ""}`}>
          <div ref={mapContainerRef} className="h-full w-full" />

          {/* Hint Overlay */}
          <div className="pointer-events-none absolute bottom-3 left-3 z-[400] rounded-xl border border-white/15 bg-obsidian/85 px-3 py-1.5 text-[0.68rem] text-muted/90 backdrop-blur-md">
            Click map or drag gold pin to position
          </div>
        </div>

        {/* Footer with Selected Location & Confirmation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-white/10 bg-surface/80 p-4">
          <div aria-live="polite" className="sr-only">
            {pickedLocation.name ? `${pickedLocation.name} selected at ${pickedLocation.lat.toFixed(2)}°N, ${pickedLocation.lng.toFixed(2)}°E` : "Selecting location"}
          </div>
          <div className="flex items-center gap-2.5">
            <Navigation className="size-4 shrink-0 text-gold" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-fg">
                  {pickedLocation.name}
                  {pickedLocation.state ? `, ${pickedLocation.state}` : ""}
                </span>
                {isReverseGeocoding && (
                  <Loader2 className="size-3 animate-spin text-gold" />
                )}
              </div>
              <div className="flex items-center gap-2 text-[0.7rem] text-muted">
                <span>
                  {pickedLocation.lat.toFixed(4)}°N, {pickedLocation.lng.toFixed(4)}°E
                </span>
                <span>•</span>
                <span>UTC {pickedLocation.tz >= 0 ? `+${pickedLocation.tz}` : pickedLocation.tz}</span>
                {pickedLocation.country && (
                  <>
                    <span>•</span>
                    <span>{pickedLocation.country}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-medium text-fg hover:bg-white/10 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => {
                onConfirm(pickedLocation);
                onClose();
              }}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl bg-gold px-5 py-2.5 text-xs font-semibold text-obsidian shadow-lg shadow-gold/20 hover:bg-gold-light transition-all cursor-pointer"
            >
              <Check className="size-4" />
              <span>Confirm Location</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

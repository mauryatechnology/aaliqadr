"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { MapPin, Search, Loader2, X, Check } from "lucide-react";
import { CITIES_DATABASE } from "@/lib/vedic-astro";

export interface SelectedLocation {
  name: string;
  state?: string;
  country?: string;
  lat: number;
  lng: number;
  tz: number;
}

interface PlaceSearchProps {
  id?: string;
  value: SelectedLocation;
  onChange: (loc: SelectedLocation) => void;
  placeholder?: string;
}

interface PhotonFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    name?: string;
    city?: string;
    town?: string;
    state?: string;
    county?: string;
    country?: string;
  };
}

export function PlaceSearch({
  id = "place-search",
  value,
  onChange,
  placeholder = "Search any city or town worldwide...",
}: PlaceSearchProps) {
  const [query, setQuery] = useState(value.name);
  const [prevValueName, setPrevValueName] = useState(value.name);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [remoteSuggestions, setRemoteSuggestions] = useState<SelectedLocation[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync state with prop during render when value.name changes externally
  if (prevValueName !== value.name) {
    setPrevValueName(value.name);
    setQuery(value.name);
  }

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const trimmed = query.trim().toLowerCase();

  // Instant local suggestions from built-in cities database
  const localSuggestions: SelectedLocation[] = useMemo(() => {
    if (trimmed.length < 2) {
      return CITIES_DATABASE.slice(0, 8).map((c) => ({
        name: c.name,
        state: c.state,
        country:
          c.state === "UAE" || c.state === "United Kingdom" || c.state === "United States" || c.state === "Singapore"
            ? c.state
            : "India",
        lat: c.lat,
        lng: c.lng,
        tz: c.tz,
      }));
    }

    return CITIES_DATABASE.filter(
      (c) => c.name.toLowerCase().includes(trimmed) || c.state.toLowerCase().includes(trimmed)
    ).map((c) => ({
      name: c.name,
      state: c.state,
      country:
        c.state === "UAE" || c.state === "United Kingdom" || c.state === "United States" || c.state === "Singapore"
          ? c.state
          : "India",
      lat: c.lat,
      lng: c.lng,
      tz: c.tz,
    }));
  }, [trimmed]);

  // Combined suggestions: local + debounced remote Photon geocoding
  const combinedSuggestions = useMemo(() => {
    if (trimmed.length < 2) {
      return localSuggestions;
    }
    const combined = [...localSuggestions];
    for (const r of remoteSuggestions) {
      const exists = combined.some(
        (c) =>
          c.name.toLowerCase() === r.name.toLowerCase() &&
          Math.abs(c.lat - r.lat) < 0.2 &&
          Math.abs(c.lng - r.lng) < 0.2
      );
      if (!exists) {
        combined.push(r);
      }
    }
    return combined.slice(0, 10);
  }, [trimmed, localSuggestions, remoteSuggestions]);

  // Debounced Photon API call for global places
  useEffect(() => {
    if (!isOpen || trimmed.length < 3) {
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(trimmed)}&limit=6`,
          { signal: controller.signal }
        );
        if (res.ok) {
          const data: { features?: PhotonFeature[] } = await res.json();
          if (data && Array.isArray(data.features)) {
            const remote: SelectedLocation[] = data.features.map((f) => {
              const p = f.properties || {};
              const coords = f.geometry?.coordinates || [77.209, 28.6139];
              const lng = coords[0] ?? 77.209;
              const lat = coords[1] ?? 28.6139;

              const cityName = p.name || p.city || p.town || "Unknown";
              const stateName = p.state || p.county || "";
              const countryName = p.country || "India";

              let estimatedTz = 5.5;
              if (countryName.toLowerCase() !== "india" && (lng < 68 || lng > 98 || lat < 6 || lat > 38)) {
                estimatedTz = Math.round((lng / 15) * 2) / 2;
              }

              return {
                name: cityName,
                state: stateName,
                country: countryName,
                lat,
                lng,
                tz: estimatedTz,
              };
            });
            setRemoteSuggestions(remote);
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "AbortError") {
          // Graceful fallback to local matches
        }
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, isOpen]);

  function handleSelect(loc: SelectedLocation) {
    onChange(loc);
    setQuery(loc.state ? `${loc.name}, ${loc.state}` : loc.name);
    setIsOpen(false);
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <MapPin className="pointer-events-none absolute left-3.5 size-4 text-gold/80" />
        <input
          id={id}
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          placeholder={placeholder}
          className="surface h-13 w-full rounded-xl border border-white/15 pl-10 pr-9 text-xs sm:text-sm text-fg placeholder:text-muted/50 focus:border-gold focus:outline-none transition-colors"
        />
        <div className="absolute right-3 flex items-center gap-1.5">
          {isSearching ? (
            <Loader2 className="size-3.5 animate-spin text-gold/70" />
          ) : query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setIsOpen(true);
              }}
              className="text-muted hover:text-fg p-0.5 cursor-pointer"
              aria-label="Clear location search"
            >
              <X className="size-3.5" />
            </button>
          ) : (
            <Search className="size-3.5 text-muted/60" />
          )}
        </div>
      </div>

      {/* Dropdown Suggestions */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-64 overflow-y-auto rounded-2xl border border-white/15 bg-obsidian/95 p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2.5 py-1.5 text-[0.68rem] uppercase tracking-wider text-muted/70 flex items-center justify-between">
            <span>Worldwide Birth Locations</span>
            {isSearching && <span className="text-gold">Searching...</span>}
          </div>

          {combinedSuggestions.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted">
              No matching city found. Try typing city name or district.
            </div>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {combinedSuggestions.map((loc, idx) => {
                const isSelected =
                  value.name.toLowerCase() === loc.name.toLowerCase() &&
                  Math.abs(value.lat - loc.lat) < 0.1;

                return (
                  <li key={`${loc.name}-${loc.lat}-${loc.lng}-${idx}`}>
                    <button
                      type="button"
                      onClick={() => handleSelect(loc)}
                      className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-gold/15 text-gold font-medium"
                          : "text-fg/90 hover:bg-white/10 hover:text-fg"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <MapPin className={`size-3.5 shrink-0 ${isSelected ? "text-gold" : "text-muted"}`} />
                        <div className="truncate">
                          <span className="font-medium text-fg">{loc.name}</span>
                          {loc.state && <span className="text-muted text-[0.72rem]">, {loc.state}</span>}
                          {loc.country && <span className="text-muted/70 text-[0.72rem]"> ({loc.country})</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 text-[0.65rem] text-muted/80">
                        <span>
                          {loc.lat.toFixed(1)}°N, {loc.lng.toFixed(1)}°E
                        </span>
                        {isSelected && <Check className="size-3 text-gold" />}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

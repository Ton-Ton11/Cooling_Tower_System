import React, { useState, useEffect, useRef, useMemo } from "react";
import { MapPin, CheckCircle2, AlertTriangle, Loader2, Navigation, Globe } from "lucide-react";

/**
 * Zamboanga City geographic bounding box (approximate administrative boundary)
 * Lat: 6.8400 to 7.4500 N, Lon: 121.8500 to 122.3600 E
 */
export const ZC_MIN_LAT = 6.8400;
export const ZC_MAX_LAT = 7.4500;
export const ZC_MIN_LON = 121.8500;
export const ZC_MAX_LON = 122.3600;

export const ZAMBOANGA_BARANGAYS_GAZETTEER = [
    { barangay: "Tetuan", lat: 6.9136, lon: 122.0837, display_name: "Brgy. Tetuan, Zamboanga City, 7000, Philippines" },
    { barangay: "Canelar", lat: 6.9154, lon: 122.0715, display_name: "Brgy. Canelar, Zamboanga City, 7000, Philippines" },
    { barangay: "Sta. Maria", lat: 6.9315, lon: 122.0728, display_name: "Brgy. Sta. Maria, Zamboanga City, 7000, Philippines" },
    { barangay: "Putik", lat: 6.9355, lon: 122.1045, display_name: "Brgy. Putik, Zamboanga City, 7000, Philippines" },
    { barangay: "Guiwan", lat: 6.9248, lon: 122.0942, display_name: "Brgy. Guiwan, Zamboanga City, 7000, Philippines" },
    { barangay: "Pasonanca", lat: 6.9472, lon: 122.0706, display_name: "Brgy. Pasonanca, Zamboanga City, 7000, Philippines" },
    { barangay: "Tumaga", lat: 6.9380, lon: 122.0840, display_name: "Brgy. Tumaga, Zamboanga City, 7000, Philippines" },
    { barangay: "Divisoria", lat: 6.9412, lon: 122.1135, display_name: "Brgy. Divisoria, Zamboanga City, 7000, Philippines" },
    { barangay: "Boalan", lat: 6.9525, lon: 122.1230, display_name: "Brgy. Boalan, Zamboanga City, 7000, Philippines" },
    { barangay: "Zambowood", lat: 6.9585, lon: 122.1320, display_name: "Brgy. Zambowood, Zamboanga City, 7000, Philippines" },
    { barangay: "Mercedes", lat: 6.9682, lon: 122.1455, display_name: "Brgy. Mercedes, Zamboanga City, 7000, Philippines" },
    { barangay: "Culianan", lat: 6.9790, lon: 122.1560, display_name: "Brgy. Culianan, Zamboanga City, 7000, Philippines" },
    { barangay: "Talon-Talon", lat: 6.9082, lon: 122.1140, display_name: "Brgy. Talon-Talon, Zamboanga City, 7000, Philippines" },
    { barangay: "Mampang", lat: 6.9125, lon: 122.1285, display_name: "Brgy. Mampang, Zamboanga City, 7000, Philippines" },
    { barangay: "Tugbungan", lat: 6.9212, lon: 122.1012, display_name: "Brgy. Tugbungan, Zamboanga City, 7000, Philippines" },
    { barangay: "Sta. Catalina", lat: 6.9065, lon: 122.0890, display_name: "Brgy. Sta. Catalina, Zamboanga City, 7000, Philippines" },
    { barangay: "San Jose Cawa-Cawa", lat: 6.9102, lon: 122.0672, display_name: "Brgy. San Jose Cawa-Cawa, Zamboanga City, 7000, Philippines" },
    { barangay: "San Jose Gusu", lat: 6.9165, lon: 122.0548, display_name: "Brgy. San Jose Gusu, Zamboanga City, 7000, Philippines" },
    { barangay: "Baliwasan", lat: 6.9130, lon: 122.0595, display_name: "Brgy. Baliwasan, Zamboanga City, 7000, Philippines" },
    { barangay: "San Roque", lat: 6.9362, lon: 122.0465, display_name: "Brgy. San Roque, Zamboanga City, 7000, Philippines" },
    { barangay: "Suterville", lat: 6.9182, lon: 122.0490, display_name: "Brgy. Suterville, Zamboanga City, 7000, Philippines" },
    { barangay: "Calarian", lat: 6.9295, lon: 122.0215, display_name: "Brgy. Calarian, Zamboanga City, 7000, Philippines" },
    { barangay: "Sinunuc", lat: 6.9425, lon: 121.9980, display_name: "Brgy. Sinunuc, Zamboanga City, 7000, Philippines" },
    { barangay: "Ayala", lat: 6.9685, lon: 121.9465, display_name: "Brgy. Ayala, Zamboanga City, 7000, Philippines" },
    { barangay: "Talisayan", lat: 6.9890, lon: 121.9280, display_name: "Brgy. Talisayan, Zamboanga City, 7000, Philippines" },
    { barangay: "Labuan", lat: 7.0985, lon: 121.9040, display_name: "Brgy. Labuan, Zamboanga City, 7000, Philippines" },
    { barangay: "Cabatangan", lat: 6.9590, lon: 122.0595, display_name: "Brgy. Cabatangan, Zamboanga City, 7000, Philippines" },
    { barangay: "Lunzuran", lat: 6.9620, lon: 122.0885, display_name: "Brgy. Lunzuran, Zamboanga City, 7000, Philippines" },
    { barangay: "Camino Nuevo", lat: 6.9110, lon: 122.0755, display_name: "Brgy. Camino Nuevo, Zamboanga City, 7000, Philippines" },
    { barangay: "Zone I", lat: 6.9045, lon: 122.0735, display_name: "Brgy. Zone I (City Proper), Zamboanga City, 7000, Philippines" },
    { barangay: "Zone II", lat: 6.9058, lon: 122.0762, display_name: "Brgy. Zone II (City Proper), Zamboanga City, 7000, Philippines" },
    { barangay: "Zone III", lat: 6.9070, lon: 122.0780, display_name: "Brgy. Zone III (City Proper), Zamboanga City, 7000, Philippines" },
    { barangay: "Zone IV", lat: 6.9035, lon: 122.0795, display_name: "Brgy. Zone IV (City Proper), Zamboanga City, 7000, Philippines" },
    { barangay: "Sta. Barbara", lat: 6.9060, lon: 122.0835, display_name: "Brgy. Sta. Barbara, Zamboanga City, 7000, Philippines" },
    { barangay: "Rio Hondo", lat: 6.9012, lon: 122.0870, display_name: "Brgy. Rio Hondo, Zamboanga City, 7000, Philippines" },
    { barangay: "Sangali", lat: 7.0725, lon: 122.2030, display_name: "Brgy. Sangali, Zamboanga City, 7000, Philippines" },
    { barangay: "Manicahan", lat: 7.0245, lon: 122.1865, display_name: "Brgy. Manicahan, Zamboanga City, 7000, Philippines" },
    { barangay: "Bolong", lat: 7.0980, lon: 122.2320, display_name: "Brgy. Bolong, Zamboanga City, 7000, Philippines" },
    { barangay: "Curuan", lat: 7.2050, lon: 122.2260, display_name: "Brgy. Curuan, Zamboanga City, 7000, Philippines" },
    { barangay: "Vitali", lat: 7.3650, lon: 122.3110, display_name: "Brgy. Vitali, Zamboanga City, 7000, Philippines" },
];

const OUTSIDE_CITIES_GAZETTEER = [
    { city: "Dipolog City", province: "Zamboanga del Norte", lat: 8.5883, lon: 123.3408 },
    { city: "Pagadian City", province: "Zamboanga del Sur", lat: 7.8257, lon: 123.4370 },
    { city: "Ipil", province: "Zamboanga Sibugay", lat: 7.7844, lon: 122.5861 },
    { city: "Isabela City", province: "Basilan", lat: 6.7041, lon: 121.9712 },
    { city: "Basilan", province: "BARMM", lat: 6.5786, lon: 122.0338 },
    { city: "Jolo", province: "Sulu", lat: 6.0522, lon: 121.0022 },
    { city: "Bongao", province: "Tawi-Tawi", lat: 5.0292, lon: 119.7731 },
    { city: "Manila", province: "Metro Manila", lat: 14.5995, lon: 120.9842 },
    { city: "Quezon City", province: "Metro Manila", lat: 14.6760, lon: 121.0437 },
    { city: "Makati", province: "Metro Manila", lat: 14.5547, lon: 121.0244 },
    { city: "Taguig", province: "Metro Manila", lat: 14.5176, lon: 121.0509 },
    { city: "Pasig", province: "Metro Manila", lat: 14.5764, lon: 121.0851 },
    { city: "Cebu City", province: "Cebu", lat: 10.3157, lon: 123.8854 },
    { city: "Cebu", province: "Cebu", lat: 10.3157, lon: 123.8854 },
    { city: "Davao City", province: "Davao del Sur", lat: 7.1907, lon: 125.4553 },
    { city: "Davao", province: "Davao del Sur", lat: 7.1907, lon: 125.4553 },
    { city: "Cagayan de Oro", province: "Misamis Oriental", lat: 8.4542, lon: 124.6319 },
    { city: "Iloilo", province: "Iloilo", lat: 10.7202, lon: 122.5621 },
    { city: "Bacolod", province: "Negros Occidental", lat: 10.6765, lon: 122.9509 },
    { city: "General Santos", province: "South Cotabato", lat: 6.1164, lon: 125.1716 },
    { city: "Butuan", province: "Agusan del Norte", lat: 8.9475, lon: 125.5406 },
    { city: "Zamboanga del Norte", province: "Zamboanga Peninsula", lat: 8.1520, lon: 122.6288 },
    { city: "Zamboanga del Sur", province: "Zamboanga Peninsula", lat: 7.8383, lon: 123.2967 },
    { city: "Zamboanga Sibugay", province: "Zamboanga Peninsula", lat: 7.7219, lon: 122.6908 },
];

/**
 * Forward-geocode and verify whether an address or coordinate pair is within Zamboanga City.
 */
export function evaluateZamboangaGeospatial(address, lat = null, lon = null) {
    const norm = (address || "").toLowerCase().trim();
    if (!norm && lat === null && lon === null) {
        return {
            status: "empty",
            is_within_zamboanga_city: false,
            detected_city: null,
            lat: null,
            lon: null,
            reason: "Type an address to run real-time geospatial forward geocoding.",
        };
    }

    // Check explicit outside cities first
    for (const out of OUTSIDE_CITIES_GAZETTEER) {
        if (norm.includes(out.city.toLowerCase()) && !norm.includes("zamboanga city")) {
            return {
                status: "outside",
                is_within_zamboanga_city: false,
                detected_city: `${out.city}, ${out.province}`,
                lat: lat ?? out.lat,
                lon: lon ?? out.lon,
                reason: `Forward-geocoded to ${out.city} (${(lat ?? out.lat).toFixed(4)}° N, ${(lon ?? out.lon).toFixed(4)}° E) — Outside Zamboanga City.`,
            };
        }
    }

    // If explicit coordinates were resolved by the geospatial service
    if (typeof lat === "number" && typeof lon === "number" && !Number.isNaN(lat) && !Number.isNaN(lon)) {
        const insideBox = lat >= ZC_MIN_LAT && lat <= ZC_MAX_LAT && lon >= ZC_MIN_LON && lon <= ZC_MAX_LON;
        if (insideBox) {
            return {
                status: "inside",
                is_within_zamboanga_city: true,
                detected_city: "Zamboanga City",
                lat,
                lon,
                reason: `Geospatial coordinates verified within Zamboanga City (${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E).`,
            };
        }
        return {
            status: "outside",
            is_within_zamboanga_city: false,
            detected_city: "Outside Zamboanga City",
            lat,
            lon,
            reason: `Geospatial coordinates (${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E) are outside the Zamboanga City service boundary.`,
        };
    }

    // Match barangay gazetteer
    for (const b of ZAMBOANGA_BARANGAYS_GAZETTEER) {
        const bNorm = b.barangay.toLowerCase();
        const bAlt = bNorm.replace("sta.", "santa");
        if (norm.includes(bNorm) || norm.includes(bAlt)) {
            return {
                status: "inside",
                is_within_zamboanga_city: true,
                detected_city: "Zamboanga City",
                detected_barangay: b.barangay,
                lat: b.lat,
                lon: b.lon,
                reason: `Forward-geocoded to Brgy. ${b.barangay}, Zamboanga City (${b.lat.toFixed(4)}° N, ${b.lon.toFixed(4)}° E).`,
            };
        }
    }

    if (norm.includes("zamboanga city") || norm.includes("zamboanga") || norm.includes("7000")) {
        return {
            status: "inside",
            is_within_zamboanga_city: true,
            detected_city: "Zamboanga City",
            lat: 6.9214,
            lon: 122.0790,
            reason: "Forward-geocoded to Zamboanga City (6.9214° N, 122.0790° E).",
        };
    }

    return {
        status: "unverified",
        is_within_zamboanga_city: false,
        detected_city: "Unverified / Outside Zamboanga City",
        lat: null,
        lon: null,
        reason: "Address has not yet resolved to Zamboanga City. Select a real-time geospatial suggestion below.",
    };
}

/**
 * Free Geospatial Address Autocomplete & Automated Forward Geocoding Input Component
 */
export default function GeospatialAddressAutocomplete({
    value = "",
    onChange,
    onGeocodeResult,
    placeholder = "Search street, barangay, or city (real-time geospatial autocomplete)...",
    allowOutsideSave = false,
    error = "",
    id = "geospatial_address",
}) {
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [openDropdown, setOpenDropdown] = useState(false);
    const [selectedCoords, setSelectedCoords] = useState({ lat: null, lon: null });
    const [remoteVerification, setRemoteVerification] = useState(null);
    const containerRef = useRef(null);

    const localEval = useMemo(
        () => evaluateZamboangaGeospatial(value, selectedCoords.lat, selectedCoords.lon),
        [value, selectedCoords.lat, selectedCoords.lon]
    );

    const activeEval = remoteVerification && remoteVerification.status !== "empty" ? remoteVerification : localEval;

    useEffect(() => {
        if (onGeocodeResult) {
            onGeocodeResult(activeEval);
        }
    }, [activeEval.status, activeEval.is_within_zamboanga_city, activeEval.lat, activeEval.lon, value]);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setOpenDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Debounced real-time geospatial search + forward geocoding
    useEffect(() => {
        const q = (value || "").trim();
        if (q.length < 2) {
            setSuggestions([]);
            setRemoteVerification(null);
            return;
        }

        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const { data } = await window.axios.get("/api/location/autocomplete", {
                    params: { q },
                });
                if (Array.isArray(data?.suggestions)) {
                    setSuggestions(data.suggestions);
                }
                if (data?.verification) {
                    setRemoteVerification({
                        status: data.verification.status,
                        is_within_zamboanga_city: Boolean(data.verification.is_within_zamboanga_city),
                        detected_city: data.verification.detected_city,
                        lat: data.verification.latitude ?? null,
                        lon: data.verification.longitude ?? null,
                        reason: data.verification.reason,
                    });
                }
            } catch {
                // Local fallback suggestions if network request fails
                const normQ = q.toLowerCase();
                const localMatches = ZAMBOANGA_BARANGAYS_GAZETTEER.filter(
                    (b) =>
                        b.display_name.toLowerCase().includes(normQ) ||
                        b.barangay.toLowerCase().includes(normQ)
                )
                    .slice(0, 6)
                    .map((b) => ({
                        display_name: b.display_name,
                        barangay: b.barangay,
                        city: "Zamboanga City",
                        lat: b.lat,
                        lon: b.lon,
                        is_within_zamboanga_city: true,
                        status: "inside",
                        reason: `Forward-geocoded to Brgy. ${b.barangay}, Zamboanga City (${b.lat.toFixed(4)}° N, ${b.lon.toFixed(4)}° E).`,
                    }));
                setSuggestions(localMatches);
            } finally {
                setLoading(false);
            }
        }, 260);

        return () => clearTimeout(timer);
    }, [value]);

    const handleSelectSuggestion = (item) => {
        setSelectedCoords({
            lat: typeof item.lat === "number" ? item.lat : parseFloat(item.lat),
            lon: typeof item.lon === "number" ? item.lon : parseFloat(item.lon),
        });
        setRemoteVerification({
            status: item.is_within_zamboanga_city ? "inside" : "outside",
            is_within_zamboanga_city: Boolean(item.is_within_zamboanga_city),
            detected_city: item.city || (item.is_within_zamboanga_city ? "Zamboanga City" : "Outside Zamboanga City"),
            lat: typeof item.lat === "number" ? item.lat : parseFloat(item.lat),
            lon: typeof item.lon === "number" ? item.lon : parseFloat(item.lon),
            reason: item.reason,
        });
        if (onChange) {
            onChange(item.display_name, item);
        }
        setOpenDropdown(false);
    };

    return (
        <div ref={containerRef} className="space-y-2 relative">
            {/* Input + Geospatial Status Header */}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                    <Globe className="size-3.5 text-blue-600" />
                    <span>OpenStreetMap Nominatim Forward Geocoding</span>
                </div>

                {value.trim().length > 1 && (
                    activeEval.is_within_zamboanga_city ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                            <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                            <span>Within Zamboanga City</span>
                            {activeEval.lat && activeEval.lon && (
                                <span className="text-[10px] font-mono text-emerald-700">
                                    ({Number(activeEval.lat).toFixed(4)}°N, {Number(activeEval.lon).toFixed(4)}°E)
                                </span>
                            )}
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-rose-800 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                            <AlertTriangle className="size-3.5 text-rose-600 shrink-0" />
                            <span>
                                {activeEval.status === "outside"
                                    ? `Outside Zamboanga City (${activeEval.detected_city || "Restricted"})`
                                    : "Unverified — Select a Geospatial Suggestion"}
                            </span>
                        </span>
                    )
                )}
            </div>

            {/* Search Input Box */}
            <div className="relative">
                <MapPin className="absolute left-3.5 top-3 size-5 text-blue-600 pointer-events-none" />
                <input
                    id={id}
                    type="text"
                    autoComplete="off"
                    value={value}
                    placeholder={placeholder}
                    onFocus={() => {
                        if (suggestions.length > 0 || value.trim().length >= 2) {
                            setOpenDropdown(true);
                        }
                    }}
                    onChange={(e) => {
                        const nextVal = e.target.value;
                        setSelectedCoords({ lat: null, lon: null });
                        setRemoteVerification(null);
                        setOpenDropdown(true);
                        if (onChange) onChange(nextVal, null);
                    }}
                    className="w-full pl-11 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all text-sm"
                />
                {loading && (
                    <Loader2 className="absolute right-3.5 top-3 size-4 text-blue-600 animate-spin" />
                )}
            </div>

            {/* Real-time Autocomplete Suggestions Dropdown */}
            {openDropdown && suggestions.length > 0 && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden max-h-64 overflow-y-auto divide-y divide-slate-100">
                    <div className="px-3.5 py-2 bg-slate-50 flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                        <span>Real-Time Geospatial Suggestions & Forward Geocoding</span>
                        <span>OpenStreetMap / PH Gazetteer</span>
                    </div>
                    {suggestions.map((item, idx) => (
                        <button
                            key={`${item.display_name}-${idx}`}
                            type="button"
                            onClick={() => handleSelectSuggestion(item)}
                            className="w-full text-left px-3.5 py-2.5 hover:bg-blue-50/70 transition flex items-start justify-between gap-3 group"
                        >
                            <div className="flex items-start gap-2.5 min-w-0">
                                <Navigation
                                    className={`size-4 mt-0.5 shrink-0 ${
                                        item.is_within_zamboanga_city ? "text-emerald-600" : "text-rose-500"
                                    }`}
                                />
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-slate-900 group-hover:text-blue-700 truncate">
                                        {item.display_name}
                                    </p>
                                    <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                                        {item.lat && item.lon && (
                                            <span className="font-mono text-[10px] text-slate-600">
                                                Lat: {Number(item.lat).toFixed(4)}° N, Lon: {Number(item.lon).toFixed(4)}° E
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>

                            <span
                                className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                    item.is_within_zamboanga_city
                                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                        : "bg-rose-100 text-rose-800 border border-rose-200"
                                }`}
                            >
                                {item.is_within_zamboanga_city ? "Within Zamboanga City" : "Outside Zamboanga"}
                            </span>
                        </button>
                    ))}
                </div>
            )}

            {/* Forward Geocoding Verification Banner */}
            {value.trim().length > 2 && (
                <div
                    className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                        activeEval.is_within_zamboanga_city
                            ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                            : "bg-amber-50/90 border-amber-300 text-amber-950"
                    }`}
                >
                    {activeEval.is_within_zamboanga_city ? (
                        <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                        <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-0.5">
                        <p className="font-bold">
                            {activeEval.is_within_zamboanga_city
                                ? "Geospatial Verification Confirmed: Eligible for Zamboanga City Service Booking"
                                : allowOutsideSave
                                ? "Outside Zamboanga City Notice: You can register your account, but booking a service is strictly available within Zamboanga City only."
                                : "Booking Service Restricted: This location is outside Zamboanga City. Booking a service is only available within Zamboanga City."}
                        </p>
                        <p className="text-[11px] opacity-90">{activeEval.reason}</p>
                    </div>
                </div>
            )}

            {error && <div className="text-xs font-medium text-red-600">{error}</div>}
        </div>
    );
}

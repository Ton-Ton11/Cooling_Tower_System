import React, { useState, useEffect, useRef, useMemo } from "react";
import { MapPin, CheckCircle2, AlertTriangle, Loader2, Navigation, Home, Building2, Compass, Sparkles } from "lucide-react";

/**
 * Zamboanga City geographic bounding box (administrative boundary)
 * Lat: 6.8400 to 7.4500 N, Lon: 121.8500 to 122.3600 E
 */
export const ZC_MIN_LAT = 6.8400;
export const ZC_MAX_LAT = 7.4500;
export const ZC_MIN_LON = 121.8500;
export const ZC_MAX_LON = 122.3600;

/**
 * Philippine archipelago bounding box for Open-Source Photon/OSM area locator
 */
const PH_BBOX = "116.8,4.5,126.6,21.2";

/**
 * Official 98 Barangays of Zamboanga City for instant boundary verification.
 * All outside cities, municipalities, and barangays across the Philippines are
 * dynamically resolved via OpenStreetMap Photon & Nominatim open-source locators.
 */
export const ZAMBOANGA_BARANGAYS_GAZETTEER = [
    { barangay: "Arena Blanco", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9145, lon: 122.1185 },
    { barangay: "Ayala", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9685, lon: 121.9465 },
    { barangay: "Baliwasan", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9130, lon: 122.0595 },
    { barangay: "Baluno", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9820, lon: 122.0120 },
    { barangay: "Boalan", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9525, lon: 122.1230 },
    { barangay: "Bolong", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 7.0980, lon: 122.2320 },
    { barangay: "Buenavista", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 7.1850, lon: 122.2480 },
    { barangay: "Bunguiao", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 7.0640, lon: 122.1920 },
    { barangay: "Busay", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9350, lon: 122.0750 },
    { barangay: "Cabaluay", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9890, lon: 122.1780 },
    { barangay: "Cabatangan", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9590, lon: 122.0595 },
    { barangay: "Cacao", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9950, lon: 122.1120 },
    { barangay: "Calabasa", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 7.1250, lon: 122.2150 },
    { barangay: "Calarian", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9295, lon: 122.0215 },
    { barangay: "Camino Nuevo", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9110, lon: 122.0755 },
    { barangay: "Campo Islam", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9148, lon: 122.0430 },
    { barangay: "Canelar", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9154, lon: 122.0715 },
    { barangay: "Capisan", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9580, lon: 122.0480 },
    { barangay: "Cawit", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9540, lon: 121.9760 },
    { barangay: "Culianan", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9790, lon: 122.1560 },
    { barangay: "Curuan", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 7.2050, lon: 122.2260 },
    { barangay: "Dita", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 7.0520, lon: 122.2010 },
    { barangay: "Divisoria", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9412, lon: 122.1135 },
    { barangay: "Dulian (Upper Bunguiao)", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 7.0810, lon: 122.1650 },
    { barangay: "Dulian (Upper Pasonanca)", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9920, lon: 122.0690 },
    { barangay: "Guisao", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9860, lon: 122.1420 },
    { barangay: "Guiwan", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9248, lon: 122.0942 },
    { barangay: "Kasanyangan", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9048, lon: 122.0985 },
    { barangay: "La Paz", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 7.0240, lon: 121.9580 },
    { barangay: "Labuan", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 7.0985, lon: 121.9040 },
    { barangay: "Lamisahan", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 7.0010, lon: 122.1490 },
    { barangay: "Landang Gua", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9510, lon: 122.2120 },
    { barangay: "Landang Laum", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9580, lon: 122.2240 },
    { barangay: "Lanzones", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9990, lon: 122.1350 },
    { barangay: "Lapakan", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9920, lon: 122.1290 },
    { barangay: "Latuan (Curuan)", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 7.1980, lon: 122.2190 },
    { barangay: "Licomo", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 7.4120, lon: 122.3250 },
    { barangay: "Limaong", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 7.2650, lon: 122.2810 },
    { barangay: "Limpapa", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 7.1320, lon: 121.9020 },
    { barangay: "Lubigan", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 7.0410, lon: 122.1680 },
    { barangay: "Lumayang", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9840, lon: 122.0950 },
    { barangay: "Lumbangan", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9490, lon: 122.1090 },
    { barangay: "Lunzuran", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9620, lon: 122.0885 },
    { barangay: "Maasin", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9520, lon: 121.9890 },
    { barangay: "Malagutay", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9380, lon: 122.0350 },
    { barangay: "Mampang", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9125, lon: 122.1285 },
    { barangay: "Manalipa", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9420, lon: 122.2510 },
    { barangay: "Mangusu", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 7.3120, lon: 122.2950 },
    { barangay: "Manicahan", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 7.0245, lon: 122.1865 },
    { barangay: "Mariki", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9005, lon: 122.0920 },
    { barangay: "Mercedes", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9682, lon: 122.1455 },
    { barangay: "Muti", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 7.2350, lon: 122.2620 },
    { barangay: "Pamucutan", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 7.0050, lon: 121.9480 },
    { barangay: "Pangapuyan", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9120, lon: 122.1820 },
    { barangay: "Panubigan", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 7.1450, lon: 122.2380 },
    { barangay: "Pasilmanta", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9350, lon: 122.2350 },
    { barangay: "Pasobolong", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9585, lon: 122.1180 },
    { barangay: "Pasonanca", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9472, lon: 122.0706 },
    { barangay: "Patalon", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 7.0680, lon: 121.9120 },
    { barangay: "Putik", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9355, lon: 122.1045 },
    { barangay: "Quiniput", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 7.1620, lon: 122.2440 },
    { barangay: "Recodo", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9560, lon: 121.9620 },
    { barangay: "Rio Hondo", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9012, lon: 122.0870 },
    { barangay: "Salaan", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9760, lon: 122.1150 },
    { barangay: "San Jose Cawa-Cawa", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9102, lon: 122.0672 },
    { barangay: "San Jose Gusu", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9165, lon: 122.0548 },
    { barangay: "San Ramon", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 7.0020, lon: 121.9190 },
    { barangay: "San Roque", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9362, lon: 122.0465 },
    { barangay: "Sangali", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 7.0725, lon: 122.2030 },
    { barangay: "Sibulao", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 7.3350, lon: 122.2880 },
    { barangay: "Sinubung", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 7.0320, lon: 121.9250 },
    { barangay: "Sinunuc", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9425, lon: 121.9980 },
    { barangay: "Sta. Barbara", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9060, lon: 122.0835 },
    { barangay: "Sta. Catalina", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9065, lon: 122.0890 },
    { barangay: "Sta. Maria", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9315, lon: 122.0728 },
    { barangay: "Santo Niño", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9140, lon: 122.0645 },
    { barangay: "Suterville", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9182, lon: 122.0490 },
    { barangay: "Tagasilay", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 7.2850, lon: 122.2750 },
    { barangay: "Taguiti", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 7.3480, lon: 122.3010 },
    { barangay: "Talabaan", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9790, lon: 122.1680 },
    { barangay: "Talisayan", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9890, lon: 121.9280 },
    { barangay: "Talon-Talon", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9082, lon: 122.1140 },
    { barangay: "Taluksangay", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9520, lon: 122.1820 },
    { barangay: "Tetuan", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9136, lon: 122.0837 },
    { barangay: "Tictapul", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 7.2510, lon: 122.2680 },
    { barangay: "Tigbalabag", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 7.3210, lon: 122.2850 },
    { barangay: "Tigtabon", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9380, lon: 122.2150 },
    { barangay: "Tolosa", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 7.0390, lon: 122.1540 },
    { barangay: "Tugbungan", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9212, lon: 122.1012 },
    { barangay: "Tulungatung", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9690, lon: 121.9580 },
    { barangay: "Tumaga", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9380, lon: 122.0840 },
    { barangay: "Tumalutab", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9820, lon: 122.2650 },
    { barangay: "Tumitus", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 7.3020, lon: 122.2920 },
    { barangay: "Victoria", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 7.0150, lon: 122.1720 },
    { barangay: "Vitali", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 7.3650, lon: 122.3110 },
    { barangay: "Zambowood", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9585, lon: 122.1320 },
    { barangay: "Zone I (City Proper)", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9045, lon: 122.0735 },
    { barangay: "Zone II (City Proper)", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9058, lon: 122.0762 },
    { barangay: "Zone III (City Proper)", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9070, lon: 122.0780 },
    { barangay: "Zone IV (City Proper)", city: "Zamboanga City", province: "Zamboanga del Sur", lat: 6.9035, lon: 122.0795 },
].map((b) => ({
    ...b,
    display_name: `Brgy. ${b.barangay}, ${b.city}, ${b.province}, 7000, Philippines`,
}));

/**
 * Forward-geocode and verify whether an address, city, or coordinate pair falls strictly within Zamboanga City.
 */
export function evaluateZamboangaGeospatial(address, lat = null, lon = null, explicitCity = null, explicitProvince = null) {
    const norm = (address || "").toLowerCase().trim();
    const cityNorm = (explicitCity || "").toLowerCase().trim();

    if (!norm && lat === null && lon === null && !cityNorm) {
        return {
            status: "empty",
            is_within_zamboanga_city: false,
            detected_city: null,
            detected_province: null,
            lat: null,
            lon: null,
            reason: "Type a barangay or city to run real-time geospatial forward geocoding.",
        };
    }

    // 1. If an explicit city was resolved by the open-source locator and is not Zamboanga City
    if (cityNorm && cityNorm !== "zamboanga city" && cityNorm !== "city of zamboanga" && cityNorm !== "zamboanga") {
        return {
            status: "outside",
            is_within_zamboanga_city: false,
            detected_city: explicitCity,
            detected_province: explicitProvince || null,
            lat,
            lon,
            reason:
                typeof lat === "number" && typeof lon === "number"
                    ? `Forward-geocoded to ${explicitCity}${explicitProvince ? `, ${explicitProvince}` : ""} (${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E) — Outside Zamboanga City boundary.`
                    : `Resolved to ${explicitCity}${explicitProvince ? `, ${explicitProvince}` : ""} — Outside Zamboanga City boundary.`,
        };
    }

    // 2. Check border exclusions in raw address string
    const borderExclusions = [
        "isabela city", "basilan", "lamitan", "tungawan", "ipil", "sibuco",
        "sirawai", "siocon", "pagadian", "dipolog", "manila", "quezon city",
        "makati", "cebu", "davao", "cagayan de oro", "iloilo", "bacolod",
    ];
    for (const excl of borderExclusions) {
        if (norm.includes(excl) && !norm.includes("zamboanga city")) {
            return {
                status: "outside",
                is_within_zamboanga_city: false,
                detected_city: explicitCity || excl.replace(/\b\w/g, (c) => c.toUpperCase()),
                detected_province: explicitProvince || null,
                lat,
                lon,
                reason: `Forward-geocoded to ${explicitCity || excl.replace(/\b\w/g, (c) => c.toUpperCase())} — Outside Zamboanga City service boundary.`,
            };
        }
    }

    // 3. If explicit coordinates were resolved by the open-source geospatial service, check Zamboanga City bounding box
    if (typeof lat === "number" && typeof lon === "number" && !Number.isNaN(lat) && !Number.isNaN(lon)) {
        const insideBox = lat >= ZC_MIN_LAT && lat <= ZC_MAX_LAT && lon >= ZC_MIN_LON && lon <= ZC_MAX_LON;
        if (insideBox) {
            return {
                status: "inside",
                is_within_zamboanga_city: true,
                detected_city: "Zamboanga City",
                detected_province: "Zamboanga del Sur",
                lat,
                lon,
                reason: `Geospatial coordinates verified within Zamboanga City (${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E).`,
            };
        }
        return {
            status: "outside",
            is_within_zamboanga_city: false,
            detected_city: explicitCity || "Outside Zamboanga City",
            detected_province: explicitProvince || null,
            lat,
            lon,
            reason: `Geospatial coordinates (${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E) are outside the Zamboanga City service boundary.`,
        };
    }

    // 4. Match Zamboanga City 98-barangay official gazetteer
    for (const b of ZAMBOANGA_BARANGAYS_GAZETTEER) {
        const bNorm = b.barangay.toLowerCase();
        const bAlt = bNorm.replace("sta.", "santa");
        if (norm.includes(bNorm) || norm.includes(bAlt)) {
            return {
                status: "inside",
                is_within_zamboanga_city: true,
                detected_city: b.city,
                detected_province: b.province,
                detected_barangay: b.barangay,
                lat: b.lat,
                lon: b.lon,
                reason: `Forward-geocoded to Brgy. ${b.barangay}, ${b.city}, ${b.province} (${b.lat.toFixed(4)}° N, ${b.lon.toFixed(4)}° E).`,
            };
        }
    }

    if (norm.includes("zamboanga city") || norm.includes("7000")) {
        return {
            status: "inside",
            is_within_zamboanga_city: true,
            detected_city: "Zamboanga City",
            detected_province: "Zamboanga del Sur",
            lat: 6.9214,
            lon: 122.0790,
            reason: "Forward-geocoded to Zamboanga City, Zamboanga del Sur (6.9214° N, 122.0790° E).",
        };
    }

    return {
        status: "unverified",
        is_within_zamboanga_city: false,
        detected_city: explicitCity || "Unverified / Outside Zamboanga City",
        detected_province: explicitProvince || null,
        lat: null,
        lon: null,
        reason: "Location has not yet resolved to Zamboanga City. Select a geospatial suggestion from the list.",
    };
}

/**
 * Direct client-side fallback to Open-Source Komoot Photon Locator (OpenStreetMap)
 * bounded to the Philippines in case backend request is slow or unreachable.
 */
async function queryPhotonOpenSourceClient(query) {
    try {
        const q = query.toLowerCase().includes("philippines") ? query : `${query}, Philippines`;
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&bbox=${PH_BBOX}&limit=8&lang=en`;
        const resp = await fetch(url);
        if (!resp.ok) return [];
        const data = await resp.json();
        const features = data?.features || [];
        return features
            .map((f) => {
                const coords = f?.geometry?.coordinates;
                const props = f?.properties || {};
                if (!Array.isArray(coords) || coords.length < 2) return null;
                if ((props.countrycode || "PH").toUpperCase() !== "PH") return null;

                const lon = Number(coords[0]);
                const lat = Number(coords[1]);
                const name = (props.name || "").trim();
                const district = (props.district || props.locality || "").trim();
                let rawCity = (props.city || props.town || props.municipality || props.county || "").trim();
                const rawProvince = (props.state || props.county || "Philippines").trim();

                const osmVal = (props.osm_value || props.type || "").toLowerCase();
                let barangay = "";
                if (["city", "town", "municipality"].includes(osmVal) && !rawCity) {
                    rawCity = name;
                    barangay = district || "Poblacion";
                } else {
                    barangay = name || district || "Poblacion";
                }
                barangay = barangay.replace(/^(brgy\.?|barangay)\s+/i, "").trim();

                const evalRes = evaluateZamboangaGeospatial(
                    `${barangay}, ${rawCity}, ${rawProvince}`,
                    lat,
                    lon,
                    rawCity || null,
                    rawProvince || null
                );

                const city = evalRes.is_within_zamboanga_city
                    ? "Zamboanga City"
                    : rawCity.replace(/^City of\s+/i, "") + (/^City of\s+/i.test(rawCity) ? " City" : "");
                const province = evalRes.is_within_zamboanga_city ? "Zamboanga del Sur" : rawProvince;
                const displayName = [barangay ? `Brgy. ${barangay}` : null, city, province, "Philippines"]
                    .filter(Boolean)
                    .join(", ");

                return {
                    display_name: displayName,
                    barangay,
                    city: city || "Philippines",
                    province: province || "Philippines",
                    lat,
                    lon,
                    is_within_zamboanga_city: evalRes.is_within_zamboanga_city,
                    status: evalRes.status,
                    reason: evalRes.reason,
                    source: "photon_osm_client",
                };
            })
            .filter(Boolean);
    } catch {
        return [];
    }
}

/**
 * Helper to compose a clean full address string from structured fields
 */
export function composeStructuredAddress({ street_house = "", barangay = "", city = "", province = "", landmark = "" }) {
    const s = String(street_house || "").trim();
    const bRaw = String(barangay || "").trim();
    const bFormatted = bRaw
        ? /^(brgy\.?|barangay)\b/i.test(bRaw)
            ? bRaw
            : `Brgy. ${bRaw}`
        : "";
    const c = String(city || "").trim();
    const p = String(province || "").trim();
    const l = String(landmark || "").trim();

    const core = [s, bFormatted, c, p].filter(Boolean).join(", ");
    if (!core) return "";
    return l ? `${core} (Landmark: ${l})` : core;
}

/**
 * Free Geospatial Address Autocomplete & Automated Forward Geocoding Component.
 */
export default function GeospatialAddressAutocomplete({
    value = "",
    onChange,
    onGeocodeResult,
    placeholder = "Search street, barangay, or city (real-time geospatial autocomplete)...",
    allowOutsideSave = false,
    error = "",
    id = "geospatial_address",
    readOnly = false,
    structured = false,
    structuredValues = null,
    onStructuredChange = null,
    structuredErrors = {},
}) {
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [openDropdown, setOpenDropdown] = useState(false);
    const [selectedCoords, setSelectedCoords] = useState({ lat: null, lon: null });
    const [remoteVerification, setRemoteVerification] = useState(null);
    const [autoFilledByGeo, setAutoFilledByGeo] = useState(false);
    const containerRef = useRef(null);

    const [internalFields, setInternalFields] = useState({
        street_house: "",
        barangay: "",
        city: "",
        province: "",
        landmark: "",
    });

    const fields = structuredValues || internalFields;

    const updateFields = (patch, geoItem = null) => {
        const next = { ...fields, ...patch };
        if (!structuredValues) {
            setInternalFields(next);
        }
        const composed = composeStructuredAddress(next);
        if (onStructuredChange) {
            onStructuredChange(next, composed, geoItem);
        }
        if (onChange) {
            onChange(composed, geoItem);
        }
    };

    const evalTarget = structured
        ? [fields.barangay, fields.city, fields.province].filter(Boolean).join(", ")
        : value;

    const localEval = useMemo(
        () =>
            evaluateZamboangaGeospatial(
                evalTarget,
                selectedCoords.lat,
                selectedCoords.lon,
                structured ? fields.city : null,
                structured ? fields.province : null
            ),
        [evalTarget, selectedCoords.lat, selectedCoords.lon, structured, fields.city, fields.province]
    );

    const activeEval = remoteVerification && remoteVerification.status !== "empty" ? remoteVerification : localEval;

    useEffect(() => {
        if (onGeocodeResult) {
            onGeocodeResult(activeEval);
        }
    }, [activeEval.status, activeEval.is_within_zamboanga_city, activeEval.lat, activeEval.lon, evalTarget]);

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

    // Search trigger term (in structured mode, driven by the Barangay input)
    const searchTerm = structured ? (fields.barangay || "").trim() : (value || "").trim();

    // Debounced real-time geospatial search + Open-Source Philippine Area Locator
    useEffect(() => {
        const q = searchTerm;
        if (q.length < 1) {
            setSuggestions([]);
            setRemoteVerification(null);
            return;
        }

        const normQ = q.toLowerCase().replace(/^(brgy\.?|barangay)\s+/i, "").trim();

        // 1. Instant local Zamboanga City 98-barangay boundary matches
        const instantBarangays = ZAMBOANGA_BARANGAYS_GAZETTEER.filter((b) => {
            const bLower = b.barangay.toLowerCase();
            const bAlt = bLower.replace("sta.", "santa");
            return bLower.includes(normQ) || bAlt.includes(normQ) || b.display_name.toLowerCase().includes(normQ);
        })
            .sort((a, b) => {
                const aStarts = a.barangay.toLowerCase().startsWith(normQ) ? 0 : 1;
                const bStarts = b.barangay.toLowerCase().startsWith(normQ) ? 0 : 1;
                return aStarts - bStarts;
            })
            .slice(0, 6)
            .map((b) => ({
                display_name: b.display_name,
                barangay: b.barangay,
                city: b.city,
                province: b.province,
                lat: b.lat,
                lon: b.lon,
                is_within_zamboanga_city: true,
                status: "inside",
                reason: `Forward-geocoded to Brgy. ${b.barangay}, ${b.city}, ${b.province} (${b.lat.toFixed(4)}° N, ${b.lon.toFixed(4)}° E).`,
            }));

        setSuggestions(instantBarangays);

        if (q.length < 2) {
            return;
        }

        // 2. Query Backend Open-Source Philippine Area Locator (Photon + Nominatim)
        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const { data } = await window.axios.get("/api/location/autocomplete", {
                    params: { q },
                });
                if (Array.isArray(data?.suggestions) && data.suggestions.length > 0) {
                    setSuggestions(data.suggestions);
                } else {
                    const clientPhoton = await queryPhotonOpenSourceClient(q);
                    if (clientPhoton.length > 0) {
                        setSuggestions([...instantBarangays, ...clientPhoton]);
                    }
                }
                if (data?.verification) {
                    setRemoteVerification({
                        status: data.verification.status,
                        is_within_zamboanga_city: Boolean(data.verification.is_within_zamboanga_city),
                        detected_city: data.verification.detected_city,
                        detected_province: data.verification.detected_province ?? null,
                        lat: data.verification.latitude ?? null,
                        lon: data.verification.longitude ?? null,
                        reason: data.verification.reason,
                    });
                }
            } catch {
                // Direct client-side fallback to open-source Photon locator
                const clientPhoton = await queryPhotonOpenSourceClient(q);
                if (clientPhoton.length > 0) {
                    setSuggestions([...instantBarangays, ...clientPhoton]);
                }
            } finally {
                setLoading(false);
            }
        }, 220);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    const handleSelectSuggestion = (item) => {
        const lat = typeof item.lat === "number" ? item.lat : parseFloat(item.lat);
        const lon = typeof item.lon === "number" ? item.lon : parseFloat(item.lon);
        const resolvedBarangay = item.barangay || item.display_name.split(",")[0]?.replace(/^Brgy\.?\s*/i, "").trim() || "";
        const resolvedCity = item.city || (item.is_within_zamboanga_city ? "Zamboanga City" : "Outside Zamboanga City");
        const resolvedProvince = item.province || (item.is_within_zamboanga_city ? "Zamboanga del Sur" : "Philippines");

        setSelectedCoords({ lat, lon });
        setRemoteVerification({
            status: item.is_within_zamboanga_city ? "inside" : "outside",
            is_within_zamboanga_city: Boolean(item.is_within_zamboanga_city),
            detected_city: resolvedCity,
            detected_province: resolvedProvince,
            lat,
            lon,
            reason: item.reason,
        });

        if (structured) {
            setAutoFilledByGeo(true);
            updateFields(
                {
                    barangay: resolvedBarangay,
                    city: resolvedCity,
                    province: resolvedProvince,
                },
                item
            );
        } else if (onChange) {
            onChange(item.display_name, item);
        }
        setOpenDropdown(false);
    };

    // If user types an exact barangay name in structured mode and blurs without clicking, auto-populate from top match
    const handleBarangayBlur = () => {
        if (!structured) return;
        const rawB = (fields.barangay || "").trim();
        if (!rawB) return;
        const normB = rawB.toLowerCase().replace(/^(brgy\.?|barangay)\s+/i, "").trim();

        const exactZC = ZAMBOANGA_BARANGAYS_GAZETTEER.find(
            (b) => b.barangay.toLowerCase() === normB || b.barangay.toLowerCase().replace("sta.", "santa") === normB
        );
        if (exactZC) {
            setSelectedCoords({ lat: exactZC.lat, lon: exactZC.lon });
            setAutoFilledByGeo(true);
            updateFields(
                {
                    barangay: exactZC.barangay,
                    city: exactZC.city,
                    province: exactZC.province,
                },
                exactZC
            );
            return;
        }

        // Or if open-source suggestions already loaded and city is still blank, auto-fill from top suggestion
        if (!fields.city && suggestions.length > 0) {
            handleSelectSuggestion(suggestions[0]);
        }
    };

    const inputBaseClass =
        "w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all text-sm";

    if (structured) {
        const hasLocationInput = Boolean((fields.barangay || "").trim() || (fields.city || "").trim());

        return (
            <div ref={containerRef} className="space-y-3.5 relative">
                {/* Section Header + Status Pill */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                        <MapPin className="size-4 text-blue-600" />
                        <span>Address Details</span>
                    </div>

                    {hasLocationInput && (
                        activeEval.is_within_zamboanga_city ? (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                                <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                                <span>Within Zamboanga City</span>
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                                <AlertTriangle className="size-3.5 text-rose-600 shrink-0" />
                                <span>Outside Zamboanga City ({activeEval.detected_city || "Outside Area"})</span>
                            </span>
                        )
                    )}
                </div>

                {/* 1. Street / House Number */}
                <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700" htmlFor={`${id}_street`}>
                        Street / House or Building No. <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                        <Home className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                        <input
                            id={`${id}_street`}
                            type="text"
                            placeholder="House / Unit / Street"
                            value={fields.street_house || ""}
                            onChange={(e) => updateFields({ street_house: e.target.value })}
                            className={inputBaseClass}
                        />
                    </div>
                    {structuredErrors?.street_house && (
                        <div className="text-xs font-medium text-red-600">{structuredErrors.street_house}</div>
                    )}
                </div>

                {/* 2. Barangay */}
                <div className="space-y-1 relative">
                    <label className="text-xs font-semibold text-slate-700" htmlFor={`${id}_barangay`}>
                        Barangay <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                        <Navigation className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-blue-600 pointer-events-none" />
                        <input
                            id={`${id}_barangay`}
                            type="text"
                            autoComplete="off"
                            placeholder="Type to search barangay..."
                            value={fields.barangay || ""}
                            onFocus={() => setOpenDropdown(true)}
                            onBlur={() => {
                                setTimeout(() => handleBarangayBlur(), 180);
                            }}
                            onChange={(e) => {
                                const nextBrgy = e.target.value;
                                setSelectedCoords({ lat: null, lon: null });
                                setRemoteVerification(null);
                                setAutoFilledByGeo(false);
                                setOpenDropdown(true);
                                updateFields({
                                    barangay: nextBrgy,
                                    ...(nextBrgy.trim() === "" ? { city: "", province: "" } : {}),
                                });
                            }}
                            className={`${inputBaseClass} pr-10`}
                        />
                        {loading && (
                            <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-blue-600 animate-spin" />
                        )}
                    </div>
                    {structuredErrors?.barangay && (
                        <div className="text-xs font-medium text-red-600">{structuredErrors.barangay}</div>
                    )}

                    {/* Suggestions Dropdown */}
                    {openDropdown && suggestions.length > 0 && (
                        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden max-h-56 overflow-y-auto divide-y divide-slate-100">
                            {suggestions.map((item, idx) => (
                                <button
                                    key={`${item.barangay || item.display_name}-${item.city || ""}-${idx}`}
                                    type="button"
                                    onClick={() => handleSelectSuggestion(item)}
                                    className="w-full text-left px-3.5 py-2 hover:bg-blue-50/70 transition flex items-center justify-between gap-3 group"
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <MapPin
                                            className={`size-4 shrink-0 ${
                                                item.is_within_zamboanga_city ? "text-blue-600" : "text-slate-400"
                                            }`}
                                        />
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold text-slate-900 group-hover:text-blue-600 truncate">
                                                {item.barangay ? `Brgy. ${item.barangay}` : item.display_name}
                                            </p>
                                            <p className="text-[11px] text-slate-500 truncate">
                                                {[item.city, item.province].filter(Boolean).join(", ")}
                                            </p>
                                        </div>
                                    </div>

                                    {!item.is_within_zamboanga_city && (
                                        <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                            Outside ZC
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* 3 & 4. City and Province Input Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700" htmlFor={`${id}_city`}>
                            City / Municipality <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                            <input
                                id={`${id}_city`}
                                type="text"
                                readOnly
                                placeholder="City / Municipality"
                                value={fields.city || ""}
                                onClick={() => setOpenDropdown(true)}
                                className={`${inputBaseClass} bg-slate-100/80 text-slate-800 font-medium cursor-default`}
                            />
                        </div>
                        {structuredErrors?.city && (
                            <div className="text-xs font-medium text-red-600">{structuredErrors.city}</div>
                        )}
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700" htmlFor={`${id}_province`}>
                            Province <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <Compass className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                            <input
                                id={`${id}_province`}
                                type="text"
                                readOnly
                                placeholder="Province"
                                value={fields.province || ""}
                                onClick={() => setOpenDropdown(true)}
                                className={`${inputBaseClass} bg-slate-100/80 text-slate-800 font-medium cursor-default`}
                            />
                        </div>
                        {structuredErrors?.province && (
                            <div className="text-xs font-medium text-red-600">{structuredErrors.province}</div>
                        )}
                    </div>
                </div>

                {/* 5. Landmark (Optional) */}
                <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700" htmlFor={`${id}_landmark`}>
                        Landmark <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                        <input
                            id={`${id}_landmark`}
                            type="text"
                            placeholder="e.g. Near church, school, or landmark"
                            value={fields.landmark || ""}
                            onChange={(e) => updateFields({ landmark: e.target.value })}
                            className={inputBaseClass}
                        />
                    </div>
                    {structuredErrors?.landmark && (
                        <div className="text-xs font-medium text-red-600">{structuredErrors.landmark}</div>
                    )}
                </div>

                {/* Alert when outside Zamboanga City */}
                {hasLocationInput && !activeEval.is_within_zamboanga_city && (
                    <div className="p-3 rounded-xl border text-xs flex items-start gap-2.5 bg-amber-50/90 border-amber-300 text-amber-950">
                        <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                            <p className="font-bold">
                                {allowOutsideSave
                                    ? "Outside Zamboanga City Boundary: You can register an account, but booking a service is strictly available within Zamboanga City only."
                                    : "Booking Service Restricted: This location is outside Zamboanga City. Booking a service is only available within Zamboanga City."}
                            </p>
                            <p className="text-[11px] opacity-90">
                                {activeEval.reason || "Location is outside the Zamboanga City service boundary."}
                            </p>
                        </div>
                    </div>
                )}

                {error && <div className="text-xs font-medium text-red-600">{error}</div>}
            </div>
        );
    }

    // Standard single-input autocomplete mode (used in BookingWizard & Profile Settings)
    return (
        <div ref={containerRef} className="space-y-2 relative">
            <div className="flex flex-wrap items-center justify-between gap-2">
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

            <div className="relative">
                <MapPin className="absolute left-3.5 top-3 size-5 text-blue-600 pointer-events-none" />
                <input
                    id={id}
                    type="text"
                    readOnly={readOnly}
                    autoComplete="off"
                    value={value}
                    placeholder={placeholder}
                    onFocus={() => {
                        if (!readOnly && (suggestions.length > 0 || value.trim().length >= 1)) {
                            setOpenDropdown(true);
                        }
                    }}
                    onChange={(e) => {
                        if (readOnly) return;
                        const nextVal = e.target.value;
                        setSelectedCoords({ lat: null, lon: null });
                        setRemoteVerification(null);
                        setOpenDropdown(true);
                        if (onChange) onChange(nextVal, null);
                    }}
                    className={`w-full pl-11 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm transition-all ${
                        readOnly
                            ? "bg-slate-100 text-slate-700 cursor-not-allowed select-none"
                            : "bg-slate-50/70 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                    }`}
                />
                {!readOnly && loading && (
                    <Loader2 className="absolute right-3.5 top-3 size-4 text-blue-600 animate-spin" />
                )}
            </div>

            {!readOnly && openDropdown && suggestions.length > 0 && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden max-h-60 overflow-y-auto divide-y divide-slate-100">
                    {suggestions.map((item, idx) => (
                        <button
                            key={`${item.display_name}-${idx}`}
                            type="button"
                            onClick={() => handleSelectSuggestion(item)}
                            className="w-full text-left px-3.5 py-2.5 hover:bg-blue-50/70 transition flex items-center justify-between gap-3 group"
                        >
                            <div className="flex items-center gap-2.5 min-w-0">
                                <Navigation
                                    className={`size-4 shrink-0 ${
                                        item.is_within_zamboanga_city ? "text-blue-600" : "text-slate-400"
                                    }`}
                                />
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold text-slate-900 group-hover:text-blue-600 truncate">
                                        {item.display_name}
                                    </p>
                                </div>
                            </div>

                            {!item.is_within_zamboanga_city && (
                                <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                    Outside ZC
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            )}

            {value.trim().length > 2 && !activeEval.is_within_zamboanga_city && (
                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                    <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                        {allowOutsideSave
                            ? "Notice: You may register this account, but cooling tower booking and on-site services are currently limited to Zamboanga City."
                            : "Notice: Cooling tower service bookings are only available within Zamboanga City."}
                    </span>
                </div>
            )}

            {error && <div className="text-xs font-medium text-red-600">{error}</div>}
        </div>
    );
}

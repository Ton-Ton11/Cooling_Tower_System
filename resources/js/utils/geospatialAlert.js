/**
 * Geospatial Location Alert Persistence Utility
 * Manages one-time acknowledgement storage across DB (for authenticated users)
 * and localStorage (as client-side cache and guest fallback).
 */

const GUEST_STORAGE_KEY = "cooling_tower_geospatial_alert_acknowledged";
const USER_STORAGE_PREFIX = "cooling_tower_geospatial_alert_acknowledged_user_";

/**
 * Check if the current user/guest has already acknowledged the geospatial boundary alert.
 * 
 * @param {Object|null} user - The current user object from dashboardData
 * @returns {boolean} True if already acknowledged, false otherwise.
 */
export function isGeospatialAlertAcknowledged(user = null) {
    // 1. Check user database flag
    if (user && Boolean(user.geospatial_alert_acknowledged)) {
        return true;
    }

    // 2. Check user-specific localStorage cache
    if (user?.user_id) {
        try {
            const userKey = `${USER_STORAGE_PREFIX}${user.user_id}`;
            if (window.localStorage.getItem(userKey) === "true") {
                return true;
            }
        } catch {
            // Local storage access error (e.g. private browsing restrictions)
        }
    }

    // 3. Check guest / browser-level fallback in localStorage
    try {
        if (window.localStorage.getItem(GUEST_STORAGE_KEY) === "true") {
            return true;
        }
    } catch {
        // Local storage access error
    }

    return false;
}

/**
 * Persistently save acknowledgment for the geospatial boundary alert.
 * Stores in the database for logged-in users and in persistent browser storage.
 * 
 * @param {Object|null} user - The current user object from dashboardData
 * @returns {Promise<boolean>} Resolves to true when acknowledgment is safely persisted.
 */
export async function persistGeospatialAlertAcknowledgment(user = null) {
    // 1. Immediately cache in localStorage for instant responsiveness
    try {
        window.localStorage.setItem(GUEST_STORAGE_KEY, "true");
        if (user?.user_id) {
            window.localStorage.setItem(`${USER_STORAGE_PREFIX}${user.user_id}`, "true");
        }
    } catch (e) {
        console.warn("Could not save to localStorage", e);
    }

    // Optimistically mark user object in-memory
    if (user) {
        user.geospatial_alert_acknowledged = true;
    }

    // 2. If logged in, save to database
    if (user?.user_id && window.axios) {
        try {
            await window.axios.post("/customer/acknowledge-geospatial-alert");
            return true;
        } catch (err) {
            console.error("Failed to persist geospatial acknowledgment to database:", err);
            // Even if server request encounters a hiccup, localStorage keeps it acknowledged
            return false;
        }
    }

    return true;
}

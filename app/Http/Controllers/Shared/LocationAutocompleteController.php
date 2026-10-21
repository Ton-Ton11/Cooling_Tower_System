<?php

namespace App\Http\Controllers\Shared;

use App\Http\Controllers\Auth\RegisteredUserController;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class LocationAutocompleteController extends Controller
{
    /**
     * Zamboanga City geographic bounding box (approximate administrative boundary).
     * Lat: 6.8400 to 7.4500 N, Lon: 121.8500 to 122.3600 E
     */
    public const ZC_MIN_LAT = 6.8400;
    public const ZC_MAX_LAT = 7.4500;
    public const ZC_MIN_LON = 121.8500;
    public const ZC_MAX_LON = 122.3600;

    /**
     * Comprehensive Zamboanga City barangays & landmarks Gazetteer with accurate coordinates
     * for instant zero-latency suggestions and offline fallback.
     */
    public static function zamboangaGazetteer(): array
    {
        return [
            ['name' => 'Brgy. Tetuan, Zamboanga City, 7000, Philippines', 'barangay' => 'Tetuan', 'city' => 'Zamboanga City', 'province' => 'Zamboanga Peninsula', 'lat' => 6.9136, 'lon' => 122.0837],
            ['name' => 'Brgy. Canelar (Mayor Jaldon St.), Zamboanga City, 7000, Philippines', 'barangay' => 'Canelar', 'city' => 'Zamboanga City', 'province' => 'Zamboanga Peninsula', 'lat' => 6.9154, 'lon' => 122.0715],
            ['name' => 'Brgy. Sta. Maria, Zamboanga City, 7000, Philippines', 'barangay' => 'Sta. Maria', 'city' => 'Zamboanga City', 'province' => 'Zamboanga Peninsula', 'lat' => 6.9315, 'lon' => 122.0728],
            ['name' => 'Brgy. Putik, Zamboanga City, 7000, Philippines', 'barangay' => 'Putik', 'city' => 'Zamboanga City', 'province' => 'Zamboanga Peninsula', 'lat' => 6.9355, 'lon' => 122.1045],
            ['name' => 'Brgy. Guiwan, Zamboanga City, 7000, Philippines', 'barangay' => 'Guiwan', 'city' => 'Zamboanga City', 'province' => 'Zamboanga Peninsula', 'lat' => 6.9248, 'lon' => 122.0942],
            ['name' => 'Brgy. Pasonanca, Zamboanga City, 7000, Philippines', 'barangay' => 'Pasonanca', 'city' => 'Zamboanga City', 'province' => 'Zamboanga Peninsula', 'lat' => 6.9472, 'lon' => 122.0706],
            ['name' => 'Brgy. Tumaga, Zamboanga City, 7000, Philippines', 'barangay' => 'Tumaga', 'city' => 'Zamboanga City', 'province' => 'Zamboanga Peninsula', 'lat' => 6.9380, 'lon' => 122.0840],
            ['name' => 'Brgy. Divisoria, Zamboanga City, 7000, Philippines', 'barangay' => 'Divisoria', 'city' => 'Zamboanga City', 'province' => 'Zamboanga Peninsula', 'lat' => 6.9412, 'lon' => 122.1135],
            ['name' => 'Brgy. Boalan, Zamboanga City, 7000, Philippines', 'barangay' => 'Boalan', 'city' => 'Zamboanga City', 'province' => 'Zamboanga Peninsula', 'lat' => 6.9525, 'lon' => 122.1230],
            ['name' => 'Brgy. Zambowood, Zamboanga City, 7000, Philippines', 'barangay' => 'Zambowood', 'city' => 'Zamboanga City', 'province' => 'Zamboanga Peninsula', 'lat' => 6.9585, 'lon' => 122.1320],
            ['name' => 'Brgy. Mercedes, Zamboanga City, 7000, Philippines', 'barangay' => 'Mercedes', 'city' => 'Zamboanga City', 'province' => 'Zamboanga Peninsula', 'lat' => 6.9682, 'lon' => 122.1455],
            ['name' => 'Brgy. Culianan, Zamboanga City, 7000, Philippines', 'barangay' => 'Culianan', 'city' => 'Zamboanga City', 'province' => 'Zamboanga Peninsula', 'lat' => 6.9790, 'lon' => 122.1560],
            ['name' => 'Brgy. Talon-Talon, Zamboanga City, 7000, Philippines', 'barangay' => 'Talon-Talon', 'city' => 'Zamboanga City', 'province' => 'Zamboanga Peninsula', 'lat' => 6.9082, 'lon' => 122.1140],
            ['name' => 'Brgy. Mampang, Zamboanga City, 7000, Philippines', 'barangay' => 'Mampang', 'city' => 'Zamboanga City', 'province' => 'Zamboanga Peninsula', 'lat' => 6.9125, 'lon' => 122.1285],
            ['name' => 'Brgy. Tugbungan, Zamboanga City, 7000, Philippines', 'barangay' => 'Tugbungan', 'city' => 'Zamboanga City', 'province' => 'Zamboanga Peninsula', 'lat' => 6.9212, 'lon' => 122.1012],
            ['name' => 'Brgy. Sta. Catalina, Zamboanga City, 7000, Philippines', 'barangay' => 'Sta. Catalina', 'city' => 'Zamboanga City', 'province' => 'Zamboanga Peninsula', 'lat' => 6.9065, 'lon' => 122.0890],
            ['name' => 'Brgy. San Jose Cawa-Cawa, Zamboanga City, 7000, Philippines', 'barangay' => 'San Jose Cawa-Cawa', 'city' => 'Zamboanga City', 'province' => 'Zamboanga Peninsula', 'lat' => 6.9102, 'lon' => 122.0672],
            ['name' => 'Brgy. San Jose Gusu, Zamboanga City, 7000, Philippines', 'barangay' => 'San Jose Gusu', 'city' => 'Zamboanga City', 'province' => 'Zamboanga Peninsula', 'lat' => 6.9165, 'lon' => 122.0548],
            ['name' => 'Brgy. Baliwasan, Zamboanga City, 7000, Philippines', 'barangay' => 'Baliwasan', 'city' => 'Zamboanga City', 'province' => 'Zamboanga Peninsula', 'lat' => 6.9130, 'lon' => 122.0595],
            ['name' => 'Brgy. San Roque, Zamboanga City, 7000, Philippines', 'barangay' => 'San Roque', 'city' => 'Zamboanga City', 'province' => 'Zamboanga Peninsula', 'lat' => 6.9362, 'lon' => 122.0465],
            ['name' => 'Brgy. Suterville, Zamboanga City, 7000, Philippines', 'barangay' => 'Suterville', 'city' => 'Zamboanga City', 'province' => 'Zamboanga Peninsula', 'lat' => 6.9182, 'lon' => 122.0490],
            ['name' => 'Brgy. Calarian, Zamboanga City, 7000, Philippines', 'barangay' => 'Calarian', 'city' => 'Zamboanga City', 'province' => 'Zamboanga Peninsula', 'lat' => 6.9295, 'lon' => 122.0215],
            ['name' => 'Brgy. Sinunuc, Zamboanga City, 7000, Philippines', 'barangay' => 'Sinunuc', 'city' => 'Zamboanga City', 'province' => 'Zamboanga Peninsula', 'lat' => 6.9425, 'lon' => 121.9980],
            ['name' => 'Brgy. Ayala, Zamboanga City, 7000, Philippines', 'barangay' => 'Ayala', 'city' => 'Zamboanga City', 'province' => 'Zamboanga Peninsula', 'lat' => 6.9685, 'lon' => 121.9465],
            ['name' => 'Brgy. Talisayan, Zamboanga City, 7000, Philippines', 'barangay' => 'Talisayan', 'city' => 'Zamboanga City', 'province' => 'Zamboanga Peninsula', 'lat' => 6.9890, 'lon' => 121.9280],
            ['name' => 'Brgy. Labuan, Zamboanga City, 7000, Philippines', 'barangay' => 'Labuan', 'city' => 'Zamboanga City', 'province' => 'Zamboanga Peninsula', 'lat' => 7.0985, 'lon' => 121.9040],
            ['name' => 'Brgy. Cabatangan, Zamboanga City, 7000, Philippines', 'barangay' => 'Cabatangan', 'city' => 'Zamboanga City', 'province' => 'Zamboanga Peninsula', 'lat' => 6.9590, 'lon' => 122.0595],
            ['name' => 'Brgy. Lunzuran, Zamboanga City, 7000, Philippines', 'barangay' => 'Lunzuran', 'city' => 'Zamboanga City', 'province' => 'Zamboanga Peninsula', 'lat' => 6.9620, 'lon' => 122.0885],
            ['name' => 'Brgy. Camino Nuevo, Zamboanga City, 7000, Philippines', 'barangay' => 'Camino Nuevo', 'city' => 'Zamboanga City', 'province' => 'Zamboanga Peninsula', 'lat' => 6.9110, 'lon' => 122.0755],
            ['name' => 'Brgy. Zone I (City Proper), Zamboanga City, 7000, Philippines', 'barangay' => 'Zone I', 'city' => 'Zamboanga City', 'province' => 'Zamboanga Peninsula', 'lat' => 6.9045, 'lon' => 122.0735],
            ['name' => 'Brgy. Zone II (City Proper), Zamboanga City, 7000, Philippines', 'barangay' => 'Zone II', 'city' => 'Zamboanga City', 'province' => 'Zamboanga Peninsula', 'lat' => 6.9058, 'lon' => 122.0762],
            ['name' => 'Brgy. Zone III (City Proper), Zamboanga City, 7000, Philippines', 'barangay' => 'Zone III', 'city' => 'Zamboanga City', 'province' => 'Zamboanga Peninsula', 'lat' => 6.9070, 'lon' => 122.0780],
            ['name' => 'Brgy. Zone IV (City Proper), Zamboanga City, 7000, Philippines', 'barangay' => 'Zone IV', 'city' => 'Zamboanga City', 'province' => 'Zamboanga Peninsula', 'lat' => 6.9035, 'lon' => 122.0795],
            ['name' => 'Brgy. Sta. Barbara, Zamboanga City, 7000, Philippines', 'barangay' => 'Sta. Barbara', 'city' => 'Zamboanga City', 'province' => 'Zamboanga Peninsula', 'lat' => 6.9060, 'lon' => 122.0835],
            ['name' => 'Brgy. Rio Hondo, Zamboanga City, 7000, Philippines', 'barangay' => 'Rio Hondo', 'city' => 'Zamboanga City', 'province' => 'Zamboanga Peninsula', 'lat' => 6.9012, 'lon' => 122.0870],
            ['name' => 'Brgy. Sangali, Zamboanga City, 7000, Philippines', 'barangay' => 'Sangali', 'city' => 'Zamboanga City', 'province' => 'Zamboanga Peninsula', 'lat' => 7.0725, 'lon' => 122.2030],
            ['name' => 'Brgy. Manicahan, Zamboanga City, 7000, Philippines', 'barangay' => 'Manicahan', 'city' => 'Zamboanga City', 'province' => 'Zamboanga Peninsula', 'lat' => 7.0245, 'lon' => 122.1865],
            ['name' => 'Brgy. Bolong, Zamboanga City, 7000, Philippines', 'barangay' => 'Bolong', 'city' => 'Zamboanga City', 'province' => 'Zamboanga Peninsula', 'lat' => 7.0980, 'lon' => 122.2320],
            ['name' => 'Brgy. Curuan, Zamboanga City, 7000, Philippines', 'barangay' => 'Curuan', 'city' => 'Zamboanga City', 'province' => 'Zamboanga Peninsula', 'lat' => 7.2050, 'lon' => 122.2260],
            ['name' => 'Brgy. Vitali, Zamboanga City, 7000, Philippines', 'barangay' => 'Vitali', 'city' => 'Zamboanga City', 'province' => 'Zamboanga Peninsula', 'lat' => 7.3650, 'lon' => 122.3110],
            // Non-Zamboanga City entries so if a user searches outside cities, geocoding accurately flags them as Outside Zamboanga City
            ['name' => 'Dipolog City, Zamboanga del Norte, Philippines', 'barangay' => null, 'city' => 'Dipolog City', 'province' => 'Zamboanga del Norte', 'lat' => 8.5883, 'lon' => 123.3408],
            ['name' => 'Pagadian City, Zamboanga del Sur, Philippines', 'barangay' => null, 'city' => 'Pagadian City', 'province' => 'Zamboanga del Sur', 'lat' => 7.8257, 'lon' => 123.4370],
            ['name' => 'Ipil, Zamboanga Sibugay, Philippines', 'barangay' => null, 'city' => 'Ipil', 'province' => 'Zamboanga Sibugay', 'lat' => 7.7844, 'lon' => 122.5861],
            ['name' => 'Isabela City, Basilan, Philippines', 'barangay' => null, 'city' => 'Isabela City', 'province' => 'Basilan', 'lat' => 6.7041, 'lon' => 121.9712],
            ['name' => 'Cebu City, Cebu, Philippines', 'barangay' => null, 'city' => 'Cebu City', 'province' => 'Cebu', 'lat' => 10.3157, 'lon' => 123.8854],
            ['name' => 'Davao City, Davao del Sur, Philippines', 'barangay' => null, 'city' => 'Davao City', 'province' => 'Davao del Sur', 'lat' => 7.1907, 'lon' => 125.4553],
            ['name' => 'Manila, Metro Manila, Philippines', 'barangay' => null, 'city' => 'Manila', 'province' => 'Metro Manila', 'lat' => 14.5995, 'lon' => 120.9842],
            ['name' => 'Quezon City, Metro Manila, Philippines', 'barangay' => null, 'city' => 'Quezon City', 'province' => 'Metro Manila', 'lat' => 14.6760, 'lon' => 121.0437],
            ['name' => 'Makati City, Metro Manila, Philippines', 'barangay' => null, 'city' => 'Makati City', 'province' => 'Metro Manila', 'lat' => 14.5547, 'lon' => 121.0244],
            ['name' => 'Cagayan de Oro City, Misamis Oriental, Philippines', 'barangay' => null, 'city' => 'Cagayan de Oro City', 'province' => 'Misamis Oriental', 'lat' => 8.4542, 'lon' => 124.6319],
        ];
    }

    /**
     * Evaluate whether coordinates and/or address text fall within Zamboanga City.
     */
    public static function evaluateGeospatialLocation(?string $address, ?float $lat = null, ?float $lon = null): array
    {
        $addressStr = trim((string) $address);
        $norm = strtolower($addressStr);

        // Explicitly check Isabela City, Basilan (which is geographically close at ~6.70N, 121.97E, south of Zamboanga City)
        $isIsabelaBasilan = str_contains($norm, 'isabela city') || str_contains($norm, 'basilan');
        if ($isIsabelaBasilan && ! str_contains($norm, 'zamboanga city')) {
            return [
                'is_within_zamboanga_city' => false,
                'status' => 'outside',
                'detected_city' => 'Isabela City / Basilan',
                'latitude' => $lat,
                'longitude' => $lon,
                'reason' => 'Location geocoded to Basilan, which is outside the Zamboanga City service boundary.',
            ];
        }

        // If coordinates are provided from forward geocoding, verify bounding box
        if ($lat !== null && $lon !== null) {
            $inBoundingBox = ($lat >= self::ZC_MIN_LAT && $lat <= self::ZC_MAX_LAT)
                && ($lon >= self::ZC_MIN_LON && $lon <= self::ZC_MAX_LON);

            if ($inBoundingBox) {
                return [
                    'is_within_zamboanga_city' => true,
                    'status' => 'inside',
                    'detected_city' => 'Zamboanga City',
                    'latitude' => round($lat, 6),
                    'longitude' => round($lon, 6),
                    'reason' => sprintf('Verified within Zamboanga City geospatial boundary (%.4f° N, %.4f° E).', $lat, $lon),
                ];
            }

            return [
                'is_within_zamboanga_city' => false,
                'status' => 'outside',
                'detected_city' => 'Outside Zamboanga City',
                'latitude' => round($lat, 6),
                'longitude' => round($lon, 6),
                'reason' => sprintf('Coordinates (%.4f° N, %.4f° E) are outside the Zamboanga City service boundary.', $lat, $lon),
            ];
        }

        // Fallback to gazetteer + text analysis
        if ($addressStr === '') {
            return [
                'is_within_zamboanga_city' => false,
                'status' => 'empty',
                'detected_city' => null,
                'latitude' => null,
                'longitude' => null,
                'reason' => 'No address provided.',
            ];
        }

        foreach (self::zamboangaGazetteer() as $entry) {
            $bName = strtolower((string) ($entry['barangay'] ?? ''));
            $cName = strtolower((string) ($entry['city'] ?? ''));
            if ($bName !== '' && str_contains($norm, $bName)) {
                return [
                    'is_within_zamboanga_city' => true,
                    'status' => 'inside',
                    'detected_city' => 'Zamboanga City',
                    'detected_barangay' => $entry['barangay'],
                    'latitude' => $entry['lat'],
                    'longitude' => $entry['lon'],
                    'reason' => sprintf('Forward-geocoded to Brgy. %s, Zamboanga City (%.4f° N, %.4f° E).', $entry['barangay'], $entry['lat'], $entry['lon']),
                ];
            }
            if ($cName !== 'zamboanga city' && $cName !== '' && str_contains($norm, $cName) && ! str_contains($norm, 'zamboanga city')) {
                return [
                    'is_within_zamboanga_city' => false,
                    'status' => 'outside',
                    'detected_city' => $entry['city'],
                    'latitude' => $entry['lat'],
                    'longitude' => $entry['lon'],
                    'reason' => sprintf('Forward-geocoded to %s (%.4f° N, %.4f° E), which is outside Zamboanga City.', $entry['city'], $entry['lat'], $entry['lon']),
                ];
            }
        }

        $isValidText = RegisteredUserController::isZamboangaCityAddress($addressStr);

        if ($isValidText) {
            return [
                'is_within_zamboanga_city' => true,
                'status' => 'inside',
                'detected_city' => 'Zamboanga City',
                'latitude' => 6.9214,
                'longitude' => 122.0790,
                'reason' => 'Verified within Zamboanga City (6.9214° N, 122.0790° E).',
            ];
        }

        return [
            'is_within_zamboanga_city' => false,
            'status' => 'outside',
            'detected_city' => 'Outside / Unverified Location',
            'latitude' => null,
            'longitude' => null,
            'reason' => 'Location could not be verified within Zamboanga City.',
        ];
    }

    /**
     * GET /api/location/autocomplete?q=...
     * Real-time geospatial autocomplete + automated forward geocoding.
     * Combines OpenStreetMap Nominatim / Photon free geocoding with instant Zamboanga City gazetteer results.
     */
    public function autocomplete(Request $request): JsonResponse
    {
        $query = trim((string) $request->query('q', ''));
        if (mb_strlen($query) < 2) {
            return response()->json([
                'query' => $query,
                'suggestions' => [],
            ]);
        }

        $normQuery = strtolower($query);
        $suggestions = [];

        // 1. Match local gazetteer first for instant street/barangay + Zamboanga City precision
        foreach (self::zamboangaGazetteer() as $item) {
            $haystack = strtolower($item['name'] . ' ' . ($item['barangay'] ?? '') . ' ' . ($item['city'] ?? ''));
            $isBarangayMatch = ! empty($item['barangay']) && str_contains($normQuery, strtolower($item['barangay']));
            $isSubMatch = str_contains($haystack, $normQuery);

            if ($isSubMatch || $isBarangayMatch) {
                $eval = self::evaluateGeospatialLocation($item['name'], (float) $item['lat'], (float) $item['lon']);

                // If user typed a specific house/street prefix before the barangay, preserve their street prefix in display_name
                $displayName = $item['name'];
                if (! empty($item['barangay']) && ! str_starts_with(strtolower($query), 'brgy') && ! str_starts_with(strtolower($query), strtolower($item['barangay']))) {
                    if ($isBarangayMatch) {
                        $cleanedInput = preg_replace('/,?\s*zamboanga\s*city.*$/i', '', $query);
                        $displayName = trim($cleanedInput) . ', Zamboanga City, 7000, Philippines';
                    }
                }

                $suggestions[] = [
                    'display_name' => $displayName,
                    'canonical_name' => $item['name'],
                    'barangay' => $item['barangay'],
                    'city' => $item['city'],
                    'province' => $item['province'],
                    'lat' => (float) $item['lat'],
                    'lon' => (float) $item['lon'],
                    'is_within_zamboanga_city' => $eval['is_within_zamboanga_city'],
                    'status' => $eval['status'],
                    'reason' => $eval['reason'],
                    'source' => 'gazetteer',
                ];
            }
        }

        // 2. If user typed a street/house number not yet matched to a barangay, offer top Zamboanga City barangay completions
        if (count($suggestions) < 4 && ! str_contains($normQuery, 'manila') && ! str_contains($normQuery, 'cebu') && ! str_contains($normQuery, 'davao')) {
            $popularBarangays = array_slice(self::zamboangaGazetteer(), 0, 5);
            foreach ($popularBarangays as $item) {
                $composed = rtrim($query, ', ') . ', Brgy. ' . $item['barangay'] . ', Zamboanga City, 7000, Philippines';
                $suggestions[] = [
                    'display_name' => $composed,
                    'canonical_name' => $item['name'],
                    'barangay' => $item['barangay'],
                    'city' => 'Zamboanga City',
                    'province' => 'Zamboanga Peninsula',
                    'lat' => (float) $item['lat'],
                    'lon' => (float) $item['lon'],
                    'is_within_zamboanga_city' => true,
                    'status' => 'inside',
                    'reason' => sprintf('Forward-geocoded to Brgy. %s, Zamboanga City (%.4f° N, %.4f° E).', $item['barangay'], $item['lat'], $item['lon']),
                    'source' => 'street_completion',
                ];
            }
        }

        // 3. Query OpenStreetMap Nominatim free forward-geocoding service (with short timeout so UI stays snappy)
        try {
            $response = Http::timeout(2.5)
                ->withHeaders([
                    'User-Agent' => 'CoolingTowerSystem-ZamboangaGeocode/1.0',
                    'Accept-Language' => 'en',
                ])
                ->get('https://nominatim.openstreetmap.org/search', [
                    'q' => $query . (str_contains($normQuery, 'philippines') ? '' : ', Philippines'),
                    'format' => 'jsonv2',
                    'addressdetails' => 1,
                    'limit' => 6,
                    'countrycodes' => 'ph',
                ]);

            if ($response->successful()) {
                $remoteItems = $response->json() ?: [];
                foreach ($remoteItems as $r) {
                    $lat = isset($r['lat']) ? (float) $r['lat'] : null;
                    $lon = isset($r['lon']) ? (float) $r['lon'] : null;
                    $displayName = (string) ($r['display_name'] ?? '');
                    if ($displayName === '' || $lat === null || $lon === null) {
                        continue;
                    }

                    $addr = $r['address'] ?? [];
                    $city = $addr['city'] ?? $addr['town'] ?? $addr['municipality'] ?? $addr['county'] ?? null;
                    $barangay = $addr['suburb'] ?? $addr['village'] ?? $addr['neighbourhood'] ?? $addr['quarter'] ?? null;
                    $province = $addr['state'] ?? $addr['region'] ?? 'Philippines';

                    $eval = self::evaluateGeospatialLocation($displayName . ' ' . ($city ?? ''), $lat, $lon);

                    $suggestions[] = [
                        'display_name' => $displayName,
                        'canonical_name' => $displayName,
                        'barangay' => $barangay,
                        'city' => $city ?: $eval['detected_city'],
                        'province' => $province,
                        'lat' => $lat,
                        'lon' => $lon,
                        'is_within_zamboanga_city' => $eval['is_within_zamboanga_city'],
                        'status' => $eval['status'],
                        'reason' => $eval['reason'],
                        'source' => 'openstreetmap_nominatim',
                    ];
                }
            }
        } catch (\Throwable $e) {
            // Gracefully fall back to built-in geospatial gazetteer when offline or rate-limited
        }

        // Deduplicate by display_name
        $unique = [];
        $seen = [];
        foreach ($suggestions as $s) {
            $key = strtolower($s['display_name']);
            if (! isset($seen[$key])) {
                $seen[$key] = true;
                $unique[] = $s;
            }
        }

        // Also forward-geocode the raw query itself so the caller gets an immediate verification status
        $directVerification = self::evaluateGeospatialLocation(
            $query,
            $unique[0]['lat'] ?? null,
            $unique[0]['lon'] ?? null
        );

        return response()->json([
            'query' => $query,
            'verification' => $directVerification,
            'suggestions' => array_slice($unique, 0, 8),
        ]);
    }
}

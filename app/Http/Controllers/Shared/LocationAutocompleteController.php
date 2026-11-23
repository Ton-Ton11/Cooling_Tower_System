<?php

namespace App\Http\Controllers\Shared;

use App\Http\Controllers\Auth\RegisteredUserController;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class LocationAutocompleteController extends Controller
{
    /**
     * Zamboanga City geographic bounding box (administrative boundary).
     * Lat: 6.8400 to 7.4500 N, Lon: 121.8500 to 122.3600 E
     */
    public const ZC_MIN_LAT = 6.8400;
    public const ZC_MAX_LAT = 7.4500;
    public const ZC_MIN_LON = 121.8500;
    public const ZC_MAX_LON = 122.3600;

    /**
     * Philippine archipelago bounding box for Open-Source Photon/OSM locator queries.
     * Ensures all open-source searches stay strictly within the Philippines.
     */
    public const PH_BBOX = '116.8,4.5,126.6,21.2';

    /**
     * Official 98 Barangays of Zamboanga City with verified forward-geocoded coordinates.
     * Outside cities/barangays are dynamically resolved via open-source area locators
     * (OpenStreetMap Photon & Nominatim + PSGC).
     */
    public static function zamboangaGazetteer(): array
    {
        $zcBarangays = [
            ['barangay' => 'Arena Blanco', 'lat' => 6.9145, 'lon' => 122.1185],
            ['barangay' => 'Ayala', 'lat' => 6.9685, 'lon' => 121.9465],
            ['barangay' => 'Baliwasan', 'lat' => 6.9130, 'lon' => 122.0595],
            ['barangay' => 'Baluno', 'lat' => 6.9820, 'lon' => 122.0120],
            ['barangay' => 'Boalan', 'lat' => 6.9525, 'lon' => 122.1230],
            ['barangay' => 'Bolong', 'lat' => 7.0980, 'lon' => 122.2320],
            ['barangay' => 'Buenavista', 'lat' => 7.1850, 'lon' => 122.2480],
            ['barangay' => 'Bunguiao', 'lat' => 7.0640, 'lon' => 122.1920],
            ['barangay' => 'Busay', 'lat' => 6.9350, 'lon' => 122.0750],
            ['barangay' => 'Cabaluay', 'lat' => 6.9890, 'lon' => 122.1780],
            ['barangay' => 'Cabatangan', 'lat' => 6.9590, 'lon' => 122.0595],
            ['barangay' => 'Cacao', 'lat' => 6.9950, 'lon' => 122.1120],
            ['barangay' => 'Calabasa', 'lat' => 7.1250, 'lon' => 122.2150],
            ['barangay' => 'Calarian', 'lat' => 6.9295, 'lon' => 122.0215],
            ['barangay' => 'Camino Nuevo', 'lat' => 6.9110, 'lon' => 122.0755],
            ['barangay' => 'Campo Islam', 'lat' => 6.9148, 'lon' => 122.0430],
            ['barangay' => 'Canelar', 'lat' => 6.9154, 'lon' => 122.0715],
            ['barangay' => 'Capisan', 'lat' => 6.9580, 'lon' => 122.0480],
            ['barangay' => 'Cawit', 'lat' => 6.9540, 'lon' => 121.9760],
            ['barangay' => 'Culianan', 'lat' => 6.9790, 'lon' => 122.1560],
            ['barangay' => 'Curuan', 'lat' => 7.2050, 'lon' => 122.2260],
            ['barangay' => 'Dita', 'lat' => 7.0520, 'lon' => 122.2010],
            ['barangay' => 'Divisoria', 'lat' => 6.9412, 'lon' => 122.1135],
            ['barangay' => 'Dulian (Upper Bunguiao)', 'lat' => 7.0810, 'lon' => 122.1650],
            ['barangay' => 'Dulian (Upper Pasonanca)', 'lat' => 6.9920, 'lon' => 122.0690],
            ['barangay' => 'Guisao', 'lat' => 6.9860, 'lon' => 122.1420],
            ['barangay' => 'Guiwan', 'lat' => 6.9248, 'lon' => 122.0942],
            ['barangay' => 'Kasanyangan', 'lat' => 6.9048, 'lon' => 122.0985],
            ['barangay' => 'La Paz', 'lat' => 7.0240, 'lon' => 121.9580],
            ['barangay' => 'Labuan', 'lat' => 7.0985, 'lon' => 121.9040],
            ['barangay' => 'Lamisahan', 'lat' => 7.0010, 'lon' => 122.1490],
            ['barangay' => 'Landang Gua', 'lat' => 6.9510, 'lon' => 122.2120],
            ['barangay' => 'Landang Laum', 'lat' => 6.9580, 'lon' => 122.2240],
            ['barangay' => 'Lanzones', 'lat' => 6.9990, 'lon' => 122.1350],
            ['barangay' => 'Lapakan', 'lat' => 6.9920, 'lon' => 122.1290],
            ['barangay' => 'Latuan (Curuan)', 'lat' => 7.1980, 'lon' => 122.2190],
            ['barangay' => 'Licomo', 'lat' => 7.4120, 'lon' => 122.3250],
            ['barangay' => 'Limaong', 'lat' => 7.2650, 'lon' => 122.2810],
            ['barangay' => 'Limpapa', 'lat' => 7.1320, 'lon' => 121.9020],
            ['barangay' => 'Lubigan', 'lat' => 7.0410, 'lon' => 122.1680],
            ['barangay' => 'Lumayang', 'lat' => 6.9840, 'lon' => 122.0950],
            ['barangay' => 'Lumbangan', 'lat' => 6.9490, 'lon' => 122.1090],
            ['barangay' => 'Lunzuran', 'lat' => 6.9620, 'lon' => 122.0885],
            ['barangay' => 'Maasin', 'lat' => 6.9520, 'lon' => 121.9890],
            ['barangay' => 'Malagutay', 'lat' => 6.9380, 'lon' => 122.0350],
            ['barangay' => 'Mampang', 'lat' => 6.9125, 'lon' => 122.1285],
            ['barangay' => 'Manalipa', 'lat' => 6.9420, 'lon' => 122.2510],
            ['barangay' => 'Mangusu', 'lat' => 7.3120, 'lon' => 122.2950],
            ['barangay' => 'Manicahan', 'lat' => 7.0245, 'lon' => 122.1865],
            ['barangay' => 'Mariki', 'lat' => 6.9005, 'lon' => 122.0920],
            ['barangay' => 'Mercedes', 'lat' => 6.9682, 'lon' => 122.1455],
            ['barangay' => 'Muti', 'lat' => 7.2350, 'lon' => 122.2620],
            ['barangay' => 'Pamucutan', 'lat' => 7.0050, 'lon' => 121.9480],
            ['barangay' => 'Pangapuyan', 'lat' => 6.9120, 'lon' => 122.1820],
            ['barangay' => 'Panubigan', 'lat' => 7.1450, 'lon' => 122.2380],
            ['barangay' => 'Pasilmanta', 'lat' => 6.9350, 'lon' => 122.2350],
            ['barangay' => 'Pasobolong', 'lat' => 6.9585, 'lon' => 122.1180],
            ['barangay' => 'Pasonanca', 'lat' => 6.9472, 'lon' => 122.0706],
            ['barangay' => 'Patalon', 'lat' => 7.0680, 'lon' => 121.9120],
            ['barangay' => 'Putik', 'lat' => 6.9355, 'lon' => 122.1045],
            ['barangay' => 'Quiniput', 'lat' => 7.1620, 'lon' => 122.2440],
            ['barangay' => 'Recodo', 'lat' => 6.9560, 'lon' => 121.9620],
            ['barangay' => 'Rio Hondo', 'lat' => 6.9012, 'lon' => 122.0870],
            ['barangay' => 'Salaan', 'lat' => 6.9760, 'lon' => 122.1150],
            ['barangay' => 'San Jose Cawa-Cawa', 'lat' => 6.9102, 'lon' => 122.0672],
            ['barangay' => 'San Jose Gusu', 'lat' => 6.9165, 'lon' => 122.0548],
            ['barangay' => 'San Ramon', 'lat' => 7.0020, 'lon' => 121.9190],
            ['barangay' => 'San Roque', 'lat' => 6.9362, 'lon' => 122.0465],
            ['barangay' => 'Sangali', 'lat' => 7.0725, 'lon' => 122.2030],
            ['barangay' => 'Sibulao', 'lat' => 7.3350, 'lon' => 122.2880],
            ['barangay' => 'Sinubung', 'lat' => 7.0320, 'lon' => 121.9250],
            ['barangay' => 'Sinunuc', 'lat' => 6.9425, 'lon' => 121.9980],
            ['barangay' => 'Sta. Barbara', 'lat' => 6.9060, 'lon' => 122.0835],
            ['barangay' => 'Sta. Catalina', 'lat' => 6.9065, 'lon' => 122.0890],
            ['barangay' => 'Sta. Maria', 'lat' => 6.9315, 'lon' => 122.0728],
            ['barangay' => 'Santo Niño', 'lat' => 6.9140, 'lon' => 122.0645],
            ['barangay' => 'Suterville', 'lat' => 6.9182, 'lon' => 122.0490],
            ['barangay' => 'Tagasilay', 'lat' => 7.2850, 'lon' => 122.2750],
            ['barangay' => 'Taguiti', 'lat' => 7.3480, 'lon' => 122.3010],
            ['barangay' => 'Talabaan', 'lat' => 6.9790, 'lon' => 122.1680],
            ['barangay' => 'Talisayan', 'lat' => 6.9890, 'lon' => 121.9280],
            ['barangay' => 'Talon-Talon', 'lat' => 6.9082, 'lon' => 122.1140],
            ['barangay' => 'Taluksangay', 'lat' => 6.9520, 'lon' => 122.1820],
            ['barangay' => 'Tetuan', 'lat' => 6.9136, 'lon' => 122.0837],
            ['barangay' => 'Tictapul', 'lat' => 7.2510, 'lon' => 122.2680],
            ['barangay' => 'Tigbalabag', 'lat' => 7.3210, 'lon' => 122.2850],
            ['barangay' => 'Tigtabon', 'lat' => 6.9380, 'lon' => 122.2150],
            ['barangay' => 'Tolosa', 'lat' => 7.0390, 'lon' => 122.1540],
            ['barangay' => 'Tugbungan', 'lat' => 6.9212, 'lon' => 122.1012],
            ['barangay' => 'Tulungatung', 'lat' => 6.9690, 'lon' => 121.9580],
            ['barangay' => 'Tumaga', 'lat' => 6.9380, 'lon' => 122.0840],
            ['barangay' => 'Tumalutab', 'lat' => 6.9820, 'lon' => 122.2650],
            ['barangay' => 'Tumitus', 'lat' => 7.3020, 'lon' => 122.2920],
            ['barangay' => 'Victoria', 'lat' => 7.0150, 'lon' => 122.1720],
            ['barangay' => 'Vitali', 'lat' => 7.3650, 'lon' => 122.3110],
            ['barangay' => 'Zambowood', 'lat' => 6.9585, 'lon' => 122.1320],
            ['barangay' => 'Zone I (City Proper)', 'lat' => 6.9045, 'lon' => 122.0735],
            ['barangay' => 'Zone II (City Proper)', 'lat' => 6.9058, 'lon' => 122.0762],
            ['barangay' => 'Zone III (City Proper)', 'lat' => 6.9070, 'lon' => 122.0780],
            ['barangay' => 'Zone IV (City Proper)', 'lat' => 6.9035, 'lon' => 122.0795],
        ];

        $entries = [];
        foreach ($zcBarangays as $b) {
            $entries[] = [
                'name' => sprintf('Brgy. %s, Zamboanga City, Zamboanga del Sur, 7000, Philippines', $b['barangay']),
                'barangay' => $b['barangay'],
                'city' => 'Zamboanga City',
                'province' => 'Zamboanga del Sur',
                'lat' => $b['lat'],
                'lon' => $b['lon'],
            ];
        }

        return $entries;
    }

    /**
     * Evaluate whether coordinates and/or address metadata fall strictly within the Zamboanga City boundary.
     */
    public static function evaluateGeospatialLocation(
        ?string $address,
        ?float $lat = null,
        ?float $lon = null,
        ?string $explicitCity = null,
        ?string $explicitProvince = null
    ): array {
        $addressStr = trim((string) $address);
        $norm = strtolower($addressStr);
        $cityNorm = strtolower(trim((string) $explicitCity));
        $provNorm = strtolower(trim((string) $explicitProvince));

        // 1. If an explicit city was resolved by the open-source locator and it is NOT Zamboanga City,
        //    immediately mark it as outside the Zamboanga City boundary (even if near the border).
        if ($cityNorm !== '' && $cityNorm !== 'zamboanga city' && $cityNorm !== 'city of zamboanga' && $cityNorm !== 'zamboanga') {
            $detectedCity = trim((string) $explicitCity);
            $detectedProv = trim((string) $explicitProvince) ?: null;

            return [
                'is_within_zamboanga_city' => false,
                'status' => 'outside',
                'detected_city' => $detectedCity,
                'detected_province' => $detectedProv,
                'latitude' => $lat !== null ? round($lat, 6) : null,
                'longitude' => $lon !== null ? round($lon, 6) : null,
                'reason' => $lat !== null && $lon !== null
                    ? sprintf('Forward-geocoded to %s%s (%.4f° N, %.4f° E) — Outside Zamboanga City service boundary.', $detectedCity, $detectedProv ? ", {$detectedProv}" : '', $lat, $lon)
                    : sprintf('Location resolved to %s%s, which is outside the Zamboanga City service boundary.', $detectedCity, $detectedProv ? ", {$detectedProv}" : ''),
            ];
        }

        // 2. Explicitly exclude neighboring Basilan / Isabela City / neighboring municipalities
        $borderExclusions = [
            'isabela city', 'basilan', 'lamitan', 'tungawan', 'ipil', 'sibuco',
            'sirawai', 'siocon', 'rt lim', 'roseller lim', 'pagadian', 'dipolog',
        ];
        foreach ($borderExclusions as $excl) {
            if (str_contains($norm, $excl) && ! str_contains($norm, 'zamboanga city')) {
                return [
                    'is_within_zamboanga_city' => false,
                    'status' => 'outside',
                    'detected_city' => $explicitCity ?: ucwords($excl),
                    'detected_province' => $explicitProvince ?: null,
                    'latitude' => $lat !== null ? round($lat, 6) : null,
                    'longitude' => $lon !== null ? round($lon, 6) : null,
                    'reason' => sprintf('Location geocoded to %s, which is outside the Zamboanga City service boundary.', $explicitCity ?: ucwords($excl)),
                ];
            }
        }

        // 3. If coordinates are provided from forward geocoding, verify the Zamboanga City bounding box
        if ($lat !== null && $lon !== null) {
            $inBoundingBox = ($lat >= self::ZC_MIN_LAT && $lat <= self::ZC_MAX_LAT)
                && ($lon >= self::ZC_MIN_LON && $lon <= self::ZC_MAX_LON);

            if ($inBoundingBox) {
                return [
                    'is_within_zamboanga_city' => true,
                    'status' => 'inside',
                    'detected_city' => 'Zamboanga City',
                    'detected_province' => 'Zamboanga del Sur',
                    'latitude' => round($lat, 6),
                    'longitude' => round($lon, 6),
                    'reason' => sprintf('Verified within Zamboanga City geospatial boundary (%.4f° N, %.4f° E).', $lat, $lon),
                ];
            }

            return [
                'is_within_zamboanga_city' => false,
                'status' => 'outside',
                'detected_city' => $explicitCity ?: 'Outside Zamboanga City',
                'detected_province' => $explicitProvince ?: null,
                'latitude' => round($lat, 6),
                'longitude' => round($lon, 6),
                'reason' => sprintf(
                    'Coordinates (%.4f° N, %.4f° E)%s are outside the Zamboanga City service boundary.',
                    $lat,
                    $lon,
                    $explicitCity ? " in {$explicitCity}" : ''
                ),
            ];
        }

        // 4. Fallback to text/gazetteer inspection when no coordinates are passed
        if ($addressStr === '') {
            return [
                'is_within_zamboanga_city' => false,
                'status' => 'empty',
                'detected_city' => null,
                'detected_province' => null,
                'latitude' => null,
                'longitude' => null,
                'reason' => 'No address provided.',
            ];
        }

        foreach (self::zamboangaGazetteer() as $entry) {
            $bName = strtolower((string) ($entry['barangay'] ?? ''));
            $bAlt = str_replace('sta.', 'santa', $bName);
            if ($bName !== '' && (str_contains($norm, $bName) || str_contains($norm, $bAlt))) {
                return [
                    'is_within_zamboanga_city' => true,
                    'status' => 'inside',
                    'detected_city' => 'Zamboanga City',
                    'detected_province' => 'Zamboanga del Sur',
                    'detected_barangay' => $entry['barangay'],
                    'latitude' => $entry['lat'],
                    'longitude' => $entry['lon'],
                    'reason' => sprintf('Forward-geocoded to Brgy. %s, Zamboanga City, Zamboanga del Sur (%.4f° N, %.4f° E).', $entry['barangay'], $entry['lat'], $entry['lon']),
                ];
            }
        }

        if (RegisteredUserController::isZamboangaCityAddress($addressStr)) {
            return [
                'is_within_zamboanga_city' => true,
                'status' => 'inside',
                'detected_city' => 'Zamboanga City',
                'detected_province' => 'Zamboanga del Sur',
                'latitude' => 6.9214,
                'longitude' => 122.0790,
                'reason' => 'Verified within Zamboanga City, Zamboanga del Sur (6.9214° N, 122.0790° E).',
            ];
        }

        return [
            'is_within_zamboanga_city' => false,
            'status' => 'outside',
            'detected_city' => $explicitCity ?: 'Outside / Unverified Location',
            'detected_province' => $explicitProvince ?: null,
            'latitude' => null,
            'longitude' => null,
            'reason' => 'Location is outside the Zamboanga City service boundary.',
        ];
    }

    /**
     * Normalize open-source city names (e.g., "City of Zamboanga" -> "Zamboanga City").
     */
    private static function normalizePhilippineCity(?string $rawCity, bool $isWithinZC = false): string
    {
        if ($isWithinZC) {
            return 'Zamboanga City';
        }
        $c = trim((string) $rawCity);
        if ($c === '') {
            return '';
        }
        if (preg_match('/^City of\s+(.+)$/i', $c, $m)) {
            return trim($m[1]) . ' City';
        }
        if (strtolower($c) === 'zamboanga') {
            return 'Zamboanga City';
        }
        return $c;
    }

    /**
     * Query open-source Philippine area locators (Komoot Photon + OpenStreetMap Nominatim)
     * with caching for any barangay, municipality, city, or province across the Philippines.
     */
    private static function queryOpenSourcePhilippineLocators(string $query): array
    {
        $cacheKey = 'ph_geospatial_locator_v2_' . md5(strtolower(trim($query)));

        return Cache::remember($cacheKey, now()->addHours(12), function () use ($query) {
            $results = [];
            $rawLower = strtolower($query);
            $searchQuery = str_contains($rawLower, 'philippines') ? $query : ($query . ', Philippines');

            // 1. Open-Source Komoot Photon Locator (fast search-as-you-type OpenStreetMap geocoder bounded to PH)
            try {
                $photonResp = Http::timeout(2.2)
                    ->withHeaders([
                        'User-Agent' => 'CoolingTowerSystem-ZamboangaGeocode/1.0',
                        'Accept-Language' => 'en',
                    ])
                    ->get('https://photon.komoot.io/api/', [
                        'q' => $searchQuery,
                        'bbox' => self::PH_BBOX,
                        'limit' => 8,
                        'lang' => 'en',
                    ]);

                if ($photonResp->successful()) {
                    $features = $photonResp->json('features') ?: [];
                    foreach ($features as $f) {
                        $coords = $f['geometry']['coordinates'] ?? null;
                        $props = $f['properties'] ?? [];
                        if (! is_array($coords) || count($coords) < 2) {
                            continue;
                        }
                        $lon = (float) $coords[0];
                        $lat = (float) $coords[1];

                        $countryCode = strtolower((string) ($props['countrycode'] ?? 'ph'));
                        if ($countryCode !== 'ph') {
                            continue;
                        }

                        $name = trim((string) ($props['name'] ?? ''));
                        $district = trim((string) ($props['district'] ?? $props['locality'] ?? ''));
                        $rawCity = trim((string) ($props['city'] ?? $props['town'] ?? $props['municipality'] ?? $props['county'] ?? ''));
                        $rawProvince = trim((string) ($props['state'] ?? $props['county'] ?? $props['region'] ?? ''));

                        // Determine barangay vs city when the feature itself is a suburb/village/barangay or city
                        $osmValue = strtolower((string) ($props['osm_value'] ?? $props['type'] ?? ''));
                        if (in_array($osmValue, ['city', 'town', 'municipality'], true) && $rawCity === '') {
                            $rawCity = $name;
                            $barangay = $district ?: 'Poblacion';
                        } else {
                            $barangay = $name ?: $district;
                        }
                        $barangay = preg_replace('/^(brgy\.?|barangay)\s+/i', '', (string) $barangay);

                        $composedText = implode(', ', array_filter([$barangay, $rawCity, $rawProvince, 'Philippines']));
                        $eval = self::evaluateGeospatialLocation($composedText, $lat, $lon, $rawCity ?: null, $rawProvince ?: null);

                        $city = self::normalizePhilippineCity($rawCity ?: ($eval['detected_city'] ?? ''), $eval['is_within_zamboanga_city']);
                        $province = $eval['is_within_zamboanga_city']
                            ? 'Zamboanga del Sur'
                            : ($rawProvince ?: ($city ?: 'Philippines'));

                        if ($barangay === '' && $city !== '') {
                            $barangay = 'Poblacion';
                        }

                        $displayName = implode(', ', array_filter([
                            $barangay ? "Brgy. {$barangay}" : null,
                            $city,
                            $province,
                            'Philippines',
                        ]));

                        $results[] = [
                            'display_name' => $displayName,
                            'canonical_name' => $displayName,
                            'barangay' => $barangay,
                            'city' => $city,
                            'province' => $province,
                            'lat' => $lat,
                            'lon' => $lon,
                            'is_within_zamboanga_city' => $eval['is_within_zamboanga_city'],
                            'status' => $eval['status'],
                            'reason' => $eval['reason'],
                            'priority' => 3,
                            'source' => 'photon_osm',
                        ];
                    }
                }
            } catch (\Throwable $e) {
                // Continue to Nominatim if Photon is unreachable
            }

            // 2. Open-Source OpenStreetMap Nominatim Locator (structured addressdetails=1 for PH barangays/cities/provinces)
            try {
                $nomResp = Http::timeout(2.5)
                    ->withHeaders([
                        'User-Agent' => 'CoolingTowerSystem-ZamboangaGeocode/1.0',
                        'Accept-Language' => 'en',
                    ])
                    ->get('https://nominatim.openstreetmap.org/search', [
                        'q' => $searchQuery,
                        'format' => 'jsonv2',
                        'addressdetails' => 1,
                        'limit' => 8,
                        'countrycodes' => 'ph',
                    ]);

                if ($nomResp->successful()) {
                    $remoteItems = $nomResp->json() ?: [];
                    foreach ($remoteItems as $r) {
                        $lat = isset($r['lat']) ? (float) $r['lat'] : null;
                        $lon = isset($r['lon']) ? (float) $r['lon'] : null;
                        $rawDisplayName = (string) ($r['display_name'] ?? '');
                        if ($rawDisplayName === '' || $lat === null || $lon === null) {
                            continue;
                        }

                        $addr = $r['address'] ?? [];
                        $rawBarangay = $addr['suburb']
                            ?? $addr['village']
                            ?? $addr['neighbourhood']
                            ?? $addr['quarter']
                            ?? $addr['hamlet']
                            ?? $addr['city_district']
                            ?? ($r['name'] ?? '');
                        $barangay = preg_replace('/^(brgy\.?|barangay)\s+/i', '', trim((string) $rawBarangay));

                        $rawCity = $addr['city']
                            ?? $addr['town']
                            ?? $addr['municipality']
                            ?? $addr['county']
                            ?? '';

                        $rawProvince = $addr['province']
                            ?? $addr['state']
                            ?? $addr['region']
                            ?? 'Philippines';

                        // If the searched entity is itself a city/municipality and barangay equals city name
                        if ($rawCity === '' && ! empty($r['name'])) {
                            $rawCity = (string) $r['name'];
                        }
                        if (strtolower($barangay) === strtolower($rawCity) || strtolower($barangay) === strtolower(str_replace(' City', '', $rawCity))) {
                            $barangay = 'Poblacion';
                        }

                        $eval = self::evaluateGeospatialLocation(
                            $rawDisplayName . ' ' . $rawCity,
                            $lat,
                            $lon,
                            $rawCity ?: null,
                            $rawProvince ?: null
                        );

                        $city = self::normalizePhilippineCity($rawCity ?: ($eval['detected_city'] ?? ''), $eval['is_within_zamboanga_city']);
                        $province = $eval['is_within_zamboanga_city']
                            ? 'Zamboanga del Sur'
                            : ($rawProvince ?: 'Philippines');

                        $cleanDisplay = implode(', ', array_filter([
                            $barangay ? "Brgy. {$barangay}" : null,
                            $city,
                            $province,
                            'Philippines',
                        ]));

                        $results[] = [
                            'display_name' => $cleanDisplay ?: $rawDisplayName,
                            'canonical_name' => $rawDisplayName,
                            'barangay' => $barangay ?: 'Poblacion',
                            'city' => $city,
                            'province' => $province,
                            'lat' => $lat,
                            'lon' => $lon,
                            'is_within_zamboanga_city' => $eval['is_within_zamboanga_city'],
                            'status' => $eval['status'],
                            'reason' => $eval['reason'],
                            'priority' => 4,
                            'source' => 'openstreetmap_nominatim',
                        ];
                    }
                }
            } catch (\Throwable $e) {
                // Gracefully fall back if offline
            }

            return $results;
        });
    }

    /**
     * GET /api/location/autocomplete?q=...
     * Real-time geospatial autocomplete + automated forward geocoding.
     * Combines the 98-barangay Zamboanga City boundary gazetteer with open-source Philippine area locators
     * (Komoot Photon + OpenStreetMap Nominatim) so ANY barangay/city/province in the Philippines is searchable.
     */
    public function autocomplete(Request $request): JsonResponse
    {
        $query = trim((string) $request->query('q', ''));
        if (mb_strlen($query) < 1) {
            return response()->json([
                'query' => $query,
                'suggestions' => [],
            ]);
        }

        $normQuery = strtolower(preg_replace('/^(brgy\.?|barangay)\s+/i', '', $query));
        $rawLower = strtolower($query);
        $suggestions = [];

        // 1. Match Zamboanga City 98-Barangay Official Boundary Index first for 0ms local matches
        foreach (self::zamboangaGazetteer() as $item) {
            $bLower = strtolower((string) ($item['barangay'] ?? ''));
            $bAlt = str_replace('sta.', 'santa', $bLower);
            $cLower = strtolower((string) ($item['city'] ?? ''));
            $pLower = strtolower((string) ($item['province'] ?? ''));
            $haystack = strtolower($item['name'] . ' ' . $bLower . ' ' . $bAlt . ' ' . $cLower . ' ' . $pLower);

            $isBarangayPrefix = $bLower !== '' && (str_starts_with($bLower, $normQuery) || str_starts_with($bAlt, $normQuery));
            $isBarangayContains = $bLower !== '' && (str_contains($bLower, $normQuery) || str_contains($bAlt, $normQuery) || str_contains($normQuery, $bLower));
            $isSubMatch = str_contains($haystack, $rawLower) || str_contains($haystack, $normQuery);

            if ($isBarangayPrefix || $isBarangayContains || $isSubMatch) {
                $eval = self::evaluateGeospatialLocation($item['name'], (float) $item['lat'], (float) $item['lon'], 'Zamboanga City', 'Zamboanga del Sur');

                $suggestions[] = [
                    'display_name' => $item['name'],
                    'canonical_name' => $item['name'],
                    'barangay' => $item['barangay'],
                    'city' => $item['city'],
                    'province' => $item['province'],
                    'lat' => (float) $item['lat'],
                    'lon' => (float) $item['lon'],
                    'is_within_zamboanga_city' => true,
                    'status' => 'inside',
                    'reason' => $eval['reason'],
                    'priority' => $isBarangayPrefix ? 1 : ($isBarangayContains ? 2 : 3),
                    'source' => 'zamboanga_boundary_gazetteer',
                ];
            }
        }

        usort($suggestions, fn ($a, $b) => ($a['priority'] ?? 9) <=> ($b['priority'] ?? 9));

        // 2. Always query Open-Source Philippine Area Locators (Photon + Nominatim) for outside cities/barangays
        //    whenever query is >= 2 chars so any barangay, city, or province in the Philippines is discovered.
        if (mb_strlen($query) >= 2) {
            $openSourceMatches = self::queryOpenSourcePhilippineLocators($query);
            $suggestions = array_merge($suggestions, $openSourceMatches);
        }

        // Deduplicate by barangay + city + province
        $unique = [];
        $seen = [];
        foreach ($suggestions as $s) {
            $key = strtolower(trim((string) ($s['barangay'] ?? '')) . '|' . trim((string) ($s['city'] ?? '')) . '|' . trim((string) ($s['province'] ?? '')));
            if ($key === '||') {
                $key = strtolower((string) $s['display_name']);
            }
            if (! isset($seen[$key])) {
                $seen[$key] = true;
                $unique[] = $s;
            }
        }

        $top = $unique[0] ?? null;
        $directVerification = self::evaluateGeospatialLocation(
            $query,
            $top['lat'] ?? null,
            $top['lon'] ?? null,
            $top['city'] ?? null,
            $top['province'] ?? null
        );

        return response()->json([
            'query' => $query,
            'verification' => $directVerification,
            'suggestions' => array_slice($unique, 0, 12),
        ]);
    }
}

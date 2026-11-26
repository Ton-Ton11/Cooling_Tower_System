<?php

namespace App\Services;

use App\Http\Controllers\SuperAdmin\SuperAdminBaseController;
use Illuminate\Validation\Rule;

class OcularInspectionService
{
    public const UNITS_OF_MEASUREMENT = ['Meters', 'Feet'];

    public const SUN_EXPOSURE_LEVELS = ['Heavy/West', 'Moderate', 'Shaded'];

    public const WINDOW_GLAZING_SIZES = ['Small', 'Medium', 'Large Glass Facade'];

    public const RECOMMENDED_AC_TYPES = [
        'Wall-Mounted Split',
        'Window',
        'Floor Standing',
        'Cassette',
    ];

    public const RECOMMENDED_MOTOR_TYPES = [
        'Inverter',
        'Non-Inverter',
        'Both',
    ];

    public static function roomValidationRules(string $prefix = ''): array
    {
        return [
            "{$prefix}room_name"                 => ['nullable', 'string', 'max:120'],
            "{$prefix}unit_of_measurement"       => ['required', 'string', Rule::in(self::UNITS_OF_MEASUREMENT)],
            "{$prefix}room_length"               => ['required', 'numeric', 'min:0.5', 'max:5000'],
            "{$prefix}room_width"                => ['required', 'numeric', 'min:0.5', 'max:5000'],
            "{$prefix}ceiling_height"            => ['required', 'numeric', 'min:1', 'max:500'],
            "{$prefix}room_category"             => ['required', 'string', 'max:120'],
            "{$prefix}sun_exposure_level"        => ['required', 'string', Rule::in(self::SUN_EXPOSURE_LEVELS)],
            "{$prefix}maximum_occupancy"         => ['required', 'integer', 'min:1', 'max:1000'],
            "{$prefix}window_size_glazing"       => ['required', 'string', Rule::in(self::WINDOW_GLAZING_SIZES)],
            "{$prefix}heat_generating_equipment" => ['required', 'integer', 'min:0', 'max:500000'],
        ];
    }

    public static function calculateCoolingCapacity(array $room): array
    {
        $isFeet = ($room['unit_of_measurement'] ?? 'Meters') === 'Feet';
        $lengthM = $isFeet ? ((float) $room['room_length'] * 0.3048) : (float) $room['room_length'];
        $widthM = $isFeet ? ((float) $room['room_width'] * 0.3048) : (float) $room['room_width'];
        $heightM = $isFeet ? ((float) $room['ceiling_height'] * 0.3048) : (float) $room['ceiling_height'];

        $areaSqm = max(1.0, $lengthM * $widthM);
        $heightFactor = max(1.0, $heightM / 2.7);

        // Base tropical cooling load ~600 BTU/h per sqm
        $btu = $areaSqm * 600.0 * $heightFactor;

        $category = strtolower((string) ($room['room_category'] ?? ''));
        if (str_contains($category, 'server')) {
            $btu *= 1.35;
        } elseif (str_contains($category, 'kitchen')) {
            $btu += 4000.0;
        } elseif (str_contains($category, 'office') || str_contains($category, 'commercial')) {
            $btu *= 1.12;
        }

        $sun = $room['sun_exposure_level'] ?? 'Moderate';
        if ($sun === 'Heavy/West') {
            $btu *= 1.12;
        } elseif ($sun === 'Shaded') {
            $btu *= 0.92;
        }

        $window = $room['window_size_glazing'] ?? 'Medium';
        if ($window === 'Large Glass Facade') {
            $btu *= 1.15;
        } elseif ($window === 'Small') {
            $btu *= 0.96;
        }

        $occupancy = max(1, (int) ($room['maximum_occupancy'] ?? 1));
        if ($occupancy > 2) {
            $btu += ($occupancy - 2) * 600.0;
        }

        $equipment = max(0, (int) ($room['heat_generating_equipment'] ?? 0));
        if ($equipment > 0) {
            // Treat values <= 30 as appliance count (~350 BTU each), larger values as wattage (* 3.412 BTU/W)
            $btu += $equipment <= 30 ? ($equipment * 350.0) : ($equipment * 3.412);
        }

        $rawHp = max(0.5, $btu / 9000.0);
        $standardHps = [0.5, 0.75, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0];
        $recommendedHp = round($rawHp * 2) / 2;
        foreach ($standardHps as $hp) {
            if ($rawHp <= $hp + 0.05) {
                $recommendedHp = $hp;
                break;
            }
        }

        return [
            'estimated_btu' => round($btu, 2),
            'estimated_hp'  => $recommendedHp,
        ];
    }

    public static function normalizeRecommendedAcType(string $rawType): string
    {
        $lower = strtolower(trim($rawType));
        if (str_contains($lower, 'window')) {
            return 'Window';
        }
        if (str_contains($lower, 'floor') || str_contains($lower, 'standing')) {
            return 'Floor Standing';
        }
        if (str_contains($lower, 'cassette')) {
            return 'Cassette';
        }

        return 'Wall-Mounted Split';
    }

    public static function normalizeMotorType(?string $rawMotor): string
    {
        $lower = strtolower(trim((string) $rawMotor));
        if (str_contains($lower, 'non')) {
            return 'Non-Inverter';
        }
        if (str_contains($lower, 'both')) {
            return 'Both';
        }

        return 'Inverter';
    }

    public static function formatRoom(object $r): array
    {
        return [
            'room_id'                   => (int) $r->room_id,
            'booking_id'                => (int) $r->booking_id,
            'room_name'                 => $r->room_name,
            'unit_of_measurement'       => $r->unit_of_measurement,
            'room_length'               => (float) $r->room_length,
            'room_width'                => (float) $r->room_width,
            'ceiling_height'            => (float) $r->ceiling_height,
            'room_category'             => $r->room_category,
            'sun_exposure_level'        => $r->sun_exposure_level,
            'maximum_occupancy'         => (int) $r->maximum_occupancy,
            'window_size_glazing'       => $r->window_size_glazing,
            'heat_generating_equipment' => (int) $r->heat_generating_equipment,
            'estimated_btu'             => $r->estimated_btu !== null ? (float) $r->estimated_btu : null,
            'estimated_hp'              => $r->estimated_hp !== null ? (float) $r->estimated_hp : null,
            'created_by'                => isset($r->created_by) ? (int) $r->created_by : null,
            'created_at'                => $r->created_at,
        ];
    }

    public static function formatRecommendation(object $rec): array
    {
        $imgPath = $rec->unit_image_path ?: ($rec->inv_image_path ?? null);
        $inventoryStatus = $rec->inventory_status
            ?: (($rec->inv_current_status ?? '') === 'Order Base' ? 'Order-Base' : 'On-Hand');
        $unitStatus = ($inventoryStatus === 'Order-Base' || ($rec->inv_current_status ?? '') === 'Order Base')
            ? 'Order Base'
            : 'Available';

        return [
            'recommendation_id'         => (int) $rec->recommendation_id,
            'booking_id'                => (int) $rec->booking_id,
            'room_id'                   => $rec->room_id ? (int) $rec->room_id : null,
            'ac_unit_id'                => $rec->ac_unit_id ? (int) $rec->ac_unit_id : null,
            'recommended_capacity'      => (float) $rec->recommended_capacity,
            'recommended_ac_type'       => $rec->recommended_ac_type,
            'motor_type_recommendation' => $rec->motor_type_recommendation,
            'brand_recommendation'      => $rec->brand_recommendation,
            'price_range_label'         => $rec->price_range_label,
            'model'                     => $rec->model,
            'model_recommendation'      => $rec->model,
            'serial_number'             => $rec->inv_serial_number ?? null,
            'inventory_status'          => $inventoryStatus,
            'unit_status'               => $unitStatus,
            'unit_current_status'       => $rec->inv_current_status ?? null,
            'unit_price'                => $rec->unit_price !== null ? (float) $rec->unit_price : null,
            'unit_image_path'           => $imgPath,
            'unit_image_url'            => SuperAdminBaseController::formatStorageUrl($imgPath),
            'notes'                     => $rec->notes,
            'status'                    => $rec->status,
            'created_at'                => $rec->created_at,
        ];
    }

    public static function formatTechnicianOcularResult(mixed $raw): ?array
    {
        if (empty($raw) || ! is_array($raw)) {
            return null;
        }

        $beforePath = $raw['before_photo_path'] ?? ($raw['before_photo_url'] ?? null);
        $afterPath = $raw['after_photo_path'] ?? ($raw['after_photo_url'] ?? null);

        return array_merge($raw, [
            'before_photo_url' => SuperAdminBaseController::formatStorageUrl($beforePath),
            'after_photo_url'  => SuperAdminBaseController::formatStorageUrl($afterPath),
        ]);
    }
}

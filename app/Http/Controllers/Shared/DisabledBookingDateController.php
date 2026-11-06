<?php

namespace App\Http\Controllers\Shared;

use App\Http\Controllers\Controller;
use App\Models\DisabledBookingDate;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class DisabledBookingDateController extends Controller
{
    /**
     * List all disabled booking dates.
     */
    public function index(): JsonResponse
    {
        $dates = DisabledBookingDate::with('disabledBy:user_id,given_name,last_name,email')
            ->orderBy('disabled_date')
            ->get()
            ->map(function ($d) {
                return [
                    'disabled_date_id' => $d->disabled_date_id,
                    'disabled_date' => Carbon::parse($d->disabled_date)->format('Y-m-d'),
                    'reason' => $d->reason,
                    'disabled_by_user_id' => $d->disabled_by_user_id,
                    'disabled_by_name' => $d->disabledBy ? trim("{$d->disabledBy->given_name} {$d->disabledBy->last_name}") : null,
                    'created_at' => $d->created_at?->toISOString(),
                ];
            });

        return response()->json([
            'data' => $dates,
        ]);
    }

    /**
     * Store a new disabled booking date (Manager / Super Admin).
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user || ! in_array((int) $user->role_id, [1, 2])) {
            abort(403, 'Unauthorized. Manager or Super Admin access required.');
        }

        $validated = $request->validate([
            'disabled_date' => ['required', 'date_format:Y-m-d'],
            'reason' => ['required', 'string', 'min:3', 'max:255'],
        ], [
            'reason.required' => 'A reason is required to disable this booking date (e.g., Holiday, Occasion, Maintenance).',
            'reason.min' => 'Please provide a clear reason of at least 3 characters.',
        ]);

        $carbonDate = Carbon::parse($validated['disabled_date']);
        $today = Carbon::today(config('app.timezone', 'Asia/Manila'));

        // Cannot disable past dates
        if ($carbonDate->lt($today)) {
            throw ValidationException::withMessages([
                'disabled_date' => ['Cannot disable past dates.'],
            ]);
        }

        // Cannot disable Sundays
        if ($carbonDate->isSunday()) {
            throw ValidationException::withMessages([
                'disabled_date' => ['Sundays are already system-wide worker rest days and cannot be booked.'],
            ]);
        }

        // Cannot disable if already disabled
        if (DisabledBookingDate::where('disabled_date', $validated['disabled_date'])->exists()) {
            throw ValidationException::withMessages([
                'disabled_date' => ['This date is already disabled.'],
            ]);
        }

        // Cannot disable a date that has existing active bookings
        $hasActiveBookings = \App\Models\Booking::whereDate('scheduled_date', $validated['disabled_date'])
            ->whereNotIn('booking_status', ['Cancelled', 'Reschedule Notice'])
            ->exists();

        if ($hasActiveBookings) {
            throw ValidationException::withMessages([
                'disabled_date' => ["Cannot disable {$carbonDate->format('M d, Y')} because there are active customer bookings scheduled on this date. Please reschedule or manage existing bookings first."],
            ]);
        }

        $record = DisabledBookingDate::create([
            'disabled_date' => $validated['disabled_date'],
            'reason' => trim($validated['reason']),
            'disabled_by_user_id' => $user->user_id,
        ]);

        return response()->json([
            'message' => 'Booking date has been disabled.',
            'data' => [
                'disabled_date_id' => $record->disabled_date_id,
                'disabled_date' => Carbon::parse($record->disabled_date)->format('Y-m-d'),
                'reason' => $record->reason,
                'disabled_by_name' => trim("{$user->given_name} {$user->last_name}"),
            ],
        ], 201);
    }

    /**
     * Remove / re-enable a disabled booking date.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        if (! $user || ! in_array((int) $user->role_id, [1, 2])) {
            abort(403, 'Unauthorized. Manager or Super Admin access required.');
        }

        $record = DisabledBookingDate::findOrFail($id);
        $record->delete();

        return response()->json([
            'message' => 'Date has been enabled for bookings.',
        ]);
    }
}


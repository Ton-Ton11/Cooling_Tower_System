<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Booking Schedule & Arrival Time Configuration
    |--------------------------------------------------------------------------
    |
    | Defines the time slot intervals and rate classifications for customer bookings:
    | - Regular Rate: Standard daytime business hours.
    | - Differential Rate: Specifically applies to early-morning (kadlawon)
    |   hours beginning at 12:00 AM (midnight).
    |
    | Note: Nighttime is not treated as differential simply because it is night;
    | only the configured early-morning kadlawon window qualifies.
    |
    */

    'interval_minutes' => 30,

    // Regular Rate Schedule
    'regular' => [
        'key' => 'regular',
        'title' => 'Regular Hours',
        'subtitle' => 'Standard Business Hours (08:00 AM – 05:00 PM)',
        'rate_name' => 'Regular Rate',
        'badge' => 'Regular',
        'start_time' => '08:00', // 08:00 AM
        'end_time' => '17:00',   // 05:00 PM
        'notice_title' => 'Regular Rate',
        'notice_message' => 'Standard service rate applies.',
        'is_differential' => false,
    ],

    // Differential Rate Schedule (Early-morning / Kadlawon)
    'differential' => [
        'key' => 'differential',
        'title' => 'Differential Hours',
        'subtitle' => 'Early Morning (Kadlawon / 12:00 AM – 05:00 AM)',
        'rate_name' => 'Differential Rate',
        'badge' => 'Differential',
        'start_time' => '00:00', // 12:00 AM
        'end_time' => '05:00',   // 05:00 AM
        'notice_title' => 'Differential Rate Applies',
        'notice_message' => 'An additional differential charge will be included in your quotation.',
        'is_differential' => true,
    ],
];

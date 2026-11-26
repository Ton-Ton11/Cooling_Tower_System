<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Booking Schedule & Arrival Time Configuration
    |--------------------------------------------------------------------------
    |
    | Defines the time slot intervals and rate classifications for customer bookings:
    | - Regular Rate: Standard daytime business hours.
    | - Differential Rate: Applies to night/differential hours
    |   starting from 05:00 PM until 07:00 AM.
    |
    */

    'interval_minutes' => 30,

    // Daily slot capacity (5 slots per day = 5 jobs for 5 technician teams, 1 job per team/technician per day)
    'max_daily_slots' => 5,
    'max_jobs_per_team_per_day' => 1,

    // Closed days of the week (0 = Sunday, rest day for workers)
    'closed_days_of_week' => [0],

    // Regular Rate Schedule
    'regular' => [
        'key' => 'regular',
        'title' => 'Regular Hours',
        'subtitle' => 'Standard Business Hours (08:00 AM – 04:00 PM)',
        'rate_name' => 'Regular Rate',
        'badge' => 'Regular',
        'start_time' => '08:00', // 08:00 AM
        'end_time' => '16:00',   // 04:00 PM
        'notice_title' => 'Regular Rate',
        'notice_message' => 'Standard service rate applies.',
        'is_differential' => false,
    ],

    // Differential Rate Schedule (Evening to Early-Morning / Night Shift)
    'differential' => [
        'key' => 'differential',
        'title' => 'Differential Hours',
        'subtitle' => 'Night Shift (05:00 PM – 07:00 AM)',
        'rate_name' => 'Differential Rate',
        'badge' => 'Differential',
        'start_time' => '17:00', // 05:00 PM
        'end_time' => '07:00',   // 07:00 AM
        'notice_title' => 'Differential Rate Applies',
        'notice_message' => 'An additional differential charge will be included in your quotation.',
        'is_differential' => true,
    ],
];

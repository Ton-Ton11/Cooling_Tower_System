<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class CoolingTowerEmployees extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('users')->insert([
            [
                'role_id' => 2, // Manager
                'given_name' => 'Maria',
                'middle_name' => 'Lopez',
                'last_name' => 'Garcia',
                'birthdate' => '1990-07-22',
                'sex' => 'Female',
                'address' => '456 EDSA, Barangay Poblacion, Mandaluyong City',
                'contact_number' => '09182345678',
                'email' => 'maria.garcia@coolingtower.com',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
                'created_at' => now(),
            ],
            [
                'role_id' => 3, // Admin Assistant
                'given_name' => 'Juan',
                'middle_name' => 'Dela Cruz',
                'last_name' => 'Mercado',
                'birthdate' => '1993-11-08',
                'sex' => 'Male',
                'address' => '789 Taft Avenue, Barangay 669, Manila',
                'contact_number' => '09193456789',
                'email' => 'juan.mercado@coolingtower.com',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
                'created_at' => now(),
            ],
            [
                'role_id' => 4, // Tools Man
                'given_name' => 'Pedro',
                'middle_name' => 'Santos',
                'last_name' => 'Reyes',
                'birthdate' => '1988-05-30',
                'sex' => 'Male',
                'address' => '321 Quezon Boulevard, Barangay Central, Quezon City',
                'contact_number' => '09204567890',
                'email' => 'pedro.reyes@coolingtower.com',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
                'created_at' => now(),
            ],
            [
                'role_id' => 5, // Technician
                'given_name' => 'Rafael',
                'middle_name' => 'Gonzales',
                'last_name' => 'Torres',
                'birthdate' => '1992-09-18',
                'sex' => 'Male',
                'address' => '890 España Street, Barangay 429, Manila',
                'contact_number' => '09226789012',
                'email' => 'rafael.torres@coolingtower.com',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
                'created_at' => now(),
            ],
        ]);
    }
}

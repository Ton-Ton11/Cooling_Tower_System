<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class RolesAndAccountsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Roles
        $roles = [
            ['role_id' => 1, 'role_name' => 'Super Admin'],
            ['role_id' => 2, 'role_name' => 'Manager'],
            ['role_id' => 3, 'role_name' => 'Admin Assistant'],
            ['role_id' => 4, 'role_name' => 'Tools Man'],
            ['role_id' => 5, 'role_name' => 'Technician / Head Technician'],
            ['role_id' => 6, 'role_name' => 'Customer'],
        ];

        foreach ($roles as $role) {
            DB::table('roles')->updateOrInsert(
                ['role_id' => $role['role_id']],
                ['role_name' => $role['role_name']]
            );
        }

        // 2. Accounts (Super Admin + Employees)
        $users = [
            // Super Admin
            [
                'role_id' => 1,
                'given_name' => 'Super',
                'middle_name' => 'Admin',
                'last_name' => 'User',
                'birthdate' => '1985-03-15',
                'sex' => 'Female',
                'address' => '123 Rizal Avenue, Barangay San Nicolas, Makati City',
                'contact_number' => '09171234567',
                'email' => 'super.admin@coolingtower.com',
                'password' => Hash::make('Superadmin123'),
                'email_verified_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            // Manager
            [
                'role_id' => 2,
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
                'updated_at' => now(),
            ],
            // Admin Assistant
            [
                'role_id' => 3,
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
                'updated_at' => now(),
            ],
            // Tools Man
            [
                'role_id' => 4,
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
                'updated_at' => now(),
            ],
            // Technician / Head Technician
            [
                'role_id' => 5,
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
                'updated_at' => now(),
            ],
        ];

        foreach ($users as $user) {
            DB::table('users')->updateOrInsert(
                ['email' => $user['email']],
                $user
            );
        }
    }
}

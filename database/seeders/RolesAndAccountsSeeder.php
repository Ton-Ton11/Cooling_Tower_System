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
            ['role_id' => 5, 'role_name' => 'Technician'],
            ['role_id' => 6, 'role_name' => 'Customer'],
            ['role_id' => 7, 'role_name' => 'Head Technician'],
        ];

        foreach ($roles as $role) {
            DB::table('roles')->updateOrInsert(
                ['role_id' => $role['role_id']],
                ['role_name' => $role['role_name'], 'is_system' => true]
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
                'email' => 'manager.maria@coolingtower.com',
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
                'email' => 'admin.juan@coolingtower.com',
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
                'email' => 'toolsman.pedro@coolingtower.com',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            // Head Technician (1 of the 10 technicians)
            [
                'role_id' => 7,
                'given_name' => 'Rafael',
                'middle_name' => 'Gonzales',
                'last_name' => 'Torres',
                'birthdate' => '1992-09-18',
                'sex' => 'Male',
                'address' => '890 España Street, Barangay 429, Manila',
                'contact_number' => '09226789012',
                'email' => 'technician.head@coolingtower.com',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            // Technician 1
            [
                'role_id' => 5,
                'given_name' => 'Danilo',
                'middle_name' => 'Bautista',
                'last_name' => 'Ramos',
                'birthdate' => '1987-04-12',
                'sex' => 'Male',
                'address' => '514 Shaw Boulevard, Barangay Addition Hills, Mandaluyong City',
                'contact_number' => '09285551234',
                'email' => 'technician.first@coolingtower.com',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            // Technician 2
            [
                'role_id' => 5,
                'given_name' => 'Arnel',
                'middle_name' => 'Villanueva',
                'last_name' => 'Castro',
                'birthdate' => '1995-10-25',
                'sex' => 'Male',
                'address' => '230 Aurora Boulevard, Barangay Kaunlaran, Quezon City',
                'contact_number' => '09178889900',
                'email' => 'technician.second@coolingtower.com',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            // Technician 3
            [
                'role_id' => 5,
                'given_name' => 'Mark',
                'middle_name' => 'Alcantara',
                'last_name' => 'Dela Rosa',
                'birthdate' => '1994-06-14',
                'sex' => 'Male',
                'address' => '12 Mabini Street, Barangay Malate, Manila',
                'contact_number' => '09291112233',
                'email' => 'technician.third@coolingtower.com',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            // Technician 4
            [
                'role_id' => 5,
                'given_name' => 'Rodel',
                'middle_name' => 'Flores',
                'last_name' => 'Aquino',
                'birthdate' => '1991-03-21',
                'sex' => 'Male',
                'address' => '88 Roxas Boulevard, Pasay City',
                'contact_number' => '09292223344',
                'email' => 'technician.fourth@coolingtower.com',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            // Technician 5
            [
                'role_id' => 5,
                'given_name' => 'Crisanto',
                'middle_name' => 'Navarro',
                'last_name' => 'Perez',
                'birthdate' => '1993-08-09',
                'sex' => 'Male',
                'address' => '45 Commonwealth Avenue, Quezon City',
                'contact_number' => '09293334455',
                'email' => 'technician.fifth@coolingtower.com',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            // Technician 6
            [
                'role_id' => 5,
                'given_name' => 'Gilbert',
                'middle_name' => 'Soriano',
                'last_name' => 'Valdez',
                'birthdate' => '1996-01-18',
                'sex' => 'Male',
                'address' => '102 Boni Avenue, Mandaluyong City',
                'contact_number' => '09294445566',
                'email' => 'technician.sixth@coolingtower.com',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            // Technician 7
            [
                'role_id' => 5,
                'given_name' => 'Eduardo',
                'middle_name' => 'Pascual',
                'last_name' => 'Morales',
                'birthdate' => '1989-12-05',
                'sex' => 'Male',
                'address' => '77 Chino Roces Avenue, Makati City',
                'contact_number' => '09295556677',
                'email' => 'technician.seventh@coolingtower.com',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            // Technician 8
            [
                'role_id' => 5,
                'given_name' => 'Jomar',
                'middle_name' => 'Banal',
                'last_name' => 'Ocampo',
                'birthdate' => '1997-05-29',
                'sex' => 'Male',
                'address' => '33 C-5 Road, Barangay Ugong, Pasig City',
                'contact_number' => '09296667788',
                'email' => 'technician.eighth@coolingtower.com',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            // Technician 9
            [
                'role_id' => 5,
                'given_name' => 'Nestor',
                'middle_name' => 'Domingo',
                'last_name' => 'Castillo',
                'birthdate' => '1992-11-17',
                'sex' => 'Male',
                'address' => '59 Ortigas Avenue, Greenhills, San Juan',
                'contact_number' => '09297778899',
                'email' => 'technician.ninth@coolingtower.com',
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

<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class SuperAdminAccount extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('users')->insert([
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
        ]);
    }
}

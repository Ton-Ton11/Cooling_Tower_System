<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class rolesSeeder extends Seeder
{
        /**
         * Run the database seeds.
         */
        public function run(): void
        {
                DB::table('roles')->insert([
                        ['role_id' => 1, 'role_name' => 'Super Admin'],
                        ['role_id' => 2, 'role_name' => 'Manager'],
                        ['role_id' => 3, 'role_name' => 'Admin Assistant'],
                        ['role_id' => 4, 'role_name' => 'Tools Man'],
                        ['role_id' => 5, 'role_name' => 'Technician / Head Technician'],
                        ['role_id' => 6, 'role_name' => 'Customer'],
                ]);
        }
}

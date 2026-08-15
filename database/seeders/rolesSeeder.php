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
            ['role_name' => 'Super Admin'],
            ['role_name' => 'Manager'],
            ['role_name' => 'Admin Assistant'],
            ['role_name' => 'Tools Man'],
            ['role_name' => 'Technician / Head Technician'],
            ['role_name' => 'Customer'],
            ]);
    }
}

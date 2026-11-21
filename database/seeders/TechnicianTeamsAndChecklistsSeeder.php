<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class TechnicianTeamsAndChecklistsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * Note: This seeder has been merged into ExampleDataSeeder.php.
     */
    public function run(): void
    {
        // All squad management, technician assignments, and checklist seeds
        // are maintained in ExampleDataSeeder.php.
        $this->call(ExampleDataSeeder::class);
    }
}

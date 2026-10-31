<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Creates technician profile, specialty, certification, and squad/team management tables.
     */
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();

        // 1. Specialties
        if (! Schema::hasTable('specialties')) {
            Schema::create('specialties', function (Blueprint $table) {
                $table->integer('specialty_id')->autoIncrement();
                $table->string('specialty_name', 50);
            });
        }

        $defaultSpecialties = [
            ['specialty_id' => 1, 'specialty_name' => 'Installation & Commissioning'],
            ['specialty_id' => 2, 'specialty_name' => 'Troubleshooting & PCB Repair'],
            ['specialty_id' => 3, 'specialty_name' => 'Preventive Maintenance'],
            ['specialty_id' => 4, 'specialty_name' => 'Chemical Deep Cleaning'],
            ['specialty_id' => 5, 'specialty_name' => 'Refrigerant System Leak Test & Recharging'],
            ['specialty_id' => 6, 'specialty_name' => 'Ducting & Cooling Tower Airflow'],
        ];

        foreach ($defaultSpecialties as $spec) {
            DB::table('specialties')->updateOrInsert(
                ['specialty_id' => $spec['specialty_id']],
                ['specialty_name' => $spec['specialty_name']]
            );
        }

        // 2. Technician Details
        if (! Schema::hasTable('technician_details')) {
            Schema::create('technician_details', function (Blueprint $table) {
                $table->integer('user_id')->primary();
                $table->date('certificate_expiry');

                $table->foreign('user_id')->references('user_id')->on('users')->onDelete('cascade');
            });
        }

        // 3. Technician Specialty
        if (! Schema::hasTable('technician_specialty')) {
            Schema::create('technician_specialty', function (Blueprint $table) {
                $table->integer('user_id');
                $table->integer('specialty_id');
                $table->primary(['user_id', 'specialty_id']);

                $table->foreign('user_id')->references('user_id')->on('technician_details')->onDelete('cascade');
                $table->foreign('specialty_id')->references('specialty_id')->on('specialties')->onDelete('cascade');
            });
        }

        // 4. Technician Certifications
        if (! Schema::hasTable('technician_certifications')) {
            Schema::create('technician_certifications', function (Blueprint $table) {
                $table->id('certification_id');
                $table->unsignedBigInteger('user_id')->index();
                $table->string('certification_name', 180);
                $table->string('issuing_body', 120)->default('TESDA');
                $table->string('certificate_number', 100)->nullable();
                $table->date('issued_date');
                $table->date('expiry_date')->index();
                $table->integer('renewal_lead_days')->default(45);
                $table->string('status', 40)->default('Active');
                $table->timestamp('last_reminded_at')->nullable();
                $table->text('notes')->nullable();
                $table->timestamps();
            });
        }

        // 5. Technician Teams
        if (! Schema::hasTable('technician_teams')) {
            Schema::create('technician_teams', function (Blueprint $table) {
                $table->integer('team_id')->autoIncrement();
                $table->string('team_name', 100);
                $table->integer('leader_id')->nullable();
                $table->integer('created_by')->nullable();
                $table->string('status', 30)->default('Active');
                $table->text('description')->nullable();
                $table->timestamps();

                $table->foreign('leader_id')->references('user_id')->on('users')->onDelete('set null');
                $table->foreign('created_by')->references('user_id')->on('users')->onDelete('set null');
            });
        }

        // 6. Technician Team Members
        if (! Schema::hasTable('technician_team_members')) {
            Schema::create('technician_team_members', function (Blueprint $table) {
                $table->integer('id')->autoIncrement();
                $table->integer('team_id');
                $table->integer('technician_id');
                $table->string('role_in_team', 50)->default('Member');
                $table->timestamps();

                $table->foreign('team_id')->references('team_id')->on('technician_teams')->onDelete('cascade');
                $table->foreign('technician_id')->references('user_id')->on('users')->onDelete('cascade');
                $table->unique(['team_id', 'technician_id']);
            });
        }

        Schema::enableForeignKeyConstraints();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::disableForeignKeyConstraints();

        Schema::dropIfExists('technician_team_members');
        Schema::dropIfExists('technician_teams');
        Schema::dropIfExists('technician_certifications');
        Schema::dropIfExists('technician_specialty');
        Schema::dropIfExists('technician_details');
        Schema::dropIfExists('specialties');

        Schema::enableForeignKeyConstraints();
    }
};

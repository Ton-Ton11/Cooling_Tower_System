<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();

        // 1. Add is_head_technician to users table
        if (! Schema::hasColumn('users', 'is_head_technician')) {
            Schema::table('users', function (Blueprint $table) {
                $table->boolean('is_head_technician')->default(false)->after('role_id');
            });
        }

        // 2. Technician Teams table
        if (! Schema::hasTable('technician_teams')) {
            Schema::create('technician_teams', function (Blueprint $table) {
                $table->integer('team_id')->autoIncrement();
                $table->string('team_name', 100);
                $table->integer('leader_id')->nullable();
                $table->integer('created_by')->nullable();
                $table->string('status', 30)->default('Active'); // Active, Inactive
                $table->text('description')->nullable();
                $table->timestamps();

                $table->foreign('leader_id')->references('user_id')->on('users')->onDelete('set null');
                $table->foreign('created_by')->references('user_id')->on('users')->onDelete('set null');
            });
        }

        // 3. Technician Team Members table
        if (! Schema::hasTable('technician_team_members')) {
            Schema::create('technician_team_members', function (Blueprint $table) {
                $table->integer('id')->autoIncrement();
                $table->integer('team_id');
                $table->integer('technician_id');
                $table->string('role_in_team', 50)->default('Member'); // Lead, Member
                $table->timestamps();

                $table->foreign('team_id')->references('team_id')->on('technician_teams')->onDelete('cascade');
                $table->foreign('technician_id')->references('user_id')->on('users')->onDelete('cascade');
                $table->unique(['team_id', 'technician_id']);
            });
        }

        // 4. Add assigned_team_id and assigned_by to bookings table
        Schema::table('bookings', function (Blueprint $table) {
            if (! Schema::hasColumn('bookings', 'assigned_team_id')) {
                $table->integer('assigned_team_id')->nullable()->after('assigned_tech_id');
                $table->foreign('assigned_team_id')->references('team_id')->on('technician_teams')->onDelete('set null');
            }
            if (! Schema::hasColumn('bookings', 'assigned_by')) {
                $table->integer('assigned_by')->nullable()->after('assigned_team_id');
                $table->foreign('assigned_by')->references('user_id')->on('users')->onDelete('set null');
            }
        });

        // 5. Tool Checklists table
        if (! Schema::hasTable('tool_checklists')) {
            Schema::create('tool_checklists', function (Blueprint $table) {
                $table->integer('checklist_id')->autoIncrement();
                $table->integer('booking_id');
                $table->integer('technician_id'); // Submitter
                $table->integer('team_id')->nullable();
                $table->string('status', 50)->default('Pending'); // Pending, Approved, Completed, Cancelled
                $table->text('notes')->nullable();
                $table->integer('approved_by')->nullable(); // Tools Man
                $table->timestamp('approved_at')->nullable();
                $table->integer('completed_by')->nullable(); // Tools Man
                $table->timestamp('completed_at')->nullable();
                $table->timestamps();

                $table->foreign('booking_id')->references('booking_id')->on('bookings')->onDelete('cascade');
                $table->foreign('technician_id')->references('user_id')->on('users')->onDelete('cascade');
                $table->foreign('team_id')->references('team_id')->on('technician_teams')->onDelete('set null');
                $table->foreign('approved_by')->references('user_id')->on('users')->onDelete('set null');
                $table->foreign('completed_by')->references('user_id')->on('users')->onDelete('set null');
            });
        }

        // 6. Tool Checklist Items table
        if (! Schema::hasTable('tool_checklist_items')) {
            Schema::create('tool_checklist_items', function (Blueprint $table) {
                $table->integer('id')->autoIncrement();
                $table->integer('checklist_id');
                $table->integer('item_id');
                $table->string('item_type', 50)->default('Tool'); // Tool, Material, Spare Part
                $table->integer('quantity_requested')->default(1);
                $table->integer('quantity_approved')->default(1);
                $table->string('status', 50)->default('assigned'); // assigned, returned, damaged, lost
                $table->text('notes')->nullable();
                $table->timestamps();

                $table->foreign('checklist_id')->references('checklist_id')->on('tool_checklists')->onDelete('cascade');
                $table->foreign('item_id')->references('item_id')->on('inventory_items')->onDelete('cascade');
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

        Schema::dropIfExists('tool_checklist_items');
        Schema::dropIfExists('tool_checklists');

        Schema::table('bookings', function (Blueprint $table) {
            if (Schema::hasColumn('bookings', 'assigned_by')) {
                $table->dropForeign(['assigned_by']);
                $table->dropColumn('assigned_by');
            }
            if (Schema::hasColumn('bookings', 'assigned_team_id')) {
                $table->dropForeign(['assigned_team_id']);
                $table->dropColumn('assigned_team_id');
            }
        });

        Schema::dropIfExists('technician_team_members');
        Schema::dropIfExists('technician_teams');

        if (Schema::hasColumn('users', 'is_head_technician')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('is_head_technician');
            });
        }

        Schema::enableForeignKeyConstraints();
    }
};

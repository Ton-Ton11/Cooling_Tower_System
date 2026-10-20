<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Creates framework tables (cache, sessions, password_reset_tokens),
     * core authentication/authorization tables (roles, users),
     * and system communication tables (activity_logs, announcements, staff_messages, user_notification_reads).
     */
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();

        // 1. Cache
        if (! Schema::hasTable('cache')) {
            Schema::create('cache', function (Blueprint $table) {
                $table->string('key')->primary();
                $table->mediumText('value');
                $table->bigInteger('expiration')->index();
            });
        }

        // 2. Cache Locks
        if (! Schema::hasTable('cache_locks')) {
            Schema::create('cache_locks', function (Blueprint $table) {
                $table->string('key')->primary();
                $table->string('owner');
                $table->bigInteger('expiration')->index();
            });
        }

        // 3. Sessions
        if (! Schema::hasTable('sessions')) {
            Schema::create('sessions', function (Blueprint $table) {
                $table->string('id')->primary();
                $table->foreignId('user_id')->nullable()->index();
                $table->string('ip_address', 45)->nullable();
                $table->text('user_agent')->nullable();
                $table->longText('payload');
                $table->integer('last_activity')->index();
            });
        }

        // 4. Password Reset Tokens
        if (! Schema::hasTable('password_reset_tokens')) {
            Schema::create('password_reset_tokens', function (Blueprint $table) {
                $table->string('email')->primary();
                $table->string('token');
                $table->timestamp('created_at')->nullable();
            });
        }

        // 5. Roles
        if (! Schema::hasTable('roles')) {
            Schema::create('roles', function (Blueprint $table) {
                $table->integer('role_id')->autoIncrement();
                $table->string('role_name', 50);
                $table->text('description')->nullable();
                $table->boolean('is_system')->default(false);
                $table->timestamps();
            });
        }

        // Ensure core system roles exist
        $defaultRoles = [
            [
                'role_id' => 1,
                'role_name' => 'Super Admin',
                'description' => 'Full administrative access and security control over the entire system.',
                'is_system' => true,
            ],
            [
                'role_id' => 2,
                'role_name' => 'Manager',
                'description' => 'Booking approvals, job dispatching, technician scheduling, and operational management.',
                'is_system' => true,
            ],
            [
                'role_id' => 3,
                'role_name' => 'Admin Assistant',
                'description' => 'Staff record management, inventory coordination, and administrative assistance.',
                'is_system' => true,
            ],
            [
                'role_id' => 4,
                'role_name' => 'Tools Man',
                'description' => 'Warehouse tools management, inventory checkouts, and material replenishment.',
                'is_system' => true,
            ],
            [
                'role_id' => 5,
                'role_name' => 'Technician',
                'description' => 'Field airconditioning service, chemical cleaning, maintenance, diagnostics, and job completion.',
                'is_system' => true,
            ],
            [
                'role_id' => 6,
                'role_name' => 'Customer',
                'description' => 'Customer self-service portal, booking requests, payments, feedback, and complaints.',
                'is_system' => true,
            ],
            [
                'role_id' => 7,
                'role_name' => 'Head Technician',
                'description' => 'Leads technician teams, organizes squads, and oversees field operations.',
                'is_system' => true,
            ],
        ];

        foreach ($defaultRoles as $role) {
            DB::table('roles')->updateOrInsert(
                ['role_id' => $role['role_id']],
                array_merge($role, [
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
            );
        }

        // 6. Users
        if (! Schema::hasTable('users')) {
            Schema::create('users', function (Blueprint $table) {
                $table->integer('user_id')->autoIncrement();
                $table->integer('role_id');
                $table->string('given_name', 100);
                $table->string('middle_name', 100)->nullable();
                $table->string('last_name', 100);
                $table->date('birthdate');
                $table->enum('sex', ['Male', 'Female']);
                $table->text('address');
                $table->string('contact_number', 50);
                $table->string('email', 150)->unique();
                $table->string('profile_photo_path', 500)->nullable();
                $table->string('password', 255);
                $table->timestamp('email_verified_at')->nullable();
                $table->string('remember_token', 100)->nullable();
                $table->timestamp('created_at')->useCurrent();
                $table->timestamp('updated_at')->nullable();
                $table->boolean('is_active')->default(true)->nullable();

                $table->foreign('role_id')->references('role_id')->on('roles');
            });
        }

        // 7. Activity Logs
        if (! Schema::hasTable('activity_logs')) {
            Schema::create('activity_logs', function (Blueprint $table) {
                $table->id();
                $table->integer('user_id');
                $table->string('action_type', 255);
                $table->text('description');
                $table->timestamps();

                $table->foreign('user_id')->references('user_id')->on('users')->onDelete('cascade');
            });
        }

        // 8. Announcements
        if (! Schema::hasTable('announcements')) {
            Schema::create('announcements', function (Blueprint $table) {
                $table->id();
                $table->integer('created_by');
                $table->string('title', 255);
                $table->text('message');
                $table->integer('target_role_id')->nullable();
                $table->timestamps();

                $table->foreign('created_by')->references('user_id')->on('users')->onDelete('cascade');
                $table->foreign('target_role_id')->references('role_id')->on('roles')->onDelete('set null');
            });
        }

        // 9. Staff Messages
        if (! Schema::hasTable('staff_messages')) {
            Schema::create('staff_messages', function (Blueprint $table) {
                $table->id('message_id');
                $table->unsignedBigInteger('sender_id')->index();
                $table->unsignedBigInteger('recipient_id')->nullable()->index();
                $table->string('subject', 160)->nullable();
                $table->text('body');
                $table->boolean('is_read')->default(false);
                $table->timestamps();
            });
        }

        // 10. User Notification Reads
        if (! Schema::hasTable('user_notification_reads')) {
            Schema::create('user_notification_reads', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id')->unique();
                $table->timestamp('last_read_at')->nullable();
                $table->timestamps();
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

        Schema::dropIfExists('user_notification_reads');
        Schema::dropIfExists('staff_messages');
        Schema::dropIfExists('announcements');
        Schema::dropIfExists('activity_logs');
        Schema::dropIfExists('users');
        Schema::dropIfExists('roles');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('cache_locks');
        Schema::dropIfExists('cache');

        Schema::enableForeignKeyConstraints();
    }
};

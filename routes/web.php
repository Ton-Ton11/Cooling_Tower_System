<?php

use App\Http\Controllers\SuperAdmin\SuperAdminController;
use App\Http\Controllers\SuperAdmin\SuperAdminBookingController;
use App\Http\Controllers\SuperAdmin\SuperAdminStaffController;
use App\Http\Controllers\SuperAdmin\SuperAdminInventoryController;
use App\Http\Controllers\SuperAdmin\SuperAdminAcUnitController;
use App\Http\Controllers\SuperAdmin\SuperAdminSparePartController;
use App\Http\Controllers\SuperAdmin\SuperAdminSalesController;
use App\Http\Controllers\SuperAdmin\SuperAdminDocumentController;
use App\Http\Controllers\SuperAdmin\SuperAdminAnnouncementController;
use App\Http\Controllers\SuperAdmin\SuperAdminPerformanceController;

use App\Http\Controllers\Manager\ManagerDashboardController;
use App\Http\Controllers\Manager\ManagerBookingController;
use App\Http\Controllers\Manager\ManagerAnnouncementController;

use App\Http\Controllers\AdminAssistant\AdminAssistantDashboardController;
use App\Http\Controllers\AdminAssistant\AdminAssistantStaffController;
use App\Http\Controllers\AdminAssistant\AdminAssistantAcUnitController;
use App\Http\Controllers\AdminAssistant\AdminAssistantSalesController;
use App\Http\Controllers\AdminAssistant\AdminAssistantAnnouncementController;

use App\Http\Controllers\ToolsMan\ToolsManDashboardController;
use App\Http\Controllers\ToolsMan\ToolsManInventoryController;
use App\Http\Controllers\ToolsMan\ToolsManSparePartController;
use App\Http\Controllers\ToolsMan\ToolsManAnnouncementController;

use App\Http\Controllers\Technician\TechnicianDashboardController;
use App\Http\Controllers\Technician\TechnicianBookingController;
use App\Http\Controllers\Technician\TechnicianAnnouncementController;
use App\Http\Controllers\Technician\TechnicianPerformanceController;

use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin'       => Route::has('login'),
        'canRegister'    => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion'     => PHP_VERSION,
    ]);
});

Route::get('/dashboard', function () {
    if (! auth()->check()) {
        return redirect()->route('login');
    }

    return match ((int) auth()->user()->role_id) {
        1 => redirect()->route('super-admin.dashboard'),
        2 => redirect()->route('manager.dashboard'),
        3 => redirect()->route('admin-assistant.dashboard'),
        4 => redirect()->route('tools-man.dashboard'),
        5 => redirect()->route('technician.dashboard'),
        6 => redirect()->route('customer.dashboard'),
        default => redirect()->route('login'),
    };
})->middleware(['auth', 'verified'])->name('dashboard');

// ══════════════════════════════════════════════════════════════════
// Super Admin  (role_id = 1)
// ══════════════════════════════════════════════════════════════════
Route::prefix('super-admin')
    ->middleware(['auth', 'verified', 'role:1'])
    ->name('super-admin.')
    ->group(function () {

        // ─── Dashboard ───
        Route::controller(SuperAdminController::class)->group(function () {
            Route::get('/dashboard', 'dashboard')->name('dashboard');
            Route::get('/dashboard/data', 'dashboardData')->name('dashboard.data');
        });

        // ─── Bookings ───
        Route::controller(SuperAdminBookingController::class)->group(function () {
            Route::get('/bookings', 'bookingsIndex')->name('bookings.index');
            Route::patch('/bookings/{bookingId}/approve', 'approveBooking')->name('bookings.approve');
        });

        // ─── Staff ───
        Route::controller(SuperAdminStaffController::class)->group(function () {
            Route::get('/staff', 'staffIndex')->name('staff.index');
            Route::post('/staff', 'storeStaff')->name('staff.store');
            Route::patch('/staff/{userId}', 'updateStaff')->name('staff.update');
            Route::patch('/staff/{userId}/archive', 'archiveStaff')->name('staff.archive');
            Route::patch('/staff/{userId}/restore', 'restoreStaff')->name('staff.restore');
        });

        // ─── Inventory ───
        Route::controller(SuperAdminInventoryController::class)->group(function () {
            // Legacy routes (keep for backward compatibility)
            Route::get('/inventory-items', 'inventoryIndex')->name('inventory.index');
            Route::post('/inventory-items', 'storeInventoryItem')->name('inventory.store');
            Route::patch('/inventory-items/{itemId}', 'updateInventoryItem')->name('inventory.update');
            Route::delete('/inventory-items/{itemId}', 'destroyInventoryItem')->name('inventory.destroy');

            // Enhanced routes
            Route::get('/inventory', 'inventoryIndex')->name('inventory.enhanced');
            Route::get('/inventory/grouped', 'inventoryGroupedIndex')->name('inventory.grouped');
            Route::post('/inventory', 'storeInventoryItem')->name('inventory.store.enhanced');
            Route::patch('/inventory/{itemId}', 'updateInventoryItem')->name('inventory.update.enhanced');
            Route::delete('/inventory/{itemId}', 'destroyInventoryItem')->name('inventory.destroy.enhanced');
        });

        // ─── AC Units ───
        Route::controller(SuperAdminAcUnitController::class)->group(function () {
            Route::get('/ac-units', 'acUnitsIndex')->name('ac-units.index');
            Route::post('/ac-units', 'storeAcUnit')->name('ac-units.store');
            Route::patch('/ac-units/{acUnitId}', 'updateAcUnit')->name('ac-units.update');
            Route::delete('/ac-units/{acUnitId}', 'destroyAcUnit')->name('ac-units.destroy');
        });

        // ─── Spare Parts ───
        Route::controller(SuperAdminSparePartController::class)->group(function () {
            Route::get('/spare-parts', 'sparePartsIndex')->name('spare-parts.index');
            Route::post('/spare-parts', 'storeSparePart')->name('spare-parts.store');
            Route::patch('/spare-parts/{itemId}', 'updateSparePart')->name('spare-parts.update');
            Route::delete('/spare-parts/{itemId}', 'destroySparePart')->name('spare-parts.destroy');
        });

        // ─── Sales Records ───
        Route::controller(SuperAdminSalesController::class)->group(function () {
            Route::get('/sales-records', 'salesRecordsIndex')->name('sales-records.index');
        });

        // ─── Documents ───
        Route::controller(SuperAdminDocumentController::class)->group(function () {
            Route::get('/documents', 'documentsIndex')->name('documents.index');
            Route::post('/documents', 'storeDocument')->name('documents.store');
            Route::patch('/documents/{docId}', 'updateDocument')->name('documents.update');
            Route::delete('/documents/{docId}', 'destroyDocument')->name('documents.destroy');
        });

        // ─── Announcements & Activity Logs ───
        Route::controller(SuperAdminAnnouncementController::class)->group(function () {
            Route::get('/announcements', 'announcementsIndex')->name('announcements.index');
            Route::post('/announcements', 'storeAnnouncement')->name('announcements.store');
            Route::patch('/announcements/{announcementId}', 'updateAnnouncement')->name('announcements.update');
            Route::delete('/announcements/{announcementId}', 'destroyAnnouncement')->name('announcements.destroy');
            Route::get('/activity-logs', 'activityLogsIndex')->name('activity-logs.index');
        });

        // ─── Performance ───
        Route::controller(SuperAdminPerformanceController::class)->group(function () {
            Route::get('/performance', 'performanceIndex')->name('performance.index');
        });
    });

// ══════════════════════════════════════════════════════════════════
// Manager  (role_id = 2)
// ══════════════════════════════════════════════════════════════════
Route::prefix('manager')
    ->middleware(['auth', 'verified', 'role:2'])
    ->name('manager.')
    ->group(function () {

        Route::controller(ManagerDashboardController::class)->group(function () {
            Route::get('/dashboard', 'dashboard')->name('dashboard');
            Route::get('/dashboard/data', 'dashboardData')->name('dashboard.data');
        });

        Route::controller(ManagerBookingController::class)->group(function () {
            Route::get('/bookings', 'bookingsIndex')->name('bookings.index');
            Route::patch('/bookings/{bookingId}/approve', 'approveBooking')->name('bookings.approve');
        });

        Route::controller(ManagerAnnouncementController::class)->group(function () {
            Route::get('/announcements', 'announcementsIndex')->name('announcements.index');
            Route::post('/announcements', 'storeAnnouncement')->name('announcements.store');
            Route::delete('/announcements/{announcementId}', 'destroyAnnouncement')->name('announcements.destroy');
        });

        // Manager also has access to the performance endpoint (shared with super-admin logic)
        Route::controller(TechnicianPerformanceController::class)->group(function () {
            Route::get('/performance', 'performanceIndex')->name('performance.index');
        });
    });

// ══════════════════════════════════════════════════════════════════
// Admin Assistant  (role_id = 3)
// ══════════════════════════════════════════════════════════════════
Route::prefix('admin-assistant')
    ->middleware(['auth', 'verified', 'role:3'])
    ->name('admin-assistant.')
    ->group(function () {

        Route::controller(AdminAssistantDashboardController::class)->group(function () {
            Route::get('/dashboard', 'dashboard')->name('dashboard');
            Route::get('/dashboard/data', 'dashboardData')->name('dashboard.data');
        });

        Route::controller(AdminAssistantStaffController::class)->group(function () {
            Route::get('/staff', 'staffIndex')->name('staff.index');
            Route::post('/staff', 'storeStaff')->name('staff.store');
            Route::patch('/staff/{userId}', 'updateStaff')->name('staff.update');
            Route::patch('/staff/{userId}/archive', 'archiveStaff')->name('staff.archive');
            Route::patch('/staff/{userId}/restore', 'restoreStaff')->name('staff.restore');
        });

        Route::controller(AdminAssistantAcUnitController::class)->group(function () {
            Route::get('/ac-units', 'acUnitsIndex')->name('ac-units.index');
            Route::post('/ac-units', 'storeAcUnit')->name('ac-units.store');
            Route::patch('/ac-units/{acUnitId}', 'updateAcUnit')->name('ac-units.update');
            Route::delete('/ac-units/{acUnitId}', 'destroyAcUnit')->name('ac-units.destroy');
        });

        Route::controller(AdminAssistantSalesController::class)->group(function () {
            Route::get('/sales-records', 'salesRecordsIndex')->name('sales-records.index');
        });

        Route::controller(AdminAssistantAnnouncementController::class)->group(function () {
            Route::get('/announcements', 'announcementsIndex')->name('announcements.index');
            Route::post('/announcements', 'storeAnnouncement')->name('announcements.store');
            Route::delete('/announcements/{announcementId}', 'destroyAnnouncement')->name('announcements.destroy');
        });
    });

// ══════════════════════════════════════════════════════════════════
// Tools Man  (role_id = 4)
// ══════════════════════════════════════════════════════════════════
Route::prefix('tools-man')
    ->middleware(['auth', 'verified', 'role:4'])
    ->name('tools-man.')
    ->group(function () {

        Route::controller(ToolsManDashboardController::class)->group(function () {
            Route::get('/dashboard', 'dashboard')->name('dashboard');
            Route::get('/dashboard/data', 'dashboardData')->name('dashboard.data');
        });

        Route::controller(ToolsManInventoryController::class)->group(function () {
            Route::get('/inventory', 'inventoryIndex')->name('inventory.index');
            Route::post('/inventory', 'storeInventoryItem')->name('inventory.store');
            Route::patch('/inventory/{itemId}', 'updateInventoryItem')->name('inventory.update');
            Route::delete('/inventory/{itemId}', 'destroyInventoryItem')->name('inventory.destroy');
        });

        Route::controller(ToolsManSparePartController::class)->group(function () {
            Route::get('/spare-parts', 'sparePartsIndex')->name('spare-parts.index');
            Route::post('/spare-parts', 'storeSparePart')->name('spare-parts.store');
            Route::patch('/spare-parts/{itemId}', 'updateSparePart')->name('spare-parts.update');
            Route::delete('/spare-parts/{itemId}', 'destroySparePart')->name('spare-parts.destroy');
        });

        Route::controller(ToolsManAnnouncementController::class)->group(function () {
            Route::get('/announcements', 'announcementsIndex')->name('announcements.index');
            Route::post('/announcements', 'storeAnnouncement')->name('announcements.store');
            Route::delete('/announcements/{announcementId}', 'destroyAnnouncement')->name('announcements.destroy');
        });
    });

// ══════════════════════════════════════════════════════════════════
// Technician  (role_id = 5)
// ══════════════════════════════════════════════════════════════════
Route::prefix('technician')
    ->middleware(['auth', 'verified', 'role:5'])
    ->name('technician.')
    ->group(function () {

        Route::controller(TechnicianDashboardController::class)->group(function () {
            Route::get('/dashboard', 'dashboard')->name('dashboard');
            Route::get('/dashboard/data', 'dashboardData')->name('dashboard.data');
        });

        Route::controller(TechnicianBookingController::class)->group(function () {
            Route::get('/bookings', 'bookingsIndex')->name('bookings.index');
            Route::post('/bookings/{bookingId}/start', 'startJob')->name('bookings.start');
            Route::post('/bookings/{bookingId}/complete', 'completeJob')->name('bookings.complete');
            Route::post('/bookings/{bookingId}/materials', 'logMaterial')->name('bookings.materials');
            Route::get('/materials-list', 'materialsList')->name('materials.list');
            Route::get('/my-tools', 'myTools')->name('tools.mine');
        });

        Route::controller(TechnicianAnnouncementController::class)->group(function () {
            Route::get('/announcements', 'announcementsIndex')->name('announcements.index');
        });

        Route::controller(TechnicianPerformanceController::class)->group(function () {
            Route::get('/performance', 'performanceIndex')->name('performance.index');
        });
    });

// ══════════════════════════════════════════════════════════════════
// Customer  (role_id = 6)
// ══════════════════════════════════════════════════════════════════
Route::get('/customer/dashboard', function () {
    return Inertia::render('Customer/Dashboard');
})->middleware(['auth', 'verified', 'role:6'])->name('customer.dashboard');

// ══════════════════════════════════════════════════════════════════
// Profile
// ══════════════════════════════════════════════════════════════════
Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
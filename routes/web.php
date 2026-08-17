<?php

use App\Http\Controllers\SuperAdminController;
use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
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

Route::prefix('super-admin')
    ->middleware(['auth', 'verified', 'role:1'])
    ->name('super-admin.')
    ->controller(SuperAdminController::class)
    ->group(function () {
        Route::get('/dashboard', 'dashboard')->name('dashboard');
        Route::get('/dashboard/data', 'dashboardData')->name('dashboard.data');

        Route::get('/bookings', 'bookingsIndex')->name('bookings.index');
        Route::patch('/bookings/{bookingId}/approve', 'approveBooking')->name('bookings.approve');

        Route::get('/staff', 'staffIndex')->name('staff.index');
        Route::post('/staff', 'storeStaff')->name('staff.store');
        Route::patch('/staff/{userId}', 'updateStaff')->name('staff.update');
        Route::patch('/staff/{userId}/archive', 'archiveStaff')->name('staff.archive');
        Route::patch('/staff/{userId}/restore', 'restoreStaff')->name('staff.restore');

        Route::get('/inventory-items', 'inventoryIndex')->name('inventory.index');
        Route::post('/inventory-items', 'storeInventoryItem')->name('inventory.store');
        Route::patch('/inventory-items/{itemId}', 'updateInventoryItem')->name('inventory.update');
        Route::delete('/inventory-items/{itemId}', 'destroyInventoryItem')->name('inventory.destroy');

        Route::get('/ac-units', 'acUnitsIndex')->name('ac-units.index');
        Route::post('/ac-units', 'storeAcUnit')->name('ac-units.store');
        Route::patch('/ac-units/{acUnitId}', 'updateAcUnit')->name('ac-units.update');
        Route::delete('/ac-units/{acUnitId}', 'destroyAcUnit')->name('ac-units.destroy');

        Route::get('/sales-records', 'salesRecordsIndex')->name('sales-records.index');

        Route::get('/documents', 'documentsIndex')->name('documents.index');
        Route::post('/documents', 'storeDocument')->name('documents.store');
        Route::patch('/documents/{docId}', 'updateDocument')->name('documents.update');
        Route::delete('/documents/{docId}', 'destroyDocument')->name('documents.destroy');

        Route::get('/announcements', 'announcementsIndex')->name('announcements.index');
        Route::post('/announcements', 'storeAnnouncement')->name('announcements.store');
        Route::patch('/announcements/{announcementId}', 'updateAnnouncement')->name('announcements.update');
        Route::delete('/announcements/{announcementId}', 'destroyAnnouncement')->name('announcements.destroy');

        Route::get('/activity-logs', 'activityLogsIndex')->name('activity-logs.index');
    });

Route::get('/manager/dashboard', function () {
    return Inertia::render('ManagerDashboard');
})->middleware(['auth', 'verified', 'role:2'])->name('manager.dashboard');

Route::get('/admin-assistant/dashboard', function () {
    return Inertia::render('AdminAssistantDashboard');
})->middleware(['auth', 'verified', 'role:3'])->name('admin-assistant.dashboard');

Route::get('/tools-man/dashboard', function () {
    return Inertia::render('ToolsManDashboard');
})->middleware(['auth', 'verified', 'role:4'])->name('tools-man.dashboard');

Route::get('/technician/dashboard', function () {
    return Inertia::render('TechnicianDashboard');
})->middleware(['auth', 'verified', 'role:5'])->name('technician.dashboard');

Route::get('/customer/dashboard', function () {
    return Inertia::render('CustomerDashboard');
})->middleware(['auth', 'verified', 'role:6'])->name('customer.dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';

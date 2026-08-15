<?php

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

Route::get('/super-admin/dashboard', function () {
    return Inertia::render('SuperAdminDashboard');
})->middleware(['auth', 'verified', 'role:1'])->name('super-admin.dashboard');

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

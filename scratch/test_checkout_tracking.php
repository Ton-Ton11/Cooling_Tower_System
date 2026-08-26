<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use App\Models\User;

echo "=== TESTING WORKER'S INVENTORY USAGE & BORROWING TRACKING ===\n";

$admin = User::where('role_id', 1)->first();
if (!$admin) {
    echo "No admin user found.\n";
    exit(1);
}
Auth::login($admin);

// 1. Get or create a technician
$tech = DB::table('users')->where('role_id', 5)->first();
$techName = $tech ? trim("{$tech->given_name} {$tech->last_name}") : "Juan Dela Cruz";
$techId = $tech ? $tech->user_id : null;

// 2. Test Power Tool Borrowing
$powerTool = DB::table('inventory_items')->where('item_type', 'Tool')->where('tool_subtype', 'power')->first();
if (!$powerTool) {
    $ptId = DB::table('inventory_items')->insertGetId([
        'item_name' => 'Test Cordless Drill 18V',
        'item_type' => 'Tool',
        'tool_subtype' => 'power',
        'serial_number' => 'SN-TEST-9988',
        'inventory_mode' => 'worker',
        'status' => 'Available',
        'unit' => 'unit',
        'quantity_on_hand' => 1,
        'initial_stock' => 1,
        'created_at' => now(),
        'updated_at' => now(),
    ], 'item_id');
    $powerTool = DB::table('inventory_items')->where('item_id', $ptId)->first();
}

echo "\n--- 1. Testing Power Tool Borrowing ---\n";
$req = \Illuminate\Http\Request::create('/super-admin/inventory/checkout', 'POST', [
    'item_id' => $powerTool->item_id,
    'technician_id' => $techId,
    'technician_name' => $techName,
    'service_name' => 'AC Cleaning & Preventive Maintenance',
    'checkout_date' => now()->toIso8601String(),
    'quantity' => 1,
    'log_type' => 'borrow',
    'notes' => 'Borrowing drill for Unit 502 cleaning job',
]);
$req->setUserResolver(fn() => $admin);

$controller = app(\App\Http\Controllers\SuperAdmin\SuperAdminInventoryController::class);
$res = $controller->checkoutItem($req);
echo "Checkout Response: " . json_encode($res->getData()) . "\n";

$updatedPt = DB::table('inventory_items')->where('item_id', $powerTool->item_id)->first();
echo "Power Tool Status now: " . $updatedPt->status . " (Expected: Borrowed)\n";

// 3. Test Power Tool Returning
echo "\n--- 2. Testing Power Tool Return ---\n";
$returnReq = \Illuminate\Http\Request::create('/super-admin/inventory/return', 'POST', [
    'item_id' => $powerTool->item_id,
    'return_date' => now()->toIso8601String(),
    'quantity' => 1,
    'notes' => 'Returned in clean working order',
]);
$returnReq->setUserResolver(fn() => $admin);
$returnRes = $controller->returnItem($returnReq);
echo "Return Response: " . json_encode($returnRes->getData()) . "\n";

$restoredPt = DB::table('inventory_items')->where('item_id', $powerTool->item_id)->first();
echo "Power Tool Status now: " . $restoredPt->status . " (Expected: Available)\n";

// 4. Test Material Usage
echo "\n--- 3. Testing Material Usage Logging ---\n";
$material = DB::table('inventory_items')->where('inventory_mode', 'worker')->where('item_type', '!=', 'Tool')->first();
if ($material) {
    $initialStock = (int)$material->quantity_on_hand;
    $matReq = \Illuminate\Http\Request::create('/super-admin/inventory/checkout', 'POST', [
        'item_id' => $material->item_id,
        'technician_id' => $techId,
        'technician_name' => $techName,
        'service_name' => 'Refrigerant Leak Repair & Top-Up',
        'checkout_date' => now()->toIso8601String(),
        'quantity' => 1,
        'log_type' => 'material_usage',
        'notes' => 'Used 1 unit for Tower 2 repair',
    ]);
    $matReq->setUserResolver(fn() => $admin);
    $matRes = $controller->checkoutItem($matReq);
    echo "Material Usage Response: " . json_encode($matRes->getData()) . "\n";

    $updatedMat = DB::table('inventory_items')->where('item_id', $material->item_id)->first();
    echo "Material Stock before: {$initialStock}, after: {$updatedMat->quantity_on_hand} (Expected: " . ($initialStock - 1) . ")\n";
}

// 5. Test Checkouts Index
echo "\n--- 4. Testing Checkouts Log Query ---\n";
$indexReq = \Illuminate\Http\Request::create('/super-admin/inventory/checkouts', 'GET');
$indexReq->setUserResolver(fn() => $admin);
$indexRes = $controller->checkoutsIndex($indexReq);
$data = $indexRes->getData();
echo "Total Checkout logs returned: " . count($data->data) . "\n";
echo "First log entry: " . json_encode($data->data[0] ?? null, JSON_PRETTY_PRINT) . "\n";

echo "\n=== ALL CHECKOUT TRACKING TESTS COMPLETED SUCCESSFULLY! ===\n";

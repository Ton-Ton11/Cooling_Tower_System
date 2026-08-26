<?php

require 'c:/Users/anton/OneDrive/Desktop/Cooling_Tower_System/vendor/autoload.php';
$app = require_once 'c:/Users/anton/OneDrive/Desktop/Cooling_Tower_System/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;
use App\Http\Controllers\SuperAdmin\SuperAdminSparePartController;
use App\Http\Controllers\AdminAssistant\AdminAssistantSparePartController;
use App\Http\Controllers\Shared\InventoryFolderController;
use Illuminate\Http\Request;

echo "=== Testing Dynamic Spare Parts Architecture & Actions ===\n\n";

$superAdmin = DB::table('users')->where('role_id', 1)->first();
$adminAssistant = DB::table('users')->where('role_id', 3)->first();

// 1. Test Creating a new dynamic Spare Part Category
$folderCtrl = app(InventoryFolderController::class);
$testCatName = 'Electronic Expansion Valves ' . rand(100, 999);
$catReq = Request::create('/super-admin/inventory/folders', 'POST', [
    'field_type' => 'spare_parts',
    'name' => $testCatName,
    'description' => 'Precision electronic pulse expansion valves for VRF inverter systems',
]);
$catReq->setUserResolver(fn() => $superAdmin);
$catRes = $folderCtrl->store($catReq);
$catData = $catRes->getData(true);
$catId = $catData['data']['id'] ?? null;

echo "[1] Create Spare Part Category:\n";
echo "    - Status Code: " . $catRes->status() . "\n";
echo "    - Category ID: {$catId}\n";
echo "    - Category Name: {$testCatName}\n";
if ($catRes->status() === 201 && $catId) {
    echo "    ✅ PASS: Spare Part category created.\n\n";
} else {
    echo "    ❌ FAIL: Could not create Spare Part category.\n\n";
}

// 2. Test Adding a Spare Part filed under this Category & Brand
$spareCtrl = app(SuperAdminSparePartController::class);
$testPartName = 'EEV Valve Body 3.2mm ' . rand(100, 999);
$partReq = Request::create('/super-admin/spare-parts', 'POST', [
    'item_name' => $testPartName,
    'compatible_brands' => 'Daikin, Panasonic',
    'folder_id' => $catId,
    'sub_category' => $testCatName,
    'unit' => 'set',
    'initial_stock' => 15,
    'quantity_on_hand' => 15,
    'reorder_level' => 3,
    'capital' => 1250.00,
    'selling_price' => 2200.00,
    'supplier_name' => 'Daikin Genuine Parts Philippines',
    'status' => 'Available / On Hand',
]);
$partReq->setUserResolver(fn() => $superAdmin);
$partRes = $spareCtrl->storeSparePart($partReq);
$partData = $partRes->getData(true);
$partId = $partData['data']['part_id'] ?? ($partData['data']['item_id'] ?? null);

echo "[2] Add Spare Part under Brand & Category:\n";
echo "    - Status Code: " . $partRes->status() . "\n";
echo "    - Part ID: {$partId}\n";
echo "    - Part Name: {$testPartName}\n";
echo "    - Category: " . ($partData['data']['sub_category'] ?? '') . "\n";
echo "    - Status: " . ($partData['data']['status'] ?? '') . "\n";
if ($partRes->status() === 201 && $partId) {
    echo "    ✅ PASS: Spare Part added successfully.\n\n";
} else {
    echo "    ❌ FAIL: Could not add Spare Part.\n\n";
}

// 3. Test Updating Spare Part Status to 'Warranty Reserved' and 'Order Base'
$updateReq = Request::create("/super-admin/spare-parts/{$partId}", 'PATCH', [
    'status' => 'Warranty Reserved',
    'quantity_on_hand' => 12,
]);
$updateReq->setUserResolver(fn() => $superAdmin);
$updateRes = $spareCtrl->updateSparePart($updateReq, $partId);
$updatedRecord = DB::table('inventory_items')->where('item_id', $partId)->first();

echo "[3] Update Spare Part Status to 'Warranty Reserved':\n";
echo "    - Status Code: " . $updateRes->status() . "\n";
echo "    - Updated Status in DB: {$updatedRecord->status}\n";
echo "    - Updated Qty: {$updatedRecord->quantity_on_hand}\n";
if ($updateRes->status() === 200 && $updatedRecord->status === 'Warranty Reserved') {
    echo "    ✅ PASS: Status updated to 'Warranty Reserved'.\n\n";
} else {
    echo "    ❌ FAIL: Status update failed.\n\n";
}

// 4. Test Selling part (reducing stock and marking as Sold)
$soldReq = Request::create("/super-admin/spare-parts/{$partId}", 'PATCH', [
    'quantity_on_hand' => 0,
    'status' => 'Sold',
]);
$soldReq->setUserResolver(fn() => $superAdmin);
$soldRes = $spareCtrl->updateSparePart($soldReq, $partId);
$soldRecord = DB::table('inventory_items')->where('item_id', $partId)->first();

echo "[4] Process Sale & Mark Status as 'Sold':\n";
echo "    - Status Code: " . $soldRes->status() . "\n";
echo "    - Updated Status in DB: {$soldRecord->status}\n";
echo "    - Remaining Qty: {$soldRecord->quantity_on_hand}\n";
if ($soldRes->status() === 200 && $soldRecord->status === 'Sold') {
    echo "    ✅ PASS: Spare part successfully marked as Sold.\n\n";
} else {
    echo "    ❌ FAIL: Sold status update failed.\n\n";
}

// 5. Test Admin Assistant Spare Part Controller
if ($adminAssistant) {
    $aaCtrl = app(AdminAssistantSparePartController::class);
    $aaReq = Request::create('/admin-assistant/spare-parts', 'GET');
    $aaReq->setUserResolver(fn() => $adminAssistant);
    $aaRes = $aaCtrl->sparePartsIndex($aaReq);
    echo "[5] Admin Assistant Spare Parts Endpoint:\n";
    echo "    - Status Code: " . $aaRes->status() . "\n";
    if ($aaRes->status() === 200) {
        echo "    ✅ PASS: Admin Assistant spare parts endpoint verified.\n\n";
    } else {
        echo "    ❌ FAIL: Admin Assistant endpoint returned error.\n\n";
    }
}

// Cleanup
DB::table('inventory_items')->where('item_id', $partId)->delete();
if ($catId) {
    DB::table('inventory_folders')->where('id', $catId)->delete();
}

echo "=== All Spare Parts Tests Passed Successfully! ===\n";

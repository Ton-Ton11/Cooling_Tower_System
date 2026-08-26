<?php

require_once __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;
use App\Models\User;
use Illuminate\Http\Request;
use App\Http\Controllers\SuperAdmin\SuperAdminInventoryController;
use App\Http\Controllers\SuperAdmin\SuperAdminSparePartController;
use App\Http\Controllers\ToolsMan\ToolsManInventoryController;

$superAdminUser = User::where('role_id', 1)->first();
if (!$superAdminUser) {
    echo "No super admin found!\n";
    exit(1);
}

echo "=== Testing Inventory & Spare Parts Sub-Category Persistence & Actions ===\n";

// 1. Create a Test Folder
$folderId = DB::table('inventory_folders')->insertGetId([
    'field_type' => 'materials',
    'name' => 'Auto-Test Subcategory ' . time(),
    'description' => 'Test Folder',
    'created_at' => now(),
    'updated_at' => now(),
]);

$folderName = DB::table('inventory_folders')->where('id', $folderId)->value('name');
echo "Created test folder: $folderName (ID: $folderId)\n";

// 2. Add item using SuperAdminInventoryController
$invController = app(SuperAdminInventoryController::class);

$req = Request::create('/super-admin/inventory-items', 'POST', [
    'item_name' => 'Test Pipe Fitting ' . time(),
    'item_type' => 'Material',
    'inventory_mode' => 'worker',
    'sub_category' => $folderName,
    'quantity_on_hand' => 25,
    'initial_stock' => 25,
    'reorder_level' => 5,
    'unit' => 'pcs',
]);
$req->setUserResolver(fn() => $superAdminUser);

$res = $invController->storeInventoryItem($req);
$data = json_decode($res->getContent(), true);
echo "Store inventory item result: " . $res->getStatusCode() . "\n";
echo "Item Folder ID: " . ($data['data']['folder_id'] ?? 'NULL') . ", Sub Category: " . ($data['data']['sub_category'] ?? 'NULL') . "\n";

assert(!empty($data['data']['folder_id']), "Folder ID must not be null!");
assert($data['data']['sub_category'] === $folderName, "Sub category must match folder name!");

// 3. Test Index Fetch
$indexReq = Request::create('/super-admin/inventory-items', 'GET');
$indexReq->setUserResolver(fn() => $superAdminUser);
$indexRes = $invController->inventoryIndex($indexReq);
$indexData = json_decode($indexRes->getContent(), true);

$foundItem = collect($indexData['data'])->firstWhere('item_id', $data['data']['item_id']);
echo "Found in Index: Folder ID: " . ($foundItem['folder_id'] ?? 'NULL') . ", Sub Category: " . ($foundItem['sub_category'] ?? 'NULL') . "\n";
assert(!empty($foundItem['folder_id']), "Index data must contain folder_id!");

// 4. Test Spare Part Store & Folder auto-resolve
$spFolderId = DB::table('inventory_folders')->insertGetId([
    'field_type' => 'spare_parts',
    'name' => 'Test Valves ' . time(),
    'description' => 'Test Valves',
    'created_at' => now(),
    'updated_at' => now(),
]);
$spFolderName = DB::table('inventory_folders')->where('id', $spFolderId)->value('name');

$spController = app(SuperAdminSparePartController::class);
$spReq = Request::create('/super-admin/spare-parts', 'POST', [
    'item_name' => 'Electronic Expansion Valve ' . time(),
    'compatible_brands' => ['Daikin', 'Carrier'],
    'sub_category' => $spFolderName,
    'quantity_on_hand' => 10,
    'initial_stock' => 10,
    'reorder_level' => 2,
    'unit' => 'unit',
    'capital' => 1200,
    'selling_price' => 1800,
]);
$spReq->setUserResolver(fn() => $superAdminUser);

$spRes = $spController->storeSparePart($spReq);
$spData = json_decode($spRes->getContent(), true);
echo "Store spare part result: " . $spRes->getStatusCode() . "\n";
echo "Spare part Folder ID: " . ($spData['data']['folder_id'] ?? 'NULL') . ", Sub Category: " . ($spData['data']['sub_category'] ?? 'NULL') . "\n";

assert(!empty($spData['data']['folder_id']), "Spare part folder_id must not be null!");
assert($spData['data']['sub_category'] === $spFolderName, "Spare part sub_category must match!");

// 5. Test Spare Part Index
$spIndexReq = Request::create('/super-admin/spare-parts', 'GET');
$spIndexReq->setUserResolver(fn() => $superAdminUser);
$spIndexRes = $spController->sparePartsIndex($spIndexReq);
$spIndexData = json_decode($spIndexRes->getContent(), true);

$foundSp = collect($spIndexData['data'])->firstWhere('item_id', $spData['data']['item_id']);
echo "Found in Spare Parts Index: Folder ID: " . ($foundSp['folder_id'] ?? 'NULL') . ", Sub Category: " . ($foundSp['sub_category'] ?? 'NULL') . "\n";
assert(!empty($foundSp['folder_id']), "Index data must contain folder_id!");

echo "\n>>> ALL PERSISTENCE AND SUB-CATEGORY TESTS PASSED SUCCESSFULLY! <<<\n";

<?php

require 'c:/Users/anton/OneDrive/Desktop/Cooling_Tower_System/vendor/autoload.php';
$app = require_once 'c:/Users/anton/OneDrive/Desktop/Cooling_Tower_System/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

echo "=== inventory_items Columns ===\n";
print_r(Schema::getColumnListing('inventory_items'));

echo "\n=== inventory_folders Columns ===\n";
print_r(Schema::getColumnListing('inventory_folders'));

echo "\n=== Existing Folders Count by field_type ===\n";
$folders = DB::table('inventory_folders')->select('field_type', DB::raw('count(*) as total'))->groupBy('field_type')->get();
foreach ($folders as $f) {
    echo "  {$f->field_type}: {$f->total}\n";
}

echo "\n=== Sample inventory_items ===\n";
$items = DB::table('inventory_items')->take(5)->get(['item_id', 'item_name', 'item_type', 'inventory_mode', 'folder_id', 'sub_category', 'status']);
print_r($items->toArray());

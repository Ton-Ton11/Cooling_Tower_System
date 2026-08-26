<?php
require_once __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

$techs = DB::table('users')->where('role_id', 5)->get(['user_id', 'given_name', 'last_name', 'email']);
dump("Technicians:", $techs);

$services = DB::table('services')->get(['service_id', 'service_name']);
dump("Services:", $services);

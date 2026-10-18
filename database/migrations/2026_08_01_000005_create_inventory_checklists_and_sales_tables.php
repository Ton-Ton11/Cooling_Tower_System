<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Creates all inventory, tool checklist, checkout, and inventory sales tables
     * (inventory_folders, inventory_items, ac_units_inventory, booking_materials,
     * tool_checklists, tool_checklist_items, tool_checkouts, inventory_sales).
     */
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();

        // 1. Inventory Folders (Sub-categories)
        if (! Schema::hasTable('inventory_folders')) {
            Schema::create('inventory_folders', function (Blueprint $table) {
                $table->increments('id');
                $table->string('field_type', 50)->comment('materials, power_tools, hand_tools, spare_parts, sale_items');
                $table->string('name', 100);
                $table->text('description')->nullable();
                $table->integer('display_order')->default(0);
                $table->unsignedInteger('created_by')->nullable();
                $table->timestamps();
            });
        }

        // Seed default inventory sub-categories if table is empty
        if (DB::table('inventory_folders')->count() === 0) {
            $defaultFolders = [
                // Worker Materials
                ['field_type' => 'materials', 'name' => 'Pipes & Copper Tubing', 'description' => 'Copper tubes, suction lines, capillary pipes, and fittings', 'display_order' => 1],
                ['field_type' => 'materials', 'name' => 'Refrigerants & Chemicals', 'description' => 'Freon gases, flushing agents, coil cleaners, and lubricants', 'display_order' => 2],
                ['field_type' => 'materials', 'name' => 'Insulation & Tapes', 'description' => 'Aeroflex insulation tubes, duct tapes, and vinyl wrap', 'display_order' => 3],
                ['field_type' => 'materials', 'name' => 'Electrical & Wiring', 'description' => 'Royal cords, THHN wires, terminals, and breakers', 'display_order' => 4],
                ['field_type' => 'materials', 'name' => 'Drainage & Fasteners', 'description' => 'PVC drain pipes, brackets, anchors, and screws', 'display_order' => 5],
                ['field_type' => 'materials', 'name' => 'General Materials', 'description' => 'General consumables and miscellaneous AC materials', 'display_order' => 6],

                // Power Tools
                ['field_type' => 'power_tools', 'name' => 'Vacuum Pumps & Recovery', 'description' => 'HVAC vacuum pumps and refrigerant recovery machines', 'display_order' => 1],
                ['field_type' => 'power_tools', 'name' => 'Pressure Washers & Cleaning', 'description' => 'High-pressure washers and chemical spray pumps', 'display_order' => 2],
                ['field_type' => 'power_tools', 'name' => 'Drills & Cordless Power Tools', 'description' => 'Hammer drills, impact drivers, and angle grinders', 'display_order' => 3],
                ['field_type' => 'power_tools', 'name' => 'Electronic Testing Equipment', 'description' => 'Digital clamp meters, manifold gauges, and leak detectors', 'display_order' => 4],
                ['field_type' => 'power_tools', 'name' => 'General Power Tools', 'description' => 'Miscellaneous powered equipment and heavy tools', 'display_order' => 5],

                // Hand Tools
                ['field_type' => 'hand_tools', 'name' => 'Flaring & Swaging Tools', 'description' => 'Eccentric flaring sets, expanders, and swaging punches', 'display_order' => 1],
                ['field_type' => 'hand_tools', 'name' => 'Wrenches & Pliers', 'description' => 'Adjustable wrenches, torque wrenches, and locking pliers', 'display_order' => 2],
                ['field_type' => 'hand_tools', 'name' => 'Cutters & Benders', 'description' => 'Tube cutters, deburrers, and spring pipe benders', 'display_order' => 3],
                ['field_type' => 'hand_tools', 'name' => 'Screwdrivers & Hex Keys', 'description' => 'Precision screwdrivers, magnetic drivers, and allen keys', 'display_order' => 4],
                ['field_type' => 'hand_tools', 'name' => 'General Hand Tools', 'description' => 'Measuring tapes, utility knives, and toolboxes', 'display_order' => 5],

                // Spare Parts
                ['field_type' => 'spare_parts', 'name' => 'Capacitors', 'description' => 'Running and starting capacitors for AC compressors and fans', 'display_order' => 1],
                ['field_type' => 'spare_parts', 'name' => 'Contactors & Relays', 'description' => 'Magnetic contactors, solid-state relays, and switch gear', 'display_order' => 2],
                ['field_type' => 'spare_parts', 'name' => 'Fan Motors', 'description' => 'Indoor blower motors, outdoor condenser fan motors, and fan blades', 'display_order' => 3],
                ['field_type' => 'spare_parts', 'name' => 'PCBs & Controls', 'description' => 'Main control boards, display panels, and inverter driver boards', 'display_order' => 4],
                ['field_type' => 'spare_parts', 'name' => 'Valves & Coils', 'description' => 'Expansion valves, solenoid valves, service valves, and reversing coils', 'display_order' => 5],
                ['field_type' => 'spare_parts', 'name' => 'Sensors & Thermistors', 'description' => 'Room temperature sensors, pipe thermistors, and pressure sensors', 'display_order' => 6],
                ['field_type' => 'spare_parts', 'name' => 'Filters & Driers', 'description' => 'Filter driers, air filters, strainers, and moisture indicators', 'display_order' => 7],
                ['field_type' => 'spare_parts', 'name' => 'Hardware & Accessories', 'description' => 'Drain pumps, vibration isolators, copper fittings, and bracket hardware', 'display_order' => 8],

                // Sale Items
                ['field_type' => 'sale_items', 'name' => 'Refrigerants', 'description' => 'For Aircon', 'display_order' => 1],
            ];

            foreach ($defaultFolders as $folder) {
                DB::table('inventory_folders')->insert(array_merge($folder, [
                    'created_at' => now(),
                    'updated_at' => now(),
                ]));
            }
        }

        // 2. Inventory Items
        if (! Schema::hasTable('inventory_items')) {
            Schema::create('inventory_items', function (Blueprint $table) {
                $table->integer('item_id')->autoIncrement();
                $table->string('item_name', 100);
                $table->enum('item_type', ['Tool', 'Material', 'Spare Part']);
                $table->string('inventory_mode')->default('worker')->comment('worker or sale');
                $table->string('tool_subtype')->nullable()->comment('power or hand (only for tools)');
                $table->unsignedInteger('folder_id')->nullable();
                $table->string('sub_category', 100)->nullable();
                $table->text('compatible_brands')->nullable()->comment('Compatible AC brands for spare parts');
                $table->string('serial_number')->nullable()->unique()->comment('Serial number for power tools');
                $table->integer('quantity_on_hand')->default(0);
                $table->integer('initial_stock')->nullable()->comment('Total stock count for reference');
                $table->integer('reorder_level')->default(5);
                $table->string('unit', 20);
                $table->decimal('capital', 12, 2)->default(0.00)->comment('Cost price for sale items');
                $table->decimal('profit', 12, 2)->default(0.00)->comment('Profit margin for sale items');
                $table->decimal('selling_price', 12, 2)->nullable()->comment('Selling price for spare parts and items for sale');
                $table->string('supplier_name')->nullable()->comment('Supplier for sale items');
                $table->string('managed_by', 150)->nullable();
                $table->boolean('is_archived')->default(false);
                $table->timestamp('archived_at')->nullable();
                $table->string('status')->default('Available')->comment('Available, Borrowed, Lost/Damaged');
                $table->timestamp('last_updated')->useCurrent()->useCurrentOnUpdate();
                $table->timestamp('created_at')->nullable()->comment('When the item was created');
            });
        }

        // 3. AC Units Inventory
        if (! Schema::hasTable('ac_units_inventory')) {
            Schema::create('ac_units_inventory', function (Blueprint $table) {
                $table->integer('ac_unit_id')->autoIncrement();
                $table->string('brand', 100);
                $table->string('model', 100);
                $table->string('serial_number', 100)->unique();
                $table->decimal('horsepower', 3, 1);
                $table->string('ac_type', 100);
                $table->string('refrigerant_type', 20)->nullable();
                $table->string('supplier', 150)->nullable();
                $table->decimal('purchase_price', 10, 2);
                $table->decimal('selling_price', 10, 2)->nullable();
                $table->date('purchase_date');
                $table->integer('warranty_period');
                $table->string('status', 50)->default('Available');
                $table->date('expected_arrival')->nullable();
                $table->timestamps();
            });
        }

        // 4. Booking Materials
        if (! Schema::hasTable('booking_materials')) {
            Schema::create('booking_materials', function (Blueprint $table) {
                $table->integer('usage_id')->autoIncrement();
                $table->integer('booking_id');
                $table->integer('item_id');
                $table->integer('quantity_used');
                $table->timestamp('logged_at')->useCurrent();

                $table->foreign('booking_id')->references('booking_id')->on('bookings')->onDelete('cascade');
                $table->foreign('item_id')->references('item_id')->on('inventory_items')->onDelete('cascade');
            });
        }

        // 5. Tool Checklists
        if (! Schema::hasTable('tool_checklists')) {
            Schema::create('tool_checklists', function (Blueprint $table) {
                $table->integer('checklist_id')->autoIncrement();
                $table->integer('booking_id');
                $table->integer('technician_id');
                $table->integer('team_id')->nullable();
                $table->string('status', 50)->default('Pending');
                $table->text('notes')->nullable();
                $table->integer('approved_by')->nullable();
                $table->timestamp('approved_at')->nullable();
                $table->integer('completed_by')->nullable();
                $table->timestamp('completed_at')->nullable();
                $table->timestamps();

                $table->foreign('booking_id')->references('booking_id')->on('bookings')->onDelete('cascade');
                $table->foreign('technician_id')->references('user_id')->on('users')->onDelete('cascade');
                $table->foreign('team_id')->references('team_id')->on('technician_teams')->onDelete('set null');
                $table->foreign('approved_by')->references('user_id')->on('users')->onDelete('set null');
                $table->foreign('completed_by')->references('user_id')->on('users')->onDelete('set null');
            });
        }

        // 6. Tool Checklist Items
        if (! Schema::hasTable('tool_checklist_items')) {
            Schema::create('tool_checklist_items', function (Blueprint $table) {
                $table->integer('id')->autoIncrement();
                $table->integer('checklist_id');
                $table->integer('item_id');
                $table->string('item_type', 50)->default('Tool');
                $table->integer('quantity_requested')->default(1);
                $table->integer('quantity_approved')->default(1);
                $table->string('status', 50)->default('assigned');
                $table->text('notes')->nullable();
                $table->timestamps();

                $table->foreign('checklist_id')->references('checklist_id')->on('tool_checklists')->onDelete('cascade');
                $table->foreign('item_id')->references('item_id')->on('inventory_items')->onDelete('cascade');
            });
        }

        // 7. Tool Checkouts & Usage Logs
        if (! Schema::hasTable('tool_checkouts')) {
            Schema::create('tool_checkouts', function (Blueprint $table) {
                $table->integer('checkout_id')->autoIncrement();
                $table->integer('item_id');
                $table->string('item_name', 150)->nullable();
                $table->string('item_type', 50)->nullable()->default('Tool');
                $table->string('log_type', 50)->default('borrow');
                $table->integer('technician_id')->nullable();
                $table->string('technician_name', 150)->nullable();
                $table->string('service_name', 150)->nullable();
                $table->integer('booking_id')->nullable();
                $table->integer('quantity')->default(1);
                $table->dateTime('checkout_date')->useCurrent();
                $table->dateTime('return_date')->nullable();
                $table->string('status', 50)->default('Checked Out');
                $table->text('notes')->nullable();
                $table->timestamps();

                $table->foreign('item_id')->references('item_id')->on('inventory_items')->onDelete('cascade');
                $table->foreign('technician_id')->references('user_id')->on('users')->onDelete('cascade');
            });
        }

        // 8. Inventory Sales (Sold Tools & Materials, Sold AC Units, Sold Spare Parts)
        if (! Schema::hasTable('inventory_sales')) {
            Schema::create('inventory_sales', function (Blueprint $table) {
                $table->id('sale_id');
                $table->unsignedBigInteger('booking_id')->nullable()->index();
                $table->unsignedBigInteger('payment_id')->nullable()->index();
                $table->string('sale_type', 40)->default('tools_materials')->index();
                $table->unsignedBigInteger('item_id')->nullable()->index();
                $table->unsignedBigInteger('ac_unit_id')->nullable()->index();
                $table->string('item_name', 191);
                $table->string('brand', 100)->nullable();
                $table->string('model', 120)->nullable();
                $table->string('serial_number', 120)->nullable();
                $table->string('sub_category', 120)->nullable();
                $table->string('item_type', 100)->nullable();
                $table->string('horsepower', 50)->nullable();
                $table->integer('quantity')->default(1);
                $table->string('unit', 40)->default('unit');
                $table->decimal('cost_price', 12, 2)->default(0.00);
                $table->decimal('unit_price', 12, 2)->default(0.00);
                $table->decimal('total_amount', 12, 2)->default(0.00);
                $table->decimal('profit', 12, 2)->default(0.00);
                $table->string('payment_method', 50)->default('Cash');
                $table->string('payment_status', 30)->default('Paid');
                $table->unsignedBigInteger('client_id')->nullable()->index();
                $table->string('customer_name', 150)->nullable();
                $table->string('customer_contact', 80)->nullable();
                $table->string('customer_address', 255)->nullable();
                $table->integer('warranty_period')->nullable()->default(12);
                $table->unsignedBigInteger('sold_by')->nullable();
                $table->string('sold_by_name', 150)->nullable();
                $table->text('notes')->nullable();
                $table->timestamp('sold_at')->nullable();
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

        Schema::dropIfExists('inventory_sales');
        Schema::dropIfExists('tool_checkouts');
        Schema::dropIfExists('tool_checklist_items');
        Schema::dropIfExists('tool_checklists');
        Schema::dropIfExists('booking_materials');
        Schema::dropIfExists('ac_units_inventory');
        Schema::dropIfExists('inventory_items');
        Schema::dropIfExists('inventory_folders');

        Schema::enableForeignKeyConstraints();
    }
};

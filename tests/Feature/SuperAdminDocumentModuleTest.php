<?php

namespace Tests\Feature;

use App\Models\Document;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SuperAdminDocumentModuleTest extends TestCase
{
    /** @var array<int> */
    protected array $createdDocIds = [];

    /** @var array<int> */
    protected array $createdUserIds = [];

    protected function setUp(): void
    {
        parent::setUp();
    }

    protected function tearDown(): void
    {
        if (! empty($this->createdDocIds)) {
            DB::table('document_items')->whereIn('document_id', $this->createdDocIds)->delete();
            DB::table('documents')->whereIn('doc_id', $this->createdDocIds)->delete();
        }
        if (! empty($this->createdUserIds)) {
            DB::table('users')->whereIn('user_id', $this->createdUserIds)->delete();
        }
        parent::tearDown();
    }

    public function test_super_admin_can_create_edit_pdf_print_and_delete_quotation_and_statement_of_account(): void
    {
        $superAdmin = User::factory()->create([
            'role_id' => 1,
            'given_name' => 'Georgita',
            'middle_name' => 'K.',
            'last_name' => 'Apostol',
            'is_active' => true,
        ]);
        $this->createdUserIds[] = $superAdmin->user_id;

        // 1. Create a Quotation Form with 4 items and 12% VAT inclusive (matching client PDF math)
        $quotationPayload = [
            'document_type' => Document::TYPE_QUOTATION,
            'document_number' => 'QU-100',
            'client_name' => 'Acme Logistics Corp',
            'client_address' => 'Cagayan de Oro City',
            'subject' => 'QUOTATION FOR GENERAL CLEANING AIRCON UNITS',
            'issue_date' => '2026-11-25',
            'expiry_date' => '2026-11-30',
            'tax_mode' => 'inclusive',
            'inclusions' => "General Cleaning using Pressurized Power Wash\nApplying grease oil",
            'exclusions' => 'Repair or replace of defective parts',
            'workmanship' => '30 days.',
            'payment_terms' => 'Upon Completion',
            'prepared_by_name' => 'Juan Dela Cruz Mercado',
            'prepared_by_title' => 'Admin Assistant',
            'approved_by_name' => 'Georgita K. Apostol',
            'approved_by_title' => 'Store Manager/Owner',
            'items' => [
                [
                    'description' => 'GENERAL CLEANING FLOOR MOUNTED TYPE AIRCON',
                    'quantity' => 5,
                    'unit_price' => 1500,
                    'discount' => 0,
                    'tax_rate' => 12,
                ],
                [
                    'description' => 'GENERAL CLEANING WALL MOUNTED SPLIT TYPE AIRCON',
                    'quantity' => 3,
                    'unit_price' => 1200,
                    'discount' => 0,
                    'tax_rate' => 12,
                ],
                [
                    'description' => 'GENERAL CLEANING WINDOW TYPE AIRCON',
                    'quantity' => 12,
                    'unit_price' => 600,
                    'discount' => 0,
                    'tax_rate' => 12,
                ],
                [
                    'description' => 'MOBILIZATION AND DEMOBILIZATION',
                    'quantity' => 1,
                    'unit_price' => 2000,
                    'discount' => 0,
                    'tax_rate' => 12,
                ],
            ],
        ];

        $createQuotResp = $this->actingAs($superAdmin)
            ->postJson('/super-admin/documents', $quotationPayload)
            ->assertCreated();

        $quotId = $createQuotResp->json('data.doc_id');
        $this->assertEquals('QU-100', $createQuotResp->json('data.document_number'));
        $this->assertEquals(20300.00, $createQuotResp->json('data.subtotal'));
        $this->assertEquals(18125.00, $createQuotResp->json('data.vatable_amount'));
        $this->assertEquals(2175.00, $createQuotResp->json('data.tax_total'));
        $this->assertEquals(20300.00, $createQuotResp->json('data.grand_total'));
        $this->assertCount(4, $createQuotResp->json('data.items'));

        // 2. Create a Statement of Account with discount and zero/blank tax (matching client SOA PDF math)
        $soaPayload = [
            'document_type' => Document::TYPE_STATEMENT,
            'document_number' => 'SOA-200',
            'client_name' => 'Grand Regency Hotel',
            'attention_to' => 'ATTENTION MARK',
            'client_address' => 'PASONANCA, ZAMBOANGA CITY',
            'issue_date' => '2026-11-14',
            'due_date' => '2026-11-30',
            'items' => [
                [
                    'description' => 'LABOR FOR SYSTEM REPROCESS 30TR ACU',
                    'quantity' => 1,
                    'unit_price' => 30000,
                    'discount' => 10000,
                    'tax_rate' => 0,
                ],
                [
                    'description' => 'CONSUMABLES (EX. REFRIGERANT, NITROGEN GAS, OXY ACCY, AND ETC.) LOT',
                    'quantity' => 1,
                    'unit_price' => 40000,
                    'discount' => null,
                    'tax_rate' => null,
                ],
            ],
        ];

        $createSoaResp = $this->actingAs($superAdmin)
            ->postJson('/super-admin/documents', $soaPayload)
            ->assertCreated();

        $soaId = $createSoaResp->json('data.doc_id');
        $this->createdDocIds[] = $soaId;
        $this->assertEquals('SOA-200', $createSoaResp->json('data.document_number'));
        $this->assertEquals(60000.00, $createSoaResp->json('data.subtotal'));
        $this->assertEquals(10000.00, $createSoaResp->json('data.discount_total'));
        $this->assertEquals(60000.00, $createSoaResp->json('data.grand_total'));
        $this->assertCount(2, $createSoaResp->json('data.items'));

        // 3. Edit the Statement of Account: add a 3rd item and modify existing item
        $soaPayload['items'][] = [
            'description' => 'ADDITIONAL COPPER PIPING AND INSULATION',
            'quantity' => 2.5,
            'unit_price' => 2000,
            'discount' => 500,
            'tax_rate' => 0,
        ];

        $updateSoaResp = $this->actingAs($superAdmin)
            ->putJson("/super-admin/documents/{$soaId}", $soaPayload)
            ->assertOk();

        $this->assertEquals(64500.00, $updateSoaResp->json('data.grand_total'));
        $this->assertCount(3, $updateSoaResp->json('data.items'));

        // 4. Test Print & PDF Download endpoints for both Quotation and Statement of Account
        $this->actingAs($superAdmin)
            ->get("/super-admin/documents/{$quotId}/print")
            ->assertOk()
            ->assertSee('QUOTATION')
            ->assertSee('Acme Logistics Corp');

        $this->actingAs($superAdmin)
            ->get("/super-admin/documents/{$soaId}/print")
            ->assertOk()
            ->assertSee('STATEMENT OF ACCOUNT')
            ->assertSee('Grand Regency Hotel');

        $pdfQuot = $this->actingAs($superAdmin)
            ->get("/super-admin/documents/{$quotId}/pdf")
            ->assertOk();
        $this->assertStringContainsString('application/pdf', $pdfQuot->headers->get('content-type'));

        $pdfSoa = $this->actingAs($superAdmin)
            ->get("/super-admin/documents/{$soaId}/pdf")
            ->assertOk();
        $this->assertStringContainsString('application/pdf', $pdfSoa->headers->get('content-type'));

        // 5. Delete Document and verify cascade delete of items
        $this->actingAs($superAdmin)
            ->deleteJson("/super-admin/documents/{$quotId}")
            ->assertOk();

        $this->assertDatabaseMissing('documents', ['doc_id' => $quotId]);
        $this->assertDatabaseMissing('document_items', ['document_id' => $quotId]);
    }

    public function test_manager_and_admin_assistant_can_access_documents_with_auto_signatories_and_customer_lookup(): void
    {
        $manager = User::factory()->create([
            'role_id' => 2,
            'given_name' => 'Elena',
            'middle_name' => 'R.',
            'last_name' => 'Santos',
            'is_active' => true,
        ]);
        $adminAssistant = User::factory()->create([
            'role_id' => 3,
            'given_name' => 'Carlo',
            'middle_name' => 'M.',
            'last_name' => 'Reyes',
            'is_active' => true,
        ]);
        $individualCustomer = User::factory()->create([
            'role_id' => 6,
            'account_type' => 'individual',
            'given_name' => 'Marco',
            'middle_name' => null,
            'last_name' => 'Villanueva',
            'address' => '123 Tetuan Highway, Zamboanga City',
            'is_active' => true,
        ]);
        $businessCustomer = User::factory()->create([
            'role_id' => 6,
            'account_type' => 'business',
            'company_name' => 'Zamboanga Grand Hotel Corp',
            'given_name' => 'Patricia',
            'middle_name' => null,
            'last_name' => 'Lim',
            'address' => 'Pasonanca Road, Zamboanga City',
            'is_active' => true,
        ]);

        $this->createdUserIds[] = $manager->user_id;
        $this->createdUserIds[] = $adminAssistant->user_id;
        $this->createdUserIds[] = $individualCustomer->user_id;
        $this->createdUserIds[] = $businessCustomer->user_id;

        // 1. Manager can fetch Documents / Forms dashboard data & signatories
        $mgrIndex = $this->actingAs($manager)
            ->getJson('/manager/documents')
            ->assertOk()
            ->assertJsonPath('signatories.approved_by_title', 'Store Manager/Owner')
            ->assertJsonPath('signatories.current_user.name', 'Elena R. Santos')
            ->assertJsonPath('signatories.current_user.title', 'Manager');

        // 2. Customer search supports individual & business customers with addresses
        $this->actingAs($manager)
            ->getJson('/manager/documents/customers?q=Zamboanga')
            ->assertOk()
            ->assertJsonFragment([
                'display_name' => 'Zamboanga Grand Hotel Corp',
                'account_type' => 'business',
                'address' => 'Pasonanca Road, Zamboanga City',
            ]);

        $this->actingAs($adminAssistant)
            ->getJson('/admin-assistant/documents/customers?q=Marco')
            ->assertOk()
            ->assertJsonFragment([
                'display_name' => 'Marco Villanueva',
                'account_type' => 'individual',
                'address' => '123 Tetuan Highway, Zamboanga City',
            ]);

        // 3. Manager creates Quotation -> Prepared By auto-set to Manager, Approved By set to Owner
        $mgrQuoteResp = $this->actingAs($manager)
            ->postJson('/manager/documents', [
                'document_type' => Document::TYPE_QUOTATION,
                'document_number' => 'QU-TEST-MGR-01',
                'client_name' => 'Zamboanga Grand Hotel Corp',
                'client_address' => 'Pasonanca Road, Zamboanga City',
                'issue_date' => '2026-11-26',
                'items' => [
                    ['description' => 'General Cleaning Split Type', 'quantity' => 2, 'unit_price' => 1200],
                ],
            ])
            ->assertCreated();

        $mgrDocId = $mgrQuoteResp->json('data.doc_id');
        $this->createdDocIds[] = $mgrDocId;
        $this->assertEquals('Elena R. Santos', $mgrQuoteResp->json('data.prepared_by_name'));
        $this->assertEquals('Manager', $mgrQuoteResp->json('data.prepared_by_title'));
        $this->assertEquals('Store Manager/Owner', $mgrQuoteResp->json('data.approved_by_title'));

        // 4. Admin Assistant edits the document as SOA -> Prepared By auto-updates to Admin Assistant
        $aaUpdateResp = $this->actingAs($adminAssistant)
            ->putJson("/admin-assistant/documents/{$mgrDocId}", [
                'document_type' => Document::TYPE_STATEMENT,
                'document_number' => 'SOA-TEST-AA-01',
                'client_name' => 'Marco Villanueva',
                'client_address' => '123 Tetuan Highway, Zamboanga City',
                'issue_date' => '2026-11-26',
                'items' => [
                    ['description' => 'Preventive Maintenance Service', 'quantity' => 1, 'unit_price' => 2500],
                ],
            ])
            ->assertOk();

        $this->assertEquals('Carlo M. Reyes', $aaUpdateResp->json('data.prepared_by_name'));
        $this->assertEquals('Admin Assistant', $aaUpdateResp->json('data.prepared_by_title'));
        $this->assertEquals('Store Manager/Owner', $aaUpdateResp->json('data.approved_by_title'));

        // 5. Manager & Admin Assistant print views use role-specific PDF links and PDF downloads succeed
        $this->actingAs($manager)
            ->get("/manager/documents/{$mgrDocId}/print")
            ->assertOk()
            ->assertSee("/manager/documents/{$mgrDocId}/pdf");

        $this->actingAs($adminAssistant)
            ->get("/admin-assistant/documents/{$mgrDocId}/print")
            ->assertOk()
            ->assertSee("/admin-assistant/documents/{$mgrDocId}/pdf");

        $this->actingAs($adminAssistant)
            ->get("/admin-assistant/documents/{$mgrDocId}/pdf")
            ->assertOk();

        // 6. Unauthorized roles (Customer / Technician) are forbidden from document endpoints
        $this->actingAs($individualCustomer)
            ->getJson('/manager/documents')
            ->assertForbidden();
        $this->actingAs($individualCustomer)
            ->getJson('/admin-assistant/documents')
            ->assertForbidden();

        // 7. Super Admin sees Owner ("Georgita K. Apostol") and Manager/Admin Assistant options
        $superAdmin = User::factory()->create([
            'role_id' => 1,
            'given_name' => 'Georgita',
            'middle_name' => 'K.',
            'last_name' => 'Apostol',
            'is_active' => true,
        ]);
        $this->createdUserIds[] = $superAdmin->user_id;

        $this->actingAs($superAdmin)
            ->getJson('/super-admin/documents')
            ->assertOk()
            ->assertJsonPath('signatories.approved_by_name', 'Georgita K. Apostol')
            ->assertJsonPath('signatories.approved_by_title', 'Store Manager/Owner')
            ->assertJsonFragment(['name' => 'Elena R. Santos', 'title' => 'Manager'])
            ->assertJsonFragment(['name' => 'Carlo M. Reyes', 'title' => 'Admin Assistant']);
    }
}

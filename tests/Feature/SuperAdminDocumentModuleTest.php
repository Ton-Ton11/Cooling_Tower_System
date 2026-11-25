<?php

namespace Tests\Feature;

use App\Models\Document;
use App\Models\Role;
use App\Models\User;
use Tests\TestCase;

class SuperAdminDocumentModuleTest extends TestCase
{

    protected function setUp(): void
    {
        parent::setUp();
    }

    public function test_super_admin_can_create_edit_pdf_print_and_delete_quotation_and_statement_of_account(): void
    {
        $superAdmin = User::factory()->create([
            'role_id' => 1,
            'is_active' => true,
        ]);

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
            'prepared_by_name' => 'Jeffrey D. Julian',
            'prepared_by_title' => 'Admin Assistant',
            'approved_by_name' => 'Georgita K. apostol',
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
}

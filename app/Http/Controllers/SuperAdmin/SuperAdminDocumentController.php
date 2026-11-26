<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Models\Document;
use App\Models\DocumentItem;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;

class SuperAdminDocumentController extends SuperAdminBaseController
{
    public const ALLOWED_TYPES = [
        Document::TYPE_QUOTATION,
        Document::TYPE_STATEMENT,
    ];

    /**
     * Authorize Super Admin (1), Manager (2), and Admin Assistant (3) for Document / Form operations.
     */
    protected function authorizeDocumentAccess(Request $request): void
    {
        abort_unless(
            $request->user() && in_array((int) $request->user()->role_id, [1, 2, 3], true),
            403
        );
    }

    /**
     * Resolve document signatory metadata and selectable Manager / Admin Assistant options.
     */
    protected function resolveDocumentSignatories(Request $request): array
    {
        $superAdmin = DB::table('users')
            ->where('role_id', 1)
            ->orderByRaw('CASE WHEN COALESCE(is_active, 1) = 1 THEN 0 ELSE 1 END')
            ->orderBy('user_id')
            ->first(['user_id', 'given_name', 'middle_name', 'last_name']);

        $ownerName = 'Georgita K. Apostol';
        if ($superAdmin) {
            $formatted = $this->formatName(
                $superAdmin->given_name,
                $superAdmin->middle_name,
                $superAdmin->last_name
            );
            if ($formatted !== '' && strcasecmp($formatted, 'Super Admin User') !== 0) {
                $ownerName = $formatted;
            }
        }

        $preparers = DB::table('users')
            ->leftJoin('roles', 'roles.role_id', '=', 'users.role_id')
            ->whereIn('users.role_id', [2, 3])
            ->where(function ($q) {
                $q->whereNull('users.is_active')->orWhere('users.is_active', 1);
            })
            ->orderBy('users.role_id')
            ->orderBy('users.last_name')
            ->orderBy('users.given_name')
            ->get([
                'users.user_id',
                'users.role_id',
                'users.given_name',
                'users.middle_name',
                'users.last_name',
                'roles.role_name',
            ])
            ->map(fn ($u) => [
                'user_id' => (int) $u->user_id,
                'role_id' => (int) $u->role_id,
                'name' => $this->formatName($u->given_name, $u->middle_name, $u->last_name),
                'title' => (int) $u->role_id === 2 ? 'Manager' : ($u->role_name ?: 'Admin Assistant'),
            ])
            ->values()
            ->all();

        $authUser = $request->user();
        $authRoleId = (int) ($authUser?->role_id ?? 1);
        $authName = $authUser
            ? $this->formatName($authUser->given_name, $authUser->middle_name, $authUser->last_name)
            : '';

        if ($authRoleId === 1 && ($authName === '' || strcasecmp($authName, 'Super Admin User') === 0)) {
            $authName = $ownerName;
        }

        $authTitle = match ($authRoleId) {
            1 => 'Store Manager/Owner',
            2 => 'Manager',
            3 => 'Admin Assistant',
            default => 'Staff',
        };

        return [
            'approved_by_name' => $ownerName,
            'approved_by_title' => 'Store Manager/Owner',
            'current_user' => [
                'user_id' => $authUser ? (int) $authUser->user_id : null,
                'role_id' => $authRoleId,
                'name' => $authName,
                'title' => $authTitle,
            ],
            'prepared_by_options' => $preparers,
        ];
    }

    /**
     * Query active individual and business customers for document client lookup.
     */
    protected function queryCustomersForDocuments(string $search = '', ?string $accountType = null, int $limit = 100): array
    {
        $hasAccountType = Schema::hasColumn('users', 'account_type');
        $hasCompanyName = Schema::hasColumn('users', 'company_name');
        $hasRepRole = Schema::hasColumn('users', 'representative_role');

        $columns = ['user_id', 'given_name', 'middle_name', 'last_name', 'address', 'contact_number', 'email'];
        if ($hasAccountType) {
            $columns[] = 'account_type';
        }
        if ($hasCompanyName) {
            $columns[] = 'company_name';
        }
        if ($hasRepRole) {
            $columns[] = 'representative_role';
        }

        $query = DB::table('users')
            ->where('role_id', 6)
            ->where(function ($q) {
                $q->whereNull('is_active')->orWhere('is_active', 1);
            });

        if ($hasAccountType && in_array($accountType, ['individual', 'business'], true)) {
            if ($accountType === 'business') {
                $query->where('account_type', 'business');
            } else {
                $query->where(function ($q) {
                    $q->whereNull('account_type')->orWhere('account_type', '!=', 'business');
                });
            }
        }

        $trimmed = trim($search);
        if ($trimmed !== '') {
            $tokens = array_values(array_filter(preg_split('/\s+/', $trimmed) ?: []));
            foreach ($tokens as $word) {
                $like = "%{$word}%";
                $query->where(function ($sub) use ($like, $hasCompanyName) {
                    $sub->where('given_name', 'like', $like)
                        ->orWhere('middle_name', 'like', $like)
                        ->orWhere('last_name', 'like', $like)
                        ->orWhere('email', 'like', $like)
                        ->orWhere('contact_number', 'like', $like)
                        ->orWhere('address', 'like', $like);
                    if ($hasCompanyName) {
                        $sub->orWhere('company_name', 'like', $like);
                    }
                });
            }
        }

        if ($hasCompanyName) {
            $query->orderByRaw("CASE WHEN COALESCE(company_name, '') != '' THEN 0 ELSE 1 END");
            $query->orderBy('company_name');
        }

        return $query->orderBy('given_name')
            ->orderBy('last_name')
            ->limit($limit)
            ->get($columns)
            ->map(function ($u) use ($hasAccountType, $hasCompanyName, $hasRepRole) {
                $fullName = $this->formatName($u->given_name, $u->middle_name, $u->last_name);
                $isBusiness = $hasAccountType && strtolower((string) ($u->account_type ?? 'individual')) === 'business';
                $companyName = $hasCompanyName ? trim((string) ($u->company_name ?? '')) : '';
                $displayName = ($isBusiness && $companyName !== '') ? $companyName : $fullName;

                return [
                    'user_id' => (int) $u->user_id,
                    'account_type' => $isBusiness ? 'business' : 'individual',
                    'account_type_label' => $isBusiness ? 'Business' : 'Individual',
                    'company_name' => $companyName !== '' ? $companyName : null,
                    'full_name' => $fullName,
                    'display_name' => $displayName,
                    'representative_role' => $hasRepRole ? ($u->representative_role ?? null) : null,
                    'address' => trim((string) ($u->address ?? '')),
                    'contact_number' => trim((string) ($u->contact_number ?? '')),
                    'email' => trim((string) ($u->email ?? '')),
                ];
            })
            ->values()
            ->all();
    }

    public function searchCustomers(Request $request): JsonResponse
    {
        $this->authorizeDocumentAccess($request);

        $q = trim((string) $request->query('q', ''));
        $accountType = strtolower(trim((string) $request->query('account_type', '')));
        $typeFilter = in_array($accountType, ['individual', 'business'], true) ? $accountType : null;

        return response()->json([
            'data' => $this->queryCustomersForDocuments($q, $typeFilter, 50),
        ]);
    }

    public function documentsIndex(Request $request): JsonResponse
    {
        $this->authorizeDocumentAccess($request);

        $query = $this->documentsBaseQuery();

        if ($request->filled('type') && in_array($request->query('type'), self::ALLOWED_TYPES, true)) {
            $query->where('documents.document_type', $request->query('type'));
        }

        if ($request->filled('search')) {
            $search = trim((string) $request->query('search'));
            $query->where(function ($q) use ($search) {
                $q->where('documents.document_number', 'like', "%{$search}%")
                    ->orWhere('documents.client_name', 'like', "%{$search}%")
                    ->orWhere('documents.client_address', 'like', "%{$search}%")
                    ->orWhere('documents.subject', 'like', "%{$search}%")
                    ->orWhere('documents.form_name', 'like', "%{$search}%");
            });
        }

        $documents = $this->mapDocuments(
            $query->orderByDesc('documents.created_at')
                ->orderByDesc('documents.doc_id')
                ->get()
        );

        return response()->json([
            'data' => $documents,
            'next_numbers' => [
                Document::TYPE_QUOTATION => $this->generateNextDocumentNumber(Document::TYPE_QUOTATION),
                Document::TYPE_STATEMENT => $this->generateNextDocumentNumber(Document::TYPE_STATEMENT),
            ],
            'signatories' => $this->resolveDocumentSignatories($request),
            'customers' => $this->queryCustomersForDocuments('', null, 100),
        ]);
    }

    public function nextDocumentNumber(Request $request): JsonResponse
    {
        $this->authorizeDocumentAccess($request);

        $type = $request->query('type', Document::TYPE_QUOTATION);
        if (! in_array($type, self::ALLOWED_TYPES, true)) {
            $type = Document::TYPE_QUOTATION;
        }

        return response()->json([
            'document_type' => $type,
            'document_number' => $this->generateNextDocumentNumber($type),
        ]);
    }

    public function showDocument(Request $request, int $docId): JsonResponse
    {
        $this->authorizeDocumentAccess($request);

        $doc = $this->mapDocuments(
            $this->documentsBaseQuery()->where('documents.doc_id', $docId)->get()
        )->first();

        if (! $doc) {
            abort(404, 'Document not found.');
        }

        return response()->json([
            'data' => $doc,
        ]);
    }

    public function storeDocument(Request $request): JsonResponse
    {
        $this->authorizeDocumentAccess($request);

        $payload = $this->normalizeDocumentPayload($request);
        $isLegacyRequest = ! isset($payload['document_type']) && ! isset($payload['items']);

        if ($isLegacyRequest) {
            $validated = validator($payload, [
                'form_name' => ['required', 'string', 'max:150'],
                'client_name' => ['required', 'string', 'max:150'],
                'service_name' => ['nullable', 'string', 'max:150'],
                'booking_id' => ['nullable', 'integer', Rule::exists('bookings', 'booking_id')],
                'status' => ['nullable', Rule::in(self::DOCUMENT_STATUSES)],
                'notes' => ['nullable', 'string'],
                'file_path' => ['nullable', 'string', 'max:255'],
            ])->validate();

            $docType = stripos($validated['form_name'], 'statement') !== false
                ? Document::TYPE_STATEMENT
                : Document::TYPE_QUOTATION;

            $docId = DB::table('documents')->insertGetId([
                'document_number' => $this->generateNextDocumentNumber($docType),
                'document_type' => $docType,
                'booking_id' => $validated['booking_id'] ?? null,
                'created_by' => (int) $request->user()->user_id,
                'form_name' => $validated['form_name'],
                'client_name' => $validated['client_name'],
                'service_name' => $validated['service_name'] ?? null,
                'issue_date' => now()->toDateString(),
                'status' => $validated['status'] ?? 'Draft',
                'notes' => $validated['notes'] ?? null,
                'file_path' => $validated['file_path'] ?? null,
                'created_at' => now(),
                'updated_at' => now(),
            ], 'doc_id');

            $this->logActivity(
                (int) $request->user()->user_id,
                'CREATE',
                sprintf('Created document "%s".', $validated['form_name'])
            );

            return response()->json([
                'message' => 'Document created successfully.',
                'data' => $this->mapDocuments($this->documentsBaseQuery()->where('documents.doc_id', $docId)->get())->first(),
            ], 201);
        }

        $validated = $this->validateDocumentPayload($payload);
        $signatories = $this->resolveDocumentSignatories($request);

        $docId = DB::transaction(function () use ($validated, $request, $signatories) {
            $docType = $validated['document_type'];
            $docNumber = ! empty($validated['document_number'])
                ? trim($validated['document_number'])
                : $this->generateNextDocumentNumber($docType);

            $calculations = $this->calculateDocumentTotals(
                $docType,
                $validated['items'],
                $validated['tax_mode'] ?? 'inclusive'
            );

            $formName = $docType === Document::TYPE_STATEMENT
                ? 'Statement of Account'
                : 'Quotation Form';

            $resolvedSignatures = $this->resolvePersistedSignatures($request, $validated, $signatories);

            $document = Document::create([
                'document_number' => $docNumber,
                'document_type' => $docType,
                'booking_id' => $validated['booking_id'] ?? null,
                'created_by' => (int) $request->user()->user_id,
                'form_name' => $formName,
                'client_name' => trim($validated['client_name']),
                'client_address' => isset($validated['client_address']) ? trim((string) $validated['client_address']) : null,
                'attention_to' => isset($validated['attention_to']) ? trim((string) $validated['attention_to']) : null,
                'subject' => isset($validated['subject']) ? trim((string) $validated['subject']) : null,
                'service_name' => $validated['subject'] ?? ($calculations['items'][0]['description'] ?? $formName),
                'issue_date' => $validated['issue_date'],
                'due_date' => $validated['due_date'] ?? null,
                'expiry_date' => $validated['expiry_date'] ?? null,
                'subtotal' => $calculations['subtotal'],
                'discount_total' => $calculations['discount_total'],
                'vatable_amount' => $calculations['vatable_amount'],
                'tax_rate' => $calculations['effective_tax_rate'],
                'tax_total' => $calculations['tax_total'],
                'grand_total' => $calculations['grand_total'],
                'inclusions' => $validated['inclusions'] ?? null,
                'exclusions' => $validated['exclusions'] ?? null,
                'workmanship' => $validated['workmanship'] ?? null,
                'payment_terms' => $validated['payment_terms'] ?? null,
                'additional_details' => array_merge($validated['additional_details'] ?? [], [
                    'tax_mode' => $validated['tax_mode'] ?? 'inclusive',
                ]),
                'prepared_by_name' => $resolvedSignatures['prepared_by_name'],
                'prepared_by_title' => $resolvedSignatures['prepared_by_title'],
                'approved_by_name' => $resolvedSignatures['approved_by_name'],
                'approved_by_title' => $resolvedSignatures['approved_by_title'],
                'received_by_name' => $validated['received_by_name'] ?? null,
                'received_date' => $validated['received_date'] ?? null,
                'status' => $validated['status'] ?? 'Finalized',
                'notes' => $validated['notes'] ?? null,
            ]);

            foreach ($calculations['items'] as $index => $item) {
                DocumentItem::create([
                    'document_id' => $document->doc_id,
                    'item_number' => $index + 1,
                    'description' => $item['description'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'discount' => $item['discount'],
                    'tax_rate' => $item['tax_rate'],
                    'amount' => $item['amount'],
                ]);
            }

            $this->logActivity(
                (int) $request->user()->user_id,
                'CREATE',
                sprintf('Created %s (%s) for "%s".', $formName, $docNumber, $document->client_name)
            );

            return $document->doc_id;
        });

        return response()->json([
            'message' => 'Document saved successfully.',
            'data' => $this->mapDocuments($this->documentsBaseQuery()->where('documents.doc_id', $docId)->get())->first(),
        ], 201);
    }

    public function updateDocument(Request $request, int $docId): JsonResponse
    {
        $this->authorizeDocumentAccess($request);

        $document = Document::find($docId);

        if (! $document) {
            abort(404, 'Document not found.');
        }

        $payload = $this->normalizeDocumentPayload($request);
        $isLegacyStatusOnly = ! isset($payload['items']) && ! isset($payload['document_type']);

        if ($isLegacyStatusOnly) {
            $validated = validator($payload, [
                'form_name' => ['sometimes', 'string', 'max:150'],
                'client_name' => ['sometimes', 'string', 'max:150'],
                'service_name' => ['nullable', 'string', 'max:150'],
                'booking_id' => ['nullable', 'integer', Rule::exists('bookings', 'booking_id')],
                'status' => ['sometimes', Rule::in(self::DOCUMENT_STATUSES)],
                'notes' => ['nullable', 'string'],
                'file_path' => ['nullable', 'string', 'max:255'],
            ])->validate();

            if ($validated !== []) {
                DB::table('documents')->where('doc_id', $docId)->update(array_merge($validated, [
                    'updated_at' => now(),
                ]));
            }

            $this->logActivity(
                (int) $request->user()->user_id,
                'UPDATE',
                sprintf('Updated document "%s".', $document->form_name)
            );

            return response()->json([
                'message' => 'Document updated successfully.',
                'data' => $this->mapDocuments($this->documentsBaseQuery()->where('documents.doc_id', $docId)->get())->first(),
            ]);
        }

        $payload['document_type'] = $payload['document_type'] ?? ($document->document_type ?: Document::TYPE_QUOTATION);
        $validated = $this->validateDocumentPayload($payload, $docId);
        $signatories = $this->resolveDocumentSignatories($request);

        DB::transaction(function () use ($document, $validated, $request, $signatories) {
            $docType = $validated['document_type'];
            $docNumber = ! empty($validated['document_number'])
                ? trim($validated['document_number'])
                : ($document->document_number ?: $this->generateNextDocumentNumber($docType));

            $calculations = $this->calculateDocumentTotals(
                $docType,
                $validated['items'],
                $validated['tax_mode'] ?? 'inclusive'
            );

            $formName = $docType === Document::TYPE_STATEMENT
                ? 'Statement of Account'
                : 'Quotation Form';

            $existingAdditional = is_array($document->additional_details) ? $document->additional_details : [];
            $resolvedSignatures = $this->resolvePersistedSignatures($request, $validated, $signatories);

            $document->update([
                'document_number' => $docNumber,
                'document_type' => $docType,
                'booking_id' => $validated['booking_id'] ?? $document->booking_id,
                'form_name' => $formName,
                'client_name' => trim($validated['client_name']),
                'client_address' => isset($validated['client_address']) ? trim((string) $validated['client_address']) : null,
                'attention_to' => isset($validated['attention_to']) ? trim((string) $validated['attention_to']) : null,
                'subject' => isset($validated['subject']) ? trim((string) $validated['subject']) : null,
                'service_name' => $validated['subject'] ?? ($calculations['items'][0]['description'] ?? $formName),
                'issue_date' => $validated['issue_date'],
                'due_date' => $validated['due_date'] ?? null,
                'expiry_date' => $validated['expiry_date'] ?? null,
                'subtotal' => $calculations['subtotal'],
                'discount_total' => $calculations['discount_total'],
                'vatable_amount' => $calculations['vatable_amount'],
                'tax_rate' => $calculations['effective_tax_rate'],
                'tax_total' => $calculations['tax_total'],
                'grand_total' => $calculations['grand_total'],
                'inclusions' => $validated['inclusions'] ?? null,
                'exclusions' => $validated['exclusions'] ?? null,
                'workmanship' => $validated['workmanship'] ?? null,
                'payment_terms' => $validated['payment_terms'] ?? null,
                'additional_details' => array_merge($existingAdditional, $validated['additional_details'] ?? [], [
                    'tax_mode' => $validated['tax_mode'] ?? 'inclusive',
                ]),
                'prepared_by_name' => $resolvedSignatures['prepared_by_name'],
                'prepared_by_title' => $resolvedSignatures['prepared_by_title'],
                'approved_by_name' => $resolvedSignatures['approved_by_name'],
                'approved_by_title' => $resolvedSignatures['approved_by_title'],
                'received_by_name' => $validated['received_by_name'] ?? null,
                'received_date' => $validated['received_date'] ?? null,
                'status' => $validated['status'] ?? $document->status ?? 'Finalized',
                'notes' => $validated['notes'] ?? null,
            ]);

            $document->items()->delete();

            foreach ($calculations['items'] as $index => $item) {
                DocumentItem::create([
                    'document_id' => $document->doc_id,
                    'item_number' => $index + 1,
                    'description' => $item['description'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'discount' => $item['discount'],
                    'tax_rate' => $item['tax_rate'],
                    'amount' => $item['amount'],
                ]);
            }

            $this->logActivity(
                (int) $request->user()->user_id,
                'UPDATE',
                sprintf('Updated %s (%s) for "%s".', $formName, $docNumber, $document->client_name)
            );
        });

        return response()->json([
            'message' => 'Document updated successfully.',
            'data' => $this->mapDocuments($this->documentsBaseQuery()->where('documents.doc_id', $docId)->get())->first(),
        ]);
    }

    public function destroyDocument(Request $request, int $docId): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        $document = DB::table('documents')->where('doc_id', $docId)->first();

        if (! $document) {
            abort(404);
        }

        DB::transaction(function () use ($docId) {
            if (Schema::hasTable('document_items')) {
                DB::table('document_items')->where('document_id', $docId)->delete();
            }
            DB::table('documents')->where('doc_id', $docId)->delete();
        });

        $this->logActivity(
            (int) $request->user()->user_id,
            'UPDATE',
            sprintf('Deleted document "%s" (%s).', $document->form_name, $document->document_number ?? "#{$docId}")
        );

        return response()->json(['message' => 'Document deleted successfully.']);
    }

    public function downloadPdf(Request $request, int $docId)
    {
        $this->authorizeDocumentAccess($request);

        $docData = $this->mapDocuments(
            $this->documentsBaseQuery()->where('documents.doc_id', $docId)->get()
        )->first();

        if (! $docData) {
            abort(404, 'Document not found.');
        }

        $viewName = $docData['document_type'] === Document::TYPE_STATEMENT
            ? 'documents.statement_of_account_pdf'
            : 'documents.quotation_pdf';

        $logoBase64 = $this->getCompanyLogoBase64();

        $pdf = Pdf::loadView($viewName, [
            'document' => $docData,
            'logoBase64' => $logoBase64,
            'isPrintMode' => false,
        ])->setPaper('a4', 'portrait');

        $safeDocNumber = preg_replace('/[^A-Za-z0-9\-_]/', '_', (string) $docData['document_number']);
        $prefix = $docData['document_type'] === Document::TYPE_STATEMENT ? 'Statement_of_Account' : 'Quotation';
        $filename = "{$prefix}_{$safeDocNumber}.pdf";

        if ($request->boolean('inline')) {
            return $pdf->stream($filename);
        }

        return $pdf->download($filename);
    }

    public function printDocument(Request $request, int $docId)
    {
        $this->authorizeDocumentAccess($request);

        $docData = $this->mapDocuments(
            $this->documentsBaseQuery()->where('documents.doc_id', $docId)->get()
        )->first();

        if (! $docData) {
            abort(404, 'Document not found.');
        }

        $viewName = $docData['document_type'] === Document::TYPE_STATEMENT
            ? 'documents.statement_of_account_pdf'
            : 'documents.quotation_pdf';

        $logoBase64 = $this->getCompanyLogoBase64();

        $routePrefix = match ((int) ($request->user()?->role_id ?? 1)) {
            2 => 'manager',
            3 => 'admin-assistant',
            default => 'super-admin',
        };
        $pdfDownloadUrl = route("{$routePrefix}.documents.pdf", ['docId' => $docId]);

        return view($viewName, [
            'document' => $docData,
            'logoBase64' => $logoBase64,
            'isPrintMode' => true,
            'pdfDownloadUrl' => $pdfDownloadUrl,
        ]);
    }

    /**
     * Resolve prepared_by and approved_by signature values based on acting role.
     * - Manager / Admin Assistant: Prepared By auto-set to the current user; Approved By set to Owner.
     * - Super Admin: Uses chosen preparer (Manager or Admin Assistant) or fallback; Approved By defaults to Owner.
     */
    protected function resolvePersistedSignatures(Request $request, array $validated, array $signatories): array
    {
        $authRoleId = (int) ($request->user()?->role_id ?? 1);
        $ownerName = $signatories['approved_by_name'] ?? 'Georgita K. Apostol';
        $ownerTitle = $signatories['approved_by_title'] ?? 'Store Manager/Owner';

        if (in_array($authRoleId, [2, 3], true)) {
            return [
                'prepared_by_name' => $signatories['current_user']['name'] ?: ($authRoleId === 2 ? 'Manager' : 'Admin Assistant'),
                'prepared_by_title' => $signatories['current_user']['title'] ?: ($authRoleId === 2 ? 'Manager' : 'Admin Assistant'),
                'approved_by_name' => $ownerName,
                'approved_by_title' => $ownerTitle,
            ];
        }

        $defaultPreparer = $signatories['prepared_by_options'][0] ?? [
            'name' => 'Juan Dela Cruz Mercado',
            'title' => 'Admin Assistant',
        ];

        $preparedByName = ! empty($validated['prepared_by_name'])
            ? trim((string) $validated['prepared_by_name'])
            : $defaultPreparer['name'];
        $preparedByTitle = ! empty($validated['prepared_by_title'])
            ? trim((string) $validated['prepared_by_title'])
            : $defaultPreparer['title'];

        return [
            'prepared_by_name' => $preparedByName,
            'prepared_by_title' => $preparedByTitle,
            'approved_by_name' => ! empty($validated['approved_by_name'])
                ? trim((string) $validated['approved_by_name'])
                : $ownerName,
            'approved_by_title' => ! empty($validated['approved_by_title'])
                ? trim((string) $validated['approved_by_title'])
                : $ownerTitle,
        ];
    }

    protected function validateDocumentPayload(array $payload, ?int $ignoreDocId = null): array
    {
        $uniqueRule = Rule::unique('documents', 'document_number');
        if ($ignoreDocId !== null) {
            $uniqueRule = $uniqueRule->ignore($ignoreDocId, 'doc_id');
        }

        return validator($payload, [
            'document_type' => ['required', 'string', Rule::in(self::ALLOWED_TYPES)],
            'document_number' => ['nullable', 'string', 'max:100', $uniqueRule],
            'booking_id' => ['nullable', 'integer', Rule::exists('bookings', 'booking_id')],
            'client_name' => ['required', 'string', 'max:150'],
            'client_address' => ['nullable', 'string', 'max:500'],
            'attention_to' => ['nullable', 'string', 'max:150'],
            'subject' => ['nullable', 'string', 'max:255'],
            'issue_date' => ['required', 'date'],
            'due_date' => ['nullable', 'date'],
            'expiry_date' => ['nullable', 'date'],
            'tax_mode' => ['nullable', 'string', Rule::in(['inclusive', 'exclusive'])],
            'inclusions' => ['nullable', 'string'],
            'exclusions' => ['nullable', 'string'],
            'workmanship' => ['nullable', 'string', 'max:500'],
            'payment_terms' => ['nullable', 'string', 'max:500'],
            'additional_details' => ['nullable', 'array'],
            'prepared_by_name' => ['nullable', 'string', 'max:150'],
            'prepared_by_title' => ['nullable', 'string', 'max:150'],
            'approved_by_name' => ['nullable', 'string', 'max:150'],
            'approved_by_title' => ['nullable', 'string', 'max:150'],
            'received_by_name' => ['nullable', 'string', 'max:150'],
            'received_date' => ['nullable', 'date'],
            'status' => ['nullable', Rule::in(self::DOCUMENT_STATUSES)],
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.description' => ['required', 'string', 'max:1000'],
            'items.*.quantity' => ['required', 'numeric', 'gt:0'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
            'items.*.discount' => ['nullable', 'numeric', 'min:0'],
            'items.*.tax_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
        ], [
            'client_name.required' => 'Client / Company Name is required.',
            'issue_date.required' => 'Document date / Issue date is required.',
            'items.required' => 'Please add at least one service or material item.',
            'items.min' => 'Please add at least one service or material item.',
            'items.*.description.required' => 'Each item must have an Item / Work Description.',
            'items.*.quantity.required' => 'Each item must have a valid quantity.',
            'items.*.quantity.gt' => 'Item quantity must be greater than zero.',
            'items.*.unit_price.required' => 'Each item must have a unit price.',
            'items.*.unit_price.min' => 'Item unit price cannot be negative.',
        ])->validate();
    }

    /**
     * Calculate line item amounts, subtotal, vatable amount, tax total, and grand total / amount due.
     * Supports zero/blank discounts and configurable per-item tax rates without double-counting VAT.
     */
    protected function calculateDocumentTotals(string $documentType, array $rawItems, string $taxMode = 'inclusive'): array
    {
        $processedItems = [];
        $subtotal = 0.0;
        $discountTotal = 0.0;
        $vatableAmount = 0.0;
        $taxTotal = 0.0;
        $nonTaxableAmount = 0.0;
        $highestTaxRate = 0.0;

        foreach (array_values($rawItems) as $index => $item) {
            $qty = round(max(0.0, (float) ($item['quantity'] ?? 1)), 2);
            $unitPrice = round(max(0.0, (float) ($item['unit_price'] ?? 0)), 2);
            $grossLine = round($qty * $unitPrice, 2);

            $rawDiscount = isset($item['discount']) && $item['discount'] !== '' && $item['discount'] !== null
                ? (float) $item['discount']
                : 0.0;
            $discount = round(min(max(0.0, $rawDiscount), $grossLine), 2);

            $rawTaxRate = isset($item['tax_rate']) && $item['tax_rate'] !== '' && $item['tax_rate'] !== null
                ? (float) $item['tax_rate']
                : 0.0;
            $taxRate = round(max(0.0, min(100.0, $rawTaxRate)), 2);

            $netLineAmount = round(max(0.0, $grossLine - $discount), 2);

            $subtotal = round($subtotal + $netLineAmount, 2);
            $discountTotal = round($discountTotal + $discount, 2);

            if ($taxRate > 0) {
                $highestTaxRate = max($highestTaxRate, $taxRate);
                if ($taxMode === 'exclusive') {
                    // Tax is added on top of the net line amount
                    $lineVatable = $netLineAmount;
                    $lineTax = round($netLineAmount * ($taxRate / 100.0), 2);
                } else {
                    // Philippine standard VAT-inclusive breakdown (as in client Quotation PDF:
                    // Sub-total 20,300 -> Vatable = 20,300 / 1.12 = 18,125.00, 12% VAT = 2,175.00, Grand Total = 20,300.00)
                    $lineVatable = round($netLineAmount / (1.0 + ($taxRate / 100.0)), 2);
                    $lineTax = round($netLineAmount - $lineVatable, 2);
                }
                $vatableAmount = round($vatableAmount + $lineVatable, 2);
                $taxTotal = round($taxTotal + $lineTax, 2);
            } else {
                $nonTaxableAmount = round($nonTaxableAmount + $netLineAmount, 2);
            }

            $processedItems[] = [
                'item_number' => $index + 1,
                'description' => trim((string) ($item['description'] ?? '')),
                'quantity' => $qty,
                'unit_price' => $unitPrice,
                'discount' => $discount,
                'tax_rate' => $taxRate,
                'amount' => $netLineAmount,
            ];
        }

        if ($taxMode === 'exclusive') {
            $grandTotal = round($subtotal + $taxTotal, 2);
        } else {
            // Inclusive: Grand Total equals Subtotal (no double-counting VAT)
            $grandTotal = $subtotal;
        }

        return [
            'items' => $processedItems,
            'subtotal' => $subtotal,
            'discount_total' => $discountTotal,
            'vatable_amount' => $vatableAmount,
            'non_taxable_amount' => $nonTaxableAmount,
            'effective_tax_rate' => $highestTaxRate > 0 ? $highestTaxRate : ($documentType === Document::TYPE_QUOTATION ? 12.0 : 0.0),
            'tax_total' => $taxTotal,
            'grand_total' => $grandTotal,
        ];
    }

    protected function generateNextDocumentNumber(string $documentType): string
    {
        $prefix = $documentType === Document::TYPE_STATEMENT ? 'SOA-' : 'QU-';

        if (! Schema::hasTable('documents') || ! Schema::hasColumn('documents', 'document_number')) {
            return $prefix . '01';
        }

        $existingNumbers = DB::table('documents')
            ->where('document_type', $documentType)
            ->whereNotNull('document_number')
            ->pluck('document_number');

        $maxSeq = -1;
        foreach ($existingNumbers as $numStr) {
            if (preg_match('/(\d+)\s*$/', (string) $numStr, $matches)) {
                $val = (int) $matches[1];
                if ($val > $maxSeq) {
                    $maxSeq = $val;
                }
            }
        }

        $nextSeq = $maxSeq < 0 ? 1 : ($maxSeq + 1);

        for ($attempt = 0; $attempt < 100; $attempt++) {
            $candidate = sprintf('%s%02d', $prefix, $nextSeq + $attempt);
            $exists = DB::table('documents')->where('document_number', $candidate)->exists();
            if (! $exists) {
                return $candidate;
            }
        }

        return $prefix . now()->format('YmdHis');
    }

    protected function getCompanyLogoBase64(): ?string
    {
        $candidates = [
            resource_path('imports/cooling_tower_airconditioning_services_logo-1.jpg'),
            public_path('images/cooling_tower_airconditioning_services_logo-1.jpg'),
        ];

        foreach ($candidates as $path) {
            if (is_file($path) && is_readable($path)) {
                $mime = mime_content_type($path) ?: 'image/jpeg';
                $data = base64_encode((string) file_get_contents($path));

                return "data:{$mime};base64,{$data}";
            }
        }

        return null;
    }
}

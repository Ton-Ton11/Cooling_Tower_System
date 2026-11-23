<?php

namespace App\Http\Controllers\SuperAdmin;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class SuperAdminDocumentController extends SuperAdminBaseController
{
    public function documentsIndex(Request $request): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        return response()->json([
            'data' => $this->mapDocuments($this->documentsBaseQuery()->orderByDesc('documents.created_at')->get()),
        ]);
    }

    public function storeDocument(Request $request): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        $payload = $this->normalizeDocumentPayload($request);

        $validated = validator($payload, [
            'form_name' => ['required', 'string', 'max:150'],
            'client_name' => ['required', 'string', 'max:150'],
            'service_name' => ['nullable', 'string', 'max:150'],
            'booking_id' => ['nullable', 'integer', Rule::exists('bookings', 'booking_id')],
            'status' => ['nullable', Rule::in(self::DOCUMENT_STATUSES)],
            'notes' => ['nullable', 'string'],
            'file_path' => ['nullable', 'string', 'max:255'],
        ])->validate();

        $docId = DB::table('documents')->insertGetId([
            'booking_id' => $validated['booking_id'] ?? null,
            'created_by' => (int) $request->user()->user_id,
            'form_name' => $validated['form_name'],
            'client_name' => $validated['client_name'],
            'service_name' => $validated['service_name'] ?? null,
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

    public function updateDocument(Request $request, int $docId): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        $document = DB::table('documents')->where('doc_id', $docId)->first();

        if (! $document) {
            abort(404);
        }

        $payload = $this->normalizeDocumentPayload($request);

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

    public function destroyDocument(Request $request, int $docId): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        $document = DB::table('documents')->where('doc_id', $docId)->first();

        if (! $document) {
            abort(404);
        }

        DB::table('documents')->where('doc_id', $docId)->delete();

        $this->logActivity(
            (int) $request->user()->user_id,
            'UPDATE',
            sprintf('Deleted document "%s".', $document->form_name)
        );

        return response()->json(['message' => 'Document deleted successfully.']);
    }
}

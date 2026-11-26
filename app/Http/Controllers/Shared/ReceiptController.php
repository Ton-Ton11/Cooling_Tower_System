<?php

namespace App\Http\Controllers\Shared;

use App\Http\Controllers\Controller;
use App\Models\Receipt;
use App\Services\ReceiptService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReceiptController extends Controller
{
    public function __construct(
        protected ReceiptService $receiptService
    ) {}

    /**
     * Staff endpoint: list official receipts and return the Daily Closeout metrics for a selected date.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user && in_array((int) $user->role_id, [1, 2, 3], true), 403);

        $date = $request->query('date');
        $routePrefix = $this->resolveStaffRoutePrefix((int) $user->role_id);

        $query = Receipt::with(['items', 'parentReceipt'])
            ->orderByDesc('issued_at')
            ->orderByDesc('receipt_id');

        if ($date && preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $date)) {
            $query->whereDate('issued_at', $date);
        }

        if ($request->filled('status')) {
            $query->where('status', (string) $request->query('status'));
        }

        if ($request->filled('source_type') && $request->filled('source_id')) {
            $query->where('source_type', (string) $request->query('source_type'))
                ->where('source_id', (int) $request->query('source_id'));
        }

        $receipts = $query->limit(250)
            ->get()
            ->map(fn (Receipt $r) => $this->receiptService->formatReceipt($r, $routePrefix))
            ->values();

        return response()->json([
            'daily_closeout' => $this->receiptService->getDailyCloseoutSummary($date ? (string) $date : null),
            'data' => $receipts,
        ]);
    }

    /**
     * Customer printable HTML view (strictly scoped to client_id === auth()->id()).
     */
    public function customerPrint(Request $request, int $receiptId)
    {
        $receipt = $this->findAuthorizedCustomerReceipt($request, $receiptId);

        return $this->renderPrintView($receipt, route('customer.receipts.pdf', ['receiptId' => $receipt->receipt_id]));
    }

    /**
     * Customer PDF download / inline stream (strictly scoped to client_id === auth()->id()).
     */
    public function customerPdf(Request $request, int $receiptId)
    {
        $receipt = $this->findAuthorizedCustomerReceipt($request, $receiptId);

        return $this->renderPdfResponse($request, $receipt);
    }

    /**
     * Staff printable HTML view (Super Admin, Manager, Admin Assistant).
     */
    public function staffPrint(Request $request, int $receiptId)
    {
        $user = $request->user();
        abort_unless($user && in_array((int) $user->role_id, [1, 2, 3], true), 403);

        $receipt = Receipt::with(['items', 'parentReceipt', 'voidRequestedByUser', 'voidApprovedByUser'])
            ->where('receipt_id', $receiptId)
            ->firstOrFail();

        $prefix = $this->resolveStaffRoutePrefix((int) $user->role_id);

        return $this->renderPrintView($receipt, route("{$prefix}.receipts.pdf", ['receiptId' => $receipt->receipt_id]));
    }

    /**
     * Staff PDF download / inline stream (Super Admin, Manager, Admin Assistant).
     */
    public function staffPdf(Request $request, int $receiptId)
    {
        $user = $request->user();
        abort_unless($user && in_array((int) $user->role_id, [1, 2, 3], true), 403);

        $receipt = Receipt::with(['items', 'parentReceipt', 'voidRequestedByUser', 'voidApprovedByUser'])
            ->where('receipt_id', $receiptId)
            ->firstOrFail();

        return $this->renderPdfResponse($request, $receipt);
    }

    /**
     * Request a void on an Issued receipt (Admin Assistant, Manager, Super Admin).
     */
    public function requestVoid(Request $request, int $receiptId): JsonResponse
    {
        $user = $request->user();
        abort_unless($user && in_array((int) $user->role_id, [1, 2, 3], true), 403);

        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:3', 'max:500'],
        ], [
            'reason.required' => 'Please enter a reason for voiding this receipt.',
        ]);

        $receipt = Receipt::where('receipt_id', $receiptId)->firstOrFail();
        $updated = $this->receiptService->requestVoid($receipt, $user, $validated['reason']);
        $prefix = $this->resolveStaffRoutePrefix((int) $user->role_id);

        return response()->json([
            'message' => "Void request submitted for {$updated->receipt_number}. Awaiting Manager or Super Admin approval.",
            'data' => $this->receiptService->formatReceipt($updated, $prefix),
            'daily_closeout' => $this->receiptService->getDailyCloseoutSummary($request->input('closeout_date')),
        ]);
    }

    /**
     * Approve a pending void request (Manager & Super Admin only; self-approval blocked).
     */
    public function approveVoid(Request $request, int $receiptId): JsonResponse
    {
        $user = $request->user();
        abort_unless($user && in_array((int) $user->role_id, [1, 2], true), 403);

        $receipt = Receipt::where('receipt_id', $receiptId)->firstOrFail();
        $updated = $this->receiptService->approveVoid($receipt, $user);
        $prefix = $this->resolveStaffRoutePrefix((int) $user->role_id);

        return response()->json([
            'message' => "Receipt {$updated->receipt_number} has been voided.",
            'data' => $this->receiptService->formatReceipt($updated, $prefix),
            'daily_closeout' => $this->receiptService->getDailyCloseoutSummary($request->input('closeout_date')),
        ]);
    }

    /**
     * Public/Auth Verification View: GET /verify-receipt/{receiptNumber}/{code}
     */
    public function verify(Request $request, string $receiptNumber, string $code)
    {
        $cleanNumber = trim($receiptNumber);
        $receipt = Receipt::with(['items', 'parentReceipt'])
            ->where('receipt_number', $cleanNumber)
            ->first();

        $isAuthentic = $receipt !== null && $receipt->matchesVerificationCode($code);

        $viewData = [
            'isAuthentic' => $isAuthentic,
            'receiptNumber' => $cleanNumber,
            'providedCode' => trim($code),
            'receipt' => $isAuthentic ? $this->receiptService->formatReceipt($receipt) : null,
            'logoBase64' => $this->getCompanyLogoBase64(),
        ];

        return response()->view('documents.verify_receipt', $viewData, $isAuthentic ? 200 : 404);
    }

    // ─── Internal Helpers ───

    protected function findAuthorizedCustomerReceipt(Request $request, int $receiptId): Receipt
    {
        $user = $request->user();
        abort_unless($user && (int) $user->role_id === 6, 403);

        $receipt = Receipt::with(['items', 'parentReceipt', 'voidRequestedByUser', 'voidApprovedByUser'])
            ->where('receipt_id', $receiptId)
            ->firstOrFail();

        if ((int) $receipt->client_id !== (int) $user->user_id) {
            abort(403, 'You are not authorized to view this receipt.');
        }

        return $receipt;
    }

    protected function renderPrintView(Receipt $receipt, string $pdfDownloadUrl)
    {
        return view('documents.official_receipt_pdf', [
            'receipt' => $this->receiptService->formatReceipt($receipt),
            'logoBase64' => $this->getCompanyLogoBase64(),
            'isPrintMode' => true,
            'pdfDownloadUrl' => $pdfDownloadUrl,
        ]);
    }

    protected function renderPdfResponse(Request $request, Receipt $receipt)
    {
        $formatted = $this->receiptService->formatReceipt($receipt);

        $pdf = Pdf::loadView('documents.official_receipt_pdf', [
            'receipt' => $formatted,
            'logoBase64' => $this->getCompanyLogoBase64(),
            'isPrintMode' => false,
            'pdfDownloadUrl' => null,
        ])->setPaper('a4', 'portrait');

        $safeNum = preg_replace('/[^A-Za-z0-9\-_]/', '_', (string) $receipt->receipt_number);
        $prefix = $receipt->document_kind === Receipt::KIND_ACKNOWLEDGEMENT ? 'Receipt' : 'Invoice';
        $filename = "{$prefix}_{$safeNum}.pdf";

        if ($request->boolean('download')) {
            return $pdf->download($filename);
        }

        return $pdf->stream($filename);
    }

    protected function resolveStaffRoutePrefix(int $roleId): string
    {
        return match ($roleId) {
            2 => 'manager',
            3 => 'admin-assistant',
            default => 'super-admin',
        };
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

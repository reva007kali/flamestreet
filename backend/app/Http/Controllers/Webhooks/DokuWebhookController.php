<?php

namespace App\Http\Controllers\Webhooks;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\PaymentTransaction;
use App\Services\OrderService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class DokuWebhookController extends Controller
{
    public function __construct(
        protected OrderService $orderService,
    ) {
    }

    public function notify(Request $request)
    {
        $clientId = (string) $request->header('Client-Id', '');
        $requestId = (string) $request->header('Request-Id', '');
        $timestamp = (string) $request->header('Request-Timestamp', '');
        $signature = (string) $request->header('Signature', '');
        $secretKeys = array_values(array_unique(array_filter([
            (string) config('doku.secret_key'),
        ], fn($v) => $v !== '')));

        $rawBody = (string) $request->getContent();
        $requestTarget = (string) $request->getPathInfo();
        $requestTarget = '/' . ltrim($requestTarget, '/');
        $requestTarget = rtrim($requestTarget, '/');
        if ($requestTarget === '') {
            $requestTarget = '/';
        }

        $relaxed = (bool) config('doku.webhook_relaxed');
        $allowRelaxed = $relaxed && app()->environment(['local', 'testing']);

        if (!$allowRelaxed) {
            if ($clientId === '' || $requestId === '' || $timestamp === '' || $signature === '' || empty($secretKeys)) {
                return response()->json(['message' => 'Invalid webhook config'], 422);
            }

            if (
                !$this->verifySignature(
                    signature: $signature,
                    clientId: $clientId,
                    requestId: $requestId,
                    timestamp: $timestamp,
                    requestTarget: $requestTarget,
                    rawBody: $rawBody,
                    secretKeys: $secretKeys,
                )
            ) {
                if (app()->environment('local')) {
                    $given = trim($signature);
                    $given = str_starts_with($given, 'HMACSHA256=') ? substr($given, strlen('HMACSHA256=')) : $given;

                    $key = (string) config('doku.secret_key');
                    $decoded = json_decode($rawBody, true);
                    $minified = is_array($decoded) ? (string) json_encode($decoded, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) : null;

                    $candidates = [];
                    foreach (array_values(array_unique(array_filter([$rawBody, $minified], fn($v) => is_string($v) && $v !== ''))) as $body) {
                        $digest = base64_encode(hash('sha256', $body, true));
                        $component =
                            "Client-Id:{$clientId}\n" .
                            "Request-Id:{$requestId}\n" .
                            "Request-Timestamp:{$timestamp}\n" .
                            "Request-Target:{$requestTarget}\n" .
                            "Digest:{$digest}";
                        $calc = base64_encode(hash_hmac('sha256', $component, $key, true));
                        $candidates[] = [
                            'body' => $body === $rawBody ? 'raw' : 'minified',
                            'digest' => $digest,
                            'calc' => $calc,
                        ];
                    }

                    Log::warning('DOKU webhook signature mismatch', [
                        'client_id' => $clientId,
                        'request_id' => $requestId,
                        'request_timestamp' => $timestamp,
                        'request_target' => $requestTarget,
                        'given' => $given,
                        'candidates' => $candidates,
                    ]);
                }

                return response()->json(['message' => 'Invalid signature'], 401);
            }
        }

        $payload = $request->all();

        $invoiceNumber = (string) (
            data_get($payload, 'order.invoice_number')
            ?? data_get($payload, 'order.invoiceNumber')
            ?? data_get($payload, 'invoice_number')
            ?? data_get($payload, 'invoiceNumber')
            ?? ''
        );

        $tokenId = (string) (
            data_get($payload, 'payment.token_id')
            ?? data_get($payload, 'payment.tokenId')
            ?? data_get($payload, 'token_id')
            ?? data_get($payload, 'tokenId')
            ?? ''
        );

        app()->terminating(function () use ($payload, $invoiceNumber, $tokenId): void {
            $tx = PaymentTransaction::query()
                ->where('provider', 'doku')
                ->where('method', 'checkout')
                ->where(function ($q) use ($invoiceNumber, $tokenId) {
                    if ($tokenId !== '') {
                        $q->orWhere('reference_no', $tokenId);
                    }
                    if ($invoiceNumber !== '') {
                        $q->orWhere('partner_reference_no', $invoiceNumber);
                    }
                })
                ->orderByDesc('id')
                ->first();

            $order = null;
            if ($tx) {
                $tx->raw_callback = $payload;
                $tx->save();
                $order = $tx->order;
            } elseif ($invoiceNumber !== '') {
                $order = Order::query()->where('order_number', $invoiceNumber)->first();
            }

            if (!$order) {
                return;
            }

            $paid = $this->isPaid($payload);
            if ($paid) {
                $this->orderService->confirmPayment($order);
            }

            if ($tx && $paid && $tx->status !== 'paid') {
                $tx->status = 'paid';
                $tx->save();
            }
        });

        return response()->json(['received' => true]);
    }

    protected function isPaid(array $payload): bool
    {
        $statusA = strtoupper((string) (data_get($payload, 'transaction.status') ?? data_get($payload, 'payment.status') ?? data_get($payload, 'status') ?? ''));
        if (in_array($statusA, ['SUCCESS', 'PAID', 'COMPLETED'], true)) {
            return true;
        }

        return false;
    }

    protected function verifySignature(
        string $signature,
        string $clientId,
        string $requestId,
        string $timestamp,
        string $requestTarget,
        string $rawBody,
        array $secretKeys,
    ): bool {
        $given = trim($signature);
        $given = str_starts_with($given, 'HMACSHA256=') ? substr($given, strlen('HMACSHA256=')) : $given;
        if ($given === '') {
            return false;
        }

        $targets = array_values(array_unique(array_filter([
            '/' . ltrim(trim($requestTarget), '/'),
        ], fn($v) => $v !== '')));

        $bodyCandidates = [$rawBody];
        $bodyCandidates[] = str_replace("\r\n", "\n", $rawBody);
        $bodyCandidates[] = trim($rawBody);

        $decoded = json_decode($rawBody, true);
        if (is_array($decoded)) {
            $bodyCandidates[] = (string) json_encode($decoded);
            $bodyCandidates[] = (string) json_encode($decoded, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        }
        $bodyCandidates = array_values(array_unique(array_filter($bodyCandidates, fn($v) => $v !== '')));

        foreach ($secretKeys as $secretKey) {
            foreach ($targets as $target) {
                foreach ($bodyCandidates as $body) {
                    $digest = base64_encode(hash('sha256', $body, true));
                    $component =
                        "Client-Id:{$clientId}\n" .
                        "Request-Id:{$requestId}\n" .
                        "Request-Timestamp:{$timestamp}\n" .
                        "Request-Target:{$target}\n" .
                        "Digest:{$digest}";

                    $calc = base64_encode(hash_hmac('sha256', $component, $secretKey, true));
                    if (hash_equals($calc, $given)) {
                        return true;
                    }
                }
            }
        }

        return false;
    }
}

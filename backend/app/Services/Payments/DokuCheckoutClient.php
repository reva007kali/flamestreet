<?php

namespace App\Services\Payments;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class DokuCheckoutClient
{
    public function createPayment(string $invoiceNumber, string $amount, array $paymentMethodTypes = [], int $paymentDueDateMinutes = 60): array
    {
        $clientId = (string) config('doku.client_id');
        $secretKey = (string) config('doku.secret_key');
        $baseUrl = rtrim((string) config('doku.checkout_base_url'), '/');

        if ($clientId === '' || $secretKey === '' || $baseUrl === '') {
            throw new \RuntimeException('DOKU checkout config is missing');
        }

        $requestTarget = '/checkout/v1/payment';
        $url = $baseUrl.$requestTarget;

        $body = [
            'order' => [
                'amount' => (int) $amount,
                'invoice_number' => $invoiceNumber,
            ],
            'payment' => [
                'payment_due_date' => $paymentDueDateMinutes,
            ],
        ];

        if (! empty($paymentMethodTypes)) {
            $body['payment']['payment_method_types'] = array_values($paymentMethodTypes);
        }

        $bodyJson = (string) json_encode($body, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        $digest = base64_encode(hash('sha256', $bodyJson, true));

        $requestId = (string) Str::uuid();
        $timestamp = gmdate('Y-m-d\\TH:i:s\\Z');

        $component = "Client-Id:{$clientId}\n".
            "Request-Id:{$requestId}\n".
            "Request-Timestamp:{$timestamp}\n".
            "Request-Target:{$requestTarget}\n".
            "Digest:{$digest}";

        $signature = 'HMACSHA256='.base64_encode(hash_hmac('sha256', $component, $secretKey, true));

        $resp = Http::timeout(25)
            ->withHeaders([
                'Client-Id' => $clientId,
                'Request-Id' => $requestId,
                'Request-Timestamp' => $timestamp,
                'Signature' => $signature,
                'Content-Type' => 'application/json',
            ])
            ->withBody($bodyJson, 'application/json')
            ->post($url);

        if (! $resp->successful()) {
            throw new \RuntimeException('DOKU checkout create payment failed: '.$resp->status().' '.$resp->body());
        }

        return $resp->json();
    }
}


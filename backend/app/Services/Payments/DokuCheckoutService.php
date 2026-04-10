<?php

namespace App\Services\Payments;

use App\Models\Order;
use App\Models\PaymentTransaction;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DokuCheckoutService
{
    public function __construct(
        protected DokuCheckoutClient $client,
    ) {
    }

    public function ensurePaymentSession(Order $order): PaymentTransaction
    {
        $methodTypes = (array) (config('doku.method_map')[$order->payment_method] ?? []);
        if (empty($methodTypes)) {
            throw ValidationException::withMessages(['payment_method' => 'Payment method is not configured for DOKU checkout']);
        }

        if ($order->payment_status !== 'unpaid') {
            throw ValidationException::withMessages(['payment_status' => 'Order is not unpaid']);
        }

        $existing = PaymentTransaction::query()
            ->where('order_id', $order->id)
            ->where('provider', 'doku')
            ->where('method', 'checkout')
            ->where('status', 'pending')
            ->orderByDesc('id')
            ->first();

        if ($existing) {
            $url = (string) (data_get($existing->raw_response, 'response.payment.url') ?? '');
            if ($url !== '') {
                return $existing;
            }
        }

        return DB::transaction(function () use ($order, $methodTypes): PaymentTransaction {
            $tx = PaymentTransaction::query()->create([
                'order_id' => $order->id,
                'provider' => 'doku',
                'method' => 'checkout',
                'status' => 'pending',
                'amount' => $order->total_amount,
                'currency' => 'IDR',
                'partner_reference_no' => $order->order_number,
            ]);

            $resp = $this->client->createPayment(
                invoiceNumber: $order->order_number,
                amount: number_format((float) $order->total_amount, 0, '.', ''),
                paymentMethodTypes: $methodTypes,
                paymentDueDateMinutes: 60,
            );

            $tx->raw_request = [
                'order' => [
                    'amount' => (int) $order->total_amount,
                    'invoice_number' => $order->order_number,
                ],
                'payment' => [
                    'payment_due_date' => 60,
                    'payment_method_types' => $methodTypes,
                ],
            ];
            $tx->raw_response = $resp;
            $tx->reference_no = (string) (data_get($resp, 'response.payment.token_id') ?? data_get($resp, 'response.order.session_id') ?? '');
            $tx->save();

            return $tx;
        });
    }
}


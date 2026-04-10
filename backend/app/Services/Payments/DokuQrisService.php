<?php

namespace App\Services\Payments;

use App\Models\Order;
use App\Models\PaymentTransaction;
use App\Services\OrderService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DokuQrisService
{
                    public function __construct(
                                        protected DokuSnapClient $client,
                                        protected OrderService $orderService,
                    ) {
                    }

                    public function ensureQrisTransaction(Order $order): PaymentTransaction
                    {
                                        if ($order->payment_method !== 'doku-qris') {
                                                            throw ValidationException::withMessages(['payment_method' => 'Payment method is not DOKU QRIS']);
                                        }
                                        if ($order->payment_status !== 'unpaid') {
                                                            throw ValidationException::withMessages(['payment_status' => 'Order is not unpaid']);
                                        }

                                        $existing = PaymentTransaction::query()
                                                            ->where('order_id', $order->id)
                                                            ->where('provider', 'doku')
                                                            ->where('method', 'qris')
                                                            ->where('status', 'pending')
                                                            ->whereNotNull('qr_content')
                                                            ->orderByDesc('id')
                                                            ->first();

                                        if ($existing && (!$existing->expires_at || $existing->expires_at->isFuture())) {
                                                            return $existing;
                                        }

                                        return DB::transaction(function () use ($order): PaymentTransaction {
                                                            $tx = PaymentTransaction::query()->create([
                                                                                'order_id' => $order->id,
                                                                                'provider' => 'doku',
                                                                                'method' => 'qris',
                                                                                'status' => 'pending',
                                                                                'amount' => $order->total_amount,
                                                                                'currency' => 'IDR',
                                                                                'partner_reference_no' => $order->order_number,
                                                            ]);

                                                            $validUntil = now('Asia/Jakarta')->addMinutes(15)->format('Y-m-d\\TH:i:sP');

                                                            $payload = [
                                                                                'partnerReferenceNo' => $order->order_number,
                                                                                'amount' => [
                                                                                                    'value' => number_format((float) $order->total_amount, 2, '.', ''),
                                                                                                    'currency' => 'IDR',
                                                                                ],
                                                                                'merchantId' => (string) config('doku.merchant_id'),
                                                                                'terminalId' => (string) config('doku.terminal_id'),
                                                                                'validityPeriod' => $validUntil,
                                                            ];

                                                            $result = $this->client->generateQris($payload);
                                                            $resp = (array) ($result['response'] ?? []);

                                                            $tx->raw_request = $payload;
                                                            $tx->raw_response = $resp;
                                                            $tx->reference_no = $resp['referenceNo'] ?? null;
                                                            $tx->qr_content = $resp['qrContent'] ?? null;
                                                            $tx->expires_at = $payload['validityPeriod'];
                                                            $tx->save();

                                                            if (!$tx->qr_content) {
                                                                                throw new \RuntimeException('DOKU QRIS generated but qrContent missing');
                                                            }

                                                            return $tx;
                                        });
                    }

                    public function queryAndSync(Order $order): ?PaymentTransaction
                    {
                                        $tx = PaymentTransaction::query()
                                                            ->where('order_id', $order->id)
                                                            ->where('provider', 'doku')
                                                            ->where('method', 'qris')
                                                            ->orderByDesc('id')
                                                            ->first();

                                        if (!$tx) {
                                                            return null;
                                        }

                                        if ($order->payment_status === 'paid') {
                                                            if ($tx->status !== 'paid') {
                                                                                $tx->status = 'paid';
                                                                                $tx->save();
                                                            }
                                                            return $tx;
                                        }

                                        if (!$tx->reference_no) {
                                                            return $tx;
                                        }

                                        $payload = [
                                                            'originalReferenceNo' => $tx->reference_no,
                                                            'originalPartnerReferenceNo' => $tx->partner_reference_no,
                                                            'serviceCode' => '47',
                                                            'merchantId' => (string) config('doku.merchant_id'),
                                        ];

                                        $result = $this->client->queryQris($payload);
                                        $resp = (array) ($result['response'] ?? []);
                                        $tx->raw_callback = $resp;

                                        $status = (string) ($resp['latestTransactionStatus'] ?? '');
                                        if ($status === '00') {
                                                            $this->orderService->confirmPayment($order);
                                                            $tx->status = 'paid';
                                        }

                                        $tx->save();

                                        return $tx;
                    }
}


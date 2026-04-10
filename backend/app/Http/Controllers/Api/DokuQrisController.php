<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\PaymentTransaction;
use App\Services\Payments\DokuQrisService;
use Illuminate\Http\Request;

class DokuQrisController extends Controller
{
                    public function __construct(
                                        protected DokuQrisService $service,
                    ) {
                    }

                    public function show(Request $request, int $orderId)
                    {
                                        $order = Order::query()->findOrFail($orderId);
                                        $this->authorizeOrder($request, $order);

                                        $tx = PaymentTransaction::query()
                                                            ->where('order_id', $order->id)
                                                            ->where('provider', 'doku')
                                                            ->where('method', 'qris')
                                                            ->orderByDesc('id')
                                                            ->first();

                                        return response()->json(['transaction' => $tx]);
                    }

                    public function generate(Request $request, int $orderId)
                    {
                                        $order = Order::query()->findOrFail($orderId);
                                        $this->authorizeOrder($request, $order);

                                        try {
                                                            $tx = $this->service->ensureQrisTransaction($order);
                                        } catch (\Throwable $e) {
                                                            return response()->json(['message' => $e->getMessage()], 422);
                                        }

                                        return response()->json(['transaction' => $tx]);
                    }

                    public function status(Request $request, int $orderId)
                    {
                                        $order = Order::query()->findOrFail($orderId);
                                        $this->authorizeOrder($request, $order);

                                        try {
                                                            $tx = $this->service->queryAndSync($order);
                                        } catch (\Throwable $e) {
                                                            return response()->json([
                                                                                'payment_status' => $order->payment_status,
                                                                                'message' => $e->getMessage(),
                                                            ], 422);
                                        }

                                        return response()->json([
                                                            'payment_status' => $order->fresh()->payment_status,
                                                            'transaction' => $tx,
                                        ]);
                    }

                    protected function authorizeOrder(Request $request, Order $order): void
                    {
                                        $user = $request->user();
                                        if ($user->hasRole('admin')) {
                                                            return;
                                        }

                                        $ok = false;
                                        if ($user->hasRole('member') && (int) $order->member_id === (int) $user->id) {
                                                            $ok = true;
                                        }
                                        if ($user->hasRole('trainer') && ((int) $order->trainer_id === (int) $user->id || (int) $order->member_id === (int) $user->id)) {
                                                            $ok = true;
                                        }

                                        if (!$ok) {
                                                            abort(403, 'Forbidden');
                                        }
                    }
}

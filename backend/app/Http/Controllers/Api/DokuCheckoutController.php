<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\PaymentTransaction;
use App\Services\Payments\DokuCheckoutService;
use Illuminate\Http\Request;

class DokuCheckoutController extends Controller
{
    public function __construct(
        protected DokuCheckoutService $service,
    ) {
    }

    public function show(Request $request, int $orderId)
    {
        $order = Order::query()->findOrFail($orderId);
        $this->authorizeOrder($request, $order);

        $tx = PaymentTransaction::query()
            ->where('order_id', $order->id)
            ->where('provider', 'doku')
            ->where('method', 'checkout')
            ->orderByDesc('id')
            ->first();

        return response()->json([
            'payment_status' => $order->payment_status,
            'transaction' => $tx,
            'payment_url' => $tx ? (data_get($tx->raw_response, 'response.payment.url') ?? null) : null,
        ]);
    }

    public function create(Request $request, int $orderId)
    {
        $order = Order::query()->findOrFail($orderId);
        $this->authorizeOrder($request, $order);

        try {
            $tx = $this->service->ensurePaymentSession($order);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'payment_status' => $order->payment_status,
            'transaction' => $tx,
            'payment_url' => data_get($tx->raw_response, 'response.payment.url'),
        ]);
    }

    public function status(Request $request, int $orderId)
    {
        $order = Order::query()->findOrFail($orderId);
        $this->authorizeOrder($request, $order);

        $tx = PaymentTransaction::query()
            ->where('order_id', $order->id)
            ->where('provider', 'doku')
            ->where('method', 'checkout')
            ->orderByDesc('id')
            ->first();

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

        if (! $ok) {
            abort(403, 'Forbidden');
        }
    }
}


<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\User;
use App\Services\NotificationService;
use App\Services\OrderService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class OrderController extends Controller
{
    public function __construct(
        protected OrderService $orderService,
        protected NotificationService $notificationService,
    ) {
    }

    public function index()
    {
        $orders = Order::query()->with(['items', 'gym'])->orderByDesc('id')->paginate(20);

        return response()->json($orders);
    }

    public function show(int $id)
    {
        $order = Order::query()->with(['items', 'gym'])->findOrFail($id);

        return response()->json(['order' => $order]);
    }

    public function updateStatus(Request $request, int $id)
    {
        $order = Order::query()->findOrFail($id);

        $data = $request->validate([
            'status' => ['nullable', Rule::in(['pending', 'confirmed', 'delivering', 'delivered', 'cancelled', 'refunded'])],
            'payment_status' => ['nullable', Rule::in(['unpaid', 'paid', 'refunded'])],
            'cancelled_reason' => ['nullable', 'string'],
        ]);

        if (isset($data['payment_status']) && $data['payment_status'] === 'paid') {
            $this->orderService->confirmPayment($order);
        } elseif (isset($data['payment_status'])) {
            if ($data['payment_status'] === 'refunded' && $order->payment_status === 'paid') {
                $this->orderService->reverseRewardsIfNeeded($order);
            }
            $order->payment_status = $data['payment_status'];
            $order->save();
        }

        if (isset($data['status'])) {
            if ($data['status'] === 'cancelled') {
                $order->cancelled_reason = $data['cancelled_reason'] ?? $order->cancelled_reason;
            }
            $this->orderService->updateStatus($order, $data['status']);
        }

        return response()->json(['order' => $order->refresh()->load(['items', 'gym'])]);
    }

    public function assignCourier(Request $request, int $id)
    {
        $order = Order::query()->findOrFail($id);

        $data = $request->validate([
            'courier_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        $courier = User::query()->findOrFail((int) $data['courier_id']);
        if (! $courier->hasRole('courier')) {
            return response()->json(['message' => 'User is not courier'], 422);
        }

        $order->courier_id = $courier->id;
        $order->save();

        $this->notificationService->notifyCourierNewDelivery($courier->id, $order->id, $order->order_number);
        $this->notificationService->notifyOrderQueue($this->orderService->queueCounts(), 'assigned', $order->order_number, $order->status, $order->payment_status, $order->id);

        return response()->json(['order' => $order->refresh()->load(['items', 'gym'])]);
    }
}

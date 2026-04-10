<?php

namespace App\Http\Controllers\Api\Staff;

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

    public function index(Request $request)
    {
        $data = $request->validate([
            'status' => ['nullable', 'string'],
            'payment_status' => ['nullable', 'string'],
        ]);

        $q = Order::query()->with('items')->orderByDesc('id');

        if (! empty($data['status'])) {
            if ($data['status'] === 'queue') {
                $q->whereIn('status', ['pending', 'confirmed', 'delivering']);
            } else {
                $q->where('status', $data['status']);
            }
        }

        if (! empty($data['payment_status'])) {
            $q->where('payment_status', $data['payment_status']);
        }

        return response()->json($q->paginate(20));
    }

    public function counts()
    {
        return response()->json(['counts' => $this->orderService->queueCounts()]);
    }

    public function show(int $id)
    {
        $order = Order::query()->with(['items', 'gym'])->findOrFail($id);

        return response()->json(['order' => $order]);
    }

    public function update(Request $request, int $id)
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
        $this->notificationService->notifyOrderQueue($this->orderService->queueCounts(), 'assigned', $order->order_number, $order->status, $order->payment_status);

        return response()->json(['order' => $order->refresh()->load(['items', 'gym'])]);
    }
}

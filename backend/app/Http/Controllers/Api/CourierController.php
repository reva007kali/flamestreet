<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\OrderService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CourierController extends Controller
{
    public function __construct(
        protected OrderService $orderService,
    ) {
    }

    public function deliveries(Request $request)
    {
        $orders = Order::query()
            ->where('courier_id', $request->user()->id)
            ->with('items')
            ->orderByDesc('id')
            ->paginate(20);

        return response()->json($orders);
    }

    public function updateStatus(Request $request, int $id)
    {
        $order = Order::query()->findOrFail($id);
        if ((int) $order->courier_id !== (int) $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $data = $request->validate([
            'status' => ['required', Rule::in(['delivering', 'delivered'])],
        ]);

        $this->orderService->updateStatus($order, $data['status']);

        return response()->json(['order' => $order->refresh()->load('items')]);
    }
}

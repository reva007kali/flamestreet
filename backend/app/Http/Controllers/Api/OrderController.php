<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Validation\Rule;
use App\Models\Order;
use App\Services\OrderService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class OrderController extends Controller
{
    public function __construct(
        protected OrderService $orderService,
    ) {
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'gym_id' => ['nullable', 'integer', Rule::exists('gyms', 'id')->where('is_active', true)],
            'delivery_address' => ['required', 'string'],
            'delivery_lat' => ['nullable', 'numeric', 'between:-90,90'],
            'delivery_lng' => ['nullable', 'numeric', 'between:-180,180'],
            'delivery_notes' => ['nullable', 'string'],
            'recipient_name' => ['required', 'string', 'max:100'],
            'recipient_phone' => ['required', 'string', 'max:20'],
            'delivery_fee' => ['nullable', 'numeric', 'min:0'],
            'discount_amount' => ['nullable', 'numeric', 'min:0'],
            'payment_method' => ['nullable', 'string', 'max:50'],
            'points_used' => ['nullable', 'integer', 'min:0'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.modifier_option_ids' => ['nullable', 'array'],
            'items.*.modifier_option_ids.*' => ['integer', 'exists:product_modifier_options,id'],
            'items.*.item_notes' => ['nullable', 'string'],
        ]);

        if (empty($data['gym_id'])) {
            if (!isset($data['delivery_lat']) || !isset($data['delivery_lng'])) {
                return response()->json(['message' => 'Delivery location is required'], 422);
            }
        }

        $order = $this->orderService->createOrder($request->user(), $data);

        if (($data['payment_method'] ?? null) === 'flame-points') {
            $this->orderService->confirmPayment($order);
        }

        return response()->json(['order' => $order], 201);
    }

    public function index(Request $request)
    {
        $data = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
        ]);

        $from = isset($data['from']) ? \Illuminate\Support\Carbon::parse($data['from'])->startOfDay() : null;
        $to = isset($data['to']) ? \Illuminate\Support\Carbon::parse($data['to'])->endOfDay() : null;

        $orders = Order::query()
            ->where('member_id', $request->user()->id)
            ->with(['items'])
            ->when($from || $to, function ($q) use ($from, $to) {
                $a = $from ?? \Illuminate\Support\Carbon::create(1970, 1, 1)->startOfDay();
                $b = $to ?? \Illuminate\Support\Carbon::now()->endOfDay();
                if ($b->lessThan($a)) {
                    [$a, $b] = [$b->copy()->startOfDay(), $a->copy()->endOfDay()];
                }
                $q->whereBetween('created_at', [$a, $b]);
            })
            ->orderByDesc('id')
            ->paginate(20);

        return response()->json($orders);
    }

    public function show(Request $request, string $orderNumber)
    {
        $order = Order::query()
            ->with([
                'items',
                'gym',
                'member:id,full_name,avatar',
                'courier:id,full_name,avatar',
            ])
            ->where('order_number', $orderNumber)
            ->firstOrFail();

        $user = $request->user();
        if (!$user->hasRole('admin')) {
            $ok = false;
            if ($user->hasRole('member') && (int) $order->member_id === (int) $user->id) {
                $ok = true;
            }
            if ($user->hasRole('trainer') && ((int) $order->trainer_id === (int) $user->id || (int) $order->member_id === (int) $user->id)) {
                $ok = true;
            }
            if ($user->hasRole('courier') && (int) $order->courier_id === (int) $user->id) {
                $ok = true;
            }
            if (!$ok) {
                return response()->json(['message' => 'Forbidden'], 403);
            }
        }

        return response()->json(['order' => $order]);
    }

    public function uploadPaymentProof(Request $request, int $id)
    {
        $request->validate([
            'payment_proof' => ['required', 'file', 'image', 'max:5120'],
        ]);

        $order = Order::query()->findOrFail($id);
        if ((int) $order->member_id !== (int) $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $path = $request->file('payment_proof')->store('payment_proofs', 'public');

        if ($order->payment_proof) {
            Storage::disk('public')->delete($order->payment_proof);
        }

        $order->payment_proof = $path;
        $order->save();

        return response()->json(['order' => $order]);
    }
}

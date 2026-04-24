<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FpShopItem;
use App\Models\FpShopPurchase;
use App\Services\FpShopService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class FpShopController extends Controller
{
    public function __construct(
        protected FpShopService $fpShop,
    ) {
    }

    public function items(Request $request)
    {
        $data = $request->validate([
            'type' => ['nullable', 'string', Rule::in(['coupon', 'merch'])],
        ]);

        $type = $data['type'] ?? null;

        $items = FpShopItem::query()
            ->where('is_active', true)
            ->when($type, fn ($q) => $q->where('type', $type))
            ->orderBy('sort_order')
            ->orderByDesc('id')
            ->get();

        return response()->json(['items' => $items]);
    }

    public function myPurchases(Request $request)
    {
        $data = $request->validate([
            'type' => ['nullable', 'string', Rule::in(['coupon', 'merch'])],
            'status' => ['nullable', 'string', Rule::in(['available', 'reserved', 'used', 'cancelled'])],
        ]);

        $type = $data['type'] ?? null;
        $status = $data['status'] ?? null;

        $rows = FpShopPurchase::query()
            ->where('user_id', $request->user()->id)
            ->when($status, fn ($q) => $q->where('status', $status))
            ->with(['item'])
            ->when($type, function ($q) use ($type) {
                $q->whereHas('item', fn ($iq) => $iq->where('type', $type));
            })
            ->orderByDesc('id')
            ->get();

        return response()->json(['purchases' => $rows]);
    }

    public function buy(Request $request, int $id)
    {
        $item = FpShopItem::query()->findOrFail($id);

        if (! $request->user()->hasRole('member') && ! $request->user()->hasRole('trainer')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $purchase = $this->fpShop->buy($request->user(), $item);
        $purchase->load('item');

        return response()->json(['purchase' => $purchase], 201);
    }
}


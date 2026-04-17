<?php

namespace App\Http\Controllers\Api\Staff;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class DashboardController extends Controller
{
    public function __invoke(Request $request)
    {
        $data = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
        ]);

        $from = isset($data['from']) ? Carbon::parse($data['from'])->startOfDay() : Carbon::now()->startOfDay();
        $to = isset($data['to']) ? Carbon::parse($data['to'])->endOfDay() : Carbon::now()->endOfDay();

        if ($to->lessThan($from)) {
            [$from, $to] = [$to->copy()->startOfDay(), $from->copy()->endOfDay()];
        }

        $paidOrders = Order::query()
            ->where('payment_status', 'paid')
            ->whereBetween('created_at', [$from, $to]);

        $salesAgg = (clone $paidOrders)
            ->selectRaw('COALESCE(SUM(subtotal), 0) as gross_sales')
            ->selectRaw('COALESCE(SUM(discount_amount), 0) as discounts')
            ->selectRaw('COALESCE(SUM(delivery_fee), 0) as delivery_fees')
            ->selectRaw('COALESCE(SUM(total_amount), 0) as total_collected')
            ->selectRaw('COUNT(*) as orders_paid')
            ->first();

        $grossSales = (float) ($salesAgg->gross_sales ?? 0);
        $discounts = (float) ($salesAgg->discounts ?? 0);
        $deliveryFees = (float) ($salesAgg->delivery_fees ?? 0);
        $totalCollected = (float) ($salesAgg->total_collected ?? 0);
        $netSales = max(0, $grossSales - $discounts);

        $items = OrderItem::query()
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->where('orders.payment_status', 'paid')
            ->whereBetween('orders.created_at', [$from, $to])
            ->groupBy('order_items.product_id', 'order_items.product_name')
            ->orderByDesc(\DB::raw('SUM(order_items.quantity)'))
            ->limit(50)
            ->get([
                'order_items.product_id as product_id',
                'order_items.product_name as product_name',
                \DB::raw('SUM(order_items.quantity) as qty_sold'),
                \DB::raw('SUM(order_items.product_price * order_items.quantity) as revenue'),
            ]);

        return response()->json([
            'range' => [
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
            ],
            'sales' => [
                'orders_paid' => (int) ($salesAgg->orders_paid ?? 0),
                'gross_sales' => $grossSales,
                'discounts' => $discounts,
                'net_sales' => $netSales,
                'delivery_fees' => $deliveryFees,
                'total_collected' => $totalCollected,
            ],
            'items_sold' => $items,
        ]);
    }
}


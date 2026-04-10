<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\MemberProfile;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\TrainerProfile;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class AdminDashboardController extends Controller
{
    public function __invoke(Request $request)
    {
        $data = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
        ]);

        $from = isset($data['from']) ? Carbon::parse($data['from'])->startOfDay() : Carbon::now()->startOfMonth();
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

        $cogs = (float) OrderItem::query()
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->join('products', 'products.id', '=', 'order_items.product_id')
            ->where('orders.payment_status', 'paid')
            ->whereBetween('orders.created_at', [$from, $to])
            ->selectRaw('COALESCE(SUM(products.hpp * order_items.quantity), 0) as cogs')
            ->value('cogs');

        $grossSales = (float) ($salesAgg->gross_sales ?? 0);
        $discounts = (float) ($salesAgg->discounts ?? 0);
        $deliveryFees = (float) ($salesAgg->delivery_fees ?? 0);
        $totalCollected = (float) ($salesAgg->total_collected ?? 0);
        $netSales = max(0, $grossSales - $discounts);

        $topProducts = OrderItem::query()
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->leftJoin('products', 'products.id', '=', 'order_items.product_id')
            ->where('orders.payment_status', 'paid')
            ->whereBetween('orders.created_at', [$from, $to])
            ->groupBy('order_items.product_id', 'order_items.product_name', 'products.image')
            ->orderByDesc(\DB::raw('SUM(order_items.quantity)'))
            ->limit(8)
            ->get([
                'order_items.product_id as product_id',
                'order_items.product_name as product_name',
                'products.image as product_image',
                \DB::raw('SUM(order_items.quantity) as qty_sold'),
                \DB::raw('SUM(order_items.product_price * order_items.quantity) as revenue'),
            ]);

        $topMembers = Order::query()
            ->join('users', 'users.id', '=', 'orders.member_id')
            ->leftJoin('order_items', 'order_items.order_id', '=', 'orders.id')
            ->where('orders.payment_status', 'paid')
            ->whereBetween('orders.created_at', [$from, $to])
            ->groupBy('orders.member_id', 'users.full_name', 'users.username', 'users.email', 'users.avatar')
            ->orderByDesc(\DB::raw('SUM(orders.total_amount)'))
            ->limit(8)
            ->get([
                'orders.member_id as member_id',
                'users.full_name',
                'users.username',
                'users.email',
                'users.avatar',
                \DB::raw('COUNT(DISTINCT orders.id) as orders_count'),
                \DB::raw('COALESCE(SUM(order_items.quantity), 0) as items_count'),
                \DB::raw('COALESCE(SUM(orders.total_amount), 0) as total_purchase'),
            ]);

        $topTrainers = TrainerProfile::query()
            ->with('user:id,full_name,username,email')
            ->orderByDesc('total_points')
            ->orderByDesc('id')
            ->limit(5)
            ->get()
            ->map(function (TrainerProfile $tp) {
                return [
                    'id' => $tp->id,
                    'user_id' => $tp->user_id,
                    'full_name' => $tp->user?->full_name,
                    'username' => $tp->user?->username,
                    'email' => $tp->user?->email,
                    'total_points' => (int) $tp->total_points,
                    'tier' => $tp->tier,
                ];
            })
            ->values();

        return response()->json([
            'counts' => [
                'users' => User::query()->count(),
                'orders' => Order::query()->count(),
                'products' => Product::query()->count(),
                'members' => MemberProfile::query()->count(),
                'trainers' => TrainerProfile::query()->count(),
            ],
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
                'cogs' => $cogs,
                'gross_profit' => $grossSales - $cogs,
                'net_profit' => $netSales - $cogs,
            ],
            'top_products' => $topProducts,
            'top_members' => $topMembers,
            'top_trainers' => $topTrainers,
        ]);
    }
}

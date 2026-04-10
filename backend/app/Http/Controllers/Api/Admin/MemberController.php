<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;

class MemberController extends Controller
{
    public function index()
    {
        $members = User::query()
            ->role('member')
            ->whereDoesntHave('roles', function ($q): void {
                $q->where('name', 'trainer');
            })
            ->join('member_profiles', 'member_profiles.user_id', '=', 'users.id')
            ->leftJoin('orders', function ($join): void {
                $join
                    ->on('orders.member_id', '=', 'users.id')
                    ->where('orders.payment_status', '=', 'paid');
            })
            ->leftJoin('order_items', 'order_items.order_id', '=', 'orders.id')
            ->groupBy(
                'users.id',
                'users.full_name',
                'users.username',
                'users.email',
                'users.phone_number',
                'users.avatar',
                'users.is_active',
                'users.created_at',
                'member_profiles.total_points',
            )
            ->orderByDesc('users.id')
            ->paginate(20, [
                'users.id',
                'users.full_name',
                'users.username',
                'users.email',
                'users.phone_number',
                'users.avatar',
                'users.is_active',
                'users.created_at',
                'member_profiles.total_points as total_points',
                \DB::raw('COUNT(DISTINCT orders.id) as orders_paid'),
                \DB::raw('COALESCE(SUM(order_items.quantity), 0) as items_count'),
                \DB::raw('COALESCE(SUM(orders.total_amount), 0) as total_purchase'),
            ]);

        return response()->json($members);
    }
}

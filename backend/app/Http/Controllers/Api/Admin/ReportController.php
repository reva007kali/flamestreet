<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function ordersExport(Request $request)
    {
        $data = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'type' => ['nullable', 'string'],
        ]);

        $from = isset($data['from']) ? Carbon::parse($data['from'])->startOfDay() : Carbon::now()->startOfMonth();
        $to = isset($data['to']) ? Carbon::parse($data['to'])->endOfDay() : Carbon::now()->endOfDay();
        if ($to->lessThan($from)) {
            [$from, $to] = [$to->copy()->startOfDay(), $from->copy()->endOfDay()];
        }

        $type = $data['type'] ?? 'orders';
        if (! in_array($type, ['orders', 'items'], true)) {
            $type = 'orders';
        }

        $filename = sprintf(
            'report-%s-%s-to-%s.csv',
            $type,
            $from->toDateString(),
            $to->toDateString(),
        );

        return response()->streamDownload(function () use ($from, $to, $type): void {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF");

            if ($type === 'items') {
                fputcsv($out, [
                    'order_number',
                    'order_date',
                    'member_id',
                    'member_name',
                    'member_email',
                    'status',
                    'payment_status',
                    'product_id',
                    'product_name',
                    'quantity',
                    'unit_price',
                    'line_subtotal',
                    'choices_json',
                    'item_notes',
                ]);

                DB::table('order_items')
                    ->join('orders', 'orders.id', '=', 'order_items.order_id')
                    ->leftJoin('users', 'users.id', '=', 'orders.member_id')
                    ->where('orders.payment_status', 'paid')
                    ->whereBetween('orders.created_at', [$from, $to])
                    ->orderBy('orders.id')
                    ->orderBy('order_items.id')
                    ->select([
                        'orders.order_number',
                        'orders.created_at as order_date',
                        'orders.member_id',
                        'users.full_name as member_name',
                        'users.email as member_email',
                        'orders.status',
                        'orders.payment_status',
                        'order_items.product_id',
                        'order_items.product_name',
                        'order_items.quantity',
                        'order_items.product_price as unit_price',
                        'order_items.subtotal as line_subtotal',
                        'order_items.modifier_options as choices_json',
                        'order_items.item_notes',
                    ])
                    ->lazyById(500, 'order_items.id')
                    ->each(function ($r) use ($out): void {
                        fputcsv($out, [
                            $r->order_number,
                            Carbon::parse($r->order_date)->toDateString(),
                            $r->member_id,
                            $r->member_name,
                            $r->member_email,
                            $r->status,
                            $r->payment_status,
                            $r->product_id,
                            $r->product_name,
                            (int) $r->quantity,
                            (float) $r->unit_price,
                            (float) $r->line_subtotal,
                            $r->choices_json,
                            $r->item_notes,
                        ]);
                    });

                fclose($out);
                return;
            }

            $cogsByOrder = DB::table('order_items')
                ->join('products', 'products.id', '=', 'order_items.product_id')
                ->selectRaw('order_items.order_id as order_id, COALESCE(SUM(products.hpp * order_items.quantity), 0) as cogs')
                ->groupBy('order_items.order_id');

            fputcsv($out, [
                'order_number',
                'order_date',
                'member_id',
                'member_name',
                'member_email',
                'status',
                'payment_status',
                'subtotal',
                'discount_amount',
                'delivery_fee',
                'total_amount',
                'cogs',
                'gross_profit',
                'net_profit',
            ]);

            DB::table('orders')
                ->leftJoin('users', 'users.id', '=', 'orders.member_id')
                ->leftJoinSub($cogsByOrder, 'cogs', function ($join) {
                    $join->on('cogs.order_id', '=', 'orders.id');
                })
                ->where('orders.payment_status', 'paid')
                ->whereBetween('orders.created_at', [$from, $to])
                ->orderBy('orders.id')
                ->select([
                    'orders.id',
                    'orders.order_number',
                    'orders.created_at as order_date',
                    'orders.member_id',
                    'users.full_name as member_name',
                    'users.email as member_email',
                    'orders.status',
                    'orders.payment_status',
                    'orders.subtotal',
                    'orders.discount_amount',
                    'orders.delivery_fee',
                    'orders.total_amount',
                    DB::raw('COALESCE(cogs.cogs, 0) as cogs'),
                ])
                ->lazyById(500, 'orders.id')
                ->each(function ($r) use ($out): void {
                    $subtotal = (float) $r->subtotal;
                    $discount = (float) $r->discount_amount;
                    $cogs = (float) $r->cogs;
                    $grossProfit = $subtotal - $cogs;
                    $netProfit = max(0, $subtotal - $discount) - $cogs;

                    fputcsv($out, [
                        $r->order_number,
                        Carbon::parse($r->order_date)->toDateString(),
                        $r->member_id,
                        $r->member_name,
                        $r->member_email,
                        $r->status,
                        $r->payment_status,
                        $subtotal,
                        $discount,
                        (float) $r->delivery_fee,
                        (float) $r->total_amount,
                        $cogs,
                        $grossProfit,
                        $netProfit,
                    ]);
                });

            fclose($out);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }
}


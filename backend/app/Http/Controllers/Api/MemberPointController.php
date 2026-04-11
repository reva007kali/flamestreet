<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MemberProfile;
use App\Models\Order;
use App\Services\PointService;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;

class MemberPointController extends Controller
{
    public function __construct(
        protected PointService $pointService,
    ) {
    }

    public function show(Request $request)
    {
        $mp = MemberProfile::query()->firstOrCreate(['user_id' => $request->user()->id]);
        $balance = (int) $mp->total_points;

        return response()->json([
            'balance' => $balance,
            'balance_rupiah' => $this->pointService->convertToRupiah($balance),
        ]);
    }

    public function history(Request $request)
    {
        $mp = MemberProfile::query()->firstOrCreate(['user_id' => $request->user()->id]);
        $balance = (int) $mp->total_points;

        $page = max(1, (int) $request->query('page', 1));
        $perPage = min(50, max(10, (int) $request->query('per_page', 20)));

        $orders = Order::query()
            ->where('member_id', $request->user()->id)
            ->orderByDesc('id')
            ->limit(300)
            ->get();

        $rows = [];
        foreach ($orders as $o) {
            $pointsUsed = (int) ($o->points_used ?? 0);
            $pointsEarned = (int) ($o->points_earned_member ?? 0);
            $usedSource = (string) ($o->points_used_source ?? '');

            if ($pointsUsed > 0 && $o->payment_method === 'flame-points' && $usedSource === 'member') {
                $rows[] = [
                    'id' => 'order:spent:'.$o->id,
                    'occurred_at' => $o->created_at,
                    'amount' => -$pointsUsed,
                    'direction' => 'out',
                    'source' => 'Order payment',
                    'reference_type' => 'order',
                    'reference_id' => $o->id,
                    'reference_label' => $o->order_number,
                ];
            }

            if ($o->payment_status === 'paid' && $pointsEarned > 0) {
                $rows[] = [
                    'id' => 'order:earned:'.$o->id,
                    'occurred_at' => $o->updated_at,
                    'amount' => $pointsEarned,
                    'direction' => 'in',
                    'source' => 'Order reward',
                    'reference_type' => 'order',
                    'reference_id' => $o->id,
                    'reference_label' => $o->order_number,
                ];
            }

            if ($o->rewards_reversed_at) {
                if ($pointsEarned > 0) {
                    $rows[] = [
                        'id' => 'order:reverse:earned:'.$o->id,
                        'occurred_at' => $o->rewards_reversed_at,
                        'amount' => -$pointsEarned,
                        'direction' => 'out',
                        'source' => 'Reward reversed',
                        'reference_type' => 'order',
                        'reference_id' => $o->id,
                        'reference_label' => $o->order_number,
                    ];
                }
                if ($pointsUsed > 0 && $o->payment_method === 'flame-points' && $usedSource === 'member') {
                    $rows[] = [
                        'id' => 'order:refund:spent:'.$o->id,
                        'occurred_at' => $o->rewards_reversed_at,
                        'amount' => $pointsUsed,
                        'direction' => 'in',
                        'source' => 'Points refunded',
                        'reference_type' => 'order',
                        'reference_id' => $o->id,
                        'reference_label' => $o->order_number,
                    ];
                }
            }
        }

        usort($rows, function ($a, $b) {
            $at = $a['occurred_at'] ? $a['occurred_at']->timestamp : 0;
            $bt = $b['occurred_at'] ? $b['occurred_at']->timestamp : 0;
            return $bt <=> $at;
        });

        $total = count($rows);
        $offset = ($page - 1) * $perPage;
        $items = array_slice($rows, $offset, $perPage);

        $p = new LengthAwarePaginator(
            $items,
            $total,
            $perPage,
            $page,
            ['path' => $request->url(), 'query' => $request->query()]
        );

        return response()->json([
            'balance' => $balance,
            'balance_rupiah' => $this->pointService->convertToRupiah($balance),
            'transactions' => $p,
        ]);
    }
}

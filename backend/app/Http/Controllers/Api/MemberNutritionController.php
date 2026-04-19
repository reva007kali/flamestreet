<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OrderItem;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;

class MemberNutritionController extends Controller
{
    public function weekly(Request $request)
    {
        $userId = (int) $request->user()->id;

        $now = CarbonImmutable::now();
        $start = $now->startOfDay()->subDays(6);
        $end = $now->endOfDay();

        $rows = OrderItem::query()
            ->select(['order_items.id', 'order_items.product_id', 'order_items.product_name', 'order_items.quantity', 'order_items.order_id'])
            ->with(['product:id,nutritional_info', 'order:id,member_id,status,payment_status,created_at'])
            ->whereHas('order', function ($q) use ($userId, $start, $end) {
                $q->where('member_id', $userId)
                    ->whereBetween('created_at', [$start, $end])
                    ->where('payment_status', 'paid')
                    ->whereNotIn('status', ['cancelled', 'refunded']);
            })
            ->get();

        $days = [];
        for ($i = 0; $i < 7; $i++) {
            $d = $start->addDays($i)->toDateString();
            $days[$d] = ['kcal' => 0.0, 'protein_g' => 0.0, 'carbs_g' => 0.0, 'fat_g' => 0.0];
        }

        $totals = ['kcal' => 0.0, 'protein_g' => 0.0, 'carbs_g' => 0.0, 'fat_g' => 0.0];
        $byProduct = [];

        foreach ($rows as $it) {
            $order = $it->order;
            if (! $order || (int) $order->member_id !== $userId) {
                continue;
            }

            $date = $order->created_at ? $order->created_at->toDateString() : null;
            if (! $date || ! isset($days[$date])) {
                continue;
            }

            $qty = (int) ($it->quantity ?? 1);
            if ($qty < 1) {
                $qty = 1;
            }

            $nut = is_array($it->product?->nutritional_info) ? $it->product->nutritional_info : [];
            $parsed = $this->parseNutrition($nut);

            foreach (['kcal', 'protein_g', 'carbs_g', 'fat_g'] as $k) {
                $add = ((float) ($parsed[$k] ?? 0)) * $qty;
                $totals[$k] += $add;
                $days[$date][$k] += $add;
            }

            $pid = (int) ($it->product_id ?? 0);
            if (! isset($byProduct[$pid])) {
                $byProduct[$pid] = [
                    'product_id' => $pid,
                    'name' => (string) ($it->product_name ?? ''),
                    'qty' => 0,
                    'kcal' => 0.0,
                    'protein_g' => 0.0,
                    'carbs_g' => 0.0,
                    'fat_g' => 0.0,
                ];
            }
            $byProduct[$pid]['qty'] += $qty;
            foreach (['kcal', 'protein_g', 'carbs_g', 'fat_g'] as $k) {
                $byProduct[$pid][$k] += ((float) ($parsed[$k] ?? 0)) * $qty;
            }
        }

        $byProduct = array_values($byProduct);
        usort($byProduct, fn ($a, $b) => (float) ($b['kcal'] ?? 0) <=> (float) ($a['kcal'] ?? 0));

        return response()->json([
            'range' => [
                'start' => $start->toDateString(),
                'end' => $end->toDateString(),
            ],
            'totals' => $this->roundNutrition($totals),
            'days' => array_map(fn ($v) => $this->roundNutrition($v), $days),
            'by_product' => array_map(fn ($v) => $this->roundNutrition($v), $byProduct),
        ]);
    }

    protected function parseNutrition(array $nut): array
    {
        $get = function (array $keys) use ($nut) {
            foreach ($keys as $k) {
                if (! array_key_exists($k, $nut)) {
                    continue;
                }
                $v = $nut[$k];
                if (is_numeric($v)) {
                    return (float) $v;
                }
                if (is_string($v)) {
                    $s = trim($v);
                    if ($s !== '' && is_numeric($s)) {
                        return (float) $s;
                    }
                }
            }
            return 0.0;
        };

        return [
            'kcal' => $get(['energy_kcal', 'calories_kcal', 'kcal', 'calories', 'energy']),
            'protein_g' => $get(['protein_g', 'protein']),
            'carbs_g' => $get(['carbs_g', 'carb_g', 'carbs', 'carbohydrate_g', 'carbohydrates_g', 'carbohydrate']),
            'fat_g' => $get(['fat_g', 'fat']),
        ];
    }

    protected function roundNutrition(array $v): array
    {
        $out = $v;
        foreach (['kcal', 'protein_g', 'carbs_g', 'fat_g'] as $k) {
            if (isset($out[$k])) {
                $out[$k] = (float) round((float) $out[$k], 1);
            }
        }
        return $out;
    }
}


<?php

namespace App\Services;

use App\Models\FpShopItem;
use App\Models\FpShopPurchase;
use App\Models\MemberProfile;
use App\Models\TrainerProfile;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class FpShopService
{
    public function calcCouponDiscount(FpShopItem $item, float $subtotal): float
    {
        if ((string) $item->type !== 'coupon') {
            return 0.0;
        }
        if (! $item->is_active) {
            return 0.0;
        }

        $now = Carbon::now();
        if ($item->starts_at && $now->lt($item->starts_at)) {
            return 0.0;
        }
        if ($item->ends_at && $now->gt($item->ends_at)) {
            return 0.0;
        }

        $min = $item->min_subtotal !== null ? (float) $item->min_subtotal : null;
        if ($min !== null && $subtotal < $min) {
            return 0.0;
        }

        $type = (string) ($item->discount_type ?? '');
        $value = $item->discount_value !== null ? (float) $item->discount_value : 0.0;
        if ($value <= 0) {
            return 0.0;
        }

        $discount = 0.0;
        if ($type === 'fixed') {
            $discount = $value;
        } elseif ($type === 'percent') {
            $discount = ($subtotal * $value) / 100.0;
        } else {
            return 0.0;
        }

        $max = $item->max_discount !== null ? (float) $item->max_discount : null;
        if ($max !== null && $discount > $max) {
            $discount = $max;
        }

        if ($discount < 0) {
            $discount = 0.0;
        }
        if ($discount > $subtotal) {
            $discount = $subtotal;
        }

        return $discount;
    }

    public function buy(User $user, FpShopItem $item): FpShopPurchase
    {
        if (! $item->is_active) {
            throw ValidationException::withMessages(['item' => 'Item not available']);
        }
        $price = (int) ($item->fp_price ?? 0);
        if ($price <= 0) {
            throw ValidationException::withMessages(['item' => 'Invalid price']);
        }

        return DB::transaction(function () use ($user, $item, $price) {
            if ($user->hasRole('trainer')) {
                $tp = TrainerProfile::query()->where('user_id', $user->id)->lockForUpdate()->first();
                if (! $tp) {
                    throw ValidationException::withMessages(['points' => 'Trainer profile not found']);
                }
                if ((int) $tp->total_points < $price) {
                    throw ValidationException::withMessages(['points' => 'Insufficient points']);
                }
                $tp->total_points = (int) $tp->total_points - $price;
                $tp->save();

                \App\Models\PointTransaction::query()->create([
                    'trainer_id' => $tp->id,
                    'amount' => -$price,
                    'type' => 'redeemed',
                    'reference_type' => 'fp_shop_item',
                    'reference_id' => $item->id,
                    'description' => 'FP Shop purchase',
                    'expires_at' => null,
                ]);
            } else {
                $mp = MemberProfile::query()->firstOrCreate(['user_id' => $user->id]);
                $mp = MemberProfile::query()->where('user_id', $user->id)->lockForUpdate()->first();
                if (! $mp) {
                    throw ValidationException::withMessages(['points' => 'Member profile not found']);
                }
                if ((int) $mp->total_points < $price) {
                    throw ValidationException::withMessages(['points' => 'Insufficient points']);
                }
                $mp->total_points = (int) $mp->total_points - $price;
                $mp->save();
            }

            return FpShopPurchase::query()->create([
                'user_id' => $user->id,
                'item_id' => $item->id,
                'status' => 'available',
            ]);
        });
    }
}

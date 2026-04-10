<?php

namespace App\Services;

use App\Models\PointSetting;
use App\Models\PointTransaction;
use App\Models\TrainerProfile;
use Illuminate\Support\Facades\DB;

class PointService
{
    public function addPoints(int $trainerId, int $amount, string $type, ?string $refType = null, ?int $refId = null, ?string $description = null): void
    {
        DB::transaction(function () use ($trainerId, $amount, $type, $refType, $refId, $description): void {
            $trainer = TrainerProfile::query()->lockForUpdate()->findOrFail($trainerId);

            $trainer->total_points = max(0, $trainer->total_points + $amount);
            $trainer->save();

            PointTransaction::query()->create([
                'trainer_id' => $trainer->id,
                'amount' => $amount,
                'type' => $type,
                'reference_type' => $refType,
                'reference_id' => $refId,
                'description' => $description,
                'expires_at' => null,
            ]);

            $this->updateTier($trainer);
        });
    }

    public function redeemPoints(int $trainerId, int $amount, ?string $description = null, ?string $refType = null, ?int $refId = null): bool
    {
        $min = (int) (PointSetting::get('min_redeem_points', '0') ?? '0');
        if ($amount < $min) {
            return false;
        }

        return (bool) DB::transaction(function () use ($trainerId, $amount, $description, $refType, $refId) {
            $trainer = TrainerProfile::query()->lockForUpdate()->findOrFail($trainerId);

            if ($trainer->total_points < $amount) {
                return false;
            }

            $trainer->total_points -= $amount;
            $trainer->save();

            PointTransaction::query()->create([
                'trainer_id' => $trainer->id,
                'amount' => -$amount,
                'type' => 'redeemed',
                'reference_type' => $refType,
                'reference_id' => $refId,
                'description' => $description,
                'expires_at' => null,
            ]);

            $this->updateTier($trainer);

            return true;
        });
    }

    public function convertToRupiah(int $points): float
    {
        $rate = (float) (PointSetting::get('point_to_rupiah_rate', '0') ?? '0');

        return $points * $rate;
    }

    public function updateTier(TrainerProfile $trainerProfile): void
    {
        $total = (int) $trainerProfile->total_points;
        $silver = (int) (PointSetting::get('tier_silver_threshold', '0') ?? '0');
        $gold = (int) (PointSetting::get('tier_gold_threshold', '0') ?? '0');
        $platinum = (int) (PointSetting::get('tier_platinum_threshold', '0') ?? '0');

        $tier = 'bronze';
        if ($total >= $platinum) {
            $tier = 'platinum';
        } elseif ($total >= $gold) {
            $tier = 'gold';
        } elseif ($total >= $silver) {
            $tier = 'silver';
        }

        if ($trainerProfile->tier !== $tier) {
            $trainerProfile->tier = $tier;
            $trainerProfile->save();
        }
    }
}

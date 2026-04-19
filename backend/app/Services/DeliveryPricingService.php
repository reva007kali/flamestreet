<?php

namespace App\Services;

use App\Models\DeliveryBranch;
use App\Models\PointSetting;

class DeliveryPricingService
{
    public function quote(float $lat, float $lng): ?array
    {
        $branches = DeliveryBranch::query()
            ->where('is_active', true)
            ->get(['id', 'name', 'address', 'city', 'province', 'lat', 'lng']);

        if ($branches->isEmpty()) {
            return null;
        }

        $best = null;
        foreach ($branches as $b) {
            $d = $this->distanceMeters($lat, $lng, (float) $b->lat, (float) $b->lng);
            if ($best === null || $d < $best['distance_m']) {
                $best = [
                    'branch' => $b,
                    'distance_m' => (int) round($d),
                ];
            }
        }

        if (! $best) {
            return null;
        }

        $rate = (float) (PointSetting::get('delivery_fee_per_meter', '2') ?? '2');
        $min = (float) (PointSetting::get('delivery_min_fee', '0') ?? '0');
        $max = (float) (PointSetting::get('delivery_max_fee', '0') ?? '0');

        $fee = ((float) $best['distance_m']) * $rate;
        if ($min > 0) {
            $fee = max($min, $fee);
        }
        if ($max > 0) {
            $fee = min($max, $fee);
        }

        return [
            'branch' => [
                'id' => (int) $best['branch']->id,
                'name' => (string) $best['branch']->name,
                'address' => $best['branch']->address,
                'city' => $best['branch']->city,
                'province' => $best['branch']->province,
                'lat' => (float) $best['branch']->lat,
                'lng' => (float) $best['branch']->lng,
            ],
            'distance_m' => (int) $best['distance_m'],
            'fee' => (float) round($fee, 0),
            'rate_per_meter' => $rate,
            'min_fee' => $min,
            'max_fee' => $max,
        ];
    }

    protected function distanceMeters(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $r = 6371000.0;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) * sin($dLat / 2)
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2))
            * sin($dLng / 2) * sin($dLng / 2);
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
        return $r * $c;
    }
}


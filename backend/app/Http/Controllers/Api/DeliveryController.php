<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DeliveryBranch;
use App\Services\DeliveryPricingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class DeliveryController extends Controller
{
    public function __construct(protected DeliveryPricingService $pricing)
    {
    }

    public function branches(Request $request)
    {
        $rows = DeliveryBranch::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'address', 'city', 'province', 'lat', 'lng'])
            ->map(fn ($b) => [
                'id' => (int) $b->id,
                'name' => (string) $b->name,
                'address' => $b->address,
                'city' => $b->city,
                'province' => $b->province,
                'lat' => (float) $b->lat,
                'lng' => (float) $b->lng,
            ])
            ->values()
            ->all();

        return response()->json(['branches' => $rows]);
    }

    public function quote(Request $request)
    {
        $data = $request->validate([
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lng' => ['required', 'numeric', 'between:-180,180'],
        ]);

        $q = $this->pricing->quote((float) $data['lat'], (float) $data['lng']);
        if (! $q) {
            return response()->json(['message' => 'No active branches'], 422);
        }

        return response()->json(['quote' => $q]);
    }

    public function reverseGeocode(Request $request)
    {
        $data = $request->validate([
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lng' => ['required', 'numeric', 'between:-180,180'],
        ]);

        $lat = (float) $data['lat'];
        $lng = (float) $data['lng'];
        $key = sprintf('revgeo:%0.5f:%0.5f', $lat, $lng);

        $res = Cache::remember($key, now()->addDays(7), function () use ($lat, $lng) {
            $r = Http::timeout(6)
                ->withHeaders([
                    'User-Agent' => 'Flamestreet/1.0 (delivery reverse geocode)',
                    'Accept-Language' => 'id,en;q=0.7',
                ])
                ->get('https://nominatim.openstreetmap.org/reverse', [
                    'format' => 'jsonv2',
                    'lat' => $lat,
                    'lon' => $lng,
                    'zoom' => 18,
                    'addressdetails' => 1,
                ]);

            if (! $r->ok()) {
                return null;
            }

            $j = $r->json();
            $display = is_array($j) ? ($j['display_name'] ?? null) : null;
            $addr = is_array($j) ? ($j['address'] ?? null) : null;
            $city = is_array($addr) ? ($addr['city'] ?? $addr['town'] ?? $addr['village'] ?? null) : null;
            $state = is_array($addr) ? ($addr['state'] ?? null) : null;
            $road = is_array($addr) ? ($addr['road'] ?? null) : null;
            $house = is_array($addr) ? ($addr['house_number'] ?? null) : null;
            $suburb = is_array($addr) ? ($addr['suburb'] ?? $addr['neighbourhood'] ?? null) : null;

            $parts = array_values(array_filter([
                trim((string) ($road ? ($house ? $road.' '.$house : $road) : '')) ?: null,
                $suburb ? trim((string) $suburb) : null,
                $city ? trim((string) $city) : null,
                $state ? trim((string) $state) : null,
            ]));

            $label = count($parts) ? implode(', ', $parts) : (is_string($display) ? $display : null);

            return [
                'label' => $label,
                'display_name' => is_string($display) ? $display : null,
                'address' => is_array($addr) ? $addr : null,
            ];
        });

        if (! $res || empty($res['label'])) {
            return response()->json(['message' => 'Reverse geocode unavailable'], 422);
        }

        return response()->json(['result' => $res]);
    }

    public function geocodeSearch(Request $request)
    {
        $data = $request->validate([
            'q' => ['required', 'string', 'max:200'],
        ]);

        $q = trim((string) $data['q']);
        if ($q === '') {
            return response()->json(['results' => []]);
        }

        $key = 'geosearch:'.sha1(mb_strtolower($q));

        $res = Cache::remember($key, now()->addHours(12), function () use ($q) {
            $r = Http::timeout(6)
                ->withHeaders([
                    'User-Agent' => 'Flamestreet/1.0 (delivery geocode search)',
                    'Accept-Language' => 'id,en;q=0.7',
                ])
                ->get('https://nominatim.openstreetmap.org/search', [
                    'format' => 'jsonv2',
                    'q' => $q,
                    'limit' => 5,
                    'addressdetails' => 1,
                ]);

            if (! $r->ok()) {
                return null;
            }

            $rows = $r->json();
            if (! is_array($rows)) {
                return null;
            }

            $out = [];
            foreach ($rows as $row) {
                if (! is_array($row)) {
                    continue;
                }
                $lat = isset($row['lat']) ? (float) $row['lat'] : null;
                $lng = isset($row['lon']) ? (float) $row['lon'] : null;
                $display = isset($row['display_name']) ? (string) $row['display_name'] : null;
                if ($lat === null || $lng === null || ! $display) {
                    continue;
                }
                $out[] = [
                    'label' => $display,
                    'display_name' => $display,
                    'lat' => $lat,
                    'lng' => $lng,
                ];
            }

            return $out;
        });

        if ($res === null) {
            return response()->json(['message' => 'Search unavailable'], 422);
        }

        return response()->json(['results' => $res]);
    }
}

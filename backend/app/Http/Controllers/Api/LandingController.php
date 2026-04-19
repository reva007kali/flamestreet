<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Gym;
use App\Models\Product;
use Illuminate\Http\Request;

class LandingController extends Controller
{
    public function show(Request $request)
    {
        $products = Product::query()
            ->with(['category:id,name'])
            ->where('is_available', true)
            ->orderByDesc('is_featured')
            ->orderBy('sort_order')
            ->orderByDesc('id')
            ->limit(9)
            ->get([
                'id',
                'category_id',
                'name',
                'slug',
                'description',
                'nutritional_info',
                'price',
                'image',
                'is_featured',
                'weight_gram',
            ])
            ->map(function (Product $p) {
                return [
                    'id' => $p->id,
                    'name' => $p->name,
                    'slug' => $p->slug,
                    'description' => $p->description,
                    'nutritional_info' => $p->nutritional_info,
                    'price' => $p->price,
                    'image' => $p->image,
                    'is_featured' => (bool) $p->is_featured,
                    'weight_gram' => $p->weight_gram,
                    'category' => $p->category ? ['id' => $p->category->id, 'name' => $p->category->name] : null,
                ];
            })
            ->values()
            ->all();

        $gyms = Gym::query()
            ->where('is_active', true)
            ->orderBy('city')
            ->orderBy('gym_name')
            ->get(['id', 'gym_name', 'address', 'city', 'province', 'image'])
            ->map(function (Gym $g) {
                return [
                    'id' => $g->id,
                    'gym_name' => $g->gym_name,
                    'address' => $g->address,
                    'city' => $g->city,
                    'province' => $g->province,
                    'image' => $g->image,
                ];
            })
            ->values()
            ->all();

        $coverageByCity = collect($gyms)
            ->groupBy(fn ($g) => (string) ($g['city'] ?? ''))
            ->map(function ($items, $city) {
                $city = trim((string) $city);
                $province = null;
                foreach ($items as $it) {
                    $p = isset($it['province']) ? trim((string) $it['province']) : null;
                    if ($p) {
                        $province = $p;
                        break;
                    }
                }
                return [
                    'city' => $city,
                    'province' => $province,
                    'count' => count($items),
                ];
            })
            ->values()
            ->sortByDesc('count')
            ->values()
            ->all();

        return response()->json([
            'products' => $products,
            'gyms' => $gyms,
            'coverage' => $coverageByCity,
            'stats' => [
                'products' => count($products),
                'gyms' => count($gyms),
            ],
        ]);
    }
}


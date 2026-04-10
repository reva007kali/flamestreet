<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PromoBanner;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PromoBannerController extends Controller
{
    public function index(Request $request)
    {
        $data = $request->validate([
            'audience' => ['nullable', Rule::in(['member', 'trainer'])],
        ]);

        $audience = $data['audience'] ?? null;

        $q = PromoBanner::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderByDesc('id');

        if ($audience) {
            $q->whereIn('audience', [$audience, 'both']);
        }

        return response()->json(['banners' => $q->get()]);
    }
}


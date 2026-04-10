<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductCategory;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $query = Product::query()->with('category')->withCount('modifiers');

        if ($request->filled('category')) {
            $cat = $request->string('category')->toString();
            $categoryId = is_numeric($cat) ? (int) $cat : ProductCategory::query()->where('slug', $cat)->value('id');
            if ($categoryId) {
                $query->where('category_id', $categoryId);
            }
        }

        if ($request->boolean('featured')) {
            $query->where('is_featured', true);
        }

        if (! $request->boolean('include_unavailable')) {
            $query->where('is_available', true);
        }

        $products = $query->orderBy('sort_order')->orderByDesc('id')->paginate(20);

        return response()->json($products);
    }

    public function show(string $slug)
    {
        $product = Product::query()
            ->with(['category', 'modifiers.options'])
            ->where('slug', $slug)
            ->firstOrFail();

        return response()->json(['product' => $product]);
    }
}

<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductModifier;
use App\Models\ProductModifierOption;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ProductController extends Controller
{
    public function index()
    {
        $products = Product::query()->with('category')->orderByDesc('id')->paginate(20);

        return response()->json($products);
    }

    public function show(int $id)
    {
        $product = Product::query()->with(['category', 'modifiers.options'])->findOrFail($id);

        return response()->json(['product' => $product]);
    }

    public function store(Request $request)
    {
        $data = $this->validateProduct($request, null);

        $product = DB::transaction(function () use ($data) {
            $product = Product::query()->create($data);
            $this->syncModifiers($product, $data['modifiers'] ?? []);

            return $product->load(['category', 'modifiers.options']);
        });

        return response()->json(['product' => $product], 201);
    }

    public function update(Request $request, int $id)
    {
        $product = Product::query()->findOrFail($id);
        $data = $this->validateProduct($request, $product->id);

        $product = DB::transaction(function () use ($product, $data) {
            $product->fill($data);
            $product->save();

            $this->syncModifiers($product, $data['modifiers'] ?? []);

            return $product->load(['category', 'modifiers.options']);
        });

        return response()->json(['product' => $product]);
    }

    public function destroy(int $id)
    {
        $product = Product::query()->findOrFail($id);

        try {
            $product->delete();
        } catch (QueryException) {
            return response()->json(['message' => 'Cannot delete product'], 422);
        }

        return response()->json(['ok' => true]);
    }

    public function uploadImage(Request $request, int $id)
    {
        $request->validate([
            'image' => ['required', 'file', 'image', 'max:5120'],
        ]);

        $product = Product::query()->findOrFail($id);
        $file = $request->file('image');
        $filename = (string) Str::uuid().'.'.$file->getClientOriginalExtension();
        $dir = public_path('uploads/product-images');
        File::ensureDirectoryExists($dir);
        $file->move($dir, $filename);
        $path = 'uploads/product-images/'.$filename;

        if ($product->image) {
            Storage::disk('public')->delete($product->image);
            File::delete(public_path($product->image));
        }

        $product->image = $path;
        $product->save();

        return response()->json(['product' => $product, 'image' => $product->image]);
    }

    public function deleteImage(int $id)
    {
        $product = Product::query()->findOrFail($id);
        if ($product->image) {
            Storage::disk('public')->delete($product->image);
            File::delete(public_path($product->image));
        }

        $product->image = null;
        $product->save();

        return response()->json(['product' => $product, 'image' => null]);
    }

    protected function validateProduct(Request $request, ?int $productId): array
    {
        return $request->validate([
            'category_id' => ['required', 'integer', 'exists:product_categories,id'],
            'name' => ['required', 'string', 'max:150'],
            'slug' => ['required', 'string', 'max:150', Rule::unique('products', 'slug')->ignore($productId)],
            'description' => ['nullable', 'string'],
            'ingredients' => ['nullable', 'string'],
            'nutritional_info' => ['nullable', 'array'],
            'hpp' => ['required', 'numeric', 'min:0'],
            'price' => ['required', 'numeric', 'min:0'],
            'image' => ['nullable', 'string', 'max:255'],
            'images' => ['nullable', 'array'],
            'weight_gram' => ['nullable', 'integer', 'min:0'],
            'is_available' => ['nullable', 'boolean'],
            'is_featured' => ['nullable', 'boolean'],
            'sort_order' => ['nullable', 'integer'],
            'point_reward' => ['nullable', 'integer', 'min:0'],
            'point_reward_member' => ['nullable', 'integer', 'min:0'],
            'point_reward_trainer' => ['nullable', 'integer', 'min:0'],
            'modifiers' => ['nullable', 'array'],
            'modifiers.*.name' => ['required_with:modifiers', 'string', 'max:100'],
            'modifiers.*.type' => ['required_with:modifiers', Rule::in(['single', 'multiple'])],
            'modifiers.*.is_required' => ['nullable', 'boolean'],
            'modifiers.*.sort_order' => ['nullable', 'integer'],
            'modifiers.*.options' => ['nullable', 'array'],
            'modifiers.*.options.*.name' => ['required_with:modifiers.*.options', 'string', 'max:100'],
            'modifiers.*.options.*.additional_price' => ['nullable', 'numeric'],
            'modifiers.*.options.*.is_default' => ['nullable', 'boolean'],
            'modifiers.*.options.*.sort_order' => ['nullable', 'integer'],
        ]);
    }

    protected function syncModifiers(Product $product, array $modifiers): void
    {
        ProductModifierOption::query()->whereIn('modifier_id', function ($q) use ($product) {
            $q->select('id')->from('product_modifiers')->where('product_id', $product->id);
        })->delete();
        ProductModifier::query()->where('product_id', $product->id)->delete();

        foreach ($modifiers as $modifierData) {
            $modifier = ProductModifier::query()->create([
                'product_id' => $product->id,
                'name' => $modifierData['name'],
                'type' => $modifierData['type'] ?? 'single',
                'is_required' => $modifierData['is_required'] ?? false,
                'sort_order' => $modifierData['sort_order'] ?? 0,
            ]);

            foreach (($modifierData['options'] ?? []) as $opt) {
                ProductModifierOption::query()->create([
                    'modifier_id' => $modifier->id,
                    'name' => $opt['name'],
                    'additional_price' => $opt['additional_price'] ?? 0,
                    'is_default' => $opt['is_default'] ?? false,
                    'sort_order' => $opt['sort_order'] ?? 0,
                ]);
            }
        }
    }
}

<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ProductCategory;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ProductCategoryController extends Controller
{
    public function index()
    {
        return response()->json(
            ProductCategory::query()->orderBy('sort_order')->orderBy('name')->paginate(50),
        );
    }

    public function show(int $id)
    {
        return response()->json(['category' => ProductCategory::query()->findOrFail($id)]);
    }

    public function store(Request $request)
    {
        $data = $this->validateCategory($request, null);
        $category = ProductCategory::query()->create($data);

        return response()->json(['category' => $category], 201);
    }

    public function update(Request $request, int $id)
    {
        $category = ProductCategory::query()->findOrFail($id);
        $data = $this->validateCategory($request, $category->id);

        $category->fill($data);
        $category->save();

        return response()->json(['category' => $category]);
    }

    public function destroy(int $id)
    {
        $category = ProductCategory::query()->findOrFail($id);

        try {
            $category->delete();
        } catch (QueryException) {
            return response()->json(['message' => 'Cannot delete category'], 422);
        }

        return response()->json(['ok' => true]);
    }

    public function uploadImage(Request $request, int $id)
    {
        $request->validate([
            'image' => ['required', 'file', 'image', 'max:5120'],
        ]);

        $category = ProductCategory::query()->findOrFail($id);
        $file = $request->file('image');
        $filename = (string) Str::uuid().'.'.$file->getClientOriginalExtension();
        $dir = public_path('uploads/category-images');
        File::ensureDirectoryExists($dir);
        $file->move($dir, $filename);
        $path = 'uploads/category-images/'.$filename;

        if ($category->image) {
            Storage::disk('public')->delete($category->image);
            File::delete(public_path($category->image));
        }

        $category->image = $path;
        $category->save();

        return response()->json(['category' => $category, 'image' => $category->image]);
    }

    public function deleteImage(int $id)
    {
        $category = ProductCategory::query()->findOrFail($id);
        if ($category->image) {
            Storage::disk('public')->delete($category->image);
            File::delete(public_path($category->image));
        }

        $category->image = null;
        $category->save();

        return response()->json(['category' => $category, 'image' => null]);
    }

    protected function validateCategory(Request $request, ?int $id): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'slug' => ['required', 'string', 'max:100', Rule::unique('product_categories', 'slug')->ignore($id)],
            'description' => ['nullable', 'string'],
            'image' => ['nullable', 'string', 'max:255'],
            'sort_order' => ['nullable', 'integer'],
            'is_active' => ['nullable', 'boolean'],
        ]);
    }
}

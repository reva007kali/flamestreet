<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\PromoBanner;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class PromoBannerController extends Controller
{
    public function index()
    {
        return response()->json(
            PromoBanner::query()->orderBy('sort_order')->orderByDesc('id')->paginate(50),
        );
    }

    public function show(int $id)
    {
        return response()->json(['banner' => PromoBanner::query()->findOrFail($id)]);
    }

    public function store(Request $request)
    {
        $data = $this->validateBanner($request);
        $banner = PromoBanner::query()->create($data);

        return response()->json(['banner' => $banner], 201);
    }

    public function update(Request $request, int $id)
    {
        $banner = PromoBanner::query()->findOrFail($id);
        $data = $this->validateBanner($request);

        $banner->fill($data);
        $banner->save();

        return response()->json(['banner' => $banner]);
    }

    public function destroy(int $id)
    {
        $banner = PromoBanner::query()->findOrFail($id);

        try {
            $banner->delete();
        } catch (QueryException) {
            return response()->json(['message' => 'Cannot delete banner'], 422);
        }

        return response()->json(['ok' => true]);
    }

    public function uploadImage(Request $request, int $id)
    {
        $request->validate([
            'image' => ['required', 'file', 'image', 'max:10240'],
        ]);

        $banner = PromoBanner::query()->findOrFail($id);
        $file = $request->file('image');
        $filename = (string) Str::uuid() . '.' . $file->getClientOriginalExtension();
        $dir = public_path('uploads/promo-banners');
        File::ensureDirectoryExists($dir);
        $file->move($dir, $filename);
        $path = 'uploads/promo-banners/' . $filename;

        if ($banner->image) {
            Storage::disk('public')->delete($banner->image);
            File::delete(public_path($banner->image));
        }

        $banner->image = $path;
        $banner->save();

        return response()->json(['banner' => $banner, 'image' => $banner->image]);
    }

    public function deleteImage(int $id)
    {
        $banner = PromoBanner::query()->findOrFail($id);
        if ($banner->image) {
            Storage::disk('public')->delete($banner->image);
            File::delete(public_path($banner->image));
        }

        $banner->image = null;
        $banner->save();

        return response()->json(['banner' => $banner, 'image' => null]);
    }

    protected function validateBanner(Request $request): array
    {
        return $request->validate([
            'audience' => ['required', Rule::in(['member', 'trainer', 'both'])],
            'kicker' => ['nullable', 'string', 'max:60'],
            'title' => ['required', 'string', 'max:120'],
            'subtitle' => ['nullable', 'string', 'max:200'],
            'image' => ['nullable', 'string', 'max:255'],
            'is_active' => ['nullable', 'boolean'],
            'sort_order' => ['nullable', 'integer'],
        ]);
    }
}

<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\FpShopItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class FpShopItemController extends Controller
{
    public function index(Request $request)
    {
        $data = $request->validate([
            'type' => ['nullable', 'string', Rule::in(['coupon', 'merch'])],
        ]);

        $type = $data['type'] ?? null;

        $items = FpShopItem::query()
            ->when($type, fn ($q) => $q->where('type', $type))
            ->orderBy('sort_order')
            ->orderByDesc('id')
            ->get();

        return response()->json(['items' => $items]);
    }

    public function show(int $id)
    {
        $item = FpShopItem::query()->findOrFail($id);
        return response()->json(['item' => $item]);
    }

    public function store(Request $request)
    {
        $data = $this->validateItem($request);
        $data['created_by'] = $request->user()->id;

        $item = FpShopItem::query()->create($data);
        return response()->json(['item' => $item], 201);
    }

    public function update(Request $request, int $id)
    {
        $item = FpShopItem::query()->findOrFail($id);
        $data = $this->validateItem($request);
        $item->update($data);
        return response()->json(['item' => $item]);
    }

    public function destroy(int $id)
    {
        $item = FpShopItem::query()->findOrFail($id);

        if ($item->image_path) {
            Storage::disk('public')->delete($item->image_path);
            File::delete(public_path($item->image_path));
        }

        $item->delete();
        return response()->json(['ok' => true]);
    }

    public function uploadImage(Request $request, int $id)
    {
        $request->validate([
            'image' => ['required', 'file', 'image', 'max:5120'],
        ]);

        $item = FpShopItem::query()->findOrFail($id);
        $file = $request->file('image');

        $dir = 'uploads/fp-shop/items';
        File::ensureDirectoryExists(public_path($dir));
        $name = uniqid('item_', true).'.'.$file->getClientOriginalExtension();
        $file->move(public_path($dir), $name);

        if ($item->image_path) {
            Storage::disk('public')->delete($item->image_path);
            File::delete(public_path($item->image_path));
        }

        $item->image_path = $dir.'/'.$name;
        $item->save();

        return response()->json(['item' => $item]);
    }

    public function deleteImage(int $id)
    {
        $item = FpShopItem::query()->findOrFail($id);
        if ($item->image_path) {
            Storage::disk('public')->delete($item->image_path);
            File::delete(public_path($item->image_path));
        }
        $item->image_path = null;
        $item->save();
        return response()->json(['item' => $item]);
    }

    protected function validateItem(Request $request): array
    {
        $data = $request->validate([
            'type' => ['required', 'string', Rule::in(['coupon', 'merch'])],
            'name' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string'],
            'fp_price' => ['required', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],

            'discount_type' => ['nullable', 'string', Rule::in(['fixed', 'percent'])],
            'discount_value' => ['nullable', 'numeric', 'min:0'],
            'min_subtotal' => ['nullable', 'numeric', 'min:0'],
            'max_discount' => ['nullable', 'numeric', 'min:0'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date'],
        ]);

        if (($data['type'] ?? null) !== 'coupon') {
            $data['discount_type'] = null;
            $data['discount_value'] = null;
            $data['min_subtotal'] = null;
            $data['max_discount'] = null;
            $data['starts_at'] = null;
            $data['ends_at'] = null;
        }

        return $data;
    }
}


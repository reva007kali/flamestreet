<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\DeliveryBranch;
use Illuminate\Http\Request;

class DeliveryBranchController extends Controller
{
    public function index()
    {
        return response()->json([
            'branches' => DeliveryBranch::query()
                ->orderByDesc('is_active')
                ->orderBy('name')
                ->get(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'address' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:100'],
            'province' => ['nullable', 'string', 'max:100'],
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lng' => ['required', 'numeric', 'between:-180,180'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $b = DeliveryBranch::query()->create($data);

        return response()->json(['branch' => $b]);
    }

    public function update(Request $request, int $id)
    {
        $b = DeliveryBranch::query()->findOrFail($id);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'address' => ['sometimes', 'nullable', 'string', 'max:255'],
            'city' => ['sometimes', 'nullable', 'string', 'max:100'],
            'province' => ['sometimes', 'nullable', 'string', 'max:100'],
            'lat' => ['sometimes', 'numeric', 'between:-90,90'],
            'lng' => ['sometimes', 'numeric', 'between:-180,180'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $b->fill($data);
        $b->save();

        return response()->json(['branch' => $b]);
    }

    public function destroy(int $id)
    {
        $b = DeliveryBranch::query()->findOrFail($id);
        $b->delete();

        return response()->json(['ok' => true]);
    }
}


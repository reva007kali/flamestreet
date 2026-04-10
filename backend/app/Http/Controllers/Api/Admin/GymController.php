<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Gym;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class GymController extends Controller
{
    public function index()
    {
        $gyms = Gym::query()->orderByDesc('id')->paginate(20);

        return response()->json($gyms);
    }

    public function show(int $id)
    {
        return response()->json(['gym' => Gym::query()->findOrFail($id)]);
    }

    public function store(Request $request)
    {
        $data = $this->validateGym($request);

        $gym = Gym::query()->create($data + ['is_active' => $data['is_active'] ?? true]);

        return response()->json(['gym' => $gym], 201);
    }

    public function update(Request $request, int $id)
    {
        $gym = Gym::query()->findOrFail($id);
        $data = $this->validateGym($request);

        $gym->fill($data + ['is_active' => $data['is_active'] ?? true]);
        $gym->save();

        return response()->json(['gym' => $gym]);
    }

    public function destroy(int $id)
    {
        $gym = Gym::query()->findOrFail($id);

        if ($gym->image) {
            Storage::disk('public')->delete($gym->image);
            File::delete(public_path($gym->image));
        }

        try {
            $gym->delete();
        } catch (QueryException) {
            return response()->json(['message' => 'Cannot delete gym'], 422);
        }

        return response()->json(['ok' => true]);
    }

    public function uploadImage(Request $request, int $id)
    {
        $request->validate([
            'image' => ['required', 'file', 'image', 'max:5120'],
        ]);

        $gym = Gym::query()->findOrFail($id);
        $file = $request->file('image');
        $filename = (string) Str::uuid().'.'.$file->getClientOriginalExtension();
        $path = $file->storePubliclyAs('gyms/images', $filename, 'public');

        if ($gym->image) {
            Storage::disk('public')->delete($gym->image);
            File::delete(public_path($gym->image));
        }

        $gym->image = $path;
        $gym->save();

        return response()->json(['gym' => $gym, 'image' => $gym->image]);
    }

    public function deleteImage(int $id)
    {
        $gym = Gym::query()->findOrFail($id);
        if ($gym->image) {
            Storage::disk('public')->delete($gym->image);
            File::delete(public_path($gym->image));
        }

        $gym->image = null;
        $gym->save();

        return response()->json(['gym' => $gym, 'image' => null]);
    }

    protected function validateGym(Request $request): array
    {
        return $request->validate([
            'gym_name' => ['required', 'string', 'max:100'],
            'address' => ['required', 'string'],
            'city' => ['required', 'string', 'max:100'],
            'province' => ['nullable', 'string', 'max:100'],
            'is_active' => ['nullable', 'boolean'],
        ]);
    }
}

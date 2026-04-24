<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\PaymentMethod;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class PaymentMethodController extends Controller
{
    public function index()
    {
        return response()->json(
            PaymentMethod::query()->orderBy('sort_order')->orderBy('name')->paginate(50),
        );
    }

    public function show(int $id)
    {
        return response()->json(['method' => PaymentMethod::query()->findOrFail($id)]);
    }

    public function store(Request $request)
    {
        $data = $this->validateMethod($request, null);
        if (empty($data['code'])) {
            $data['code'] = Str::slug($data['name']);
        }

        if (!empty($data['icon'])) {
            $file = $data['icon'];
            $filename = (string) Str::uuid().'.'.$file->getClientOriginalExtension();
            $dir = public_path('uploads/payment-method-icons');
            File::ensureDirectoryExists($dir);
            $file->move($dir, $filename);
            $data['icon'] = 'uploads/payment-method-icons/'.$filename;
        }

        $method = PaymentMethod::query()->create($data);

        return response()->json(['method' => $method], 201);
    }

    public function update(Request $request, int $id)
    {
        $method = PaymentMethod::query()->findOrFail($id);
        $data = $this->validateMethod($request, $method->id);
        if (empty($data['code'])) {
            $data['code'] = Str::slug($data['name']);
        }

        if (!empty($data['icon'])) {
            $file = $data['icon'];
            $filename = (string) Str::uuid().'.'.$file->getClientOriginalExtension();
            $dir = public_path('uploads/payment-method-icons');
            File::ensureDirectoryExists($dir);
            $file->move($dir, $filename);
            $path = 'uploads/payment-method-icons/'.$filename;

            if ($method->icon) {
                Storage::disk('public')->delete($method->icon);
                File::delete(public_path($method->icon));
            }

            $data['icon'] = $path;
        } else {
            unset($data['icon']);
        }

        $method->fill($data);
        $method->save();

        return response()->json(['method' => $method]);
    }

    public function destroy(int $id)
    {
        $method = PaymentMethod::query()->findOrFail($id);

        try {
            if ($method->icon) {
                Storage::disk('public')->delete($method->icon);
                File::delete(public_path($method->icon));
            }
            $method->delete();
        } catch (QueryException) {
            return response()->json(['message' => 'Cannot delete payment method'], 422);
        }

        return response()->json(['ok' => true]);
    }

    protected function validateMethod(Request $request, ?int $id): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'code' => ['nullable', 'string', 'max:60', Rule::unique('payment_methods', 'code')->ignore($id)],
            'type' => ['required', Rule::in(['bank_transfer', 'cash', 'other'])],
            'icon' => ['nullable', 'file', 'image', 'max:5120'],
            'instructions' => ['nullable', 'string'],
            'is_active' => ['nullable', 'boolean'],
            'sort_order' => ['nullable', 'integer'],
        ]);
    }
}

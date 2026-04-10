<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\PointSetting;
use Illuminate\Http\Request;

class PointSettingController extends Controller
{
    public function index()
    {
        $settings = PointSetting::query()->orderBy('key')->get();

        return response()->json(['settings' => $settings]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'settings' => ['required', 'array', 'min:1'],
            'settings.*.key' => ['required', 'string', 'max:100'],
            'settings.*.value' => ['required', 'string', 'max:255'],
            'settings.*.description' => ['nullable', 'string'],
        ]);

        foreach ($data['settings'] as $row) {
            PointSetting::query()->updateOrCreate(
                ['key' => $row['key']],
                [
                    'value' => $row['value'],
                    'description' => $row['description'] ?? null,
                    'updated_by' => $request->user()->id,
                ],
            );
        }

        return $this->index();
    }
}

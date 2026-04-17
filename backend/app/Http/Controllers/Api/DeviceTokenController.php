<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PushToken;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DeviceTokenController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'token' => ['required', 'string', 'max:512'],
            'platform' => ['required', 'string', 'max:20', Rule::in(['web'])],
        ]);

        $token = trim((string) $data['token']);
        if ($token === '') {
            return response()->json(['message' => 'Invalid token'], 422);
        }

        PushToken::query()->updateOrCreate(
            ['token' => $token],
            [
                'user_id' => (int) $request->user()->id,
                'provider' => 'fcm',
                'platform' => (string) $data['platform'],
                'last_seen_at' => now(),
            ],
        );

        return response()->json(['ok' => true]);
    }
}


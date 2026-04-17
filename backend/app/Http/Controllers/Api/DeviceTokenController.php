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
            'device_id' => ['nullable', 'string', 'max:80'],
            'user_agent' => ['nullable', 'string', 'max:512'],
        ]);

        $token = trim((string) $data['token']);
        if ($token === '') {
            return response()->json(['message' => 'Invalid token'], 422);
        }

        $userId = (int) $request->user()->id;
        $platform = (string) $data['platform'];
        $provider = 'fcm';
        $deviceId = isset($data['device_id']) ? trim((string) $data['device_id']) : null;
        if ($deviceId === '') {
            $deviceId = null;
        }
        $userAgent = isset($data['user_agent']) ? trim((string) $data['user_agent']) : null;
        if ($userAgent === '') {
            $userAgent = null;
        }

        $row = null;
        if ($deviceId) {
            $row = \DB::transaction(function () use ($token, $userId, $provider, $platform, $deviceId, $userAgent) {
                PushToken::query()
                    ->where('token', $token)
                    ->where(function ($q) use ($provider, $platform, $deviceId) {
                        $q->where('provider', '!=', $provider)
                            ->orWhere('platform', '!=', $platform)
                            ->orWhere('device_id', '!=', $deviceId)
                            ->orWhereNull('device_id');
                    })
                    ->delete();

                return PushToken::query()->updateOrCreate(
                    ['provider' => $provider, 'platform' => $platform, 'device_id' => $deviceId],
                    [
                        'user_id' => $userId,
                        'token' => $token,
                        'user_agent' => $userAgent,
                        'last_seen_at' => now(),
                    ],
                );
            });
        } else {
            $row = PushToken::query()->updateOrCreate(
                ['token' => $token],
                [
                    'user_id' => $userId,
                    'provider' => $provider,
                    'platform' => $platform,
                    'user_agent' => $userAgent,
                    'last_seen_at' => now(),
                ],
            );
        }

        $this->pruneUserTokens($userId, $provider, $platform, keep: 3, keepIds: [$row->id]);

        return response()->json(['ok' => true]);
    }

    public function destroy(Request $request)
    {
        $data = $request->validate([
            'platform' => ['required', 'string', 'max:20', Rule::in(['web'])],
            'device_id' => ['nullable', 'string', 'max:80'],
            'token' => ['nullable', 'string', 'max:512'],
        ]);

        $userId = (int) $request->user()->id;
        $platform = (string) $data['platform'];
        $provider = 'fcm';
        $deviceId = isset($data['device_id']) ? trim((string) $data['device_id']) : null;
        if ($deviceId === '') {
            $deviceId = null;
        }
        $token = isset($data['token']) ? trim((string) $data['token']) : null;
        if ($token === '') {
            $token = null;
        }

        $q = PushToken::query()
            ->where('user_id', $userId)
            ->where('provider', $provider)
            ->where('platform', $platform);

        if ($deviceId) {
            $q->where('device_id', $deviceId);
        } elseif ($token) {
            $q->where('token', $token);
        }

        $q->delete();

        return response()->json(['ok' => true]);
    }

    protected function pruneUserTokens(int $userId, string $provider, string $platform, int $keep = 3, array $keepIds = []): void
    {
        $keepIds = array_values(array_filter(array_map('intval', $keepIds)));

        $ids = PushToken::query()
            ->where('user_id', $userId)
            ->where('provider', $provider)
            ->where('platform', $platform)
            ->orderByDesc('last_seen_at')
            ->orderByDesc('id')
            ->limit(max(0, $keep))
            ->pluck('id')
            ->all();

        $keepSet = array_values(array_unique(array_merge($ids, $keepIds)));
        if (!count($keepSet)) {
            return;
        }

        PushToken::query()
            ->where('user_id', $userId)
            ->where('provider', $provider)
            ->where('platform', $platform)
            ->whereNotIn('id', $keepSet)
            ->delete();
    }
}

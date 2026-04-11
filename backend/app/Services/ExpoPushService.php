<?php

namespace App\Services;

use App\Models\PushToken;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ExpoPushService
{
    public function upsertToken(int $userId, string $token, ?string $platform = null): void
    {
        $token = trim($token);
        if ($token === '' || strlen($token) > 200) {
            return;
        }

        PushToken::query()->updateOrCreate(
            ['token' => $token],
            ['user_id' => $userId, 'platform' => $platform, 'last_seen_at' => now()],
        );
    }

    public function sendToUser(int $userId, string $title, ?string $body = null, array $data = []): void
    {
        $tokens = PushToken::query()
            ->where('user_id', $userId)
            ->pluck('token')
            ->all();

        $this->send($tokens, $title, $body, $data);
    }

    public function sendToRoles(array $roles, string $title, ?string $body = null, array $data = []): void
    {
        $userIds = User::query()->role($roles)->pluck('id')->all();
        if (! count($userIds)) {
            return;
        }

        $tokens = PushToken::query()
            ->whereIn('user_id', $userIds)
            ->pluck('token')
            ->all();

        $this->send($tokens, $title, $body, $data);
    }

    protected function send(array $tokens, string $title, ?string $body, array $data): void
    {
        $tokens = array_values(array_unique(array_filter(array_map('trim', $tokens))));
        if (! count($tokens)) {
            return;
        }

        $messages = array_map(function (string $to) use ($title, $body, $data) {
            return array_filter([
                'to' => $to,
                'title' => $title,
                'body' => $body,
                'sound' => null,
                'data' => $data,
            ], fn ($v) => $v !== null);
        }, $tokens);

        foreach (array_chunk($messages, 100) as $chunk) {
            try {
                $res = Http::timeout(5)->post('https://exp.host/--/api/v2/push/send', $chunk);
                if (! $res->ok()) {
                    Log::warning('Expo push failed', ['status' => $res->status(), 'body' => $res->body()]);
                }
            } catch (\Throwable $e) {
                Log::warning('Expo push exception', ['error' => $e->getMessage()]);
            }
        }
    }
}


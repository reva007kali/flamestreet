<?php

namespace App\Services;

use App\Models\PushToken;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Kreait\Firebase\Factory;
use Kreait\Firebase\Messaging\CloudMessage;
use Kreait\Firebase\Messaging\Notification;

class FirebaseNotificationService
{
    protected function enabled(): bool
    {
        $path = env('FIREBASE_SERVICE_ACCOUNT');
        return is_string($path) && trim($path) !== '';
    }

    protected function messaging()
    {
        $path = (string) env('FIREBASE_SERVICE_ACCOUNT');
        return (new Factory())->withServiceAccount($path)->createMessaging();
    }

    public function sendToUser(int $userId, string $title, ?string $body = null, array $data = []): void
    {
        if (! $this->enabled()) {
            return;
        }

        $tokens = PushToken::query()
            ->where('user_id', $userId)
            ->where('provider', 'fcm')
            ->pluck('token')
            ->all();

        $this->send($tokens, $title, $body, $data);
    }

    public function sendToRoles(array $roles, string $title, ?string $body = null, array $data = []): void
    {
        if (! $this->enabled()) {
            return;
        }

        $userIds = User::query()->role($roles)->pluck('id')->all();
        if (! count($userIds)) {
            return;
        }

        $tokens = PushToken::query()
            ->whereIn('user_id', $userIds)
            ->where('provider', 'fcm')
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

        $data = array_map(fn ($v) => is_scalar($v) ? (string) $v : json_encode($v), $data);

        try {
            $message = CloudMessage::new()
                ->withNotification(Notification::create($title, $body))
                ->withData(array_filter($data, fn ($v) => $v !== null));

            $report = $this->messaging()->sendMulticast($message, $tokens);

            foreach ($report->failures()->getItems() as $failure) {
                $token = $failure->target()?->value();
                $msg = $failure->error()?->getMessage();
                if (is_string($token) && $token !== '') {
                    PushToken::query()->where('token', $token)->where('provider', 'fcm')->delete();
                }
                Log::warning('FCM push failed', ['error' => $msg]);
            }
        } catch (\Throwable $e) {
            Log::warning('FCM push exception', ['error' => $e->getMessage()]);
        }
    }
}


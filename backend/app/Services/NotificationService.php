<?php

namespace App\Services;

use App\Events\NewDeliveryAssigned;
use App\Events\NewMemberReferred;
use App\Events\OrderQueueUpdated;
use App\Events\OrderStatusUpdated;
use App\Events\PointEarned;
use App\Events\UserNotification;
use Illuminate\Support\Facades\Log;

class NotificationService
{
    public function __construct(protected ExpoNotificationService $expoPush)
    {
    }

    public function notifyUser(int $userId, string $type, string $title, array $data = []): void
    {
        try {
            UserNotification::dispatch($userId, $type, $title, $data);
            $body = null;
            if (isset($data['body']) && is_string($data['body']) && trim($data['body']) !== '') {
                $body = (string) $data['body'];
            } elseif (isset($data['order_number'])) {
                $body = '#'.(string) $data['order_number'];
            } elseif (isset($data['points'])) {
                $body = (string) $data['points'].' points';
            }
            $this->expoPush->sendToUser($userId, $title, $body, ['type' => $type] + $data);
        } catch (\Throwable $e) {
            Log::warning('Broadcast failed: notifyUser', ['userId' => $userId, 'error' => $e->getMessage()]);
        }
    }

    public function notifyTrainerNewMember(int $trainerUserId, array $member): void
    {
        try {
            NewMemberReferred::dispatch($trainerUserId, $member);
            $name = $member['full_name'] ?? $member['name'] ?? null;
            $this->expoPush->sendToUser(
                $trainerUserId,
                'Member baru',
                $name ? (string) $name : null,
                ['type' => 'new_member_referred', 'member' => $member],
            );
        } catch (\Throwable $e) {
            Log::warning('Broadcast failed: notifyTrainerNewMember', ['trainerUserId' => $trainerUserId, 'error' => $e->getMessage()]);
        }
    }

    public function notifyTrainerPointEarned(int $trainerUserId, int $amount, int $totalPoints, string $eventType, ?int $orderId = null): void
    {
        try {
            PointEarned::dispatch($trainerUserId, $amount, $totalPoints, $eventType, $orderId);
            $this->expoPush->sendToUser(
                $trainerUserId,
                'Point masuk',
                ($amount >= 0 ? '+' : '').$amount.' fp',
                [
                    'type' => 'point_earned',
                    'amount' => $amount,
                    'total_points' => $totalPoints,
                    'event_type' => $eventType,
                    'order_id' => $orderId,
                ],
            );
        } catch (\Throwable $e) {
            Log::warning('Broadcast failed: notifyTrainerPointEarned', ['trainerUserId' => $trainerUserId, 'error' => $e->getMessage()]);
        }
    }

    public function notifyOrderStatus(int $orderId, string $status, ?string $orderNumber = null, ?string $paymentStatus = null): void
    {
        try {
            OrderStatusUpdated::dispatch($orderId, $status, $orderNumber, $paymentStatus);
        } catch (\Throwable $e) {
            Log::warning('Broadcast failed: notifyOrderStatus', ['orderId' => $orderId, 'error' => $e->getMessage()]);
        }
    }

    public function notifyCourierNewDelivery(int $courierUserId, int $orderId, ?string $orderNumber = null): void
    {
        try {
            NewDeliveryAssigned::dispatch($courierUserId, $orderId, $orderNumber);
            $this->expoPush->sendToUser(
                $courierUserId,
                'Delivery baru',
                $orderNumber ? '#'.$orderNumber : null,
                ['type' => 'delivery_assigned', 'order_id' => $orderId, 'order_number' => $orderNumber],
            );
        } catch (\Throwable $e) {
            Log::warning('Broadcast failed: notifyCourierNewDelivery', ['courierUserId' => $courierUserId, 'error' => $e->getMessage()]);
        }
    }

    public function notifyOrderQueue(array $counts, string $eventType, ?string $orderNumber = null, ?string $status = null, ?string $paymentStatus = null, ?int $orderId = null): void
    {
        try {
            OrderQueueUpdated::dispatch($counts, $eventType, $orderNumber, $status, $paymentStatus, $orderId);
            if ($eventType === 'created') {
                $this->expoPush->sendToRoles(
                    ['admin', 'cashier'],
                    'Order masuk',
                    $orderNumber ? '#'.$orderNumber : null,
                    [
                        'type' => 'order_queue',
                        'counts' => $counts,
                        'event_type' => $eventType,
                        'order_number' => $orderNumber,
                        'status' => $status,
                        'payment_status' => $paymentStatus,
                        'order_id' => $orderId,
                    ],
                );
            }
        } catch (\Throwable $e) {
            Log::warning('Broadcast failed: notifyOrderQueue', ['error' => $e->getMessage()]);
        }
    }
}

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
    public function notifyUser(int $userId, string $type, string $title, array $data = []): void
    {
        try {
            UserNotification::dispatch($userId, $type, $title, $data);
        } catch (\Throwable $e) {
            Log::warning('Broadcast failed: notifyUser', ['userId' => $userId, 'error' => $e->getMessage()]);
        }
    }

    public function notifyTrainerNewMember(int $trainerUserId, array $member): void
    {
        try {
            NewMemberReferred::dispatch($trainerUserId, $member);
        } catch (\Throwable $e) {
            Log::warning('Broadcast failed: notifyTrainerNewMember', ['trainerUserId' => $trainerUserId, 'error' => $e->getMessage()]);
        }
    }

    public function notifyTrainerPointEarned(int $trainerUserId, int $amount, int $totalPoints, string $eventType, ?int $orderId = null): void
    {
        try {
            PointEarned::dispatch($trainerUserId, $amount, $totalPoints, $eventType, $orderId);
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
        } catch (\Throwable $e) {
            Log::warning('Broadcast failed: notifyCourierNewDelivery', ['courierUserId' => $courierUserId, 'error' => $e->getMessage()]);
        }
    }

    public function notifyOrderQueue(array $counts, string $eventType, ?string $orderNumber = null, ?string $status = null, ?string $paymentStatus = null): void
    {
        try {
            OrderQueueUpdated::dispatch($counts, $eventType, $orderNumber, $status, $paymentStatus);
        } catch (\Throwable $e) {
            Log::warning('Broadcast failed: notifyOrderQueue', ['error' => $e->getMessage()]);
        }
    }
}

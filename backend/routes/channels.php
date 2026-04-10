<?php

use App\Models\Order;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('trainer.{trainerId}', function ($user, $trainerId) {
    if ($user->hasRole('admin')) {
        return true;
    }

    return $user->hasRole('trainer') && (int) $user->id === (int) $trainerId;
});

Broadcast::channel('courier.{courierId}', function ($user, $courierId) {
    if ($user->hasRole('admin')) {
        return true;
    }

    return $user->hasRole('courier') && (int) $user->id === (int) $courierId;
});

Broadcast::channel('order.{orderId}', function ($user, $orderId) {
    if ($user->hasRole('admin')) {
        return true;
    }

    $order = Order::query()->select(['id', 'member_id', 'trainer_id', 'courier_id'])->find($orderId);
    if (! $order) {
        return false;
    }

    if ($user->hasRole('member') && (int) $order->member_id === (int) $user->id) {
        return true;
    }

    if ($user->hasRole('trainer') && (int) $order->trainer_id === (int) $user->id) {
        return true;
    }

    if ($user->hasRole('courier') && (int) $order->courier_id === (int) $user->id) {
        return true;
    }

    return false;
});

Broadcast::channel('staff.orders', function ($user) {
    return $user->hasRole('admin') || $user->hasRole('cashier');
});

Broadcast::channel('user.{userId}', function ($user, $userId) {
    return (int) $user->id === (int) $userId;
});

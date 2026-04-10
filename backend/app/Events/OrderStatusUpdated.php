<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class OrderStatusUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public int $orderId,
        public string $status,
        public ?string $orderNumber = null,
        public ?string $paymentStatus = null,
    ) {
    }

    public function broadcastOn(): array
    {
        return [new PrivateChannel('order.'.$this->orderId)];
    }

    public function broadcastAs(): string
    {
        return 'OrderStatusUpdated';
    }
}

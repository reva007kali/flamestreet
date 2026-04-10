<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NewDeliveryAssigned implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public int $courierId,
        public int $orderId,
        public ?string $orderNumber = null,
    ) {
    }

    public function broadcastOn(): array
    {
        return [new PrivateChannel('courier.'.$this->courierId)];
    }

    public function broadcastAs(): string
    {
        return 'NewDeliveryAssigned';
    }
}

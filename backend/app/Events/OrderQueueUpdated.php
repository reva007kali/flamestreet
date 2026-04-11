<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class OrderQueueUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public array $counts,
        public string $event_type,
        public ?string $order_number = null,
        public ?string $status = null,
        public ?string $payment_status = null,
        public ?int $order_id = null,
    ) {
    }

    public function broadcastOn()
    {
        return new PrivateChannel('staff.orders');
    }

    public function broadcastAs()
    {
        return 'OrderQueueUpdated';
    }
}

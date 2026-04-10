<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PointEarned implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public int $trainerId,
        public int $amount,
        public int $totalPoints,
        public string $eventType,
        public ?int $orderId = null,
    ) {
    }

    public function broadcastOn(): array
    {
        return [new PrivateChannel('trainer.'.$this->trainerId)];
    }

    public function broadcastAs(): string
    {
        return 'PointEarned';
    }
}

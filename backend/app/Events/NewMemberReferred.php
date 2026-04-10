<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NewMemberReferred implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public int $trainerId,
        public array $member,
    ) {
    }

    public function broadcastOn(): array
    {
        return [new PrivateChannel('trainer.'.$this->trainerId)];
    }

    public function broadcastAs(): string
    {
        return 'NewMemberReferred';
    }
}

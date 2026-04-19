<?php

namespace App\Events;

use App\Models\OrderChatMessage;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class OrderChatMessageCreated implements ShouldBroadcastNow
{
    use Dispatchable;
    use InteractsWithSockets;
    use SerializesModels;

    public function __construct(public OrderChatMessage $message)
    {
    }

    public function broadcastOn(): array
    {
        return [new PrivateChannel('order.'.$this->message->order_id)];
    }

    public function broadcastAs(): string
    {
        return 'OrderChatMessageCreated';
    }

    public function broadcastWith(): array
    {
        $m = $this->message;

        return [
            'id' => (int) $m->id,
            'order_id' => (int) $m->order_id,
            'sender_id' => (int) $m->sender_id,
            'type' => (string) $m->type,
            'body' => $m->body,
            'image_path' => $m->image_path,
            'created_at' => $m->created_at?->toISOString(),
        ];
    }
}


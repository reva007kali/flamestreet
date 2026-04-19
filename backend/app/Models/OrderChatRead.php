<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['order_id', 'user_id', 'last_read_message_id'])]
class OrderChatRead extends Model
{
                    use HasFactory;

                    public function order(): BelongsTo
                    {
                                        return $this->belongsTo(Order::class);
                    }

                    public function user(): BelongsTo
                    {
                                        return $this->belongsTo(User::class);
                    }
}


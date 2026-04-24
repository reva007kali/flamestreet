<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'user_id',
    'item_id',
    'status',
    'reserved_order_id',
    'reserved_at',
    'used_at',
    'cancelled_at',
])]
class FpShopPurchase extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'reserved_at' => 'datetime',
            'used_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function item()
    {
        return $this->belongsTo(FpShopItem::class, 'item_id');
    }

    public function reservedOrder()
    {
        return $this->belongsTo(Order::class, 'reserved_order_id');
    }
}


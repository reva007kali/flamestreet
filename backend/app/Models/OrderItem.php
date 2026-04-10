<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['order_id', 'product_id', 'product_name', 'product_price', 'quantity', 'modifier_options', 'item_notes', 'subtotal', 'point_reward', 'point_reward_member', 'point_reward_trainer'])]
class OrderItem extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'product_price' => 'decimal:2',
            'quantity' => 'integer',
            'modifier_options' => 'array',
            'subtotal' => 'decimal:2',
            'point_reward' => 'integer',
            'point_reward_member' => 'integer',
            'point_reward_trainer' => 'integer',
        ];
    }

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}

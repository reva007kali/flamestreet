<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['order_number', 'member_id', 'trainer_id', 'courier_id', 'gym_id', 'status', 'payment_status', 'payment_method', 'payment_proof', 'subtotal', 'discount_amount', 'delivery_fee', 'total_amount', 'points_used', 'points_used_source', 'points_earned_trainer', 'points_earned_member', 'delivery_address', 'delivery_lat', 'delivery_lng', 'delivery_distance_m', 'delivery_branch_id', 'delivery_notes', 'recipient_name', 'recipient_phone', 'estimated_delivery_at', 'delivered_at', 'cancelled_at', 'cancelled_reason'])]
class Order extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'subtotal' => 'decimal:2',
            'discount_amount' => 'decimal:2',
            'delivery_fee' => 'decimal:2',
            'total_amount' => 'decimal:2',
            'delivery_lat' => 'decimal:8',
            'delivery_lng' => 'decimal:8',
            'delivery_distance_m' => 'integer',
            'points_used' => 'integer',
            'points_earned_trainer' => 'integer',
            'points_earned_member' => 'integer',
            'rewards_reversed_at' => 'datetime',
            'estimated_delivery_at' => 'datetime',
            'delivered_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    public function member()
    {
        return $this->belongsTo(User::class, 'member_id');
    }

    public function trainer()
    {
        return $this->belongsTo(User::class, 'trainer_id');
    }

    public function courier()
    {
        return $this->belongsTo(User::class, 'courier_id');
    }

    public function gym()
    {
        return $this->belongsTo(Gym::class, 'gym_id');
    }

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function paymentTransactions()
    {
        return $this->hasMany(PaymentTransaction::class);
    }
}

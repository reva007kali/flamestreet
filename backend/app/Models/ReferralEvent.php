<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['trainer_id', 'member_id', 'order_id', 'event_type', 'points_earned', 'description'])]
class ReferralEvent extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'points_earned' => 'integer',
        ];
    }

    public function trainerProfile()
    {
        return $this->belongsTo(TrainerProfile::class, 'trainer_id');
    }

    public function member()
    {
        return $this->belongsTo(User::class, 'member_id');
    }

    public function order()
    {
        return $this->belongsTo(Order::class);
    }
}

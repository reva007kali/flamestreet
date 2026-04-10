<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['trainer_id', 'amount', 'type', 'reference_type', 'reference_id', 'description', 'expires_at'])]
class PointTransaction extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'amount' => 'integer',
            'expires_at' => 'datetime',
        ];
    }

    public function trainerProfile()
    {
        return $this->belongsTo(TrainerProfile::class, 'trainer_id');
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['user_id', 'referred_by', 'default_gym_id', 'date_of_birth', 'total_points'])]
class MemberProfile extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date',
            'total_points' => 'integer',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function trainerProfile()
    {
        return $this->belongsTo(TrainerProfile::class, 'referred_by');
    }

    public function defaultGym()
    {
        return $this->belongsTo(Gym::class, 'default_gym_id');
    }
}

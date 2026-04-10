<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['gym_name', 'address', 'city', 'province', 'image', 'is_active'])]
class Gym extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function trainers()
    {
        return $this->hasMany(TrainerProfile::class);
    }
}

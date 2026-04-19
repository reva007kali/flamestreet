<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['name', 'address', 'city', 'province', 'lat', 'lng', 'is_active'])]
class DeliveryBranch extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'lat' => 'decimal:8',
            'lng' => 'decimal:8',
            'is_active' => 'boolean',
        ];
    }
}


<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'type',
    'name',
    'description',
    'image_path',
    'fp_price',
    'is_active',
    'sort_order',
    'discount_type',
    'discount_value',
    'min_subtotal',
    'max_discount',
    'starts_at',
    'ends_at',
    'created_by',
])]
class FpShopItem extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'fp_price' => 'integer',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
            'discount_value' => 'decimal:2',
            'min_subtotal' => 'decimal:2',
            'max_discount' => 'decimal:2',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
        ];
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}


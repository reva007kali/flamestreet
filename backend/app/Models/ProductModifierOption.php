<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['modifier_id', 'name', 'additional_price', 'is_default', 'sort_order'])]
class ProductModifierOption extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'additional_price' => 'decimal:2',
            'is_default' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function modifier()
    {
        return $this->belongsTo(ProductModifier::class, 'modifier_id');
    }
}

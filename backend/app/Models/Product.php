<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['category_id', 'name', 'slug', 'description', 'ingredients', 'nutritional_info', 'hpp', 'price', 'image', 'images', 'weight_gram', 'is_available', 'is_featured', 'sort_order', 'point_reward', 'point_reward_member', 'point_reward_trainer'])]
class Product extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'nutritional_info' => 'array',
            'images' => 'array',
            'hpp' => 'decimal:2',
            'price' => 'decimal:2',
            'weight_gram' => 'integer',
            'is_available' => 'boolean',
            'is_featured' => 'boolean',
            'sort_order' => 'integer',
            'point_reward' => 'integer',
            'point_reward_member' => 'integer',
            'point_reward_trainer' => 'integer',
        ];
    }

    public function category()
    {
        return $this->belongsTo(ProductCategory::class, 'category_id');
    }

    public function modifiers()
    {
        return $this->hasMany(ProductModifier::class);
    }
}

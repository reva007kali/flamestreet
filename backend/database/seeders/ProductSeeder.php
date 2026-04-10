<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\ProductCategory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $category = ProductCategory::query()->updateOrCreate(
            ['slug' => 'flame-street-menu'],
            [
                'name' => 'Flame Street Menu',
                'description' => 'High-protein grilled chicken meals',
                'is_active' => true,
                'sort_order' => 1,
            ],
        );

        $products = [
            [
                'name' => 'Flame Dada',
                'description' => '200g Steak dada ayam bakar arang yang dirancang sebagai asupan protein tepat setelah latihan',
                'weight_gram' => 200,
                'nutritional_info' => ['protein_g' => 53.7],
                'sort_order' => 1,
            ],
            [
                'name' => 'Flame Wrap',
                'description' => 'Wrap dada ayam tinggi protein ala Flame Street',
                'weight_gram' => null,
                'nutritional_info' => ['protein_g' => 28.7],
                'sort_order' => 2,
            ],
            [
                'name' => 'Flame Omni Bowl',
                'description' => 'Dada ayam bakar arang yang dipadukan dengan berbagai sayuran segar ala Flame Street',
                'weight_gram' => null,
                'nutritional_info' => ['protein_g' => 30.0],
                'sort_order' => 3,
            ],
            [
                'name' => 'Flame Paha',
                'description' => '200gr Steak paha ayam bakar arang extra juicy yang dirancang sebagai asupan protein saat Post Workout',
                'weight_gram' => 200,
                'nutritional_info' => ['protein_g' => 38.4],
                'sort_order' => 4,
            ],
        ];

        foreach ($products as $p) {
            $slug = Str::slug($p['name']);

            Product::query()->updateOrCreate(
                ['slug' => $slug],
                [
                    'category_id' => $category->id,
                    'name' => $p['name'],
                    'description' => $p['description'],
                    'ingredients' => null,
                    'nutritional_info' => $p['nutritional_info'],
                    'hpp' => 0,
                    'price' => 0,
                    'image' => null,
                    'images' => null,
                    'weight_gram' => $p['weight_gram'],
                    'is_available' => true,
                    'is_featured' => true,
                    'sort_order' => $p['sort_order'],
                    'point_reward' => 0,
                ],
            );
        }
    }
}


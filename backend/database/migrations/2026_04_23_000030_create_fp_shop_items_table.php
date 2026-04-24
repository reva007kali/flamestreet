<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fp_shop_items', function (Blueprint $table) {
            $table->id();
            $table->string('type', 30);
            $table->string('name', 120);
            $table->text('description')->nullable();
            $table->string('image_path')->nullable();
            $table->unsignedInteger('fp_price')->default(0);
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);

            $table->string('discount_type', 20)->nullable();
            $table->decimal('discount_value', 14, 2)->nullable();
            $table->decimal('min_subtotal', 14, 2)->nullable();
            $table->decimal('max_discount', 14, 2)->nullable();
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();

            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['type', 'is_active', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fp_shop_items');
    }
};


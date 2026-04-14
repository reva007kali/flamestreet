<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_modifier_options', function (Blueprint $table) {
            $table->id();
            $table->foreignId('modifier_id')->constrained('product_modifiers')->cascadeOnDelete();
            $table->string('name', 100);
            $table->decimal('additional_price', 10, 2)->default(0);
            $table->boolean('is_default')->default(false);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_modifier_options');
    }
};

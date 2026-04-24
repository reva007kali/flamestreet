<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fp_shop_purchases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('item_id')->constrained('fp_shop_items')->cascadeOnDelete();
            $table->string('status', 20)->default('available');
            $table->foreignId('reserved_order_id')->nullable()->constrained('orders')->nullOnDelete();
            $table->timestamp('reserved_at')->nullable();
            $table->timestamp('used_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index(['item_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fp_shop_purchases');
    }
};


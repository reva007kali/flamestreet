<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->foreignId('fp_shop_purchase_id')->nullable()->constrained('fp_shop_purchases')->nullOnDelete()->after('discount_amount');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('fp_shop_purchase_id');
        });
    }
};


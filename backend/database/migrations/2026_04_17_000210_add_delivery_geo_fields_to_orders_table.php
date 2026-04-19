<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->decimal('delivery_lat', 10, 8)->nullable()->after('delivery_address');
            $table->decimal('delivery_lng', 11, 8)->nullable()->after('delivery_lat');
            $table->unsignedInteger('delivery_distance_m')->nullable()->after('delivery_lng');
            $table->foreignId('delivery_branch_id')->nullable()->after('delivery_distance_m')->constrained('delivery_branches')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('delivery_branch_id');
            $table->dropColumn(['delivery_lat', 'delivery_lng', 'delivery_distance_m']);
        });
    }
};


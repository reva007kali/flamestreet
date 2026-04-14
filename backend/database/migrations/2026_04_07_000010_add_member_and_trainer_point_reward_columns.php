<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->unsignedInteger('point_reward_member')->default(0)->after('point_reward');
            $table->unsignedInteger('point_reward_trainer')->default(0)->after('point_reward_member');
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->unsignedInteger('point_reward_member')->default(0)->after('point_reward');
            $table->unsignedInteger('point_reward_trainer')->default(0)->after('point_reward_member');
        });

        DB::table('products')->update([
            'point_reward_member' => DB::raw('point_reward'),
            'point_reward_trainer' => DB::raw('point_reward'),
        ]);

        DB::table('order_items')->update([
            'point_reward_member' => DB::raw('point_reward'),
            'point_reward_trainer' => DB::raw('point_reward'),
        ]);
    }

    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropColumn(['point_reward_member', 'point_reward_trainer']);
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['point_reward_member', 'point_reward_trainer']);
        });
    }
};


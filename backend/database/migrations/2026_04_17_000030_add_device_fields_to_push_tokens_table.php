<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('push_tokens', function (Blueprint $table) {
            $table->string('device_id', 80)->nullable()->after('platform');
            $table->string('user_agent', 512)->nullable()->after('device_id');
            $table->index(['user_id', 'provider', 'platform', 'last_seen_at']);
            $table->unique(['provider', 'platform', 'device_id']);
        });
    }

    public function down(): void
    {
        Schema::table('push_tokens', function (Blueprint $table) {
            $table->dropUnique(['provider', 'platform', 'device_id']);
            $table->dropIndex(['user_id', 'provider', 'platform', 'last_seen_at']);
            $table->dropColumn(['device_id', 'user_agent']);
        });
    }
};

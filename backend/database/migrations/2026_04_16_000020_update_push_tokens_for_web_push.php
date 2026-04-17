<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('push_tokens', function (Blueprint $table) {
            $table->string('token', 512)->change();
            $table->string('provider', 20)->default('expo')->after('token');
            $table->index(['user_id', 'provider', 'platform']);
        });
    }

    public function down(): void
    {
        Schema::table('push_tokens', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'provider', 'platform']);
            $table->dropColumn('provider');
            $table->string('token', 200)->change();
        });
    }
};


<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('member_profiles', function (Blueprint $table) {
            $table->foreignId('default_gym_id')->nullable()->constrained('gyms')->nullOnDelete()->after('referred_by');
        });
    }

    public function down(): void
    {
        Schema::table('member_profiles', function (Blueprint $table) {
            $table->dropConstrainedForeignId('default_gym_id');
        });
    }
};


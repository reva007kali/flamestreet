<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('trainer_profiles', function (Blueprint $table): void {
            $table->string('payout_bank', 100)->nullable()->after('instagram_handle');
            $table->string('payout_account_number', 50)->nullable()->after('payout_bank');
        });
    }

    public function down(): void
    {
        Schema::table('trainer_profiles', function (Blueprint $table): void {
            $table->dropColumn(['payout_bank', 'payout_account_number']);
        });
    }
};


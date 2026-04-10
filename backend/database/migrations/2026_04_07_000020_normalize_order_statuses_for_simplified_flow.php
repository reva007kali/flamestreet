<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('orders')->whereIn('status', ['preparing', 'ready_pickup'])->update(['status' => 'confirmed']);
    }

    public function down(): void
    {
    }
};


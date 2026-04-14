<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Webhooks\DokuWebhookController;

Route::get('/', function () {
    return response()->json([
        'status' => 'ok',
        'service' => 'Flamestreet API',
        'env' => app()->environment(),
        'timestamp' => now()
    ]);
});

Route::post('/webhooks/doku/notify', [DokuWebhookController::class, 'notify']);

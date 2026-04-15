<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Webhooks\DokuWebhookController;

Route::get('/', function () {
    return response()->json([
        'status' => 'ok',
        'service' => 'Flamestreet API',
    ]);
});

Route::post('/webhooks/doku/notify', [DokuWebhookController::class, 'notify'])->middleware('throttle:webhooks');

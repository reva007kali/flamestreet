<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Webhooks\DokuWebhookController;

Route::get('/', function () {
    return view('welcome');
});

Route::post('/webhooks/doku/notify', [DokuWebhookController::class, 'notify']);

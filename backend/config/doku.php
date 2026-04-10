<?php

return [
    'checkout_base_url' => env('DOKU_CHECKOUT_BASE_URL', 'https://api-sandbox.doku.com'),
    'client_id' => env('DOKU_CHECKOUT_CLIENT_ID'),
    'secret_key' => env('DOKU_CHECKOUT_SECRET_KEY'),
    'api_key' => env('DOKU_CHECKOUT_API_KEY'),
    'webhook_relaxed' => (bool) env('DOKU_WEBHOOK_RELAXED', false),

    'method_map' => [
        'doku-qris' => ['QRIS'],
        'doku-va-bca' => ['VIRTUAL_ACCOUNT_BCA'],
        'doku-va-bni' => ['VIRTUAL_ACCOUNT_BNI'],
        'doku-va-bri' => ['VIRTUAL_ACCOUNT_BRI'],
        'doku-va-mandiri' => ['VIRTUAL_ACCOUNT_BANK_MANDIRI'],
        'doku-va-permata' => ['VIRTUAL_ACCOUNT_BANK_PERMATA'],
        'doku-va-cimb' => ['VIRTUAL_ACCOUNT_BANK_CIMB'],
        'doku-va-danamon' => ['VIRTUAL_ACCOUNT_BANK_DANAMON'],
    ],
];

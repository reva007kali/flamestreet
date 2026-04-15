<?php

return [
    'paths' => ['api/*', 'broadcasting/auth', 'broadcasting/user-auth'],
    'allowed_methods' => ['*'],
    'allowed_origins' => (function (): array {
        $raw = env('FRONTEND_URLS', env('FRONTEND_URL', ''));
        $origins = array_values(array_filter(array_map('trim', explode(',', (string) $raw))));

        if (count($origins) > 0) {
            return $origins;
        }

        return env('APP_ENV') === 'local' ? ['*'] : [];
    })(),
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => false,
];

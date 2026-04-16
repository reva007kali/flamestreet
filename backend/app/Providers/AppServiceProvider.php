<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        if ($this->app->runningInConsole()) {
            $this->loadMigrationsFrom(app_path('Database/Migrations'));
        }

        RateLimiter::for('auth', function (Request $request) {
            $ip = (string) $request->ip();
            $email = (string) $request->input('email', '');
            $key = $email !== '' ? $ip . '|' . $email : $ip;

            return Limit::perMinute(10)->by($key);
        });

        RateLimiter::for('uploads', function (Request $request) {
            $ip = (string) $request->ip();
            $userId = (string) optional($request->user())->getAuthIdentifier();

            return Limit::perMinute(30)->by($userId !== '' ? $userId : $ip);
        });

        RateLimiter::for('webhooks', function (Request $request) {
            return Limit::perMinute(120)->by((string) $request->ip());
        });
    }
}

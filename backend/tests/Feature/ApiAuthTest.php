<?php

namespace Tests\Feature;

use Tests\TestCase;

class ApiAuthTest extends TestCase
{
    public function test_api_requires_auth_returns_401_not_500(): void
    {
        $response = $this->getJson('/api/gyms');

        $response->assertStatus(401);
    }
}


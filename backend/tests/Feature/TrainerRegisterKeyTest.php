<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class TrainerRegisterKeyTest extends TestCase
{
                    use RefreshDatabase;

                    public function test_trainer_register_requires_key(): void
                    {
                                        Role::findOrCreate('trainer');

                                        config(['services.trainer_register.key' => 'secret']);

                                        $this->postJson('/api/auth/register', [
                                                            'full_name' => 'Trainer One',
                                                            'username' => 'trainer_one',
                                                            'phone_number' => '081200000001',
                                                            'email' => 'trainer_one@example.com',
                                                            'password' => 'password123',
                                                            'role' => 'trainer',
                                                            'date_of_birth' => '1990-01-01',
                                        ])->assertStatus(403);
                    }

                    public function test_trainer_register_allows_with_key(): void
                    {
                                        Role::findOrCreate('trainer');

                                        config(['services.trainer_register.key' => 'secret']);

                                        $this->postJson('/api/auth/register', [
                                                            'full_name' => 'Trainer Two',
                                                            'username' => 'trainer_two',
                                                            'phone_number' => '081200000002',
                                                            'email' => 'trainer_two@example.com',
                                                            'password' => 'password123',
                                                            'role' => 'trainer',
                                                            'date_of_birth' => '1990-01-01',
                                                            'trainer_register_key' => 'secret',
                                        ])->assertStatus(200)->assertJsonStructure(['token', 'user']);
                    }
}


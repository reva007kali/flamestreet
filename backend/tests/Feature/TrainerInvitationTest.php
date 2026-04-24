<?php

namespace Tests\Feature;

use App\Models\MemberProfile;
use App\Models\TrainerProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class TrainerInvitationTest extends TestCase
{
                    use RefreshDatabase;

                    public function test_trainer_can_invite_member_and_member_can_accept(): void
                    {
                                        Role::findOrCreate('trainer');
                                        Role::findOrCreate('member');

                                        $trainer = User::factory()->create([
                                                            'username' => 'trainer1',
                                                            'email' => 'trainer1@example.com',
                                        ]);
                                        $trainer->assignRole('trainer');
                                        $tp = TrainerProfile::query()->create([
                                                            'user_id' => $trainer->id,
                                                            'date_of_birth' => Carbon::parse('1990-01-01'),
                                        ]);
                                        $tp->refresh();

                                        $member = User::factory()->create([
                                                            'username' => 'member1',
                                                            'email' => 'member1@example.com',
                                        ]);
                                        $member->assignRole('member');
                                        MemberProfile::query()->create(['user_id' => $member->id]);

                                        $inv = $this
                                                            ->actingAs($trainer, 'sanctum')
                                                            ->postJson('/api/trainer/invitations', ['identifier' => 'member1'])
                                                            ->assertStatus(200)
                                                            ->json('invitation');

                                        $this->assertNotEmpty($inv['id'] ?? null);

                                        $this
                                                            ->actingAs($member, 'sanctum')
                                                            ->postJson('/api/member/invitations/' . ((int) $inv['id']) . '/accept')
                                                            ->assertStatus(200)
                                                            ->assertJson(['ok' => true]);

                                        $mp = MemberProfile::query()->where('user_id', $member->id)->firstOrFail();
                                        $this->assertSame((int) $tp->id, (int) $mp->referred_by);
                    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MemberProfile;
use App\Models\TrainerMemberInvitation;
use App\Models\TrainerProfile;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Http\Request;

class TrainerInvitationController extends Controller
{
                    public function __construct(
                                        protected NotificationService $notificationService,
                    ) {
                    }

                    public function index(Request $request)
                    {
                                        $trainerProfile = TrainerProfile::query()->where('user_id', $request->user()->id)->firstOrFail();

                                        $data = $request->validate([
                                                            'status' => ['nullable', 'string', 'max:20'],
                                        ]);

                                        $q = TrainerMemberInvitation::query()
                                                            ->with(['member'])
                                                            ->where('trainer_profile_id', $trainerProfile->id)
                                                            ->orderByDesc('id');

                                        if (!empty($data['status'])) {
                                                            $q->where('status', $data['status']);
                                        }

                                        $items = $q->paginate(20)->through(function (TrainerMemberInvitation $inv) {
                                                            return [
                                                                                'id' => $inv->id,
                                                                                'status' => $inv->status,
                                                                                'responded_at' => $inv->responded_at,
                                                                                'created_at' => $inv->created_at,
                                                                                'member' => $inv->member?->only(['id', 'full_name', 'username', 'email', 'phone_number', 'avatar']),
                                                            ];
                                        });

                                        return response()->json($items);
                    }

                    public function store(Request $request)
                    {
                                        $trainerUser = $request->user();
                                        $trainerProfile = TrainerProfile::query()->where('user_id', $trainerUser->id)->firstOrFail();

                                        $data = $request->validate([
                                                            'identifier' => ['required', 'string', 'max:120'],
                                        ]);

                                        $raw = trim((string) $data['identifier']);
                                        $member = User::query()
                                                            ->where(function ($q) use ($raw) {
                                                                                $q->where('username', $raw)->orWhere('email', $raw);
                                                            })
                                                            ->first();

                                        if (!$member) {
                                                            return response()->json(['message' => 'User tidak ditemukan (username/email).'], 404);
                                        }

                                        if ((int) $member->id === (int) $trainerUser->id) {
                                                            return response()->json(['message' => 'Tidak bisa mengundang diri sendiri.'], 422);
                                        }

                                        if (!$member->hasRole('member')) {
                                                            return response()->json(['message' => 'User ini bukan member.'], 422);
                                        }

                                        $memberProfile = MemberProfile::query()->firstOrCreate(['user_id' => $member->id]);
                                        if ($memberProfile->referred_by) {
                                                            return response()->json(['message' => 'Member sudah punya trainer.'], 422);
                                        }

                                        $inv = TrainerMemberInvitation::query()->where([
                                                            'trainer_profile_id' => $trainerProfile->id,
                                                            'member_id' => $member->id,
                                        ])->first();

                                        if (!$inv) {
                                                            $inv = TrainerMemberInvitation::query()->create([
                                                                                'trainer_profile_id' => $trainerProfile->id,
                                                                                'member_id' => $member->id,
                                                                                'status' => 'pending',
                                                                                'responded_at' => null,
                                                            ]);
                                        } elseif ($inv->status === 'pending') {
                                                            return response()->json(['message' => 'Invitation masih pending.'], 409);
                                        } elseif ($inv->status === 'accepted') {
                                                            return response()->json(['message' => 'Member sudah menerima invitation.'], 409);
                                        } else {
                                                            $inv->status = 'pending';
                                                            $inv->responded_at = null;
                                                            $inv->save();
                                        }

                                        $trainer = $trainerUser->only(['id', 'full_name', 'username', 'email', 'avatar']);

                                        $this->notificationService->notifyUser(
                                                            (int) $member->id,
                                                            'trainer_invitation',
                                                            'Trainer invitation',
                                                            [
                                                                                'invitation_id' => $inv->id,
                                                                                'trainer_profile_id' => $trainerProfile->id,
                                                                                'trainer' => $trainer,
                                                                                'body' => ($trainer['full_name'] ?? 'Trainer') . ' mengundang kamu jadi member referral',
                                                                                'url' => '/member/invitations',
                                                            ],
                                        );

                                        return response()->json([
                                                            'invitation' => [
                                                                                'id' => $inv->id,
                                                                                'status' => $inv->status,
                                                                                'created_at' => $inv->created_at,
                                                                                'member' => $member->only(['id', 'full_name', 'username', 'email', 'phone_number', 'avatar']),
                                                            ],
                                        ]);
                    }
}


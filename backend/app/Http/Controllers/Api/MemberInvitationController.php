<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MemberProfile;
use App\Models\TrainerMemberInvitation;
use App\Models\TrainerProfile;
use App\Services\NotificationService;
use App\Services\ReferralService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class MemberInvitationController extends Controller
{
                    public function __construct(
                                        protected ReferralService $referralService,
                                        protected NotificationService $notificationService,
                    ) {
                    }

                    public function index(Request $request)
                    {
                                        $user = $request->user();

                                        $items = TrainerMemberInvitation::query()
                                                            ->with(['trainerProfile.user'])
                                                            ->where('member_id', $user->id)
                                                            ->where('status', 'pending')
                                                            ->orderByDesc('id')
                                                            ->get()
                                                            ->map(function (TrainerMemberInvitation $inv) {
                                                                                $trainer = $inv->trainerProfile?->user;

                                                                                return [
                                                                                                    'id' => $inv->id,
                                                                                                    'status' => $inv->status,
                                                                                                    'responded_at' => $inv->responded_at,
                                                                                                    'created_at' => $inv->created_at,
                                                                                                    'trainer' => $trainer ? $trainer->only(['id', 'full_name', 'username', 'email', 'avatar']) : null,
                                                                                                    'trainer_profile_id' => $inv->trainer_profile_id,
                                                                                ];
                                                            })
                                                            ->values();

                                        return response()->json(['invitations' => $items]);
                    }

                    public function accept(Request $request, int $id)
                    {
                                        $user = $request->user();
                                        $inv = TrainerMemberInvitation::query()
                                                            ->with(['trainerProfile'])
                                                            ->whereKey($id)
                                                            ->where('member_id', $user->id)
                                                            ->firstOrFail();

                                        if ($inv->status !== 'pending') {
                                                            return response()->json(['message' => 'Invitation sudah diproses.'], 409);
                                        }

                                        $memberProfile = MemberProfile::query()->firstOrCreate(['user_id' => $user->id]);
                                        if ($memberProfile->referred_by && (int) $memberProfile->referred_by !== (int) $inv->trainer_profile_id) {
                                                            return response()->json(['message' => 'Kamu sudah punya trainer.'], 422);
                                        }

                                        $trainerProfile = TrainerProfile::query()->findOrFail($inv->trainer_profile_id);

                                        $this->referralService->attachTrainer($user, (string) $trainerProfile->referral_code);

                                        $inv->status = 'accepted';
                                        $inv->responded_at = Carbon::now();
                                        $inv->save();

                                        $this->notificationService->notifyUser(
                                                            (int) $trainerProfile->user_id,
                                                            'trainer_invitation_accepted',
                                                            'Invitation accepted',
                                                            [
                                                                                'member' => $user->only(['id', 'full_name', 'username', 'email', 'avatar']),
                                                                                'invitation_id' => $inv->id,
                                                                                'trainer_profile_id' => $trainerProfile->id,
                                                                                'body' => ($user->full_name ?? 'Member') . ' menerima invitation kamu',
                                                                                'url' => '/trainer/referrals',
                                                            ],
                                        );

                                        return response()->json(['ok' => true]);
                    }

                    public function reject(Request $request, int $id)
                    {
                                        $user = $request->user();
                                        $inv = TrainerMemberInvitation::query()
                                                            ->with(['trainerProfile'])
                                                            ->whereKey($id)
                                                            ->where('member_id', $user->id)
                                                            ->firstOrFail();

                                        if ($inv->status !== 'pending') {
                                                            return response()->json(['message' => 'Invitation sudah diproses.'], 409);
                                        }

                                        $trainerProfile = TrainerProfile::query()->findOrFail($inv->trainer_profile_id);

                                        $inv->status = 'rejected';
                                        $inv->responded_at = Carbon::now();
                                        $inv->save();

                                        $this->notificationService->notifyUser(
                                                            (int) $trainerProfile->user_id,
                                                            'trainer_invitation_rejected',
                                                            'Invitation rejected',
                                                            [
                                                                                'member' => $user->only(['id', 'full_name', 'username', 'email', 'avatar']),
                                                                                'invitation_id' => $inv->id,
                                                                                'trainer_profile_id' => $trainerProfile->id,
                                                                                'body' => ($user->full_name ?? 'Member') . ' menolak invitation kamu',
                                                                                'url' => '/trainer/referrals',
                                                            ],
                                        );

                                        return response()->json(['ok' => true]);
                    }
}


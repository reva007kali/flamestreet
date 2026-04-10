<?php

namespace App\Services;

use App\Models\MemberProfile;
use App\Models\Order;
use App\Models\PointSetting;
use App\Models\ReferralEvent;
use App\Models\TrainerProfile;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class ReferralService
{
    public function __construct(
        protected PointService $pointService,
        protected NotificationService $notificationService,
    ) {
    }

    public function attachTrainer(User $member, string $referralCode): void
    {
        $referralCode = trim($referralCode);
        if ($referralCode === '') {
            return;
        }

        $trainerProfile = TrainerProfile::query()->where('referral_code', $referralCode)->first();
        if (! $trainerProfile) {
            return;
        }

        DB::transaction(function () use ($member, $trainerProfile): void {
            $memberProfile = MemberProfile::query()->firstOrCreate(['user_id' => $member->id]);

            if ($memberProfile->referred_by) {
                return;
            }

            $memberProfile->referred_by = $trainerProfile->id;
            $memberProfile->save();

            $points = (int) (PointSetting::get('referral_new_member', '0') ?? '0');

            $event = ReferralEvent::query()->create([
                'trainer_id' => $trainerProfile->id,
                'member_id' => $member->id,
                'order_id' => null,
                'event_type' => 'new_member',
                'points_earned' => $points,
                'description' => 'New member referred',
            ]);

            if ($points > 0) {
                $this->pointService->addPoints($trainerProfile->id, $points, 'earned', 'referral_event', $event->id, 'Referral: new member');
            }
        });

        $trainerProfile->refresh();

        $this->notificationService->notifyTrainerNewMember($trainerProfile->user_id, [
            'id' => $member->id,
            'full_name' => $member->full_name,
            'username' => $member->username,
            'email' => $member->email,
        ]);

        $points = (int) (PointSetting::get('referral_new_member', '0') ?? '0');
        if ($points > 0) {
            $this->notificationService->notifyTrainerPointEarned($trainerProfile->user_id, $points, (int) $trainerProfile->total_points, 'new_member', null);
        }
    }

    public function awardPoints(int $trainerProfileId, string $eventType, ?int $orderId = null): int
    {
        $trainerProfile = TrainerProfile::query()->findOrFail($trainerProfileId);
        if (! $orderId) {
            return 0;
        }

        $order = Order::query()->with('items')->findOrFail($orderId);

        $points = 0;
        if ($eventType === 'first_order') {
            $points = (int) (PointSetting::get('referral_first_order', '0') ?? '0');
        } elseif ($eventType === 'repeat_order') {
            $points = $this->calculateOrderPoints($order);
        }

        $event = ReferralEvent::query()->create([
            'trainer_id' => $trainerProfile->id,
            'member_id' => $order->member_id,
            'order_id' => $order->id,
            'event_type' => $eventType,
            'points_earned' => max(0, $points),
            'description' => $eventType,
        ]);

        if ($points > 0) {
            $this->pointService->addPoints($trainerProfile->id, $points, 'earned', 'referral_event', $event->id, 'Referral: '.$eventType);
            $trainerProfile->refresh();
            $this->notificationService->notifyTrainerPointEarned($trainerProfile->user_id, $points, (int) $trainerProfile->total_points, $eventType, $order->id);
        }

        return max(0, $points);
    }

    public function calculateOrderPoints(Order $order): int
    {
        $total = 0;
        foreach ($order->items as $item) {
            $reward = isset($item->point_reward_trainer) ? (int) $item->point_reward_trainer : (int) $item->point_reward;
            $total += $reward * ((int) $item->quantity);
        }

        return $total;
    }
}

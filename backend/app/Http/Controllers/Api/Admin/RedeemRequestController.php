<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\PointTransaction;
use App\Models\TrainerRedeemRequest;
use App\Models\TrainerProfile;
use App\Services\NotificationService;
use App\Services\PointService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class RedeemRequestController extends Controller
{
    public function __construct(
        protected PointService $pointService,
        protected NotificationService $notificationService,
    ) {
    }

    public function index(Request $request)
    {
        $data = $request->validate([
            'status' => ['nullable', Rule::in(['pending', 'approved', 'rejected'])],
        ]);

        $q = TrainerRedeemRequest::query()
            ->with(['trainerProfile.user:id,full_name,username,email,avatar'])
            ->orderByDesc('id');

        if (! empty($data['status'])) {
            $q->where('status', $data['status']);
        }

        return response()->json($q->paginate(20));
    }

    public function update(Request $request, int $id)
    {
        $data = $request->validate([
            'action' => ['required', Rule::in(['approve', 'reject'])],
            'rejected_reason' => ['nullable', 'string', 'max:500'],
        ]);

        $admin = $request->user();

        return response()->json(DB::transaction(function () use ($data, $id, $admin) {
            $redeem = TrainerRedeemRequest::query()->lockForUpdate()->findOrFail($id);
            if ($redeem->status !== 'pending') {
                return ['redeem' => $redeem];
            }

            $trainerProfile = TrainerProfile::query()->findOrFail((int) $redeem->trainer_profile_id);
            $trainerUserId = (int) $trainerProfile->user_id;
            $alreadyDeducted = PointTransaction::query()
                ->where('trainer_id', $trainerProfile->id)
                ->where('type', 'redeemed')
                ->where('reference_type', 'redeem_request')
                ->where('reference_id', $redeem->id)
                ->where('amount', -(int) $redeem->amount)
                ->exists();

            if ($data['action'] === 'approve') {
                if (! $alreadyDeducted) {
                    $ok = $this->pointService->redeemPoints(
                        (int) $trainerProfile->id,
                        (int) $redeem->amount,
                        $redeem->description ?: 'Redeem approved',
                        'redeem_request',
                        (int) $redeem->id,
                    );
                    if (! $ok) {
                        throw ValidationException::withMessages(['amount' => 'Cannot approve redeem']);
                    }
                }

                $redeem->status = 'approved';
                $redeem->approved_by = $admin->id;
                $redeem->approved_at = now();
                $redeem->save();

                $this->notificationService->notifyUser(
                    $trainerUserId,
                    'redeem_approved',
                    'Redeem approved',
                    ['redeem_request_id' => $redeem->id, 'amount' => (int) $redeem->amount],
                );
            } else {
                $redeem->status = 'rejected';
                $redeem->approved_by = $admin->id;
                $redeem->rejected_reason = $data['rejected_reason'] ?? null;
                $redeem->rejected_at = now();
                $redeem->save();

                if ($alreadyDeducted) {
                    $this->pointService->addPoints(
                        (int) $trainerProfile->id,
                        (int) $redeem->amount,
                        'adjusted',
                        'redeem_request',
                        (int) $redeem->id,
                        'Redeem rejected: refund points',
                    );
                }

                $this->notificationService->notifyUser(
                    $trainerUserId,
                    'redeem_rejected',
                    'Redeem rejected',
                    [
                        'redeem_request_id' => $redeem->id,
                        'amount' => (int) $redeem->amount,
                        'reason' => $redeem->rejected_reason,
                    ],
                );
            }

            return ['redeem' => $redeem->refresh()->load(['trainerProfile.user:id,full_name,username,email,avatar'])];
        }));
    }
}

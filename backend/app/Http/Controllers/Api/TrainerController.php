<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MemberProfile;
use App\Models\Order;
use App\Models\PointTransaction;
use App\Models\TrainerProfile;
use App\Models\TrainerRedeemRequest;
use App\Services\PointService;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class TrainerController extends Controller
{
    public function __construct(
        protected PointService $pointService,
        protected NotificationService $notificationService,
    ) {
    }

    public function dashboard(Request $request)
    {
        $trainerProfile = TrainerProfile::query()->where('user_id', $request->user()->id)->firstOrFail();

        $totalMembers = MemberProfile::query()->where('referred_by', $trainerProfile->id)->count();

        $start = Carbon::now()->startOfMonth();
        $end = Carbon::now()->endOfMonth();
        $monthEarning = PointTransaction::query()
            ->where('trainer_id', $trainerProfile->id)
            ->where('type', 'earned')
            ->whereBetween('created_at', [$start, $end])
            ->sum('amount');

        $recentMembers = MemberProfile::query()
            ->with('user')
            ->where('referred_by', $trainerProfile->id)
            ->orderByDesc('id')
            ->limit(10)
            ->get()
            ->map(function (MemberProfile $mp) {
                return [
                    'id' => $mp->user->id,
                    'full_name' => $mp->user->full_name,
                    'username' => $mp->user->username,
                    'email' => $mp->user->email,
                    'created_at' => $mp->created_at,
                ];
            })
            ->values();

        return response()->json([
            'trainer' => $trainerProfile,
            'stats' => [
                'total_members' => $totalMembers,
                'total_points' => (int) $trainerProfile->total_points,
                'total_points_rupiah' => $this->pointService->convertToRupiah((int) $trainerProfile->total_points),
                'month_earning_points' => (int) $monthEarning,
            ],
            'recent_members' => $recentMembers,
        ]);
    }

    public function referrals(Request $request)
    {
        $trainerProfile = TrainerProfile::query()->where('user_id', $request->user()->id)->firstOrFail();

        $members = MemberProfile::query()
            ->with('user')
            ->where('referred_by', $trainerProfile->id)
            ->orderByDesc('id')
            ->paginate(20);

        $memberIds = collect($members->items())->map(fn (MemberProfile $mp) => $mp->user_id)->all();
        $latestOrders = Order::query()
            ->select(['id', 'order_number', 'member_id', 'status', 'payment_status', 'total_amount', 'created_at'])
            ->whereIn('member_id', $memberIds)
            ->orderByDesc('id')
            ->get()
            ->groupBy('member_id')
            ->map(fn ($rows) => $rows->first());

        $data = $members->through(function (MemberProfile $mp) use ($latestOrders) {
            return [
                'member' => $mp->user->only(['id', 'full_name', 'username', 'email', 'phone_number']),
                'latest_order' => $latestOrders->get($mp->user_id),
            ];
        });

        return response()->json($data);
    }

    public function points(Request $request)
    {
        $trainerProfile = TrainerProfile::query()->where('user_id', $request->user()->id)->firstOrFail();

        $tx = PointTransaction::query()
            ->where('trainer_id', $trainerProfile->id)
            ->orderByDesc('id')
            ->paginate(20);

        return response()->json([
            'balance' => (int) $trainerProfile->total_points,
            'balance_rupiah' => $this->pointService->convertToRupiah((int) $trainerProfile->total_points),
            'payout' => [
                'payout_bank' => $trainerProfile->payout_bank,
                'payout_account_number' => $trainerProfile->payout_account_number,
            ],
            'transactions' => $tx,
        ]);
    }

    public function updatePayoutAccount(Request $request)
    {
        $trainerProfile = TrainerProfile::query()->where('user_id', $request->user()->id)->firstOrFail();

        $data = $request->validate([
            'payout_bank' => ['nullable', 'string', 'max:100'],
            'payout_account_number' => ['required', 'string', 'max:50'],
        ]);

        $trainerProfile->payout_bank = $data['payout_bank'] ?? null;
        $trainerProfile->payout_account_number = $data['payout_account_number'];
        $trainerProfile->save();

        return response()->json([
            'payout' => [
                'payout_bank' => $trainerProfile->payout_bank,
                'payout_account_number' => $trainerProfile->payout_account_number,
            ],
        ]);
    }

    public function redeem(Request $request)
    {
        $trainerProfile = TrainerProfile::query()->where('user_id', $request->user()->id)->firstOrFail();
        $data = $request->validate([
            'amount' => ['required', 'integer', 'min:1'],
            'description' => ['nullable', 'string', 'max:255'],
        ]);

        if (! $trainerProfile->payout_account_number) {
            return response()->json(['message' => 'Payout account is required'], 422);
        }

        $amount = (int) $data['amount'];
        $description = $data['description'] ?? null;

        try {
            $redeem = DB::transaction(function () use ($trainerProfile, $amount, $description) {
                $min = (int) (\App\Models\PointSetting::get('min_redeem_points', '0') ?? '0');
                if ($amount < $min) {
                    return null;
                }

                $pending = (int) TrainerRedeemRequest::query()
                    ->where('trainer_profile_id', $trainerProfile->id)
                    ->where('status', 'pending')
                    ->sum('amount');
                $available = max(0, (int) $trainerProfile->total_points - $pending);
                if ($available < $amount) {
                    return null;
                }

                $redeem = TrainerRedeemRequest::query()->create([
                    'trainer_profile_id' => $trainerProfile->id,
                    'amount' => $amount,
                    'status' => 'pending',
                    'payout_bank' => $trainerProfile->payout_bank,
                    'payout_account_number' => $trainerProfile->payout_account_number,
                    'description' => $description,
                ]);

                return $redeem;
            });
        } catch (\Throwable) {
            $redeem = null;
        }

        if (! $redeem) {
            return response()->json(['message' => 'Cannot redeem points'], 422);
        }

        $trainerProfile->refresh();

        $this->notificationService->notifyUser(
            (int) $request->user()->id,
            'redeem_requested',
            'Redeem requested',
            ['amount' => $amount, 'redeem_request_id' => $redeem->id],
        );

        return response()->json([
            'balance' => (int) $trainerProfile->total_points,
            'balance_rupiah' => $this->pointService->convertToRupiah((int) $trainerProfile->total_points),
            'redeem' => $redeem,
        ]);
    }

    public function redeemRequests(Request $request)
    {
        $trainerProfile = TrainerProfile::query()->where('user_id', $request->user()->id)->firstOrFail();

        $q = TrainerRedeemRequest::query()
            ->where('trainer_profile_id', $trainerProfile->id)
            ->orderByDesc('id');

        $page = $q->paginate(20);
        $ids = $page->getCollection()->pluck('id')->values()->all();
        $deductedIds = PointTransaction::query()
            ->where('trainer_id', $trainerProfile->id)
            ->where('type', 'redeemed')
            ->where('reference_type', 'redeem_request')
            ->whereIn('reference_id', $ids)
            ->pluck('reference_id')
            ->map(fn ($v) => (int) $v)
            ->all();
        $deductedSet = array_fill_keys($deductedIds, true);

        $page->getCollection()->transform(function (TrainerRedeemRequest $r) use ($deductedSet) {
            $arr = $r->toArray();
            $arr['deducted'] = isset($deductedSet[(int) $r->id]);
            return $arr;
        });

        return response()->json($page);
    }
}

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

        $data = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'min_purchase' => ['nullable', 'numeric', 'min:0'],
            'sort' => ['nullable', \Illuminate\Validation\Rule::in(['newest', 'purchase_desc', 'purchase_asc'])],
        ]);

        $q = MemberProfile::query()
            ->with('user')
            ->where('referred_by', $trainerProfile->id);

        if (! empty($data['q'])) {
            $term = '%'.str_replace('%', '\\%', $data['q']).'%';
            $q->whereHas('user', function ($qq) use ($term) {
                $qq->where('full_name', 'like', $term)->orWhere('username', 'like', $term);
            });
        }

        $members = $q->orderByDesc('id')->paginate(20);

        $memberIds = collect($members->items())->map(fn (MemberProfile $mp) => $mp->user_id)->all();
        $orderAgg = \App\Models\Order::query()
            ->whereIn('member_id', $memberIds)
            ->where('payment_status', 'paid')
            ->groupBy('member_id')
            ->selectRaw('member_id, COALESCE(SUM(total_amount), 0) as total_purchase')
            ->pluck('total_purchase', 'member_id')
            ->map(fn ($v) => (float) $v);

        $itemAgg = \App\Models\OrderItem::query()
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->whereIn('orders.member_id', $memberIds)
            ->where('orders.payment_status', 'paid')
            ->groupBy('orders.member_id')
            ->selectRaw('orders.member_id as member_id, COALESCE(SUM(order_items.quantity), 0) as items_count')
            ->pluck('items_count', 'member_id')
            ->map(fn ($v) => (int) $v);

        $rows = $members->through(function (MemberProfile $mp) use ($orderAgg, $itemAgg) {
            return [
                'member' => $mp->user->only(['id', 'full_name', 'username', 'email', 'phone_number', 'avatar']),
                'total_purchase' => (float) ($orderAgg->get($mp->user_id) ?? 0),
                'items_count' => (int) ($itemAgg->get($mp->user_id) ?? 0),
            ];
        });

        if (! empty($data['min_purchase'])) {
            $min = (float) $data['min_purchase'];
            $filtered = $rows->getCollection()->filter(fn ($r) => (float) ($r['total_purchase'] ?? 0) >= $min)->values();
            $rows->setCollection($filtered);
        }

        $sort = $data['sort'] ?? null;
        if ($sort === 'purchase_desc') {
            $rows->setCollection($rows->getCollection()->sortByDesc('total_purchase')->values());
        } elseif ($sort === 'purchase_asc') {
            $rows->setCollection($rows->getCollection()->sortBy('total_purchase')->values());
        }

        return response()->json($rows);
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

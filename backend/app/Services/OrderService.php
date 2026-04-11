<?php

namespace App\Services;

use App\Models\MemberProfile;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductModifierOption;
use App\Models\Gym;
use App\Models\TrainerProfile;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OrderService
{
    public function __construct(
        protected ReferralService $referralService,
        protected NotificationService $notificationService,
        protected PointService $pointService,
    ) {
    }

    public function createOrder(User $member, array $cartData): Order
    {
        return DB::transaction(function () use ($member, $cartData) {
            $items = $cartData['items'] ?? [];

            $productIds = collect($items)->pluck('product_id')->filter()->unique()->values()->all();
            $products = Product::query()
                ->with(['modifiers.options'])
                ->whereIn('id', $productIds)
                ->get()
                ->keyBy('id');

            $gym = null;
            if (! empty($cartData['gym_id'])) {
                $gym = Gym::query()->where('is_active', true)->find((int) $cartData['gym_id']);
            }

            $deliveryFee = $gym ? 0.0 : (float) ($cartData['delivery_fee'] ?? 0);
            $discountAmount = (float) ($cartData['discount_amount'] ?? 0);

            $order = new Order();
            $order->order_number = $this->generateOrderNumber();
            $order->member_id = $member->id;

            $memberProfile = MemberProfile::query()->where('user_id', $member->id)->first();
            if (! $memberProfile) {
                $memberProfile = MemberProfile::query()->create(['user_id' => $member->id]);
            }
            $order->trainer_id = $memberProfile?->trainerProfile?->user_id;

            $order->status = 'pending';
            $order->payment_status = 'unpaid';
            $order->payment_method = $cartData['payment_method'] ?? null;
            $order->payment_proof = null;
            $order->discount_amount = $discountAmount;
            $order->delivery_fee = $deliveryFee;
            $order->points_used = 0;
            $order->points_used_source = null;
            $order->points_earned_trainer = 0;
            $order->gym_id = $gym?->id;
            $order->delivery_address = $gym ? $this->formatGymAddress($gym) : ($cartData['delivery_address'] ?? '');
            $order->delivery_notes = $cartData['delivery_notes'] ?? null;
            $order->recipient_name = $cartData['recipient_name'] ?? $member->full_name;
            $order->recipient_phone = $cartData['recipient_phone'] ?? $member->phone_number;
            $order->estimated_delivery_at = null;
            $order->delivered_at = null;
            $order->cancelled_at = null;
            $order->cancelled_reason = null;

            $subtotal = 0;
            $order->subtotal = 0;
            $order->total_amount = max(0, 0 + $deliveryFee - $discountAmount);
            $order->save();

            if ($gym && $memberProfile && ! $memberProfile->default_gym_id) {
                $memberProfile->default_gym_id = $gym->id;
                $memberProfile->save();
            }

            foreach ($items as $item) {
                $product = $products->get((int) ($item['product_id'] ?? 0));
                if (! $product) {
                    continue;
                }

                $qty = max(1, (int) ($item['quantity'] ?? 1));
                $selectedOptionIds = collect($item['modifier_option_ids'] ?? [])->filter()->map(fn ($v) => (int) $v)->values()->all();

                $options = [];
                $modifierSnapshot = [];
                $modifierAdditional = 0.0;

                if (! empty($selectedOptionIds)) {
                    $options = ProductModifierOption::query()
                        ->whereIn('id', $selectedOptionIds)
                        ->whereIn('modifier_id', $product->modifiers->pluck('id')->all())
                        ->get()
                        ->keyBy('id');

                    foreach ($product->modifiers as $modifier) {
                        $picked = $options->where('modifier_id', $modifier->id)->values();
                        if ($picked->isEmpty()) {
                            continue;
                        }

                        foreach ($picked as $opt) {
                            $modifierAdditional += (float) $opt->additional_price;
                            $modifierSnapshot[] = [
                                'modifier_name' => $modifier->name,
                                'option_name' => $opt->name,
                                'additional_price' => (float) $opt->additional_price,
                            ];
                        }
                    }
                }

                $basePrice = (float) $product->price;
                $itemSubtotal = ($basePrice + $modifierAdditional) * $qty;
                $subtotal += $itemSubtotal;

                $memberReward = isset($product->point_reward_member) ? (int) $product->point_reward_member : (int) $product->point_reward;
                $trainerReward = isset($product->point_reward_trainer) ? (int) $product->point_reward_trainer : (int) $product->point_reward;

                OrderItem::query()->create([
                    'order_id' => $order->id,
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'product_price' => $product->price,
                    'quantity' => $qty,
                    'modifier_options' => empty($modifierSnapshot) ? null : $modifierSnapshot,
                    'item_notes' => $item['item_notes'] ?? null,
                    'subtotal' => $itemSubtotal,
                    'point_reward' => $memberReward,
                    'point_reward_member' => $memberReward,
                    'point_reward_trainer' => $trainerReward,
                ]);
            }

            $order->subtotal = $subtotal;
            $order->total_amount = max(0, $subtotal + $deliveryFee - $discountAmount);

            if (($cartData['payment_method'] ?? null) === 'flame-points') {
                $pointsNeeded = (int) round((float) $order->total_amount);
                if ($member->hasRole('trainer')) {
                    $tp = TrainerProfile::query()->where('user_id', $member->id)->lockForUpdate()->first();
                    if (! $tp) {
                        throw ValidationException::withMessages(['points_used' => 'Trainer profile not found']);
                    }
                    if ((int) $tp->total_points < $pointsNeeded) {
                        throw ValidationException::withMessages(['points_used' => 'Insufficient points']);
                    }

                    $tp->total_points = (int) $tp->total_points - $pointsNeeded;
                    $tp->save();

                    $order->points_used = $pointsNeeded;
                    $order->points_used_source = 'trainer';
                } else {
                    $mp = MemberProfile::query()->where('user_id', $member->id)->lockForUpdate()->first();
                    if (! $mp) {
                        throw ValidationException::withMessages(['points_used' => 'Member profile not found']);
                    }
                    if ((int) $mp->total_points < $pointsNeeded) {
                        throw ValidationException::withMessages(['points_used' => 'Insufficient points']);
                    }

                    $mp->total_points = (int) $mp->total_points - $pointsNeeded;
                    $mp->save();

                    $order->points_used = $pointsNeeded;
                    $order->points_used_source = 'member';
                }
            }

            $order->save();

            $this->notificationService->notifyOrderQueue($this->queueCounts(), 'created', $order->order_number, $order->status, $order->payment_status, $order->id);

            return $order->load('items');
        });
    }

    public function confirmPayment(Order $order): void
    {
        if ($order->payment_status === 'paid') {
            return;
        }

        DB::transaction(function () use ($order): void {
            $order->payment_status = 'paid';
            $order->save();

            $memberPoints = (int) OrderItem::query()
                ->where('order_id', $order->id)
                ->selectRaw('COALESCE(SUM(point_reward_member * quantity), 0) as pts')
                ->value('pts');

            if ($memberPoints > 0) {
                $mp = MemberProfile::query()->where('user_id', $order->member_id)->lockForUpdate()->first();
                if ($mp) {
                    $mp->total_points = (int) $mp->total_points + $memberPoints;
                    $mp->save();
                }
            }

            $order->points_earned_member = $memberPoints;
            $order->save();

            $this->notificationService->notifyOrderStatus($order->id, $order->status, $order->order_number, $order->payment_status);
            $this->notificationService->notifyOrderQueue($this->queueCounts(), 'payment', $order->order_number, $order->status, $order->payment_status, $order->id);
            if ($memberPoints > 0) {
                $this->notificationService->notifyUser(
                    (int) $order->member_id,
                    'reward_in',
                    'Reward masuk',
                    ['order_id' => $order->id, 'order_number' => $order->order_number, 'points' => $memberPoints],
                );
            }
            $this->notificationService->notifyUser(
                (int) $order->member_id,
                'order_status',
                'Status pesanan diperbarui',
                ['order_id' => $order->id, 'order_number' => $order->order_number, 'status' => $order->status, 'payment_status' => $order->payment_status],
            );

            if (! $order->trainer_id) {
                return;
            }

            $memberProfile = MemberProfile::query()->where('user_id', $order->member_id)->first();
            if (! $memberProfile?->referred_by) {
                return;
            }

            $isFirstPaid = ! Order::query()
                ->where('member_id', $order->member_id)
                ->where('payment_status', 'paid')
                ->where('id', '!=', $order->id)
                ->exists();

            $eventType = $isFirstPaid ? 'first_order' : 'repeat_order';
            $points = $this->referralService->awardPoints((int) $memberProfile->referred_by, $eventType, $order->id);
            $order->points_earned_trainer = $points;
            $order->save();
        });
    }

    public function updateStatus(Order $order, string $status): void
    {
        DB::transaction(function () use ($order, $status): void {
            $locked = Order::query()->lockForUpdate()->findOrFail($order->id);

            if ($status === 'cancelled' && $locked->payment_status === 'paid') {
                $this->reverseRewardsIfNeeded($locked);
            }

            $locked->status = $status;
            if ($status === 'delivered' && ! $locked->delivered_at) {
                $locked->delivered_at = now();
            }
            if ($status === 'cancelled' && ! $locked->cancelled_at) {
                $locked->cancelled_at = now();
            }
            $locked->save();
        });

        $order->refresh();
        $this->notificationService->notifyOrderStatus($order->id, $order->status, $order->order_number, $order->payment_status);
        $this->notificationService->notifyOrderQueue($this->queueCounts(), 'status', $order->order_number, $order->status, $order->payment_status, $order->id);
        $this->notificationService->notifyUser(
            (int) $order->member_id,
            'order_status',
            'Status pesanan diperbarui',
            ['order_id' => $order->id, 'order_number' => $order->order_number, 'status' => $order->status, 'payment_status' => $order->payment_status],
        );
    }

    public function reverseRewardsIfNeeded(Order $order): void
    {
        DB::transaction(function () use ($order): void {
            $locked = Order::query()->lockForUpdate()->findOrFail($order->id);
            if ($locked->rewards_reversed_at) {
                return;
            }
            if ($locked->payment_status !== 'paid') {
                return;
            }

            $memberPoints = (int) ($locked->points_earned_member ?? 0);
            $trainerPoints = (int) ($locked->points_earned_trainer ?? 0);
            $pointsUsed = (int) ($locked->points_used ?? 0);
            $pointsUsedSource = (string) ($locked->points_used_source ?? '');

            if ($memberPoints > 0) {
                $mp = MemberProfile::query()->where('user_id', $locked->member_id)->lockForUpdate()->first();
                if ($mp) {
                    $mp->total_points = max(0, (int) $mp->total_points - $memberPoints);
                    $mp->save();
                }
            }

            if ($pointsUsed > 0) {
                if ($pointsUsedSource === 'trainer') {
                    $tp = TrainerProfile::query()->where('user_id', $locked->member_id)->lockForUpdate()->first();
                    if ($tp) {
                        $tp->total_points = (int) $tp->total_points + $pointsUsed;
                        $tp->save();
                    }
                } else {
                    $mp = MemberProfile::query()->where('user_id', $locked->member_id)->lockForUpdate()->first();
                    if ($mp) {
                        $mp->total_points = (int) $mp->total_points + $pointsUsed;
                        $mp->save();
                    }
                }
            }

            if ($trainerPoints > 0 && $locked->trainer_id) {
                $tp = TrainerProfile::query()->where('user_id', $locked->trainer_id)->lockForUpdate()->first();
                if ($tp) {
                    $exists = \App\Models\PointTransaction::query()
                        ->where('trainer_id', $tp->id)
                        ->where('type', 'adjusted')
                        ->where('reference_type', 'order')
                        ->where('reference_id', $locked->id)
                        ->where('amount', -$trainerPoints)
                        ->exists();

                    if (! $exists) {
                        $this->pointService->addPoints(
                            $tp->id,
                            -$trainerPoints,
                            'adjusted',
                            'order',
                            $locked->id,
                            'Order cancelled: rollback points',
                        );
                    }
                }
            }

            $locked->rewards_reversed_at = now();
            $locked->save();
        });
    }

    public function queueCounts(): array
    {
        $queueStatuses = ['pending', 'confirmed', 'delivering'];

        $queueTotal = Order::query()->whereIn('status', $queueStatuses)->count();
        $unpaidQueue = Order::query()->whereIn('status', $queueStatuses)->where('payment_status', 'unpaid')->count();

        return [
            'queue_total' => $queueTotal,
            'queue_unpaid' => $unpaidQueue,
        ];
    }

    protected function formatGymAddress(Gym $gym): string
    {
        $parts = array_values(array_filter([
            $gym->gym_name,
            $gym->address,
            $gym->city,
            $gym->province,
        ]));

        return implode(', ', $parts);
    }


    public function generateOrderNumber(): string
    {
        $date = Carbon::now()->format('Ymd');
        $prefix = 'FS-'.$date.'-';

        $count = (int) Order::query()->where('order_number', 'like', $prefix.'%')->count();
        $seq = str_pad((string) ($count + 1), 4, '0', STR_PAD_LEFT);

        return $prefix.$seq;
    }
}

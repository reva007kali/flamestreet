<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderChatRead;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ChatThreadController extends Controller
{
                    public function index(Request $request)
                    {
                                        $u = $request->user();

                                        $isCourier = $u->hasRole('courier');
                                        $isMember = $u->hasRole('member');
                                        $isTrainer = $u->hasRole('trainer');
                                        if (!$isCourier && !$isMember && !$isTrainer) {
                                                            abort(403);
                                        }

                                        $orders = Order::query()
                                                            ->when($isCourier, fn($q) => $q->where('courier_id', $u->id))
                                                            ->when($isMember || $isTrainer, fn($q) => $q->where('member_id', $u->id))
                                                            ->whereNotNull('courier_id')
                                                            ->with([
                                                                                'member:id,full_name,avatar',
                                                                                'courier:id,full_name,avatar',
                                                            ])
                                                            ->orderByDesc(
                                                                                DB::raw('(SELECT COALESCE(MAX(id), 0) FROM order_chat_messages WHERE order_chat_messages.order_id = orders.id)'),
                                                            )
                                                            ->limit(60)
                                                            ->get(['id', 'order_number', 'member_id', 'courier_id', 'status', 'payment_status', 'created_at']);

                                        $orderIds = $orders->pluck('id')->all();

                                        $lastMessageIds = DB::table('order_chat_messages')
                                                            ->selectRaw('order_id, MAX(id) as last_id')
                                                            ->whereIn('order_id', $orderIds)
                                                            ->groupBy('order_id')
                                                            ->pluck('last_id', 'order_id');

                                        $lastMessages = DB::table('order_chat_messages')
                                                            ->whereIn('id', array_values($lastMessageIds->all()))
                                                            ->get(['id', 'order_id', 'sender_id', 'type', 'body', 'image_path', 'created_at'])
                                                            ->keyBy('order_id');

                                        $reads = OrderChatRead::query()
                                                            ->where('user_id', $u->id)
                                                            ->whereIn('order_id', $orderIds)
                                                            ->get(['order_id', 'last_read_message_id'])
                                                            ->keyBy('order_id');

                                        $data = $orders->map(function (Order $o) use ($u, $isCourier, $lastMessages, $reads) {
                                                            $other = $isCourier ? $o->member : $o->courier;
                                                            $otherUser = $other
                                                                                ? [
                                                                                                    'id' => (int) $other->id,
                                                                                                    'full_name' => (string) ($other->full_name ?? ''),
                                                                                                    'avatar' => $other->avatar,
                                                                                ]
                                                                                : null;

                                                            $lm = $lastMessages->get($o->id);
                                                            $lastRead = (int) ($reads->get($o->id)?->last_read_message_id ?? 0);

                                                            $unread = (int) DB::table('order_chat_messages')
                                                                                ->where('order_id', $o->id)
                                                                                ->where('id', '>', $lastRead)
                                                                                ->where('sender_id', '!=', $u->id)
                                                                                ->count();

                                                            return [
                                                                                'order_id' => (int) $o->id,
                                                                                'order_number' => (string) $o->order_number,
                                                                                'other_user' => $otherUser,
                                                                                'last_message' => $lm ? [
                                                                                                    'id' => (int) $lm->id,
                                                                                                    'order_id' => (int) $lm->order_id,
                                                                                                    'sender_id' => (int) $lm->sender_id,
                                                                                                    'type' => (string) $lm->type,
                                                                                                    'body' => $lm->body,
                                                                                                    'image_path' => $lm->image_path,
                                                                                                    'created_at' => $lm->created_at ? (string) $lm->created_at : null,
                                                                                ] : null,
                                                                                'unread_count' => $unread,
                                                            ];
                                        })->values();

                                        return response()->json(['threads' => $data]);
                    }

                    public function markRead(Request $request, int $orderId)
                    {
                                        $order = Order::query()->findOrFail($orderId);
                                        $u = $request->user();

                                        $isCourier = $u->hasRole('courier');
                                        $isMember = $u->hasRole('member');
                                        $isTrainer = $u->hasRole('trainer');
                                        if (!$isCourier && !$isMember && !$isTrainer) {
                                                            abort(403);
                                        }

                                        $ok = false;
                                        if ($isCourier && (int) $order->courier_id === (int) $u->id)
                                                            $ok = true;
                                        if (($isMember || $isTrainer) && (int) $order->member_id === (int) $u->id)
                                                            $ok = true;
                                        if (!$ok)
                                                            abort(403);

                                        $lastId = (int) DB::table('order_chat_messages')->where('order_id', $order->id)->max('id');

                                        OrderChatRead::query()->updateOrCreate(
                                                            ['order_id' => $order->id, 'user_id' => $u->id],
                                                            ['last_read_message_id' => $lastId],
                                        );

                                        return response()->json(['ok' => true, 'order_id' => (int) $order->id, 'last_read_message_id' => $lastId]);
                    }
}

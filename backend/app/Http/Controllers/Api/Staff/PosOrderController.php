<?php

namespace App\Http\Controllers\Api\Staff;

use App\Http\Controllers\Controller;
use App\Models\Gym;
use App\Models\MemberProfile;
use App\Models\User;
use App\Services\OrderService;
use Illuminate\Http\Request;

class PosOrderController extends Controller
{
    public function store(Request $request, OrderService $orderService)
    {
        $data = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'gym_id' => ['required', 'integer', 'exists:gyms,id'],
            'delivery_address' => ['required', 'string'],
            'delivery_notes' => ['nullable', 'string'],
            'recipient_name' => ['required', 'string'],
            'recipient_phone' => ['required', 'string'],
            'payment_method' => ['nullable', 'string', 'max:50'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.modifier_option_ids' => ['nullable', 'array'],
            'items.*.modifier_option_ids.*' => ['integer', 'exists:modifier_options,id'],
            'items.*.item_notes' => ['nullable', 'string'],
        ]);

        $user = User::query()->findOrFail($data['user_id']);
        $gym = Gym::query()->where('is_active', true)->findOrFail($data['gym_id']);

        $cartData = $data;
        $cartData['gym_id'] = $gym->id;
        $cartData['delivery_lat'] = null;
        $cartData['delivery_lng'] = null;

        $order = $orderService->createOrder($user, $cartData);

        MemberProfile::query()->updateOrCreate(
            ['user_id' => $user->id],
            ['default_gym_id' => $gym->id],
        );

        return response()->json(['order' => $order]);
    }
}


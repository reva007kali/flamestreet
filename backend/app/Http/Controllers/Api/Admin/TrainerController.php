<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\TrainerProfile;
use App\Models\User;
use Illuminate\Http\Request;

class TrainerController extends Controller
{
    public function index()
    {
        $trainers = User::query()
            ->role('trainer')
            ->with('trainerProfile.gym')
            ->orderByDesc('id')
            ->paginate(20);

        $trainers->getCollection()->transform(function (User $u) {
            return $u->only(['id', 'full_name', 'username', 'email', 'phone_number', 'avatar', 'is_active']) + [
                'trainer_profile' => $u->trainerProfile,
            ];
        });

        return response()->json($trainers);
    }

    public function verify(Request $request, int $id)
    {
        $data = $request->validate([
            'is_verified' => ['required', 'boolean'],
        ]);

        $profile = TrainerProfile::query()->findOrFail($id);
        $profile->is_verified = (bool) $data['is_verified'];
        $profile->save();

        return response()->json(['trainer_profile' => $profile]);
    }
}

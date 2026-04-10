<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\MemberProfile;
use App\Models\TrainerProfile;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $users = User::query()
            ->orderByDesc('id')
            ->paginate(20);

        $users->getCollection()->transform(function (User $u) {
            return $u->only(['id', 'full_name', 'username', 'phone_number', 'email', 'avatar', 'is_active', 'created_at']) + [
                'roles' => $u->getRoleNames(),
            ];
        });

        return response()->json($users);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'full_name' => ['required', 'string', 'max:100'],
            'username' => ['required', 'string', 'max:50', 'alpha_dash', 'unique:users,username'],
            'phone_number' => ['required', 'string', 'max:20', 'unique:users,phone_number'],
            'email' => ['required', 'email', 'max:100', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', Rule::in(['admin', 'trainer', 'member', 'courier'])],
            'is_active' => ['nullable', 'boolean'],
            'date_of_birth' => ['nullable', 'date'],
            'gym_id' => ['nullable', 'integer', 'exists:gyms,id'],
        ]);

        $user = User::query()->create([
            'full_name' => $data['full_name'],
            'username' => $data['username'],
            'phone_number' => $data['phone_number'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'is_active' => $data['is_active'] ?? true,
        ]);

        $user->syncRoles([$data['role']]);

        if ($data['role'] === 'trainer') {
            TrainerProfile::query()->create([
                'user_id' => $user->id,
                'gym_id' => $data['gym_id'] ?? null,
                'date_of_birth' => $data['date_of_birth'] ?? now()->subYears(18)->toDateString(),
                'is_verified' => false,
            ]);
        }

        if ($data['role'] === 'member') {
            MemberProfile::query()->create([
                'user_id' => $user->id,
                'date_of_birth' => $data['date_of_birth'] ?? null,
            ]);
        }

        return response()->json([
            'user' => $user->only(['id', 'full_name', 'username', 'phone_number', 'email', 'is_active']) + [
                'roles' => $user->getRoleNames(),
            ],
        ], 201);
    }

    public function show($id)
    {
        $user = User::query()->findOrFail($id);
        
        $data = $user->only(['id', 'full_name', 'username', 'phone_number', 'email', 'is_active', 'created_at']);
        $data['roles'] = $user->getRoleNames();

        if ($data['roles']->contains('trainer')) {
            $data['trainer_profile'] = $user->trainerProfile;
        }

        if ($data['roles']->contains('member')) {
            $data['member_profile'] = $user->memberProfile;
        }

        return response()->json($data);
    }

    public function update(Request $request, $id)
    {
        $user = User::query()->findOrFail($id);

        $data = $request->validate([
            'full_name' => ['required', 'string', 'max:100'],
            'username' => ['required', 'string', 'max:50', 'alpha_dash', Rule::unique('users')->ignore($user->id)],
            'phone_number' => ['required', 'string', 'max:20', Rule::unique('users')->ignore($user->id)],
            'email' => ['required', 'email', 'max:100', Rule::unique('users')->ignore($user->id)],
            'password' => ['nullable', 'string', 'min:8'],
            'role' => ['required', Rule::in(['admin', 'trainer', 'member', 'courier', 'cashier'])],
            'is_active' => ['nullable', 'boolean'],
            'date_of_birth' => ['nullable', 'date'],
            'gym_id' => ['nullable', 'integer', 'exists:gyms,id'],
        ]);

        $updateData = [
            'full_name' => $data['full_name'],
            'username' => $data['username'],
            'phone_number' => $data['phone_number'],
            'email' => $data['email'],
            'is_active' => $data['is_active'] ?? true,
        ];

        if (!empty($data['password'])) {
            $updateData['password'] = Hash::make($data['password']);
        }

        $user->update($updateData);
        $user->syncRoles([$data['role']]);

        if ($data['role'] === 'trainer') {
            TrainerProfile::query()->updateOrCreate(
                ['user_id' => $user->id],
                [
                    'gym_id' => $data['gym_id'] ?? null,
                    'date_of_birth' => $data['date_of_birth'] ?? null,
                ]
            );
        }

        if ($data['role'] === 'member') {
            MemberProfile::query()->updateOrCreate(
                ['user_id' => $user->id],
                [
                    'date_of_birth' => $data['date_of_birth'] ?? null,
                ]
            );
        }

        return response()->json([
            'user' => $user->only(['id', 'full_name', 'username', 'phone_number', 'email', 'is_active']) + [
                'roles' => $user->getRoleNames(),
            ],
        ]);
    }

    public function destroy($id)
    {
        $user = User::query()->findOrFail($id);
        $user->delete();

        return response()->noContent();
    }
}

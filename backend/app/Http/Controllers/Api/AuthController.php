<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MemberProfile;
use App\Models\TrainerProfile;
use App\Models\User;
use App\Services\ReferralService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Role;

class AuthController extends Controller
{
    public function __construct(
        protected ReferralService $referralService,
    ) {
    }

    public function register(Request $request)
    {
        $data = $request->validate([
            'full_name' => ['required', 'string', 'max:100'],
            'username' => ['required', 'string', 'max:50', 'alpha_dash', 'unique:users,username'],
            'phone_number' => ['required', 'string', 'max:20', 'unique:users,phone_number'],
            'email' => ['required', 'email', 'max:100', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['nullable', Rule::in(['member', 'trainer'])],
            'date_of_birth' => ['nullable', 'date'],
            'gym_id' => ['nullable', 'integer', 'exists:gyms,id'],
            'bio' => ['nullable', 'string'],
            'instagram_handle' => ['nullable', 'string', 'max:100'],
            'referral_code' => ['nullable', 'string', 'max:20'],
        ]);

        $role = $data['role'] ?? 'member';

        $user = User::query()->create([
            'full_name' => $data['full_name'],
            'username' => $data['username'],
            'phone_number' => $data['phone_number'],
            'email' => $data['email'],
            'password' => $data['password'],
            'is_active' => true,
        ]);

        Role::findOrCreate($role);
        $user->syncRoles([$role]);

        if ($role === 'trainer') {
            TrainerProfile::query()->create([
                'user_id' => $user->id,
                'gym_id' => $data['gym_id'] ?? null,
                'date_of_birth' => $data['date_of_birth'] ?? now()->subYears(18)->toDateString(),
                'bio' => $data['bio'] ?? null,
                'instagram_handle' => $data['instagram_handle'] ?? null,
                'is_verified' => false,
            ]);
        } else {
            MemberProfile::query()->create([
                'user_id' => $user->id,
                'date_of_birth' => $data['date_of_birth'] ?? null,
            ]);

            $ref = $data['referral_code'] ?? $request->query('ref');
            if (is_string($ref) && trim($ref) !== '') {
                $this->referralService->attachTrainer($user, $ref);
            }
        }

        $token = $user->createToken('api')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $user->load(['trainerProfile', 'memberProfile'])->only(['id', 'full_name', 'username', 'phone_number', 'email', 'avatar', 'is_active']) + [
                'roles' => $user->getRoleNames(),
                'trainer_profile' => $user->trainerProfile,
                'member_profile' => $user->memberProfile,
            ],
        ]);
    }

    public function login(Request $request)
    {
        $data = $request->validate([
            'login' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $user = User::query()
            ->where('email', $data['login'])
            ->orWhere('username', $data['login'])
            ->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            return response()->json(['message' => 'Invalid credentials'], 422);
        }

        if (! $user->is_active) {
            return response()->json(['message' => 'Account disabled'], 403);
        }

        $token = $user->createToken('api')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $user->load(['trainerProfile', 'memberProfile'])->only(['id', 'full_name', 'username', 'phone_number', 'email', 'avatar', 'is_active']) + [
                'roles' => $user->getRoleNames(),
                'trainer_profile' => $user->trainerProfile,
                'member_profile' => $user->memberProfile,
            ],
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()?->currentAccessToken()?->delete();

        return response()->json(['ok' => true]);
    }
}

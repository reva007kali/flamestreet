<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MemberProfile;
use App\Models\TrainerProfile;
use App\Services\ExpoNotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class MeController extends Controller
{
    public function __construct(protected ExpoNotificationService $expoPush)
    {
    }

    public function show(Request $request)
    {
        $user = $request->user()->load(['trainerProfile', 'memberProfile']);

        return response()->json([
            'user' => $user->only(['id', 'full_name', 'username', 'phone_number', 'email', 'avatar', 'flamehub_bio', 'is_active']) + [
                'roles' => $user->getRoleNames(),
                'trainer_profile' => $user->trainerProfile,
                'member_profile' => $user->memberProfile,
            ],
        ]);
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();
        $data = $request->validate([
            'full_name' => ['sometimes', 'string', 'max:100'],
            'phone_number' => ['sometimes', 'string', 'max:20', 'unique:users,phone_number,' . $user->id],
            'flamehub_bio' => ['sometimes', 'nullable', 'string', 'max:160'],
            'trainer_bio' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'username' => ['sometimes', 'string', 'max:50', Rule::unique('users', 'username')->ignore($user->id)],
            'email' => ['sometimes', 'string', 'email', 'max:100', Rule::unique('users', 'email')->ignore($user->id)],
            'current_password' => ['sometimes', 'string'],
        ]);

        $needsCurrentPassword = false;
        if (array_key_exists('email', $data) && (string) $data['email'] !== (string) $user->email) {
            $needsCurrentPassword = true;
        }
        if (array_key_exists('username', $data) && (string) $data['username'] !== (string) $user->username) {
            $needsCurrentPassword = true;
        }

        if ($needsCurrentPassword) {
            $request->validate([
                'current_password' => ['required', 'current_password'],
            ]);
        }

        $trainerBio = array_key_exists('trainer_bio', $data) ? $data['trainer_bio'] : null;
        unset($data['trainer_bio'], $data['current_password']);

        $user->fill($data);
        $user->save();

        if (array_key_exists('trainer_bio', $request->all())) {
            $tp = TrainerProfile::query()->where('user_id', $user->id)->first();
            if ($tp) {
                $tp->bio = $trainerBio;
                $tp->save();
            }
        }

        return $this->show($request);
    }

    public function updateMemberProfile(Request $request)
    {
        $data = $request->validate([
            'default_gym_id' => ['nullable', 'integer', 'exists:gyms,id'],
        ]);

        MemberProfile::query()->updateOrCreate(
            ['user_id' => $request->user()->id],
            ['default_gym_id' => $data['default_gym_id'] ?? null],
        );

        return $this->show($request);
    }

    public function updatePassword(Request $request)
    {
        $user = $request->user();
        $data = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user->password = $data['password'];
        $user->save();

        $token = $request->user()->currentAccessToken();
        if ($token) {
            $request->user()->tokens()->where('id', '!=', $token->id)->delete();
        } else {
            $request->user()->tokens()->delete();
        }

        return response()->json(['ok' => true]);
    }

    public function updateAvatar(Request $request)
    {
        $request->validate([
            'avatar' => ['required', 'file', 'image', 'max:5120'],
        ]);

        $user = $request->user();
        $file = $request->file('avatar');
        $filename = (string) Str::uuid() . '.' . $file->getClientOriginalExtension();
        $dir = public_path('uploads/avatars');
        File::ensureDirectoryExists($dir);
        $file->move($dir, $filename);
        $path = 'uploads/avatars/' . $filename;

        if ($user->avatar) {
            Storage::disk('public')->delete($user->avatar);
            File::delete(public_path($user->avatar));
        }

        $user->avatar = $path;
        $user->save();

        return $this->show($request);
    }

    public function deleteAvatar(Request $request)
    {
        $user = $request->user();
        if ($user->avatar) {
            Storage::disk('public')->delete($user->avatar);
            File::delete(public_path($user->avatar));
        }

        $user->avatar = null;
        $user->save();

        return $this->show($request);
    }

    public function updatePushToken(Request $request)
    {
        $data = $request->validate([
            'expo_push_token' => ['required', 'string', 'max:512'],
            'platform' => ['nullable', 'string', 'max:20'],
        ]);

        $this->expoPush->upsertToken(
            (int) $request->user()->id,
            (string) $data['expo_push_token'],
            isset($data['platform']) ? (string) $data['platform'] : null,
            'expo',
        );

        return response()->json(['ok' => true]);
    }

    public function deletePushToken(Request $request)
    {
        $data = $request->validate([
            'expo_push_token' => ['required', 'string', 'max:512'],
        ]);

        $this->expoPush->deleteToken((int) $request->user()->id, (string) $data['expo_push_token']);

        return response()->json(['ok' => true]);
    }
}

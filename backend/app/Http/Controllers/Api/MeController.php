<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ExpoNotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MeController extends Controller
{
    public function __construct(protected ExpoNotificationService $expoPush)
    {
    }

    public function show(Request $request)
    {
        $user = $request->user()->load(['trainerProfile', 'memberProfile']);

        return response()->json([
            'user' => $user->only(['id', 'full_name', 'username', 'phone_number', 'email', 'avatar', 'is_active']) + [
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
            'phone_number' => ['sometimes', 'string', 'max:20', 'unique:users,phone_number,'.$user->id],
        ]);

        $user->fill($data);
        $user->save();

        return $this->show($request);
    }

    public function updateAvatar(Request $request)
    {
        $request->validate([
            'avatar' => ['required', 'file', 'image', 'max:5120'],
        ]);

        $user = $request->user();
        $file = $request->file('avatar');
        $filename = (string) Str::uuid().'.'.$file->getClientOriginalExtension();
        $dir = public_path('uploads/avatars');
        File::ensureDirectoryExists($dir);
        $file->move($dir, $filename);
        $path = 'uploads/avatars/'.$filename;

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
            'expo_push_token' => ['required', 'string', 'max:200'],
            'platform' => ['nullable', 'string', 'max:20'],
        ]);

        $this->expoPush->upsertToken(
            (int) $request->user()->id,
            (string) $data['expo_push_token'],
            isset($data['platform']) ? (string) $data['platform'] : null,
        );

        return response()->json(['ok' => true]);
    }
}

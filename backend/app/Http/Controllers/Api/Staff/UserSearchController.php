<?php

namespace App\Http\Controllers\Api\Staff;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class UserSearchController extends Controller
{
    public function index(Request $request)
    {
        $q = trim((string) $request->query('q', ''));
        if ($q === '') {
            return response()->json(['users' => []]);
        }

        $users = User::query()
            ->with(['memberProfile'])
            ->where(function ($qq) use ($q) {
                $qq->where('full_name', 'like', '%' . $q . '%')
                    ->orWhere('phone_number', 'like', '%' . $q . '%')
                    ->orWhere('username', 'like', '%' . $q . '%')
                    ->orWhere('email', 'like', '%' . $q . '%');
            })
            ->whereHas('roles', function ($qr) {
                $qr->whereIn('name', ['member', 'trainer']);
            })
            ->orderBy('full_name')
            ->limit(20)
            ->get()
            ->map(function (User $u) {
                return [
                    'id' => $u->id,
                    'full_name' => $u->full_name,
                    'phone_number' => $u->phone_number,
                    'roles' => $u->getRoleNames()->values(),
                    'member_profile' => $u->memberProfile ? [
                        'default_gym_id' => $u->memberProfile->default_gym_id,
                    ] : null,
                ];
            });

        return response()->json(['users' => $users]);
    }
}


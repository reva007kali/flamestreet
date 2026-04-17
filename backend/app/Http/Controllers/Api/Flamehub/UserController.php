<?php

namespace App\Http\Controllers\Api\Flamehub;

use App\Http\Controllers\Controller;
use App\Models\FlamehubFollow;
use App\Models\FlamehubPost;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class UserController extends Controller
{
                    public function search(Request $request)
                    {
                                        $data = $request->validate([
                                                            'q' => ['required', 'string', 'min:1', 'max:40'],
                                                            'limit' => ['nullable', 'integer', 'min:1', 'max:25'],
                                        ]);

                                        $q = trim((string) $data['q']);
                                        $limit = (int) ($data['limit'] ?? 20);

                                        $items = User::query()
                                                            ->select(['id', 'username', 'full_name', 'avatar'])
                                                            ->where(function ($qq) use ($q) {
                                                                                $qq->where('username', 'like', $q . '%')
                                                                                                    ->orWhere('username', 'like', '%' . $q . '%')
                                                                                                    ->orWhere('full_name', 'like', '%' . $q . '%');
                                                            })
                                                            ->orderByRaw("CASE WHEN username LIKE ? THEN 0 ELSE 1 END", [$q . '%'])
                                                            ->orderBy('username')
                                                            ->limit($limit)
                                                            ->get();

                                        $data = $items->map(function (User $u) {
                                                            return [
                                                                                'id' => $u->id,
                                                                                'username' => $u->username,
                                                                                'full_name' => $u->full_name,
                                                                                'avatar' => $u->avatar,
                                                                                'is_trainer' => $u->hasRole('trainer'),
                                                            ];
                                        })->values();

                                        return response()->json(['data' => $data]);
                    }

                    public function show(Request $request, string $username)
                    {
                                        $viewerId = (int) $request->user()->getAuthIdentifier();

                                        $user = User::query()
                                                            ->select(['id', 'username', 'full_name', 'avatar', 'flamehub_bio'])
                                                            ->where('username', $username)
                                                            ->firstOrFail();

                                        $followersCount = FlamehubFollow::query()->where('following_id', $user->id)->count();
                                        $followingCount = FlamehubFollow::query()->where('follower_id', $user->id)->count();
                                        $isFollowing = FlamehubFollow::query()
                                                            ->where('follower_id', $viewerId)
                                                            ->where('following_id', $user->id)
                                                            ->exists();

                                        $posts = FlamehubPost::query()
                                                            ->where('user_id', $user->id)
                                                            ->with(['media:id,post_id,type,path,sort_order,width,height,duration_ms'])
                                                            ->whereDoesntHave('hides', fn($qq) => $qq->where('user_id', $viewerId))
                                                            ->withCount([
                                                                                'likes as like_count',
                                                                                'comments as comment_count' => fn($qq) => $qq->whereNull('deleted_at'),
                                                            ])
                                                            ->withExists([
                                                                                'likes as liked_by_me' => fn($qq) => $qq->where('user_id', $viewerId),
                                                                                'saves as saved_by_me' => fn($qq) => $qq->where('user_id', $viewerId),
                                                            ])
                                                            ->orderByDesc('id')
                                                            ->limit(12)
                                                            ->get();

                                        return response()->json([
                                                            'user' => $user->toArray() + ['is_trainer' => $user->hasRole('trainer')],
                                                            'stats' => [
                                                                                'followers' => $followersCount,
                                                                                'following' => $followingCount,
                                                            ],
                                                            'is_following' => $isFollowing,
                                                            'posts' => $posts,
                                        ]);
                    }

                    public function followers(Request $request, string $username)
                    {
                                        $data = $request->validate([
                                                            'cursor' => ['nullable', 'integer', 'min:1'],
                                                            'limit' => ['nullable', 'integer', 'min:1', 'max:50'],
                                        ]);

                                        $viewerId = (int) $request->user()->getAuthIdentifier();
                                        $limit = (int) ($data['limit'] ?? 20);
                                        $user = User::query()->select(['id', 'username'])->where('username', $username)->firstOrFail();

                                        $q = FlamehubFollow::query()
                                                            ->where('following_id', $user->id)
                                                            ->with(['follower:id,username,full_name,avatar'])
                                                            ->orderByDesc('id');

                                        if (!empty($data['cursor'])) {
                                                            $q->where('id', '<', (int) $data['cursor']);
                                        }

                                        $rows = $q->limit($limit + 1)->get();
                                        $nextCursor = null;
                                        if ($rows->count() > $limit) {
                                                            $nextCursor = (int) $rows[$limit - 1]->id;
                                                            $rows = $rows->slice(0, $limit)->values();
                                        }

                                        $items = $rows->map(function ($row) use ($viewerId) {
                                                            $f = $row->follower;
                                                            if (!$f) return null;
                                                            $isFollowing = FlamehubFollow::query()
                                                                                ->where('follower_id', $viewerId)
                                                                                ->where('following_id', $f->id)
                                                                                ->exists();
                                                            return [
                                                                                'id' => $f->id,
                                                                                'username' => $f->username,
                                                                                'full_name' => $f->full_name,
                                                                                'avatar' => $f->avatar,
                                                                                'is_trainer' => $f->hasRole('trainer'),
                                                                                'is_following' => $isFollowing,
                                                            ];
                                        })->filter()->values();

                                        return response()->json([
                                                            'data' => $items,
                                                            'next_cursor' => $nextCursor,
                                        ]);
                    }

                    public function follow(Request $request, string $username)
                    {
                                        $viewerId = (int) $request->user()->getAuthIdentifier();

                                        $user = User::query()->select(['id', 'username'])->where('username', $username)->firstOrFail();
                                        if ($user->id === $viewerId) {
                                                            throw ValidationException::withMessages(['username' => 'You cannot follow yourself.']);
                                        }

                                        FlamehubFollow::query()->firstOrCreate([
                                                            'follower_id' => $viewerId,
                                                            'following_id' => $user->id,
                                        ]);

                                        return response()->json(['ok' => true], 201);
                    }

                    public function unfollow(Request $request, string $username)
                    {
                                        $viewerId = (int) $request->user()->getAuthIdentifier();
                                        $user = User::query()->select(['id', 'username'])->where('username', $username)->firstOrFail();

                                        FlamehubFollow::query()
                                                            ->where('follower_id', $viewerId)
                                                            ->where('following_id', $user->id)
                                                            ->delete();

                                        return response()->json(['ok' => true]);
                    }
}

<?php

namespace App\Http\Controllers\Api\Flamehub;

use App\Http\Controllers\Controller;
use App\Models\FlamehubPost;
use Illuminate\Http\Request;

class FeedController extends Controller
{
                    public function index(Request $request)
                    {
                                        $data = $request->validate([
                                                            'cursor' => ['nullable', 'integer', 'min:1'],
                                                            'limit' => ['nullable', 'integer', 'min:1', 'max:30'],
                                        ]);

                                        $userId = (int) $request->user()->getAuthIdentifier();
                                        $limit = (int) ($data['limit'] ?? 12);

                                        $q = FlamehubPost::query()
                                                            ->with([
                                                                                'user:id,username,full_name,avatar',
                                                                                'media:id,post_id,type,path,sort_order,width,height,duration_ms',
                                                            ])
                                                            ->withCount([
                                                                                'likes as like_count',
                                                                                'comments as comment_count' => fn($qq) => $qq->whereNull('deleted_at'),
                                                            ])
                                                            ->withExists([
                                                                                'likes as liked_by_me' => fn($qq) => $qq->where('user_id', $userId),
                                                            ])
                                                            ->orderByDesc('id');

                                        if (!empty($data['cursor'])) {
                                                            $q->where('id', '<', (int) $data['cursor']);
                                        }

                                        $items = $q->limit($limit + 1)->get();
                                        $nextCursor = null;
                                        if ($items->count() > $limit) {
                                                            $nextCursor = (int) $items[$limit - 1]->id;
                                                            $items = $items->slice(0, $limit)->values();
                                        }

                                        return response()->json([
                                                            'data' => $items,
                                                            'next_cursor' => $nextCursor,
                                        ]);
                    }
}


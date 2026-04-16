<?php

namespace App\Http\Controllers\Api\Flamehub;

use App\Http\Controllers\Controller;
use App\Models\FlamehubComment;
use App\Models\FlamehubPost;
use Illuminate\Http\Request;

class CommentController extends Controller
{
                    public function index(Request $request, int $postId)
                    {
                                        $data = $request->validate([
                                                            'cursor' => ['nullable', 'integer', 'min:1'],
                                                            'limit' => ['nullable', 'integer', 'min:1', 'max:50'],
                                        ]);

                                        FlamehubPost::query()->findOrFail($postId);

                                        $limit = (int) ($data['limit'] ?? 30);
                                        $q = FlamehubComment::query()
                                                            ->where('post_id', $postId)
                                                            ->whereNull('deleted_at')
                                                            ->with(['user:id,username,full_name,avatar'])
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

                    public function store(Request $request, int $postId)
                    {
                                        $data = $request->validate([
                                                            'body' => ['required', 'string', 'min:1', 'max:2000'],
                                                            'parent_id' => ['nullable', 'integer', 'min:1'],
                                        ]);

                                        FlamehubPost::query()->findOrFail($postId);

                                        $parentId = isset($data['parent_id']) ? (int) $data['parent_id'] : null;
                                        if ($parentId) {
                                                            FlamehubComment::query()
                                                                                ->where('post_id', $postId)
                                                                                ->whereNull('deleted_at')
                                                                                ->findOrFail($parentId);
                                        }

                                        $userId = (int) $request->user()->getAuthIdentifier();
                                        $comment = FlamehubComment::create([
                                                            'post_id' => $postId,
                                                            'user_id' => $userId,
                                                            'parent_id' => $parentId,
                                                            'body' => $data['body'],
                                        ]);

                                        $comment->load(['user:id,username,full_name,avatar']);

                                        return response()->json(['comment' => $comment], 201);
                    }
}


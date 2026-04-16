<?php

namespace App\Http\Controllers\Api\Flamehub;

use App\Http\Controllers\Controller;
use App\Models\FlamehubPost;
use App\Models\FlamehubPostLike;
use Illuminate\Http\Request;

class LikeController extends Controller
{
                    public function store(Request $request, int $postId)
                    {
                                        FlamehubPost::query()->findOrFail($postId);

                                        $userId = (int) $request->user()->getAuthIdentifier();
                                        FlamehubPostLike::query()->firstOrCreate([
                                                            'post_id' => $postId,
                                                            'user_id' => $userId,
                                        ]);

                                        return response()->json(['ok' => true], 201);
                    }

                    public function destroy(Request $request, int $postId)
                    {
                                        $userId = (int) $request->user()->getAuthIdentifier();
                                        FlamehubPostLike::query()
                                                            ->where('post_id', $postId)
                                                            ->where('user_id', $userId)
                                                            ->delete();

                                        return response()->json(['ok' => true]);
                    }
}


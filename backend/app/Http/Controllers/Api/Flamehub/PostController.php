<?php

namespace App\Http\Controllers\Api\Flamehub;

use App\Http\Controllers\Controller;
use App\Models\FlamehubPost;
use App\Models\FlamehubPostMedia;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Validation\ValidationException;

class PostController extends Controller
{
                    public function show(Request $request, int $id)
                    {
                                        $userId = (int) $request->user()->getAuthIdentifier();

                                        $post = FlamehubPost::query()
                                                            ->with([
                                                                                'user:id,username,full_name,avatar',
                                                                                'media:id,post_id,type,path,poster_path,sort_order,width,height,duration_ms',
                                                            ])
                                                            ->withCount([
                                                                                'likes as like_count',
                                                                                'comments as comment_count' => fn($qq) => $qq->whereNull('deleted_at'),
                                                            ])
                                                            ->withExists([
                                                                                'likes as liked_by_me' => fn($qq) => $qq->where('user_id', $userId),
                                                                                'saves as saved_by_me' => fn($qq) => $qq->where('user_id', $userId),
                                                            ])
                                                            ->findOrFail($id);

                                        return response()->json(['post' => $post]);
                    }

                    public function store(Request $request)
                    {
                                        $data = $request->validate([
                                                            'caption' => ['nullable', 'string', 'max:2000'],
                                                            'media' => ['required', 'array', 'min:1', 'max:10'],
                                                            'media.*' => ['required', 'file', 'max:51200'],
                                                            'cover' => ['nullable', 'file', 'max:5120', 'mimes:jpg,jpeg,png,webp'],
                                        ]);

                                        $files = $request->file('media', []);
                                        $coverFile = $request->file('cover');
                                        if (!is_array($files)) {
                                                            $files = [$files];
                                        }
                                        $videoCount = 0;
                                        $imageCount = 0;
                                        $types = [];

                                        foreach ($files as $f) {
                                                            $mime = (string) $f->getMimeType();
                                                            $isVideo = str_starts_with($mime, 'video/');
                                                            $isImage = str_starts_with($mime, 'image/');
                                                            if (!$isVideo && !$isImage) {
                                                                                throw ValidationException::withMessages(['media' => 'Unsupported file type.']);
                                                            }
                                                            $types[] = $isVideo ? 'video' : 'image';
                                                            $videoCount += $isVideo ? 1 : 0;
                                                            $imageCount += $isImage ? 1 : 0;
                                        }

                                        if ($videoCount > 0 && $imageCount > 0) {
                                                            throw ValidationException::withMessages(['media' => 'Mixing video and images is not allowed.']);
                                        }

                                        if ($videoCount === 1 && count($files) !== 1) {
                                                            throw ValidationException::withMessages(['media' => 'Video post must contain exactly 1 video.']);
                                        }

                                        if ($videoCount > 1) {
                                                            throw ValidationException::withMessages(['media' => 'Only 1 video is allowed per post.']);
                                        }

                                        if ($coverFile && $videoCount !== 1) {
                                                            throw ValidationException::withMessages(['cover' => 'Cover is only allowed for video post.']);
                                        }

                                        $userId = (int) $request->user()->getAuthIdentifier();

                                        $post = DB::transaction(function () use ($data, $files, $types, $userId, $coverFile, $videoCount) {
                                                            $post = FlamehubPost::create([
                                                                                'user_id' => $userId,
                                                                                'caption' => $data['caption'] ?? null,
                                                            ]);

                                                            foreach ($files as $i => $file) {
                                                                                $dir = public_path('uploads/flamehub/posts/' . $post->id);
                                                                                File::ensureDirectoryExists($dir);

                                                                                $ext = (string) ($file->getClientOriginalExtension() ?: '');
                                                                                $ext = $ext !== '' ? $ext : ($types[$i] === 'video' ? 'mp4' : 'jpg');
                                                                                $name = bin2hex(random_bytes(16)) . '.' . $ext;
                                                                                $file->move($dir, $name);
                                                                                $path = 'uploads/flamehub/posts/' . $post->id . '/' . $name;

                                                                                $posterPath = null;
                                                                                if ($videoCount === 1 && $types[$i] === 'video' && $coverFile) {
                                                                                                    $cExt = (string) ($coverFile->getClientOriginalExtension() ?: '');
                                                                                                    $cExt = $cExt !== '' ? $cExt : 'jpg';
                                                                                                    $cName = bin2hex(random_bytes(16)) . '.' . $cExt;
                                                                                                    $coverFile->move($dir, $cName);
                                                                                                    $posterPath = 'uploads/flamehub/posts/' . $post->id . '/' . $cName;
                                                                                }

                                                                                FlamehubPostMedia::create([
                                                                                                    'post_id' => $post->id,
                                                                                                    'type' => $types[$i],
                                                                                                    'path' => $path,
                                                                                                    'poster_path' => $posterPath,
                                                                                                    'sort_order' => $i,
                                                                                ]);
                                                            }

                                                            return $post;
                                        });

                                        $post->load([
                                                            'user:id,username,full_name,avatar',
                                                            'media:id,post_id,type,path,poster_path,sort_order,width,height,duration_ms',
                                        ]);

                                        return response()->json(['post' => $post], 201);
                    }

                    public function update(Request $request, int $id)
                    {
                                        $data = $request->validate([
                                                            'caption' => ['nullable', 'string', 'max:2000'],
                                        ]);

                                        $userId = (int) $request->user()->getAuthIdentifier();
                                        $post = FlamehubPost::query()->where('user_id', $userId)->findOrFail($id);
                                        $post->caption = $data['caption'] ?? null;
                                        $post->save();

                                        $post->load([
                                                            'user:id,username,full_name,avatar',
                                                            'media:id,post_id,type,path,poster_path,sort_order,width,height,duration_ms',
                                        ]);

                                        return response()->json(['post' => $post]);
                    }

                    public function destroy(Request $request, int $id)
                    {
                                        $userId = (int) $request->user()->getAuthIdentifier();
                                        $post = FlamehubPost::query()->where('user_id', $userId)->findOrFail($id);
                                        $post->delete();
                                        return response()->json(['ok' => true]);
                    }
}

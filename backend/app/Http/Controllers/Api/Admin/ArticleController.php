<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Article;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ArticleController extends Controller
{
    public function index()
    {
        return response()->json(
            Article::query()->orderByDesc('published_at')->orderByDesc('id')->paginate(50),
        );
    }

    public function show(int $id)
    {
        return response()->json(['article' => Article::query()->findOrFail($id)]);
    }

    public function store(Request $request)
    {
        $data = $this->validateArticle($request);
        $data['created_by'] = $request->user()->id;
        if (! isset($data['published_at'])) {
            $data['published_at'] = now();
        }
        $article = Article::query()->create($data);

        return response()->json(['article' => $article], 201);
    }

    public function update(Request $request, int $id)
    {
        $article = Article::query()->findOrFail($id);
        $data = $this->validateArticle($request);

        $article->fill($data);
        $article->save();

        return response()->json(['article' => $article]);
    }

    public function destroy(int $id)
    {
        $article = Article::query()->findOrFail($id);
        try {
            $article->delete();
        } catch (QueryException) {
            return response()->json(['message' => 'Cannot delete article'], 422);
        }

        return response()->json(['ok' => true]);
    }

    public function uploadCover(Request $request, int $id)
    {
        $request->validate([
            'image' => ['required', 'file', 'image', 'max:5120'],
        ]);

        $article = Article::query()->findOrFail($id);
        $file = $request->file('image');
        $filename = (string) Str::uuid().'.'.$file->getClientOriginalExtension();
        $dir = public_path('uploads/articles');
        File::ensureDirectoryExists($dir);
        $file->move($dir, $filename);
        $path = 'uploads/articles/'.$filename;

        if ($article->cover_image) {
            Storage::disk('public')->delete($article->cover_image);
            File::delete(public_path($article->cover_image));
        }

        $article->cover_image = $path;
        $article->save();

        return response()->json(['image' => $article->cover_image, 'article' => $article]);
    }

    public function deleteCover(int $id)
    {
        $article = Article::query()->findOrFail($id);
        if ($article->cover_image) {
            Storage::disk('public')->delete($article->cover_image);
            File::delete(public_path($article->cover_image));
        }

        $article->cover_image = null;
        $article->save();

        return response()->json(['image' => null, 'article' => $article]);
    }

    public function uploadInlineImage(Request $request)
    {
        $request->validate([
            'image' => ['required', 'file', 'image', 'max:5120'],
        ]);

        $file = $request->file('image');
        $filename = (string) Str::uuid().'.'.$file->getClientOriginalExtension();
        $dir = public_path('uploads/articles/inline');
        File::ensureDirectoryExists($dir);
        $file->move($dir, $filename);

        $path = 'uploads/articles/inline/'.$filename;

        return response()->json(['url' => url('/'.$path), 'path' => $path]);
    }

    protected function validateArticle(Request $request): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:160'],
            'slug' => ['required', 'string', 'max:180'],
            'excerpt' => ['nullable', 'string', 'max:220'],
            'content_html' => ['nullable', 'string'],
            'cover_image' => ['nullable', 'string', 'max:255'],
            'is_pinned' => ['nullable', 'boolean'],
            'is_published' => ['nullable', 'boolean'],
            'published_at' => ['nullable', 'date'],
        ]);
    }
}


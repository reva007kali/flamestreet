<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Article;
use Illuminate\Http\Request;

class ArticleController extends Controller
{
    public function index(Request $request)
    {
        $data = $request->validate([
            'pinned' => ['nullable', 'boolean'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $q = Article::query()
            ->where('is_published', true)
            ->orderByDesc('published_at')
            ->orderByDesc('id');

        if (! empty($data['pinned'])) {
            $limit = (int) ($data['limit'] ?? 5);
            $items = $q->where('is_pinned', true)->limit($limit)->get();
            return response()->json(['articles' => $items]);
        }

        $perPage = (int) ($data['limit'] ?? 20);
        return response()->json($q->paginate($perPage));
    }

    public function show(string $slug)
    {
        $article = Article::query()
            ->where('is_published', true)
            ->where('slug', $slug)
            ->firstOrFail();

        return response()->json(['article' => $article]);
    }
}


<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Gym;

class GymController extends Controller
{
    public function index()
    {
        $gyms = Gym::query()
            ->where('is_active', true)
            ->orderBy('gym_name')
            ->get(['id', 'gym_name', 'address', 'city', 'province', 'image']);

        return response()->json(['gyms' => $gyms]);
    }
}

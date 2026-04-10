<?php

namespace App\Http\Controllers\Api\Staff;

use App\Http\Controllers\Controller;
use App\Models\User;

class CourierController extends Controller
{
    public function index()
    {
        $couriers = User::query()
            ->whereHas('roles', fn ($q) => $q->where('name', 'courier'))
            ->select(['id', 'full_name', 'email'])
            ->orderBy('full_name')
            ->get();

        return response()->json(['couriers' => $couriers]);
    }
}


<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MemberProfile;
use App\Services\PointService;
use Illuminate\Http\Request;

class MemberPointController extends Controller
{
    public function __construct(
        protected PointService $pointService,
    ) {
    }

    public function show(Request $request)
    {
        $mp = MemberProfile::query()->firstOrCreate(['user_id' => $request->user()->id]);
        $balance = (int) $mp->total_points;

        return response()->json([
            'balance' => $balance,
            'balance_rupiah' => $this->pointService->convertToRupiah($balance),
        ]);
    }
}

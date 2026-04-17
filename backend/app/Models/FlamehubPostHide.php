<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FlamehubPostHide extends Model
{
    use HasFactory;

    protected $table = 'flamehub_post_hides';

    protected $fillable = [
        'post_id',
        'user_id',
    ];

    public function post()
    {
        return $this->belongsTo(FlamehubPost::class, 'post_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}


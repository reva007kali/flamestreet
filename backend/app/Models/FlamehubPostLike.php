<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FlamehubPostLike extends Model
{
                    use HasFactory;

                    protected $table = 'flamehub_post_likes';

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


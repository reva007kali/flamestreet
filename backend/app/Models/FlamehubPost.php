<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class FlamehubPost extends Model
{
                    use HasFactory, SoftDeletes;

                    protected $fillable = [
                                        'user_id',
                                        'caption',
                    ];

                    public function user()
                    {
                                        return $this->belongsTo(User::class);
                    }

                    public function media()
                    {
                                        return $this->hasMany(FlamehubPostMedia::class, 'post_id')->orderBy('sort_order');
                    }

                    public function comments()
                    {
                                        return $this->hasMany(FlamehubComment::class, 'post_id');
                    }

                    public function likes()
                    {
                                        return $this->hasMany(FlamehubPostLike::class, 'post_id');
                    }
}


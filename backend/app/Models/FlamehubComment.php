<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class FlamehubComment extends Model
{
                    use HasFactory, SoftDeletes;

                    protected $fillable = [
                                        'post_id',
                                        'user_id',
                                        'parent_id',
                                        'body',
                    ];

                    public function post()
                    {
                                        return $this->belongsTo(FlamehubPost::class, 'post_id');
                    }

                    public function user()
                    {
                                        return $this->belongsTo(User::class);
                    }

                    public function parent()
                    {
                                        return $this->belongsTo(self::class, 'parent_id');
                    }

                    public function replies()
                    {
                                        return $this->hasMany(self::class, 'parent_id');
                    }
}


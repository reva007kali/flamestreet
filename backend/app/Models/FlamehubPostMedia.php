<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FlamehubPostMedia extends Model
{
                    use HasFactory;

                    protected $table = 'flamehub_post_media';

                    protected $fillable = [
                                        'post_id',
                                        'type',
                                        'path',
                                        'sort_order',
                                        'width',
                                        'height',
                                        'duration_ms',
                    ];

                    public function post()
                    {
                                        return $this->belongsTo(FlamehubPost::class, 'post_id');
                    }
}


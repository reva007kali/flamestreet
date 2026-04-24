<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['trainer_profile_id', 'member_id', 'status', 'responded_at'])]
class TrainerMemberInvitation extends Model
{
                    use HasFactory;

                    protected function casts(): array
                    {
                                        return [
                                                            'responded_at' => 'datetime',
                                        ];
                    }

                    public function trainerProfile()
                    {
                                        return $this->belongsTo(TrainerProfile::class, 'trainer_profile_id');
                    }

                    public function member()
                    {
                                        return $this->belongsTo(User::class, 'member_id');
                    }
}


<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

#[Fillable(['user_id', 'gym_id', 'date_of_birth', 'referral_code', 'total_points', 'tier', 'bio', 'instagram_handle', 'payout_bank', 'payout_account_number', 'is_verified'])]
class TrainerProfile extends Model
{
    use HasFactory;

    protected static function booted(): void
    {
        static::creating(function (TrainerProfile $profile): void {
            if (!empty($profile->referral_code) || empty($profile->user_id)) {
                return;
            }

            $username = User::query()->whereKey($profile->user_id)->value('username') ?? 'TRAINER';
            $base = 'PT-'.Str::upper(preg_replace('/[^A-Z0-9]+/i', '', $username) ?: 'TRAINER');

            $code = $base;
            $i = 1;
            while (static::query()->where('referral_code', $code)->exists()) {
                $code = $base.str_pad((string) $i, 2, '0', STR_PAD_LEFT);
                $i++;
            }

            $profile->referral_code = $code;
        });
    }

    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date',
            'total_points' => 'integer',
            'is_verified' => 'boolean',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function gym()
    {
        return $this->belongsTo(Gym::class);
    }

    public function memberProfiles()
    {
        return $this->hasMany(MemberProfile::class, 'referred_by');
    }

    public function referralEvents()
    {
        return $this->hasMany(ReferralEvent::class, 'trainer_id');
    }

    public function pointTransactions()
    {
        return $this->hasMany(PointTransaction::class, 'trainer_id');
    }
}

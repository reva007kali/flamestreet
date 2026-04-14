<?php

namespace Database\Seeders;

use App\Models\Gym;
use App\Models\MemberProfile;
use App\Models\PointSetting;
use App\Models\TrainerProfile;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        foreach (['admin', 'trainer', 'member', 'courier', 'cashier'] as $roleName) {
            Role::findOrCreate($roleName);
        }

        $admin = User::query()->firstOrCreate(
            ['email' => 'admin@flamestreet.test'],
            [
                'full_name' => 'Admin',
                'username' => 'admin',
                'phone_number' => '+620000000001',
                'password' => Hash::make('password'),
                'is_active' => true,
            ],
        );
        $admin->syncRoles(['admin']);

        $gym = Gym::query()->firstOrCreate(
            ['gym_name' => 'Flamestreet Gym'],
            [
                'address' => 'Jl. Contoh No. 1',
                'city' => 'Jakarta',
                'province' => 'DKI Jakarta',
                'is_active' => true,
            ],
        );

        $trainerUser = User::query()->firstOrCreate(
            ['email' => 'trainer@flamestreet.test'],
            [
                'full_name' => 'Trainer',
                'username' => 'trainer',
                'phone_number' => '+620000000002',
                'password' => Hash::make('password'),
                'is_active' => true,
            ],
        );
        $trainerUser->syncRoles(['trainer']);
        TrainerProfile::query()->firstOrCreate(
            ['user_id' => $trainerUser->id],
            [
                'gym_id' => $gym->id,
                'date_of_birth' => '1990-01-01',
                'bio' => 'Protein meal enthusiast.',
                'instagram_handle' => 'trainer',
                'is_verified' => true,
            ],
        );

        $memberUser = User::query()->firstOrCreate(
            ['email' => 'member@flamestreet.test'],
            [
                'full_name' => 'Member',
                'username' => 'member',
                'phone_number' => '+620000000003',
                'password' => Hash::make('password'),
                'is_active' => true,
            ],
        );
        $memberUser->syncRoles(['member']);
        MemberProfile::query()->firstOrCreate(
            ['user_id' => $memberUser->id],
            [
                'referred_by' => $trainerUser->trainerProfile?->id,
                'date_of_birth' => '2000-01-01',
            ],
        );

        $courier = User::query()->firstOrCreate(
            ['email' => 'courier@flamestreet.test'],
            [
                'full_name' => 'Courier',
                'username' => 'courier',
                'phone_number' => '+620000000004',
                'password' => Hash::make('password'),
                'is_active' => true,
            ],
        );
        $courier->syncRoles(['courier']);

        $cashier = User::query()->firstOrCreate(
            ['email' => 'cashier@flamestreet.test'],
            [
                'full_name' => 'Cashier',
                'username' => 'cashier',
                'phone_number' => '+620000000005',
                'password' => Hash::make('password'),
                'is_active' => true,
            ],
        );
        $cashier->syncRoles(['cashier']);

        $defaults = [
            [
                'key' => 'point_to_rupiah_rate',
                'value' => '1',
                'description' => '1 point = Rp 1',
            ],
            [
                'key' => 'referral_new_member',
                'value' => '50',
                'description' => 'Point untuk PT saat member baru daftar',
            ],
            [
                'key' => 'referral_first_order',
                'value' => '100',
                'description' => 'Point untuk PT saat member pertama kali order',
            ],
            [
                'key' => 'referral_repeat_order',
                'value' => '20',
                'description' => 'Point untuk PT setiap member repeat order',
            ],
            [
                'key' => 'min_redeem_points',
                'value' => '500',
                'description' => 'Minimum point untuk redeem',
            ],
            [
                'key' => 'point_expiry_days',
                'value' => '365',
                'description' => 'Point kadaluarsa setelah N hari',
            ],
            [
                'key' => 'tier_silver_threshold',
                'value' => '1000',
                'description' => 'Total point untuk naik ke Silver',
            ],
            [
                'key' => 'tier_gold_threshold',
                'value' => '5000',
                'description' => 'Total point untuk naik ke Gold',
            ],
            [
                'key' => 'tier_platinum_threshold',
                'value' => '15000',
                'description' => 'Total point untuk naik ke Platinum',
            ],
        ];

        foreach ($defaults as $row) {
            PointSetting::query()->updateOrCreate(['key' => $row['key']], $row + ['updated_by' => $admin->id]);
        }

        $this->call(PaymentMethodSeeder::class);
        $this->call(ProductSeeder::class);
    }
}

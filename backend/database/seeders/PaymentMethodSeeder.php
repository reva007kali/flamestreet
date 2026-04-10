<?php

namespace Database\Seeders;

use App\Models\PaymentMethod;
use Illuminate\Database\Seeder;

class PaymentMethodSeeder extends Seeder
{
    public function run(): void
    {
        PaymentMethod::query()->updateOrCreate(
            ['code' => 'flame-points'],
            [
                'name' => 'Flame Points',
                'type' => 'other',
                'instructions' => "Gunakan Flame Points untuk membayar. 1 Flame Point = Rp 1.\n\nPastikan saldo point mencukupi.",
                'is_active' => true,
                'sort_order' => 0,
            ],
        );

        PaymentMethod::query()->updateOrCreate(
            ['code' => 'bca-transfer-evan-grimaldi'],
            [
                'name' => 'Bank Transfer BCA (Evan Grimaldi)',
                'type' => 'bank_transfer',
                'instructions' => "Transfer ke rekening berikut:\n\nBank: BCA\nNama: Evan Grimaldi\nNo Rek: 2290640256\n\nSetelah transfer, konfirmasi ke cashier.",
                'is_active' => true,
                'sort_order' => 1,
            ],
        );

        PaymentMethod::query()->updateOrCreate(
            ['code' => 'doku-qris'],
            [
                'name' => 'QRIS (DOKU)',
                'type' => 'other',
                'instructions' => "Kamu akan diarahkan ke halaman pembayaran DOKU untuk menyelesaikan pembayaran via QRIS.",
                'is_active' => true,
                'sort_order' => 2,
            ],
        );

        PaymentMethod::query()->updateOrCreate(
            ['code' => 'doku-va-bca'],
            [
                'name' => 'Virtual Account BCA (DOKU)',
                'type' => 'other',
                'instructions' => "Kamu akan diarahkan ke halaman pembayaran DOKU untuk mendapatkan nomor Virtual Account BCA.",
                'is_active' => true,
                'sort_order' => 3,
            ],
        );

        PaymentMethod::query()->updateOrCreate(
            ['code' => 'doku-va-bni'],
            [
                'name' => 'Virtual Account BNI (DOKU)',
                'type' => 'other',
                'instructions' => "Kamu akan diarahkan ke halaman pembayaran DOKU untuk mendapatkan nomor Virtual Account BNI.",
                'is_active' => true,
                'sort_order' => 4,
            ],
        );

        PaymentMethod::query()->updateOrCreate(
            ['code' => 'doku-va-bri'],
            [
                'name' => 'Virtual Account BRI (DOKU)',
                'type' => 'other',
                'instructions' => "Kamu akan diarahkan ke halaman pembayaran DOKU untuk mendapatkan nomor Virtual Account BRI.",
                'is_active' => true,
                'sort_order' => 5,
            ],
        );

        PaymentMethod::query()->updateOrCreate(
            ['code' => 'doku-va-mandiri'],
            [
                'name' => 'Virtual Account Mandiri (DOKU)',
                'type' => 'other',
                'instructions' => "Kamu akan diarahkan ke halaman pembayaran DOKU untuk mendapatkan nomor Virtual Account Mandiri.",
                'is_active' => true,
                'sort_order' => 6,
            ],
        );

        PaymentMethod::query()->updateOrCreate(
            ['code' => 'doku-va-permata'],
            [
                'name' => 'Virtual Account Permata (DOKU)',
                'type' => 'other',
                'instructions' => "Kamu akan diarahkan ke halaman pembayaran DOKU untuk mendapatkan nomor Virtual Account Permata.",
                'is_active' => true,
                'sort_order' => 7,
            ],
        );

        PaymentMethod::query()->updateOrCreate(
            ['code' => 'doku-va-cimb'],
            [
                'name' => 'Virtual Account CIMB (DOKU)',
                'type' => 'other',
                'instructions' => "Kamu akan diarahkan ke halaman pembayaran DOKU untuk mendapatkan nomor Virtual Account CIMB.",
                'is_active' => true,
                'sort_order' => 8,
            ],
        );

        PaymentMethod::query()->updateOrCreate(
            ['code' => 'doku-va-danamon'],
            [
                'name' => 'Virtual Account Danamon (DOKU)',
                'type' => 'other',
                'instructions' => "Kamu akan diarahkan ke halaman pembayaran DOKU untuk mendapatkan nomor Virtual Account Danamon.",
                'is_active' => true,
                'sort_order' => 9,
            ],
        );
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
                    'order_id',
                    'provider',
                    'method',
                    'status',
                    'amount',
                    'currency',
                    'partner_reference_no',
                    'reference_no',
                    'qr_content',
                    'expires_at',
                    'raw_request',
                    'raw_response',
                    'raw_callback',
])]
class PaymentTransaction extends Model
{
                    use HasFactory;

                    protected function casts(): array
                    {
                                        return [
                                                            'amount' => 'decimal:2',
                                                            'expires_at' => 'datetime',
                                                            'raw_request' => 'array',
                                                            'raw_response' => 'array',
                                                            'raw_callback' => 'array',
                                        ];
                    }

                    public function order()
                    {
                                        return $this->belongsTo(Order::class);
                    }
}


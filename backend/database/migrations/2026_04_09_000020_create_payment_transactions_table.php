<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
                    public function up(): void
                    {
                                        Schema::create('payment_transactions', function (Blueprint $table) {
                                                            $table->id();
                                                            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();

                                                            $table->string('provider', 50);
                                                            $table->string('method', 50);
                                                            $table->string('status', 20)->default('pending');

                                                            $table->decimal('amount', 12, 2);
                                                            $table->string('currency', 3)->default('IDR');

                                                            $table->string('partner_reference_no', 64)->nullable();
                                                            $table->string('reference_no', 64)->nullable();
                                                            $table->text('qr_content')->nullable();
                                                            $table->dateTime('expires_at')->nullable();

                                                            $table->json('raw_request')->nullable();
                                                            $table->json('raw_response')->nullable();
                                                            $table->json('raw_callback')->nullable();

                                                            $table->timestamps();

                                                            $table->index(['order_id', 'provider', 'method']);
                                                            $table->index(['provider', 'status']);
                                        });
                    }

                    public function down(): void
                    {
                                        Schema::dropIfExists('payment_transactions');
                    }
};


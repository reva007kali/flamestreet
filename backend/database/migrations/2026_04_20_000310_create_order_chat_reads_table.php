<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
                    public function up(): void
                    {
                                        Schema::create('order_chat_reads', function (Blueprint $table): void {
                                                            $table->id();
                                                            $table->unsignedBigInteger('order_id');
                                                            $table->unsignedBigInteger('user_id');
                                                            $table->unsignedBigInteger('last_read_message_id')->default(0);
                                                            $table->timestamps();

                                                            $table->unique(['order_id', 'user_id']);
                                                            $table->index(['user_id', 'order_id']);
                                        });
                    }

                    public function down(): void
                    {
                                        Schema::dropIfExists('order_chat_reads');
                    }
};


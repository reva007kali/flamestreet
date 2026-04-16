<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
                    public function up(): void
                    {
                                        Schema::create('flamehub_post_media', function (Blueprint $table) {
                                                            $table->id();
                                                            $table->foreignId('post_id')->constrained('flamehub_posts')->cascadeOnDelete();
                                                            $table->string('type', 16);
                                                            $table->string('path', 255);
                                                            $table->unsignedSmallInteger('sort_order')->default(0);
                                                            $table->unsignedSmallInteger('width')->nullable();
                                                            $table->unsignedSmallInteger('height')->nullable();
                                                            $table->unsignedInteger('duration_ms')->nullable();
                                                            $table->timestamps();

                                                            $table->index(['post_id', 'sort_order']);
                                        });
                    }

                    public function down(): void
                    {
                                        Schema::dropIfExists('flamehub_post_media');
                    }
};


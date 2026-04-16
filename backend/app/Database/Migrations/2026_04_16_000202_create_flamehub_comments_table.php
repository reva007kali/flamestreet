<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
                    public function up(): void
                    {
                                        Schema::create('flamehub_comments', function (Blueprint $table) {
                                                            $table->id();
                                                            $table->foreignId('post_id')->constrained('flamehub_posts')->cascadeOnDelete();
                                                            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                                                            $table->foreignId('parent_id')->nullable()->constrained('flamehub_comments')->nullOnDelete();
                                                            $table->text('body');
                                                            $table->timestamps();
                                                            $table->softDeletes();

                                                            $table->index(['post_id', 'id']);
                                                            $table->index(['post_id', 'parent_id', 'id']);
                                        });
                    }

                    public function down(): void
                    {
                                        Schema::dropIfExists('flamehub_comments');
                    }
};


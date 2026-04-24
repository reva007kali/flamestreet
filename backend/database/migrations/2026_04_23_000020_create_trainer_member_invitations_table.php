<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
                    public function up(): void
                    {
                                        Schema::create('trainer_member_invitations', function (Blueprint $table) {
                                                            $table->id();
                                                            $table->unsignedBigInteger('trainer_profile_id');
                                                            $table->unsignedBigInteger('member_id');
                                                            $table->string('status', 20)->default('pending');
                                                            $table->timestamp('responded_at')->nullable();
                                                            $table->timestamps();

                                                            $table->unique(['trainer_profile_id', 'member_id']);
                                                            $table->index(['member_id', 'status']);
                                                            $table->index(['trainer_profile_id', 'status']);

                                                            $table
                                                                                ->foreign('trainer_profile_id')
                                                                                ->references('id')
                                                                                ->on('trainer_profiles')
                                                                                ->cascadeOnDelete();
                                                            $table
                                                                                ->foreign('member_id')
                                                                                ->references('id')
                                                                                ->on('users')
                                                                                ->cascadeOnDelete();
                                        });
                    }

                    public function down(): void
                    {
                                        Schema::dropIfExists('trainer_member_invitations');
                    }
};


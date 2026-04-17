<?php

use App\Http\Controllers\Api\Admin\AdminDashboardController;
use App\Http\Controllers\Api\Admin\GymController as AdminGymController;
use App\Http\Controllers\Api\Admin\MemberController as AdminMemberController;
use App\Http\Controllers\Api\Admin\OrderController as AdminOrderController;
use App\Http\Controllers\Api\Admin\PaymentMethodController as AdminPaymentMethodController;
use App\Http\Controllers\Api\Admin\PromoBannerController as AdminPromoBannerController;
use App\Http\Controllers\Api\Admin\PointSettingController as AdminPointSettingController;
use App\Http\Controllers\Api\Admin\ProductCategoryController as AdminProductCategoryController;
use App\Http\Controllers\Api\Admin\ProductController as AdminProductController;
use App\Http\Controllers\Api\Admin\RedeemRequestController as AdminRedeemRequestController;
use App\Http\Controllers\Api\Admin\TrainerController as AdminTrainerController;
use App\Http\Controllers\Api\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\Admin\ReportController as AdminReportController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\CourierController;
use App\Http\Controllers\Api\DokuCheckoutController;
use App\Http\Controllers\Api\GymController;
use App\Http\Controllers\Api\MeController;
use App\Http\Controllers\Api\MemberPointController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\PaymentMethodController;
use App\Http\Controllers\Api\PromoBannerController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\TrainerController;
use App\Http\Controllers\Api\ArticleController;
use App\Http\Controllers\Api\Admin\ArticleController as AdminArticleController;
use App\Http\Controllers\Api\Staff\OrderController as StaffOrderController;
use App\Http\Controllers\Api\Staff\CourierController as StaffCourierController;
use App\Http\Controllers\Api\Staff\DashboardController as StaffDashboardController;
use App\Http\Controllers\Api\DeviceTokenController;
use App\Http\Controllers\Api\Flamehub\FeedController as FlamehubFeedController;
use App\Http\Controllers\Api\Flamehub\PostController as FlamehubPostController;
use App\Http\Controllers\Api\Flamehub\CommentController as FlamehubCommentController;
use App\Http\Controllers\Api\Flamehub\LikeController as FlamehubLikeController;
use App\Http\Controllers\Api\Flamehub\SaveController as FlamehubSaveController;
use App\Http\Controllers\Api\Flamehub\HideController as FlamehubHideController;
use App\Http\Controllers\Api\Flamehub\SavedController as FlamehubSavedController;
use App\Http\Controllers\Api\Flamehub\UserController as FlamehubUserController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:auth');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:auth');
    Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [MeController::class, 'show']);
    Route::put('/me/profile', [MeController::class, 'updateProfile']);
    Route::post('/me/avatar', [MeController::class, 'updateAvatar'])->middleware('throttle:uploads');
    Route::put('/me/avatar', [MeController::class, 'updateAvatar'])->middleware('throttle:uploads');
    Route::delete('/me/avatar', [MeController::class, 'deleteAvatar']);
    Route::put('/me/push-token', [MeController::class, 'updatePushToken']);
    Route::delete('/me/push-token', [MeController::class, 'deletePushToken']);
    Route::post('/device-tokens', [DeviceTokenController::class, 'store']);
    Route::delete('/device-tokens', [DeviceTokenController::class, 'destroy']);
    Route::get('/member/points', [MemberPointController::class, 'show'])->middleware('role:member');
    Route::get('/member/points/history', [MemberPointController::class, 'history'])->middleware('role:member');

    Route::get('/products', [ProductController::class, 'index']);
    Route::get('/products/{slug}', [ProductController::class, 'show']);
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::get('/payment-methods', [PaymentMethodController::class, 'index']);
    Route::get('/promo-banners', [PromoBannerController::class, 'index']);
    Route::get('/gyms', [GymController::class, 'index']);
    Route::get('/articles', [ArticleController::class, 'index']);
    Route::get('/articles/{slug}', [ArticleController::class, 'show']);

    Route::prefix('flamehub')->group(function () {
        Route::get('/feed', [FlamehubFeedController::class, 'index']);
        Route::get('/saved', [FlamehubSavedController::class, 'index']);
        Route::post('/posts', [FlamehubPostController::class, 'store'])->middleware('throttle:uploads');
        Route::get('/posts/{id}', [FlamehubPostController::class, 'show']);
        Route::put('/posts/{id}', [FlamehubPostController::class, 'update']);
        Route::delete('/posts/{id}', [FlamehubPostController::class, 'destroy']);
        Route::post('/posts/{postId}/like', [FlamehubLikeController::class, 'store']);
        Route::delete('/posts/{postId}/like', [FlamehubLikeController::class, 'destroy']);
        Route::post('/posts/{postId}/save', [FlamehubSaveController::class, 'store']);
        Route::delete('/posts/{postId}/save', [FlamehubSaveController::class, 'destroy']);
        Route::post('/posts/{postId}/hide', [FlamehubHideController::class, 'store']);
        Route::delete('/posts/{postId}/hide', [FlamehubHideController::class, 'destroy']);
        Route::get('/posts/{postId}/comments', [FlamehubCommentController::class, 'index']);
        Route::post('/posts/{postId}/comments', [FlamehubCommentController::class, 'store']);
        Route::get('/users/search', [FlamehubUserController::class, 'search']);
        Route::get('/users/{username}', [FlamehubUserController::class, 'show']);
        Route::get('/users/{username}/followers', [FlamehubUserController::class, 'followers']);
        Route::post('/users/{username}/follow', [FlamehubUserController::class, 'follow']);
        Route::delete('/users/{username}/follow', [FlamehubUserController::class, 'unfollow']);
    });

    Route::middleware('role:member|trainer')->group(function () {
        Route::post('/orders', [OrderController::class, 'store']);
        Route::get('/orders', [OrderController::class, 'index']);
        Route::post('/orders/{id}/payment', [OrderController::class, 'uploadPaymentProof'])->middleware('throttle:uploads');
        Route::get('/orders/{id}/doku/checkout', [DokuCheckoutController::class, 'show']);
        Route::post('/orders/{id}/doku/checkout', [DokuCheckoutController::class, 'create']);
        Route::get('/orders/{id}/doku/checkout/status', [DokuCheckoutController::class, 'status']);
    });

    Route::get('/orders/{orderNumber}', [OrderController::class, 'show']);

    Route::prefix('trainer')->middleware('role:trainer')->group(function () {
        Route::get('/dashboard', [TrainerController::class, 'dashboard']);
        Route::get('/referrals', [TrainerController::class, 'referrals']);
        Route::get('/points', [TrainerController::class, 'points']);
        Route::post('/points/redeem', [TrainerController::class, 'redeem']);
        Route::get('/redeems', [TrainerController::class, 'redeemRequests']);
        Route::put('/payout-account', [TrainerController::class, 'updatePayoutAccount']);
    });

    Route::prefix('courier')->middleware('role:courier')->group(function () {
        Route::get('/deliveries', [CourierController::class, 'deliveries']);
        Route::put('/deliveries/{id}/status', [CourierController::class, 'updateStatus']);
    });

    Route::prefix('staff')->middleware('role:admin|cashier')->group(function () {
        Route::get('/dashboard', StaffDashboardController::class);
        Route::get('/couriers', [StaffCourierController::class, 'index']);
        Route::get('/orders/counts', [StaffOrderController::class, 'counts']);
        Route::get('/orders', [StaffOrderController::class, 'index']);
        Route::get('/orders/{id}', [StaffOrderController::class, 'show']);
        Route::put('/orders/{id}', [StaffOrderController::class, 'update']);
        Route::put('/orders/{id}/assign-courier', [StaffOrderController::class, 'assignCourier']);
    });

    Route::prefix('admin')->middleware('role:admin')->group(function () {
        Route::get('/dashboard', AdminDashboardController::class);
        Route::get('/reports/orders-export', [AdminReportController::class, 'ordersExport']);
        Route::get('/users', [AdminUserController::class, 'index']);
        Route::get('/users/{id}', [AdminUserController::class, 'show']);
        Route::post('/users', [AdminUserController::class, 'store']);
        Route::put('/users/{id}', [AdminUserController::class, 'update']);
        Route::delete('/users/{id}', [AdminUserController::class, 'destroy']);
        Route::get('/orders', [AdminOrderController::class, 'index']);
        Route::get('/orders/{id}', [AdminOrderController::class, 'show']);
        Route::put('/orders/{id}/status', [AdminOrderController::class, 'updateStatus']);
        Route::put('/orders/{id}/assign-courier', [AdminOrderController::class, 'assignCourier']);
        Route::get('/promo-banners', [AdminPromoBannerController::class, 'index']);
        Route::get('/promo-banners/{id}', [AdminPromoBannerController::class, 'show']);
        Route::post('/promo-banners', [AdminPromoBannerController::class, 'store']);
        Route::put('/promo-banners/{id}', [AdminPromoBannerController::class, 'update']);
        Route::delete('/promo-banners/{id}', [AdminPromoBannerController::class, 'destroy']);
        Route::post('/promo-banners/{id}/image', [AdminPromoBannerController::class, 'uploadImage']);
        Route::delete('/promo-banners/{id}/image', [AdminPromoBannerController::class, 'deleteImage']);
        Route::get('/articles', [AdminArticleController::class, 'index']);
        Route::get('/articles/{id}', [AdminArticleController::class, 'show']);
        Route::post('/articles', [AdminArticleController::class, 'store']);
        Route::put('/articles/{id}', [AdminArticleController::class, 'update']);
        Route::delete('/articles/{id}', [AdminArticleController::class, 'destroy']);
        Route::post('/articles/{id}/cover', [AdminArticleController::class, 'uploadCover']);
        Route::delete('/articles/{id}/cover', [AdminArticleController::class, 'deleteCover']);
        Route::post('/articles/inline-image', [AdminArticleController::class, 'uploadInlineImage']);
        Route::get('/payment-methods', [AdminPaymentMethodController::class, 'index']);
        Route::get('/payment-methods/{id}', [AdminPaymentMethodController::class, 'show']);
        Route::post('/payment-methods', [AdminPaymentMethodController::class, 'store']);
        Route::put('/payment-methods/{id}', [AdminPaymentMethodController::class, 'update']);
        Route::delete('/payment-methods/{id}', [AdminPaymentMethodController::class, 'destroy']);
        Route::get('/redeems', [AdminRedeemRequestController::class, 'index']);
        Route::put('/redeems/{id}', [AdminRedeemRequestController::class, 'update']);
        Route::get('/product-categories', [AdminProductCategoryController::class, 'index']);
        Route::get('/product-categories/{id}', [AdminProductCategoryController::class, 'show']);
        Route::post('/product-categories', [AdminProductCategoryController::class, 'store']);
        Route::put('/product-categories/{id}', [AdminProductCategoryController::class, 'update']);
        Route::delete('/product-categories/{id}', [AdminProductCategoryController::class, 'destroy']);
        Route::post('/product-categories/{id}/image', [AdminProductCategoryController::class, 'uploadImage']);
        Route::delete('/product-categories/{id}/image', [AdminProductCategoryController::class, 'deleteImage']);
        Route::get('/products', [AdminProductController::class, 'index']);
        Route::get('/products/{id}', [AdminProductController::class, 'show']);
        Route::post('/products', [AdminProductController::class, 'store']);
        Route::put('/products/{id}', [AdminProductController::class, 'update']);
        Route::delete('/products/{id}', [AdminProductController::class, 'destroy']);
        Route::post('/products/{id}/image', [AdminProductController::class, 'uploadImage']);
        Route::delete('/products/{id}/image', [AdminProductController::class, 'deleteImage']);
        Route::get('/members', [AdminMemberController::class, 'index']);
        Route::get('/gyms', [AdminGymController::class, 'index']);
        Route::get('/gyms/{id}', [AdminGymController::class, 'show']);
        Route::post('/gyms', [AdminGymController::class, 'store']);
        Route::put('/gyms/{id}', [AdminGymController::class, 'update']);
        Route::delete('/gyms/{id}', [AdminGymController::class, 'destroy']);
        Route::post('/gyms/{id}/image', [AdminGymController::class, 'uploadImage']);
        Route::delete('/gyms/{id}/image', [AdminGymController::class, 'deleteImage']);
        Route::get('/point-settings', [AdminPointSettingController::class, 'index']);
        Route::put('/point-settings', [AdminPointSettingController::class, 'update']);
        Route::get('/trainers', [AdminTrainerController::class, 'index']);
        Route::put('/trainers/{id}/verify', [AdminTrainerController::class, 'verify']);
    });
});

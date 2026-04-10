# Flamestreet.id — AI Code Assistant Prompt

## 🧠 Project Context

You are helping build **Flamestreet.id**, a protein meals ordering platform with a personal trainer referral reward system. The tech stack is:

- **Backend**: Laravel 11, MySQL, Laravel Sanctum (API auth), Spatie Laravel Permission (roles), Laravel Echo + Soketi (realtime broadcasting), Redis (queue + cache)
- **Frontend**: React 18 + Vite, Tailwind CSS v4, shadcn/ui (Nova preset), Zustand (state), TanStack Query (data fetching), Axios, Laravel Echo + Pusher-js, Framer Motion, React Router v6, Lucide React

---

## 👥 User Roles

Managed via `spatie/laravel-permission`. Four roles:
1. `admin` — full access, manages everything
2. `trainer` — personal trainer, earns points from referrals
3. `member` — customer who orders meals
4. `courier` — delivery personnel

---

## 🗄️ DATABASE SCHEMA — Full Detail

### Table: `users`
```
id                  BIGINT UNSIGNED PK AUTO_INCREMENT
full_name           VARCHAR(100) NOT NULL
username            VARCHAR(50) UNIQUE NOT NULL
phone_number        VARCHAR(20) UNIQUE NOT NULL
email               VARCHAR(100) UNIQUE NOT NULL
email_verified_at   TIMESTAMP NULL
password            VARCHAR(255) NOT NULL
avatar              VARCHAR(255) NULL
is_active           BOOLEAN DEFAULT true
remember_token      VARCHAR(100) NULL
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

### Table: `gyms`
```
id                  BIGINT UNSIGNED PK AUTO_INCREMENT
gym_name            VARCHAR(100) NOT NULL
address             TEXT NOT NULL
city                VARCHAR(100) NOT NULL        -- kota/kabupaten
province            VARCHAR(100) NULL
is_active           BOOLEAN DEFAULT true
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

### Table: `trainer_profiles`
```
id                  BIGINT UNSIGNED PK AUTO_INCREMENT
user_id             BIGINT UNSIGNED FK → users.id (unique)
gym_id              BIGINT UNSIGNED FK → gyms.id NULL
date_of_birth       DATE NOT NULL
referral_code       VARCHAR(20) UNIQUE NOT NULL   -- e.g. "PT-BUDI01", auto-generated
total_points        INT UNSIGNED DEFAULT 0
tier                ENUM('bronze','silver','gold','platinum') DEFAULT 'bronze'
bio                 TEXT NULL
instagram_handle    VARCHAR(100) NULL
is_verified         BOOLEAN DEFAULT false          -- verified by admin
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

### Table: `member_profiles`
```
id                  BIGINT UNSIGNED PK AUTO_INCREMENT
user_id             BIGINT UNSIGNED FK → users.id (unique)
referred_by         BIGINT UNSIGNED FK → trainer_profiles.id NULL
date_of_birth       DATE NULL
total_points        INT UNSIGNED DEFAULT 0
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

### Table: `product_categories`
```
id                  BIGINT UNSIGNED PK AUTO_INCREMENT
name                VARCHAR(100) NOT NULL
slug                VARCHAR(100) UNIQUE NOT NULL
description         TEXT NULL
image               VARCHAR(255) NULL
is_active           BOOLEAN DEFAULT true
sort_order          INT DEFAULT 0
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

### Table: `products`
```
id                  BIGINT UNSIGNED PK AUTO_INCREMENT
category_id         BIGINT UNSIGNED FK → product_categories.id
name                VARCHAR(150) NOT NULL
slug                VARCHAR(150) UNIQUE NOT NULL
description         TEXT NULL
ingredients         TEXT NULL                     -- bahan-bahan
nutritional_info    JSON NULL                     -- { calories, protein_g, carbs_g, fat_g, fiber_g }
hpp                 DECIMAL(12,2) NOT NULL        -- harga pokok produksi (cost price)
price               DECIMAL(12,2) NOT NULL        -- harga jual (IDR)
image               VARCHAR(255) NULL
images              JSON NULL                     -- array of image URLs
weight_gram         INT NULL                      -- berat produk dalam gram
is_available        BOOLEAN DEFAULT true
is_featured         BOOLEAN DEFAULT false
sort_order          INT DEFAULT 0
point_reward        INT UNSIGNED DEFAULT 0        -- poin yang diperoleh PT per item terjual
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

### Table: `product_modifiers`
```
id                  BIGINT UNSIGNED PK AUTO_INCREMENT
product_id          BIGINT UNSIGNED FK → products.id
name                VARCHAR(100) NOT NULL         -- e.g. "Ukuran", "Level Pedas", "Tambahan Protein"
type                ENUM('single','multiple') DEFAULT 'single'  -- single = pilih satu, multiple = bisa pilih banyak
is_required         BOOLEAN DEFAULT false
sort_order          INT DEFAULT 0
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

### Table: `product_modifier_options`
```
id                  BIGINT UNSIGNED PK AUTO_INCREMENT
modifier_id         BIGINT UNSIGNED FK → product_modifiers.id
name                VARCHAR(100) NOT NULL         -- e.g. "Regular", "Large", "Extra Spicy"
additional_price    DECIMAL(10,2) DEFAULT 0       -- tambahan harga dalam IDR
is_default          BOOLEAN DEFAULT false
sort_order          INT DEFAULT 0
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

### Table: `point_settings`
```
id                  BIGINT UNSIGNED PK AUTO_INCREMENT
key                 VARCHAR(100) UNIQUE NOT NULL
value               VARCHAR(255) NOT NULL
description         TEXT NULL
updated_by          BIGINT UNSIGNED FK → users.id NULL
created_at          TIMESTAMP
updated_at          TIMESTAMP

-- Default rows to seed:
-- key: 'point_to_rupiah_rate'     value: '100'     description: '1 point = Rp 100'
-- key: 'referral_new_member'      value: '50'      description: 'Point untuk PT saat member baru daftar'
-- key: 'referral_first_order'     value: '100'     description: 'Point untuk PT saat member pertama kali order'
-- key: 'referral_repeat_order'    value: '20'      description: 'Point untuk PT setiap member repeat order'
-- key: 'min_redeem_points'        value: '500'     description: 'Minimum point untuk redeem'
-- key: 'point_expiry_days'        value: '365'     description: 'Point kadaluarsa setelah N hari'
-- key: 'tier_silver_threshold'    value: '1000'    description: 'Total point untuk naik ke Silver'
-- key: 'tier_gold_threshold'      value: '5000'    description: 'Total point untuk naik ke Gold'
-- key: 'tier_platinum_threshold'  value: '15000'   description: 'Total point untuk naik ke Platinum'
```

### Table: `orders`
```
id                      BIGINT UNSIGNED PK AUTO_INCREMENT
order_number            VARCHAR(30) UNIQUE NOT NULL     -- e.g. "FS-20240405-0001"
member_id               BIGINT UNSIGNED FK → users.id
trainer_id              BIGINT UNSIGNED FK → users.id NULL   -- trainer yang me-refer member ini
courier_id              BIGINT UNSIGNED FK → users.id NULL
status                  ENUM(
                          'pending',         -- baru dibuat, menunggu konfirmasi
                          'confirmed',       -- dikonfirmasi admin/dapur
                          'preparing',       -- sedang disiapkan
                          'ready_pickup',    -- siap diambil kurir
                          'delivering',      -- sedang diantar
                          'delivered',       -- sudah diterima
                          'cancelled',       -- dibatalkan
                          'refunded'         -- direfund
                        ) DEFAULT 'pending'
payment_status          ENUM('unpaid','paid','refunded') DEFAULT 'unpaid'
payment_method          VARCHAR(50) NULL               -- 'transfer', 'cod', 'e-wallet', dll
payment_proof           VARCHAR(255) NULL              -- upload bukti transfer
subtotal                DECIMAL(14,2) NOT NULL         -- total sebelum diskon & ongkir
discount_amount         DECIMAL(14,2) DEFAULT 0
delivery_fee            DECIMAL(14,2) DEFAULT 0
total_amount            DECIMAL(14,2) NOT NULL         -- final amount yang dibayar
points_used             INT UNSIGNED DEFAULT 0         -- poin yang dipakai untuk diskon
points_earned_trainer   INT UNSIGNED DEFAULT 0         -- total poin yang diberikan ke trainer dari order ini
delivery_address        TEXT NOT NULL
delivery_notes          TEXT NULL                      -- catatan pengiriman
recipient_name          VARCHAR(100) NOT NULL
recipient_phone         VARCHAR(20) NOT NULL
estimated_delivery_at   TIMESTAMP NULL
delivered_at            TIMESTAMP NULL
cancelled_at            TIMESTAMP NULL
cancelled_reason        TEXT NULL
created_at              TIMESTAMP
updated_at              TIMESTAMP
```

### Table: `order_items`
```
id                      BIGINT UNSIGNED PK AUTO_INCREMENT
order_id                BIGINT UNSIGNED FK → orders.id
product_id              BIGINT UNSIGNED FK → products.id
product_name            VARCHAR(150) NOT NULL        -- snapshot nama produk saat order
product_price           DECIMAL(12,2) NOT NULL       -- snapshot harga saat order
quantity                INT UNSIGNED NOT NULL
modifier_options        JSON NULL                    -- snapshot modifier yang dipilih
                                                    -- [{ modifier_name, option_name, additional_price }]
item_notes              TEXT NULL                    -- catatan per item, e.g. "tidak pakai nasi"
subtotal                DECIMAL(12,2) NOT NULL       -- (product_price + modifier price) * qty
point_reward            INT UNSIGNED DEFAULT 0       -- snapshot point_reward produk saat order
created_at              TIMESTAMP
updated_at              TIMESTAMP
```

### Table: `referral_events`
```
id                  BIGINT UNSIGNED PK AUTO_INCREMENT
trainer_id          BIGINT UNSIGNED FK → trainer_profiles.id
member_id           BIGINT UNSIGNED FK → users.id
order_id            BIGINT UNSIGNED FK → orders.id NULL
event_type          ENUM('new_member','first_order','repeat_order')
points_earned       INT UNSIGNED NOT NULL
description         TEXT NULL
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

### Table: `point_transactions`
```
id                  BIGINT UNSIGNED PK AUTO_INCREMENT
trainer_id          BIGINT UNSIGNED FK → trainer_profiles.id
amount              INT NOT NULL                    -- positif = credit, negatif = debit
type                ENUM('earned','redeemed','expired','adjusted')
reference_type      VARCHAR(50) NULL                -- 'referral_event', 'manual_adjustment', dll
reference_id        BIGINT UNSIGNED NULL
description         VARCHAR(255) NULL
expires_at          TIMESTAMP NULL
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

---

## ⚙️ REFERRAL FLOW — Full Logic

```
1. Trainer daftar → system auto-generate referral_code unik (format: PT-[USERNAME])
2. Member buka URL: https://flamestreet.id/register?ref=PT-BUDI01
3. Frontend simpan ref code ke localStorage key 'flamestreet_ref'
4. Member submit register form → frontend kirim referral_code ke API
5. Backend: RegisterController → ReferralService::attachTrainer($member, $referralCode)
   - Validasi referral_code exists di trainer_profiles
   - Set member_profiles.referred_by = trainer_id
   - Buat ReferralEvent type: 'new_member'
   - Buat PointTransaction dengan amount dari point_settings 'referral_new_member'
   - Update trainer_profiles.total_points
   - Update trainer tier jika threshold tercapai
   - Broadcast event ke trainer via Laravel Echo
6. Saat member first order:
   - OrderService setelah payment confirmed → cek apakah first order
   - Jika ya → ReferralEvent type: 'first_order' → award points ke trainer
7. Saat member repeat order:
   - Setiap order paid → hitung total points dari order_items.point_reward
   - Buat ReferralEvent type: 'repeat_order'
   - Points earned = SUM(order_items.point_reward * quantity) dari order tersebut
   - Broadcast ke trainer realtime
```

---

## 🏗️ LARAVEL BACKEND STRUCTURE

### Models yang dibutuhkan:
- `User` — dengan relationships ke TrainerProfile, MemberProfile, Orders
- `Gym`
- `TrainerProfile` — dengan referral_code auto-generate di boot()
- `MemberProfile`
- `ProductCategory`
- `Product` — dengan modifiers, modifier options
- `ProductModifier` — hasMany ModifierOptions
- `ProductModifierOption`
- `PointSetting` — static helper `PointSetting::get('key')`
- `Order` — dengan full status management
- `OrderItem` — dengan modifier snapshot sebagai JSON
- `ReferralEvent`
- `PointTransaction`

### Services:
```
app/Services/
├── ReferralService.php
│   - attachTrainer($member, $referralCode): void
│   - awardPoints($trainerId, $eventType, $orderId): void
│   - calculateOrderPoints($order): int
│
├── OrderService.php
│   - createOrder($member, $cartData): Order
│   - confirmPayment($order): void
│   - updateStatus($order, $status): void
│   - generateOrderNumber(): string
│
├── PointService.php
│   - addPoints($trainerId, $amount, $type, $refType, $refId): void
│   - redeemPoints($trainerId, $amount): bool
│   - convertToRupiah($points): float
│   - updateTier($trainerProfile): void
│
└── NotificationService.php
    - notifyTrainer($trainerId, $message, $data): void
    - notifyMember($memberId, $message, $data): void
```

### API Routes (routes/api.php):
```php
// Public
POST /api/auth/register          // support ?ref=PT-XXXX
POST /api/auth/login
POST /api/auth/logout

// Authenticated (any role)
GET  /api/me
PUT  /api/me/profile
PUT  /api/me/avatar

// Member routes
GET  /api/products               // list produk, filter by category
GET  /api/products/{slug}        // detail produk + modifiers
GET  /api/categories
POST /api/orders                 // buat order baru
GET  /api/orders                 // history order member
GET  /api/orders/{orderNumber}   // detail order
POST /api/orders/{id}/payment    // upload bukti bayar

// Trainer routes
GET  /api/trainer/dashboard      // stats: total member, total points, this month earning
GET  /api/trainer/referrals      // list member yang di-refer
GET  /api/trainer/points         // point balance + history
POST /api/trainer/points/redeem  // request redeem

// Courier routes
GET  /api/courier/deliveries           // list order assigned
PUT  /api/courier/deliveries/{id}/status  // update status

// Admin routes
GET  /api/admin/dashboard
GET  /api/admin/users
POST /api/admin/users
GET  /api/admin/orders
PUT  /api/admin/orders/{id}/status
PUT  /api/admin/orders/{id}/assign-courier
GET  /api/admin/products
POST /api/admin/products
PUT  /api/admin/products/{id}
GET  /api/admin/gyms
POST /api/admin/gyms
GET  /api/admin/point-settings
PUT  /api/admin/point-settings    // update point conversion settings
GET  /api/admin/trainers
PUT  /api/admin/trainers/{id}/verify
```

---

## ⚛️ REACT FRONTEND STRUCTURE

### Pages:
```
src/pages/
├── auth/
│   ├── Login.jsx
│   └── Register.jsx             // deteksi ?ref= dari URL, simpan ke localStorage
├── member/
│   ├── Home.jsx                 // featured products, categories
│   ├── Menu.jsx                 // browse semua produk dengan filter
│   ├── ProductDetail.jsx        // detail + modifier selector + add to cart
│   ├── Cart.jsx
│   ├── Checkout.jsx
│   ├── Orders.jsx               // order history
│   ├── OrderDetail.jsx          // realtime status tracker
│   └── Profile.jsx
├── trainer/
│   ├── Dashboard.jsx            // stats, recent members, point balance
│   ├── Referrals.jsx            // list members + order activity
│   ├── Points.jsx               // history + redeem
│   └── Profile.jsx
├── courier/
│   ├── Dashboard.jsx
│   └── DeliveryDetail.jsx
└── admin/
    ├── Dashboard.jsx
    ├── Orders.jsx
    ├── Products.jsx
    ├── ProductForm.jsx          // create/edit dengan modifier builder
    ├── Users.jsx
    ├── Trainers.jsx
    ├── Gyms.jsx
    └── PointSettings.jsx        // UI untuk update semua point_settings
```

### Order Page (Universal — Member & Trainer):
```
- OrderDetail.jsx harus bisa diakses oleh role member DAN trainer
- Trainer bisa lihat order dari member referral-nya
- Tampilkan: order number, status timeline (step indicator), item list dengan modifier,
  breakdown harga (subtotal + modifier + ongkir - diskon), payment info,
  delivery info, realtime status update via Laravel Echo
- Status timeline: Pending → Confirmed → Preparing → Ready → Delivering → Delivered
```

### Key Components:
```
src/components/
├── order/
│   ├── OrderStatusTimeline.jsx  // step-by-step visual tracker
│   ├── OrderCard.jsx            // card untuk list
│   └── ModifierSelector.jsx     // UI pilih modifier saat order
├── trainer/
│   ├── PointBalance.jsx
│   ├── ReferralLink.jsx         // copy referral link
│   └── MemberActivityFeed.jsx   // realtime feed aktivitas member
├── layout/
│   ├── MemberLayout.jsx
│   ├── TrainerLayout.jsx
│   ├── AdminLayout.jsx
│   └── CourierLayout.jsx
└── common/
    ├── RoleGuard.jsx
    └── RealtimeProvider.jsx     // setup Laravel Echo context
```

### Zustand Stores:
```
src/store/
├── authStore.js     // user, token, role, login(), logout()
├── cartStore.js     // items[], addItem(), removeItem(), clearCart(), total
└── notifStore.js    // notifications[], unreadCount, markRead()
```

### Axios Setup (src/lib/axios.js):
```javascript
// Base URL: import.meta.env.VITE_API_URL
// Interceptors:
//   Request: attach Authorization: Bearer {token} dari authStore
//   Response: jika 401 → auto logout dan redirect ke /login
//   Response: jika 422 → format validation errors
```

### Laravel Echo Setup (src/lib/echo.js):
```javascript
// Pusher-compatible dengan Soketi self-hosted
// Channels:
//   private-trainer.{trainerId}   → new member event, point earned event
//   private-order.{orderId}       → order status update
//   private-courier.{courierId}   → new delivery assigned
```

---

## 🔒 AUTH & ROLE GUARD

```javascript
// React Router setup:
// /member/*    → hanya role 'member'
// /trainer/*   → hanya role 'trainer'
// /courier/*   → hanya role 'courier'
// /admin/*     → hanya role 'admin'
// Redirect ke /login jika belum auth
// Redirect ke role homepage jika sudah auth mencoba akses /login
```

---

## 📦 ADDITIONAL NOTES

1. **Snapshot data di order_items**: Selalu simpan nama produk, harga, dan modifier sebagai snapshot JSON saat order dibuat — jangan hanya simpan FK — karena harga bisa berubah di masa depan.

2. **Point reward per produk**: Setiap produk punya kolom `point_reward` sendiri. Saat order selesai (status = delivered), system hitung total poin dari SUM(item.point_reward * item.quantity) dan award ke trainer yang me-refer member tersebut.

3. **Point conversion**: `point_settings` key `point_to_rupiah_rate` menentukan nilai 1 point dalam rupiah. Ini bisa diubah admin kapan saja dari admin panel.

4. **Order number format**: Generate di OrderService dengan format `FS-YYYYMMDD-XXXX` (4 digit sequential per hari).

5. **Realtime events yang perlu di-broadcast**:
   - `OrderStatusUpdated` → channel `private-order.{orderId}`
   - `PointEarned` → channel `private-trainer.{trainerId}`
   - `NewMemberReferred` → channel `private-trainer.{trainerId}`
   - `NewDeliveryAssigned` → channel `private-courier.{courierId}`

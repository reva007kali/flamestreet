# Flamestreet Mobile (Expo)

## Setup
1) Install dependencies

```bash
cd mobile
npm install
```

2) Configure API base URL

Create `mobile/.env`:

```bash
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

On a real device, `127.0.0.1` refers to the device itself. Use either:
- your computer LAN IP (example `http://192.168.x.x:8000`), or
- a public tunnel URL for backend.

3) Run

```bash
cd mobile
npm run start
```

## Backend endpoints used
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/me`
- `GET /api/products`
- `GET /api/products/{slug}`
- `GET /api/payment-methods`
- `POST /api/orders`
- `GET /api/orders`
- `GET /api/orders/{orderNumber}`
- `POST /api/orders/{id}/doku/checkout`
- `GET /api/orders/{id}/doku/checkout/status`


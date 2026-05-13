# Indomitum — Digital Plant Passport Platform

Live: [indomitum.online](https://indomitum.online)

## Stack
- **Frontend**: React + TypeScript + Vite, deployed on Railway
- **Backend**: Node.js / Express, deployed on Railway
- **Database**: PostgreSQL (Railway managed)
- **Auth**: JWT (stored in localStorage)

## Architecture
```
frontend/          React app (Vite)
api/index.js       Express REST API
db/init.sql        Initial schema
db/migrate_v2.sql  v2 migrations
```

## Roles
- **Collector** — manages seed inventory, views incoming orders, updates order status, generates QR/barcodes
- **Buyer** — scans products, builds a list, sends orders, tracks fulfillment

---

## v2.1 Changes

### Bug Fixes
- **Single-char input fixed** — `WebScanner` (`html5-qrcode`) is no longer auto-mounted in the Scan tab. It only mounts when the user clicks "Start Camera", which eliminates the focus-steal that caused the input to reset after the first character.
- **Favorites persist across sessions** — Favorites now read from and write to the backend DB (`/buyer/favorites`) instead of `localStorage`. No data loss on refresh, cleared cache, or different devices.
- **Scanner works from all phones** — camera now starts with `{ facingMode: { ideal: "environment" } }` (non-strict) and falls back to `{}` (any camera) on failure. Fixes `OverconstrainedError` on Samsung/Xiaomi/other Android devices. Errors are surfaced clearly to the user.

### UX Fixes
- **Duplicate Scan removed** — the "Scan with camera" secondary button in My Seeds toolbar was removed. Only one Scan entry exists: the sidebar nav item.
- **Qty input replaced** — `+/-` buttons in `ShareListModal` replaced with `<input type="number">`. Users can type `1000` directly.
- **New Order from Tracking removed** — the "New Order Request" button/dialog visible to buyers inside Tracking has been removed. Order creation is only from the buyer dashboard "Send Order" button → `ShareListModal`.
- **Export de-duplicated** — the always-visible Export icon button in the My Seeds toolbar is removed. Export only appears in the "selected" bar when at least one seed is checked.
- **Selected row highlight** — checked rows now show a subtle `bg-primary/5` tint so it's clear which are selected vs which aren't.

### New Features
- **Collector Orders page** (`/dashboard/orders`) — lists all incoming buyer orders with status badges, buyer details, and order items. Collector can update status (Requested → Invoice Sent → Confirmed → Preparing → Shipped → Delivered → Completed) and add tracking codes.
- **Orders badge in collector sidebar** — red circle badge shows count of new (status: `requested`) orders, just like an email notification. Auto-fetches on load.
- **Buyer Orders in sidebar** — "Orders" is now a distinct sidebar item in the buyer nav (previously "Order History"). Links to `/buyer/orders`.

### New Files
| File | Purpose |
|------|---------|
| `src/pages/CollectorOrders.tsx` | New collector orders management page |
| `src/lib/escapeHtml.ts` | XSS-safe HTML escaping utility (used in print/PDF views) |

### Modified Files
| File | What changed |
|------|-------------|
| `src/components/WebScanner.tsx` | Camera fallback, lazy mount, better error messages |
| `src/components/ShareListModal.tsx` | Number input for qty, live Send Order button |
| `src/pages/BuyerDashboard.tsx` | Favorites→DB, remove duplicate Scan btn, export fix, row highlight |
| `src/pages/Tracking.tsx` | Removed buyer "New Order Request" block |
| `src/pages/Dashboard.tsx` | Orders nav link + red badge, newOrdersCount state |
| `src/App.tsx` | Added `/dashboard/orders` route |

---

## Environment Variables

### Frontend
```
VITE_API_URL=https://your-backend.railway.app
```

### Backend
```
DATABASE_URL=postgresql://...
JWT_SECRET=...
PORT=3000
```

---

## Local Development
```bash
# Frontend
cd frontend
npm install
npm run dev

# Backend
cd api
npm install
node index.js
```

## Deploy (Railway)
Both frontend and backend are separate Railway services. Push to `main` triggers auto-deploy.

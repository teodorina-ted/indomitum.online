# 🌱 Indomitum

> *"Indomitum"* — Latin for untamed, wild, unconquered. Just like the plants we track.

A seed collection CRM built for the field. Scan, track, and share plant passports — from the dirt to the database.

---

## What it does

**For Collectors** (the people knee-deep in soil):
- Add plants by scanning their bag QR/barcode in the field
- Attach GPS coordinates, photos, and notes
- Generate printable barcodes and QR codes for each bag
- Manage orders from buyers
- Track everything in a clean dashboard

**For Buyers** (the people who want the plants):
- Scan a QR code to view a plant's full passport
- Save seeds to a wishlist
- Place orders and track shipping

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + TypeScript + Vite + Tailwind + shadcn/ui |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| Auth | JWT |
| Email | Resend |
| Infra | Docker + Railway |
| DNS | Cloudflare |
| QR Scanning | Html5Qrcode + native BarcodeDetector API |

---

## Getting started

### Prerequisites
- Node.js 20+
- PostgreSQL
- A Resend account (for emails)

### Local setup

```bash
git clone https://github.com/teodorina-ted/indomitum.online
cd indomitum.online

# Frontend
npm install
cp .env.example .env
# Set VITE_API_URL=http://localhost:3000
npm run dev

# Backend
cd api
npm install
cp .env.example .env
# Set DATABASE_URL, JWT_SECRET, RESEND_API_KEY
node index.js
```

### Environment variables

**Frontend (`.env`)**
```
VITE_API_URL=https://indomitum.up.railway.app
```

**Backend (`api/.env`)**
```
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-here
RESEND_API_KEY=re_...
APP_URL=https://indomitum.online
PORT=3000
CORS_ORIGIN=https://indomitum.online,https://indomitum-online.up.railway.app
```

---

## Roles

| Role | Can do |
|------|--------|
| `collector` | Add/manage seeds, handle orders, generate QR codes |
| `buyer` | Scan QR codes, view passports, save seeds, place orders |
| `admin` | Everything |

---

## Deployment

Deployed on [Railway](https://railway.app) with two services:
- **front** — nginx serving the React SPA
- **back** — Node.js API

Auto-deploys on push to `main`. Domain managed via Cloudflare.

---

## Features

- 📱 Mobile-first PWA — installable on any device
- 🔍 Live QR/barcode scanner (mobile) + manual entry (desktop)
- 🗺️ GPS location capture with address lookup
- 📸 Photo upload with base64 storage
- 📧 Email verification on signup
- 🌍 Multi-language support (EN, IT, ES, FR, DE)
- 🌙 Dark mode
- 🏷️ Printable bag labels with QR codes
- ♻️ Recycle bin — delete and restore seeds

---

## License

MIT — use it, fork it, plant it.

---

*Built with too much coffee and not enough sleep.* ☕

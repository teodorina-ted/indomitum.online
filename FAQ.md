# Indomitum — FAQ & Product Overview

## What is Indomitum?

Indomitum is a seed collection CRM and plant passport platform. It connects seed collectors and botanical organizations with buyers through QR-coded plant passports, order management, and collection tracking.

---

## Who is Indomitum for?

### Organizations & Collectors
Seed companies, botanical gardens, seed banks, and independent collectors who need to:
- Catalog and track their seed collections
- Generate scannable QR codes for every seed bag
- Manage orders from buyers
- Share plant passports with full origin, GPS, and collection data

### Buyers
Individuals, researchers, or resellers who want to:
- Discover and scan seed passports from collectors
- Build and manage their seed wishlist
- Send orders directly to collectors
- Track shipments

---

## How does the organization hierarchy work?

```
Indomitum Platform
  └── Organizations (e.g. GreenFarm Seeds, BotanicaCo)
        └── Collectors (staff members who catalog seeds)
        └── Seeds (owned by the organization)
  └── Buyers (can follow and order from multiple organizations)
        └── My List (seeds from any organization)
        └── Orders (automatically routed to the right collector/org)
```

A buyer can have seeds from multiple organizations in their list. When they send an order, it is automatically split and routed to each organization separately.

---

## Can one buyer order from multiple organizations at once?

Yes. The buyer builds one unified list, taps "Send", and Indomitum automatically:
1. Groups seeds by their source organization
2. Creates separate orders per organization
3. Notifies each collector via email
4. Tracks each order independently

---

## How do multiple collectors join the same organization?

Using an **invite code**. The process:
1. The first collector creates an organization and receives a unique 6-character code
2. Other collectors enter that code when signing up or in Settings
3. All collectors under the same org share seed visibility and order management

This is planned for the next release.

---

## What is a Plant Passport?

A plant passport is a public page for each seed bag containing:
- Plant name and unique bag ID
- Collection date and GPS coordinates
- Origin address (auto-filled via reverse geocoding)
- Collector photo
- Quantity available
- Notes

Every bag gets a QR code that links directly to its passport. Anyone with a phone can scan it — no app download required.

---

## What platforms does it run on?

Indomitum is a Progressive Web App (PWA):
- Works on any device with a browser (iOS, Android, desktop)
- Can be installed on the home screen like a native app
- No app store download required
- Works offline for basic functions

---

## What does the scanning flow look like?

**Collector (adding a plant):**
1. Scan or type the bag ID
2. Take a photo (optional)
3. Capture GPS location (auto-fills address)
4. Add name, quantity, notes
5. Generate and print QR code for the bag

**Buyer (discovering a plant):**
1. Scan the QR on a seed bag
2. View the full plant passport
3. Tap "Add to My List" or "Favorite"
4. Send order when ready

---

## What are the subscription tiers? *(planned)*

| Tier | Price | Includes |
|------|-------|----------|
| Free | €0 | 1 collector, up to 20 seeds, basic passports |
| Pro | €29/mo | Unlimited seeds, 3 collectors, order management, analytics |
| Enterprise | €99/mo | Unlimited collectors, org profile page, API access, priority support |

---

## What analytics does Indomitum provide? *(planned)*

For organizations:
- Total QR scans per seed
- Most saved and ordered seeds
- Active buyers and order frequency
- Geographic distribution of buyers

---

## What is the public organization profile? *(planned)*

Each organization gets a public page at `indomitum.online/org/your-org-name` showing:
- All their available seeds
- Organization description and contact
- Buyers can follow the org and get notified of new seeds

Think of it as a free shop front — every seed bag's QR code drives traffic to it.

---

## How does order fulfillment work?

```
Buyer sends order → status: PENDING
Collector reviews  → status: APPROVED or REJECTED
Collector ships    → status: SHIPPED (+ tracking number added)
Package delivered  → status: DELIVERED
```

Both parties see real-time status updates. The buyer receives email notifications at each stage.

---

## Is buyer data private?

Yes. Buyers only see seeds and organizations they have interacted with. Collectors see buyer names and contact info only for orders placed with them. No buyer data is shared across organizations.

---

## What makes Indomitum different from a spreadsheet or generic CRM?

- **QR-first** — every bag gets a scannable passport, no manual lookup
- **Field-ready** — designed for mobile use in the field, works in poor connectivity
- **Buyer-facing** — seeds are discoverable, not just stored internally
- **Order pipeline** — built-in from scan to delivery, no email chains
- **GPS origin tracking** — automatic address fill from coordinates

---

*Indomitum — untamed, wild, unconquered. Just like the plants we track.* 🌱

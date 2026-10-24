# OfflinePay

**Digital wallet payments that work without internet.**

OfflinePay is an SDK and API that wallets like eSewa or Khalti can plug in so their users can pay and
get paid by QR code with no signal: in the mountains, at crowded events, or during outages.
Payments settle automatically when a phone is back online.

This repo is a working demo with two mock wallets, **PayA** (green) and **PayB** (purple).

---

## Try it

| Phone | How |
|---|---|
| **Android** | Download `OfflinePay-Wallet.apk` from [Releases](https://github.com/aayushbhatta230-ux/offlinepay/releases) and install it. If you had version 1.x, uninstall it first. |
| **iPhone** | Open **https://aayushbhatta230-ux.github.io/offlinepay/** in Safari → **Share → Add to Home Screen** → open it from the icon. |

No laptop or server needed. Pick PayA or PayB, create an account (it starts with NPR 5,000 of demo
money) and go. Android and iPhone can pay each other.

> **iPhone:** create your account inside the home-screen app, not in the Safari tab. They keep separate storage.

---

## How it works

1. **Set up (online):** the phone creates a secret signing key and gets a certificate from OfflinePay.
2. **Load (online):** move money into the **Offline Vault**. The wallet locks it in your account.
3. **Pay (offline):** the shop shows a QR, you scan and confirm, and your phone shows a **signed** payment code. The shop scans it and checks the signature on the spot: ✅ verified.
4. **Settle (online later):** either phone uploads the payment and the money moves.

**Cheating is caught:**

| Attack | Result |
|---|---|
| Editing the amount or faking a code | Signature fails, so it's **rejected instantly, even offline** |
| Showing the same payment twice | One-time code already used, so it's **rejected instantly** |
| Copying the vault to spend money twice | Looks fine offline, but the reused counter is **caught at settlement** and the **account is frozen** |

Offline spending is capped at **NPR 5,000 per phone**, so any loss is small and always traced to a known account.

---

## Two-phone demo (≈3 min)

**Setup:** phone 1 = PayA, personal account. Phone 2 = PayB, merchant account. Both open the **Offline Pay** tab and set it up; the customer loads NPR 1,000.

1. Turn on **airplane mode** on both phones (or tap the **Online** pill to simulate it).
2. **Pay:** the merchant taps **Receive** and enters NPR 200. The customer taps **Scan** and confirms. The merchant taps **Scan customer's code** → ✅ *Payment verified*.
3. **Tamper:** in *Demo: attack tools*, the customer turns on **Tamper** and pays again. The merchant scans → ❌ *rejected*.
4. **Double-spend:** before step 2, the customer taps **Save vault snapshot**. After paying, tap **Roll back vault** and pay a new request with the same money. It looks valid offline.
5. **Back online:** the real payment shows **Settled**, the copy shows **🚩 Fraud — blocked**, and the customer's account is **frozen**. See **Profile → OfflinePay console**.

Reset with **Profile → Erase all data on this phone**.

> *Demo: attack tools* (bottom of the Offline Pay tab) simulates a hacked phone so you can show the security working. Real users would never see it.

---

## Laptop server (optional)

Run one shared backend with a live dashboard for a projector:

```bash
git clone https://github.com/aayushbhatta230-ux/offlinepay.git
cd offlinepay
npm install
npm start
```

- Dashboard: **http://localhost:3000/dashboard/**
- In the app: **Profile → Wallet & connection** (or **Advanced** on the first screen) → enter the address `npm start` prints, e.g. `http://192.168.1.10:3000`.
- Phones and laptop must be on the **same Wi-Fi or hotspot**. On Windows, allow Node.js through the firewall.
- iPhone needs an HTTPS tunnel for this: `npx cloudflared tunnel --url http://localhost:3000`.

Server mode also catches the same money spent at **two different shops**, which phone-only mode can't, because only a central server sees every payment.

---

## Project structure

```
sdk/protocol.js         Signing and verification (ECDSA P-256, WebCrypto), shared by phone and server
sdk/offlinepay-sdk.js   What a wallet embeds: device key, vault, QR payments, sync
core/engine.js          The backend: OfflinePay API (certificates, settlement, fraud checks)
                        plus the mock PayA/PayB wallets. Runs on the server and inside the app.
apps/wallet/            The wallet app (packaged as the APK and the iPhone web app)
apps/dashboard/         Live console for server mode
server/index.js         Optional laptop server
test/                   End-to-end server test and two-phone standalone test
```

## Development

```bash
npm test               # all tests
npm start              # laptop server on :3000
npm run build:android  # bundle the app for Android (then: cd android && ./gradlew assembleDebug)
npm run build:web      # build the iPhone/web version into site/
```

GitHub Actions runs the tests, builds the APK and publishes the website on every push to `main`.
Pushing a tag like `v2.1` creates a numbered release.

## Pitch deck deploys (`presentation/`)

The 3D pitch deck is the Vercel project `tridiots/presentation`, live at
https://presentation-one-azure.vercel.app. Its Root Directory is set to `presentation`.

- **Automatic:** every push to `main` deploys to production.
- **Manual:** run the CLI from the **repo root**, not from inside `presentation/`
  (Vercel would look for `presentation/presentation` and fail):

```bash
cd offlinepay
npx vercel --prod --yes
```

Before deploying a change, bump the `?v=` query on `presentation.css` and `presentation.js` in
`presentation/index.html`, and set the same value as `VERSION` in `presentation/sw.js`
(the service worker that keeps the deck working offline; a new version clears old caches).

**On stage:** open the deck once on the venue network so it saves itself for offline use. Press
`S` for the presenter view (notes, next slide, pacing) on your laptop screen, `B` to black out,
`R` to reset the timer, `1`–`7` to jump, and `?` for every shortcut. `C` turns on snap navigation:
snap or clap **twice** (about a third of a second apart) to advance. The mic dot turns amber after the
first snap. Speech, coughs and single clicks are ignored, and so is the deck's own sound, so a snap
during a playing video won't count; wait for a pause. Add `?time=4` to the URL for
a 4-minute budget (default 5). Don't change the Root Directory back to `.`: with git connected,
the next push would deploy the whole repo and take the site down.

## Partner API (summary)

| Endpoint | Purpose |
|---|---|
| `POST /v1/devices/register` | Register a user's phone → device certificate |
| `POST /v1/offline/load` | Wallet locked funds → load certificate for the vault |
| `POST /v1/sync` | Upload signed payments → settle, detect fraud |
| `POST /v1/devices/:id/freeze` | Block a device |
| `GET /v1/revocations` | Frozen devices |

Webhooks to the wallet: `settlement.debit`, `settlement.credit`, `settlement.rejected`, `fraud.detected`.
OfflinePay never holds money; it tells the wallets what to debit and credit.

## Demo limitations
- Keys and the vault are protected in software. Production would use the phone's secure hardware (Android StrongBox, iOS Secure Enclave).
- Double-spending is **detected and capped**, not prevented, while offline.
- In phone-only mode, the issuer key is built into the app, and each phone keeps its own accounts.
- The APK is a debug build with a demo signing key. It isn't a Play Store release.

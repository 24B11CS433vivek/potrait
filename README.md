# Graphite & Co. — Portrait Booking Site

Files:
- `index.html` — public gallery, pricing, and booking form (creates a customer account automatically)
- `login.html` — login for existing customers / artists / admin
- `dashboard.html` — one dashboard that shows a different view depending on role (customer / artist / admin)
- `config.js` — shared Firebase + Cloudinary setup (loaded by all three pages)
- `style.css` — shared design
- `pradeep.png` — **add your logo file here**, same folder, exactly this filename

## 1. One-time setup (15 minutes)

### A. Cloudinary — create an unsigned upload preset
Your API **secret** must never sit in website code (anyone can view page source and take over your account with it). So this site never uses it — instead it uses an "unsigned upload preset," which is the safe, standard way to let a browser upload images.

1. Log into Cloudinary → **Settings → Upload**.
2. Scroll to **Upload presets → Add upload preset**.
3. Set:
   - Preset name: `portrait_unsigned` (must match exactly — it's already in `config.js`)
   - Signing mode: **Unsigned**
   - Folder: `portraits` (optional, just keeps things tidy)
4. Save. That's it — no secret needed anywhere in the code.

### B. Firestore — security rules
In Firebase Console → Firestore Database → Rules, paste this:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() { return request.auth != null; }
    function myRole() { return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role; }
    function isAdmin() { return isSignedIn() && myRole() == 'admin'; }
    function isArtist() { return isSignedIn() && myRole() == 'artist'; }

    match /users/{uid} {
      allow read: if isSignedIn();
      allow create: if isSignedIn() && request.auth.uid == uid;
      allow update: if isSignedIn() && (request.auth.uid == uid || isAdmin());
    }
    match /portraits/{id} {
      allow read: if true;
      allow write: if isAdmin() || (isArtist() && request.resource.data.artistId == request.auth.uid);
      allow delete: if isAdmin() || (isArtist() && resource.data.artistId == request.auth.uid);
    }
    match /orders/{id} {
      allow create: if isSignedIn();
      allow read: if isAdmin() || (isSignedIn() && (resource.data.customerId == request.auth.uid || resource.data.artistId == request.auth.uid));
      allow update: if isAdmin() || (isSignedIn() && (resource.data.customerId == request.auth.uid || resource.data.artistId == request.auth.uid));
    }
    match /settings/{doc} {
      allow read: if true;
      allow write: if isAdmin();
    }
  }
}
```

### C. Make yourself the admin
There's no "sign up as admin" button on purpose — admin access is set manually the first time so random visitors can't grant themselves control.

1. Go to `login.html` on your deployed site and create an account the normal way — actually, easiest: go to **Firebase Console → Authentication → Add user**, enter your email + password.
2. Copy that user's UID.
3. Go to **Firestore Database → Start collection** (if `users` doesn't exist yet) → collection `users` → document ID = the UID you copied → add fields:
   - `role` (string) = `admin`
   - `name` (string) = your name
4. Log into `login.html` with that email/password — you'll land on the admin dashboard.

### D. Add your logo
Drop your logo file into the same folder as the HTML files and name it exactly `pradeep.png`. It's already wired into the header, browser tab icon, and footer.

## 2. How the money flow works
- Customer books → order status `pending`.
- Artist/admin reviews it and taps **Confirm order** → `confirmed`.
- Artist/admin taps **Send payment QR**, enters the final amount → status `qr_sent`. The QR is generated on the spot from the artist's UPI ID (no third-party payment gateway, no fees) — nothing is stored as an image, it's just drawn from the UPI ID + amount each time.
- Customer scans it in their dashboard, pays, then uploads a screenshot as proof → `paid_screenshot`.
- Artist/admin taps **Mark payment confirmed** → back to `confirmed`, then **Mark completed** once shipped.
- A "Share on WhatsApp too" button is included, but note: WhatsApp's `wa.me` links can only pre-fill **text**, not attach an image automatically — that's a WhatsApp limitation, not something any website can work around. The screenshot is already safely stored and visible in the admin/artist dashboard either way, so this button is just a backup for the customer's peace of mind.

## 3. Adding artists
Only the admin can do this (Dashboard → Artists tab). It creates their login and a UPI ID field for their own QR codes. Each artist only ever sees and manages their own portraits and orders; the admin sees everything.

## 4. Deploying
This is a static site — no server needed. Easiest options:
- **Firebase Hosting** (free, and you're already using Firebase): `firebase init hosting` → point it at this folder → `firebase deploy`.
- Or any static host: Netlify, Vercel, GitHub Pages — just upload all the files in this folder together.

## 5. Before you go live
- Swap in your real Cloudinary preset if you want a different folder structure.
- Double-check the Firestore rules above are actually pasted in (Firebase's default rules block everything).
- Add at least one artist with a UPI ID, or the QR step won't have anything to generate from.
- Test one full booking yourself end to end before sharing the link.

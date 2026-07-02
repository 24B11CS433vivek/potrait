/* ============================================================
   GRAPHITE & CO. — shared configuration
   Loaded by index.html, login.html and dashboard.html
   ============================================================ */

// ---- Firebase (safe to expose publicly — access is controlled by Firestore rules) ----
const firebaseConfig = {
  apiKey: "AIzaSyDQXcONWg3t1gWPSzwrFD0O5XuatfUMUKE",
  authDomain: "portrait-booking-vivek.firebaseapp.com",
  databaseURL: "https://portrait-booking-vivek-default-rtdb.firebaseio.com",
  projectId: "portrait-booking-vivek",
  storageBucket: "portrait-booking-vivek.firebasestorage.app",
  messagingSenderId: "306588507617",
  appId: "1:306588507617:web:d3ba4dce11280a1b6a06a0",
  measurementId: "G-183ZVR4E59"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ---- Cloudinary (UNSIGNED upload only — no secret ever lives in browser code) ----
// You must create this preset once in Cloudinary → Settings → Upload → Add upload preset
// Name it exactly "portrait_unsigned", set Signing Mode = Unsigned, Folder = "portraits"
const CLOUDINARY_CLOUD_NAME = "jhdqqf9m";
const CLOUDINARY_UPLOAD_PRESET = "portrait_unsigned";

async function uploadToCloudinary(file, folder = "orders") {
  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  form.append("folder", folder);
  const res = await fetch(url, { method: "POST", body: form });
  if (!res.ok) throw new Error("Image upload failed. Check your Cloudinary preset.");
  const data = await res.json();
  return data.secure_url;
}

// ---- Site-wide constants ----
const SITE = {
  name: "Graphite & Co.",
  instagram: "https://instagram.com/ravan_arts777",
  whatsapp: "919182262751",
  whatsappBookingText: "Hi! I'd like to book a custom portrait.",
  callNumber: "+919182262751",
  youtube: "" // add your channel URL later from the admin dashboard's Social Links panel
};

// ---- Default pricing matrix (editable later from Admin → Pricing) ----
// Stored in Firestore at settings/pricing — this is only the fallback used the very first time.
const DEFAULT_PRICING = {
  base: {
    A4: { low: 799, medium: 1499, high: 2499 },
    A3: { low: 1299, medium: 2299, high: 3499 },
    A2: { low: 1999, medium: 3299, high: 4999 }
  },
  extraFace: 60, // percent added per extra face, e.g. 2nd face = +60% of base
  faceOptions: [1, 2, 3]
};

async function getPricing() {
  try {
    const doc = await db.collection("settings").doc("pricing").get();
    if (doc.exists) return doc.data();
  } catch (e) { /* fall through to default */ }
  return DEFAULT_PRICING;
}

function calculatePrice(pricing, size, tier, faces) {
  const base = pricing.base?.[size]?.[tier];
  if (!base) return null;
  const extraFaces = Math.max(0, faces - 1);
  const perFacePct = pricing.extraFace ?? 60;
  const total = base + base * (perFacePct / 100) * extraFaces;
  return Math.round(total);
}

// ---- UPI QR helper: builds a UPI deep-link and renders it as a QR code into a container ----
function renderUpiQr(containerEl, { upiId, payeeName, amount, note }) {
  containerEl.innerHTML = "";
  const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${encodeURIComponent(amount)}&cu=INR&tn=${encodeURIComponent(note || "Portrait order")}`;
  // eslint-disable-next-line no-undef
  new QRCode(containerEl, {
    text: upiUrl,
    width: 220,
    height: 220,
    colorDark: "#1B1A17",
    colorLight: "#F1EBDD"
  });
  return upiUrl;
}

function waLink(number, text) {
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

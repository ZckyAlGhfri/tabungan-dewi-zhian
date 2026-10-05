import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, doc, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyABB46okef-WeGI8XaXn2X-pwC0GNnP7Bw",
    authDomain: "tabungan-nikah-dz.firebaseapp.com",
    projectId: "tabungan-nikah-dz",
    storageBucket: "tabungan-nikah-dz.firebasestorage.app",
    messagingSenderId: "541421779082",
    appId: "1:541421779082:web:eb36944c2a74304c70d573"
  };

// Inisialisasi Firebase & Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const savingsDocRef = doc(db, "tabungan", "oktober_2026");

let state = {};

// Helper Format Rupiah
function rupiah(n) {
  return "Rp" + (n || 0).toLocaleString("id-ID");
}

// Update Badge Status di Header
function setStatus(isOnline, text) {
  const dot = document.getElementById("statusDot");
  const label = document.getElementById("statusText");
  if (!dot || !label) return;

  if (isOnline) {
    dot.classList.add("online");
    label.textContent = text || "🟢 Realtime Terhubung";
  } else {
    dot.classList.remove("online");
    label.textContent = text || "🟡 Menghubungkan...";
  }
}

// Render Tabel 31 Hari & Hitung Total
function render() {
  const rows = document.getElementById("rows");
  if (!rows) return;
  rows.innerHTML = "";
  
  let totalD = 0;
  let totalZ = 0;

  for (let day = 1; day <= 31; day++) {
    const dayData = state[day] || { amount: 10000, d: false, z: false };
    const r = document.createElement("div");
    r.className = "row";

    // Tanggal
    const date = document.createElement("div");
    date.className = "date-col";
    date.textContent = day + " Okt";

    // Dropdown Nominal
    const nominalWrap = document.createElement("div");
    const select = document.createElement("select");
    select.className = "money-select";
    
    for (let val = 10000; val <= 100000; val += 10000) {
      const opt = document.createElement("option");
      opt.value = val;
      opt.textContent = rupiah(val);
      if (val === (dayData.amount || 10000)) opt.selected = true;
      select.appendChild(opt);
    }

    select.onchange = (e) => {
      updateDay(day, { amount: parseInt(e.target.value, 10) });
    };
    nominalWrap.appendChild(select);

    const nominal = dayData.amount || 10000;
    if (dayData.d) totalD += nominal;
    if (dayData.z) totalZ += nominal;

    // Tombol Dewi (D)
    const dWrap = document.createElement("div");
    dWrap.className = "center";
    const d = document.createElement("button");
    d.className = "user-btn" + (dayData.d ? " done" : "");
    d.textContent = dayData.d ? "D ✓" : "D";
    d.onclick = () => updateDay(day, { d: !dayData.d });
    dWrap.appendChild(d);

    // Tombol Zhian (Z)
    const zWrap = document.createElement("div");
    zWrap.className = "center";
    const z = document.createElement("button");
    z.className = "user-btn" + (dayData.z ? " done" : "");
    z.textContent = dayData.z ? "Z ✓" : "Z";
    z.onclick = () => updateDay(day, { z: !dayData.z });
    zWrap.appendChild(z);

    r.append(date, nominalWrap, dWrap, zWrap);
    rows.appendChild(r);
  }

  document.getElementById("dewiTotal").textContent = rupiah(totalD);
  document.getElementById("zhianTotal").textContent = rupiah(totalZ);
  document.getElementById("bothTotal").textContent = rupiah(totalD + totalZ);
}

// Simpan Update ke Firestore
async function updateDay(day, changes) {
  const cur = state[day] || { amount: 10000, d: false, z: false };
  state[day] = { ...cur, ...changes };
  render(); // Optimistic UI: perbarui tampilan seketika

  try {
    await setDoc(savingsDocRef, { [day]: state[day] }, { merge: true });
  } catch (err) {
    console.error("Gagal sinkron cloud:", err);
    setStatus(false, "🔴 Gagal Sinkron");
  }
}

// Reset Seluruh Data Tabungan
async function resetAllData() {
  state = {};
  render();
  try {
    await setDoc(savingsDocRef, {});
  } catch (err) {
    console.error(err);
  }
}

// Realtime Listener Firestore (Data Otomatis Terupdate saat Pasangan Mengklik)
onSnapshot(savingsDocRef, (docSnap) => {
  setStatus(true, "🟢 Sinkron Realtime Aktif");
  if (docSnap.exists()) {
    state = docSnap.data() || {};
    render();
  } else {
    state = {};
    render();
  }
}, (err) => {
  console.error(err);
  setStatus(false, "🔴 Gagal Konek Firebase");
});

// Setup Modal Konfirmasi Reset
const modal = document.getElementById("resetModal");
document.getElementById("btnReset").onclick = () => modal.classList.add("active");
document.getElementById("btnCancelReset").onclick = () => modal.classList.remove("active");
document.getElementById("btnConfirmReset").onclick = () => {
  modal.classList.remove("active");
  resetAllData();
};

// Render awal saat halaman baru dibuka
render();
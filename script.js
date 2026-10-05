import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, doc, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Kredensial Firebase Asli Anda
const firebaseConfig = {
  apiKey: "AIzaSyABB46okef-WeGI8XaXn2X-pwC0GNnP7Bw",
  authDomain: "tabungan-nikah-dz.firebaseapp.com",
  projectId: "tabungan-nikah-dz",
  storageBucket: "tabungan-nikah-dz.firebasestorage.app",
  messagingSenderId: "541421779082",
  appId: "1:541421779082:web:eb36944c2a74304c70d573"
};

// Inisialisasi Firebase & Dokumen Database
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
// Menyimpan seluruh data multi-bulan dalam 1 dokumen tunggal (hemat kuota)
const savingsDocRef = doc(db, "tabungan", "data_pernikahan");

// State Global
let allMonthsData = {}; // Format: { "2026-10": { "1": { amount, d, z } } }
let activeDate = new Date(2026, 9, 1); // Default ke target Oktober 2026 (Month 0-indexed: 9 = Oktober)

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

function rupiah(n) {
  return "Rp" + (n || 0).toLocaleString("id-ID");
}

function getActiveMonthKey() {
  const y = activeDate.getFullYear();
  const m = String(activeDate.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function getDaysInActiveMonth() {
  return new Date(activeDate.getFullYear(), activeDate.getMonth() + 1, 0).getDate();
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

// Render UI (Kalender, Tabel, dan Dual Summary)
function render() {
  const monthKey = getActiveMonthKey();
  const currentMonthData = allMonthsData[monthKey] || {};
  const totalDays = getDaysInActiveMonth();
  
  // 1. Perbarui Label Navigator
  const monthName = MONTH_NAMES[activeDate.getMonth()];
  const fullYear = activeDate.getFullYear();
  document.getElementById("currentMonthLabel").textContent = `${monthName} ${fullYear}`;
  document.getElementById("labelSummaryMonth").textContent = `${monthName.substring(0,3)} ${fullYear}`;
  document.getElementById("spanSelectedMonth").textContent = `${monthName} ${fullYear}`;

  // 2. Render Baris Harian
  const rowsContainer = document.getElementById("rows");
  rowsContainer.innerHTML = "";

  let monthD = 0;
  let monthZ = 0;

  for (let day = 1; day <= totalDays; day++) {
    const dayData = currentMonthData[day] || { amount: 10000, d: false, z: false };
    const r = document.createElement("div");
    r.className = "row";

    // Kolom Tanggal
    const dateDiv = document.createElement("div");
    dateDiv.className = "date-col";
    dateDiv.textContent = `${day} ${monthName.substring(0,3)}`;

    // Nominal Dropdown (10rb - 100rb)
    const nomWrap = document.createElement("div");
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
      updateDayData(day, { amount: parseInt(e.target.value, 10) });
    };
    nomWrap.appendChild(select);

    const nominal = dayData.amount || 10000;
    if (dayData.d) monthD += nominal;
    if (dayData.z) monthZ += nominal;

    // Tombol Dewi (D)
    const dWrap = document.createElement("div");
    dWrap.className = "center";
    const dBtn = document.createElement("button");
    dBtn.className = "user-btn" + (dayData.d ? " done" : "");
    dBtn.textContent = dayData.d ? "D ✓" : "D";
    dBtn.onclick = () => updateDayData(day, { d: !dayData.d });
    dWrap.appendChild(dBtn);

    // Tombol Zhian (Z)
    const zWrap = document.createElement("div");
    zWrap.className = "center";
    const zBtn = document.createElement("button");
    zBtn.className = "user-btn" + (dayData.z ? " done" : "");
    zBtn.textContent = dayData.z ? "Z ✓" : "Z";
    zBtn.onclick = () => updateDayData(day, { z: !dayData.z });
    zWrap.appendChild(zBtn);

    r.append(dateDiv, nomWrap, dWrap, zWrap);
    rowsContainer.appendChild(r);
  }

  // 3. Tampilkan Subtotal Bulan Ini
  document.getElementById("monthDewi").textContent = rupiah(monthD);
  document.getElementById("monthZhian").textContent = rupiah(monthZ);
  document.getElementById("monthTotal").textContent = rupiah(monthD + monthZ);

  // 4. Hitung & Tampilkan Akumulasi Seluruh Bulan (All-Time)
  let grandTotalD = 0;
  let grandTotalZ = 0;

  for (const mKey in allMonthsData) {
    const mData = allMonthsData[mKey];
    for (const dKey in mData) {
      const item = mData[dKey];
      const amt = item.amount || 10000;
      if (item.d) grandTotalD += amt;
      if (item.z) grandTotalZ += amt;
    }
  }

  document.getElementById("allDewi").textContent = rupiah(grandTotalD);
  document.getElementById("allZhian").textContent = rupiah(grandTotalZ);
  document.getElementById("grandTotal").textContent = rupiah(grandTotalD + grandTotalZ);
}

// Simpan Perubahan ke Firestore
async function updateDayData(day, changes) {
  const mKey = getActiveMonthKey();
  if (!allMonthsData[mKey]) allMonthsData[mKey] = {};
  
  const currentDay = allMonthsData[mKey][day] || { amount: 10000, d: false, z: false };
  allMonthsData[mKey][day] = { ...currentDay, ...changes };

  render(); // Optimistic UI: langsung berubah tanpa nunggu respon server

  try {
    await setDoc(savingsDocRef, {
      [mKey]: {
        [day]: allMonthsData[mKey][day]
      }
    }, { merge: true });
  } catch (err) {
    console.error("Gagal simpan ke Firestore:", err);
    setStatus(false, "🔴 Gagal Sinkron");
  }
}

// Realtime Listener dari Firestore
onSnapshot(savingsDocRef, (docSnap) => {
  setStatus(true, "🟢 Sinkron Realtime Aktif");
  if (docSnap.exists()) {
    allMonthsData = docSnap.data() || {};
  } else {
    allMonthsData = {};
  }
  render();
}, (err) => {
  console.error("Firestore Error:", err);
  setStatus(false, "🔴 Masalah Jaringan/Koneksi");
});

// ==========================================
// NAVIGASI BULAN & SWIPE GESTURE
// ==========================================
function changeMonth(delta) {
  activeDate.setMonth(activeDate.getMonth() + delta);
  render();
}

document.getElementById("prevMonth").onclick = () => changeMonth(-1);
document.getElementById("nextMonth").onclick = () => changeMonth(1);

// Gesture Swipe di Layar HP
let touchStartX = 0;
let touchStartY = 0;
const swipeArea = document.getElementById("swipeArea");

swipeArea.addEventListener("touchstart", (e) => {
  touchStartX = e.changedTouches[0].screenX;
  touchStartY = e.changedTouches[0].screenY;
}, { passive: true });

swipeArea.addEventListener("touchend", (e) => {
  const diffX = e.changedTouches[0].screenX - touchStartX;
  const diffY = e.changedTouches[0].screenY - touchStartY;

  // Deteksi pergerakan horizontal dominan (> 60px)
  if (Math.abs(diffX) > 60 && Math.abs(diffX) > Math.abs(diffY)) {
    if (diffX < 0) {
      changeMonth(1); // Geser ke kiri -> Bulan maju
    } else {
      changeMonth(-1); // Geser ke kanan -> Bulan mundur
    }
  }
}, { passive: true });

// ==========================================
// MODAL RESET DENGAN VALIDASI BERTINGKAT
// ==========================================
const modalResetMenu = document.getElementById("modalResetMenu");
const modalConfirm = document.getElementById("modalConfirm");
const typedArea = document.getElementById("typedValidationArea");
const validationInput = document.getElementById("validationInput");

let pendingResetAction = null; // 'MONTH' atau 'ALL'

document.getElementById("btnOpenResetMenu").onclick = () => modalResetMenu.classList.add("active");
document.getElementById("btnCloseResetMenu").onclick = () => modalResetMenu.classList.remove("active");

// Opsi 1: Reset Hanya Bulan Aktif
document.getElementById("btnChoiceMonth").onclick = () => {
  modalResetMenu.classList.remove("active");
  pendingResetAction = 'MONTH';
  
  document.getElementById("confirmTitle").textContent = "Konfirmasi Reset Bulan Ini";
  document.getElementById("confirmDesc").textContent = `Apakah Anda yakin ingin MENGOSONGKAN catatan di bulan ${document.getElementById("spanSelectedMonth").textContent}?`;
  typedArea.style.display = "none";
  
  modalConfirm.classList.add("active");
};

// Opsi 2: Reset Seluruh Bulan (All-Time)
document.getElementById("btnChoiceAll").onclick = () => {
  modalResetMenu.classList.remove("active");
  pendingResetAction = 'ALL';
  
  document.getElementById("confirmTitle").textContent = "⚠️ PERINGATAN: RESET TOTAL";
  document.getElementById("confirmDesc").textContent = "Tindakan ini akan MENGHAPUS SEMUA DATA tabungan dari SEMUA BULAN secara permanen!";
  typedArea.style.display = "block";
  validationInput.value = "";
  
  modalConfirm.classList.add("active");
};

// Batalkan Reset
document.getElementById("btnCancelConfirm").onclick = () => {
  modalConfirm.classList.remove("active");
  pendingResetAction = null;
};

// Eksekusi Reset setelah konfirmasi
document.getElementById("btnExecuteConfirm").onclick = async () => {
  if (pendingResetAction === 'ALL') {
    if (validationInput.value.trim().toUpperCase() !== "HAPUS") {
      alert("Validasi gagal! Anda harus mengetik kata 'HAPUS' dengan tepat.");
      return;
    }
    
    allMonthsData = {};
    render();
    try {
      await setDoc(savingsDocRef, {});
    } catch (e) {
      console.error(e);
    }
  } else if (pendingResetAction === 'MONTH') {
    const mKey = getActiveMonthKey();
    delete allMonthsData[mKey];
    render();
    try {
      await setDoc(savingsDocRef, allMonthsData);
    } catch (e) {
      console.error(e);
    }
  }

  modalConfirm.classList.remove("active");
  pendingResetAction = null;
};

// Inisialisasi awal tampilan
render();
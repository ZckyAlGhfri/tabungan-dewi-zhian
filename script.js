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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const savingsDocRef = doc(db, "tabungan", "data_pernikahan");

// State Global
let allMonthsData = {};
let activeDate = new Date(2026, 9, 1); // Default ke Oktober 2026

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

function triggerHaptic() {
  if (navigator.vibrate) {
    navigator.vibrate(35);
  }
}

let toastTimer = null;
function showMonthToast(monthName, year) {
  const toast = document.getElementById("monthToast");
  toast.textContent = `📅 ${monthName} ${year}`;
  toast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 1600);
}

// Render UI Tabel & Kontrol Independen Dewi & Zhian
function render(slideDirection = null) {
  const monthKey = getActiveMonthKey();
  const currentMonthData = allMonthsData[monthKey] || {};
  const totalDays = getDaysInActiveMonth();
  
  // 1. Label Navigator
  const monthName = MONTH_NAMES[activeDate.getMonth()];
  const fullYear = activeDate.getFullYear();
  document.getElementById("currentMonthLabel").textContent = `${monthName} ${fullYear}`;
  document.getElementById("labelSummaryMonth").textContent = `${monthName.substring(0,3)} ${fullYear}`;
  document.getElementById("spanSelectedMonth").textContent = `${monthName} ${fullYear}`;

  // 2. Render Baris Harian
  const rowsContainer = document.getElementById("rows");
  rowsContainer.innerHTML = "";

  if (slideDirection === "next") {
    rowsContainer.className = "slide-next";
  } else if (slideDirection === "prev") {
    rowsContainer.className = "slide-prev";
  } else {
    rowsContainer.className = "";
  }

  let monthD = 0;
  let monthZ = 0;

  for (let day = 1; day <= totalDays; day++) {
    const raw = currentMonthData[day] || {};
    
    // Normalisasi data (kompatibel dengan format lama & baru)
    const dayData = {
      dAmount: raw.dAmount !== undefined ? raw.dAmount : (raw.amount || 10000),
      zAmount: raw.zAmount !== undefined ? raw.zAmount : (raw.amount || 10000),
      d: Boolean(raw.d),
      z: Boolean(raw.z)
    };

    const r = document.createElement("div");
    r.className = "row";

    // Kolom Tanggal
    const dateDiv = document.createElement("div");
    dateDiv.className = "date-col";
    dateDiv.innerHTML = `${day}<span class="date-sub">${monthName.substring(0,3)}</span>`;

    // --- KONTROL DEWI ---
    const dewiBox = document.createElement("div");
    dewiBox.className = "person-control dewi-box";

    const selectD = document.createElement("select");
    selectD.className = "money-select-mini";
    for (let val = 10000; val <= 100000; val += 10000) {
      const opt = document.createElement("option");
      opt.value = val;
      opt.textContent = rupiah(val);
      if (val === dayData.dAmount) opt.selected = true;
      selectD.appendChild(opt);
    }
    selectD.onchange = (e) => {
      updateDayData(day, { dAmount: parseInt(e.target.value, 10) });
    };

    const btnD = document.createElement("button");
    btnD.className = "user-btn-mini dewi-btn" + (dayData.d ? " done" : "");
    btnD.textContent = dayData.d ? "✓" : "D";
    btnD.onclick = () => updateDayData(day, { d: !dayData.d });

    dewiBox.append(selectD, btnD);

    // --- KONTROL ZHIAN ---
    const zhianBox = document.createElement("div");
    zhianBox.className = "person-control zhian-box";

    const selectZ = document.createElement("select");
    selectZ.className = "money-select-mini";
    for (let val = 10000; val <= 100000; val += 10000) {
      const opt = document.createElement("option");
      opt.value = val;
      opt.textContent = rupiah(val);
      if (val === dayData.zAmount) opt.selected = true;
      selectZ.appendChild(opt);
    }
    selectZ.onchange = (e) => {
      updateDayData(day, { zAmount: parseInt(e.target.value, 10) });
    };

    const btnZ = document.createElement("button");
    btnZ.className = "user-btn-mini zhian-btn" + (dayData.z ? " done" : "");
    btnZ.textContent = dayData.z ? "✓" : "Z";
    btnZ.onclick = () => updateDayData(day, { z: !dayData.z });

    zhianBox.append(selectZ, btnZ);

    // Akumulasi Subtotal
    if (dayData.d) monthD += dayData.dAmount;
    if (dayData.z) monthZ += dayData.zAmount;

    r.append(dateDiv, dewiBox, zhianBox);
    rowsContainer.appendChild(r);
  }

  // 3. Subtotal Bulan Ini
  document.getElementById("monthDewi").textContent = rupiah(monthD);
  document.getElementById("monthZhian").textContent = rupiah(monthZ);
  document.getElementById("monthTotal").textContent = rupiah(monthD + monthZ);

  // 4. Akumulasi Total Seluruh Bulan
  let grandTotalD = 0;
  let grandTotalZ = 0;

  for (const mKey in allMonthsData) {
    const mData = allMonthsData[mKey];
    for (const dKey in mData) {
      const item = mData[dKey];
      const dAmt = item.dAmount !== undefined ? item.dAmount : (item.amount || 10000);
      const zAmt = item.zAmount !== undefined ? item.zAmount : (item.amount || 10000);
      if (item.d) grandTotalD += dAmt;
      if (item.z) grandTotalZ += zAmt;
    }
  }

  document.getElementById("allDewi").textContent = rupiah(grandTotalD);
  document.getElementById("allZhian").textContent = rupiah(grandTotalZ);
  document.getElementById("grandTotal").textContent = rupiah(grandTotalD + grandTotalZ);
}

// Simpan Modifikasi ke Firestore
async function updateDayData(day, changes) {
  const mKey = getActiveMonthKey();
  if (!allMonthsData[mKey]) allMonthsData[mKey] = {};
  
  const raw = allMonthsData[mKey][day] || {};
  const currentDay = {
    dAmount: raw.dAmount !== undefined ? raw.dAmount : (raw.amount || 10000),
    zAmount: raw.zAmount !== undefined ? raw.zAmount : (raw.amount || 10000),
    d: Boolean(raw.d),
    z: Boolean(raw.z)
  };

  allMonthsData[mKey][day] = { ...currentDay, ...changes };
  render(); // Optimistic update

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

// Realtime Listener
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
// NAVIGASI BULAN, ANIMASI & GESTURE SWIPE
// ==========================================
function changeMonth(delta) {
  activeDate.setMonth(activeDate.getMonth() + delta);
  triggerHaptic();
  
  const dir = delta > 0 ? "next" : "prev";
  render(dir);
  showMonthToast(MONTH_NAMES[activeDate.getMonth()], activeDate.getFullYear());
}

document.getElementById("prevMonth").onclick = () => changeMonth(-1);
document.getElementById("nextMonth").onclick = () => changeMonth(1);

// Gesture Swipe Touch
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

  if (Math.abs(diffX) > 60 && Math.abs(diffX) > Math.abs(diffY)) {
    if (diffX < 0) {
      changeMonth(1);
    } else {
      changeMonth(-1);
    }
  }
}, { passive: true });

// ==========================================
// QUICK JUMP PICKER
// ==========================================
const modalJump = document.getElementById("modalJump");
const jumpMonthSelect = document.getElementById("jumpMonthSelect");
const jumpYearSelect = document.getElementById("jumpYearSelect");

MONTH_NAMES.forEach((m, idx) => {
  const opt = document.createElement("option");
  opt.value = idx;
  opt.textContent = m;
  jumpMonthSelect.appendChild(opt);
});

for (let y = 2025; y <= 2030; y++) {
  const opt = document.createElement("option");
  opt.value = y;
  opt.textContent = y;
  jumpYearSelect.appendChild(opt);
}

document.getElementById("btnOpenJumpModal").onclick = () => {
  jumpMonthSelect.value = activeDate.getMonth();
  jumpYearSelect.value = activeDate.getFullYear();
  modalJump.classList.add("active");
};

document.getElementById("btnCancelJump").onclick = () => {
  modalJump.classList.remove("active");
};

document.getElementById("btnExecuteJump").onclick = () => {
  const chosenMonth = parseInt(jumpMonthSelect.value, 10);
  const chosenYear = parseInt(jumpYearSelect.value, 10);
  
  activeDate = new Date(chosenYear, chosenMonth, 1);
  triggerHaptic();
  render("next");
  showMonthToast(MONTH_NAMES[chosenMonth], chosenYear);

  modalJump.classList.remove("active");
};

// ==========================================
// FITUR EKSPOR LAPORAN PDF DENGAN RENTANG BULAN
// ==========================================
const modalExport = document.getElementById("modalExport");
const exportStartMonth = document.getElementById("exportStartMonth");
const exportStartYear = document.getElementById("exportStartYear");
const exportEndMonth = document.getElementById("exportEndMonth");
const exportEndYear = document.getElementById("exportEndYear");

// Isi Dropdown Opsi Export
function populateExportDropdowns() {
  exportStartMonth.innerHTML = "";
  exportEndMonth.innerHTML = "";
  exportStartYear.innerHTML = "";
  exportEndYear.innerHTML = "";

  MONTH_NAMES.forEach((m, idx) => {
    exportStartMonth.appendChild(new Option(m, idx));
    exportEndMonth.appendChild(new Option(m, idx));
  });

  for (let y = 2025; y <= 2030; y++) {
    exportStartYear.appendChild(new Option(y, y));
    exportEndYear.appendChild(new Option(y, y));
  }

  // Default: dari Januari tahun aktif s/d Bulan aktif
  exportStartMonth.value = 0;
  exportStartYear.value = activeDate.getFullYear();
  exportEndMonth.value = activeDate.getMonth();
  exportEndYear.value = activeDate.getFullYear();
}

document.getElementById("btnOpenExportModal").onclick = () => {
  populateExportDropdowns();
  modalExport.classList.add("active");
};

document.getElementById("btnCancelExport").onclick = () => {
  modalExport.classList.remove("active");
};

// Eksekusi Pembuatan PDF
document.getElementById("btnExecuteExport").onclick = async () => {
  const startM = parseInt(exportStartMonth.value, 10);
  const startY = parseInt(exportStartYear.value, 10);
  const endM = parseInt(exportEndMonth.value, 10);
  const endY = parseInt(exportEndYear.value, 10);

  const startDate = new Date(startY, startM, 1);
  const endDate = new Date(endY, endM, 1);

  if (startDate > endDate) {
    alert("Bulan mulai tidak boleh lebih besar dari bulan akhir!");
    return;
  }

  const btnText = document.getElementById("btnExportText");
  btnText.textContent = "Sedang Memproses...";

  // Siapkan Template HTML Khusus PDF
  const container = document.getElementById("pdfExportContainer");
  container.innerHTML = "";

  let grandD = 0;
  let grandZ = 0;
  let monthlyBlocksHTML = "";

  let cursor = new Date(startDate);
  while (cursor <= endDate) {
    const curY = cursor.getFullYear();
    const curM = cursor.getMonth();
    const mKey = `${curY}-${String(curM + 1).padStart(2, "0")}`;
    const mData = allMonthsData[mKey] || {};
    const daysInMonth = new Date(curY, curM + 1, 0).getDate();

    let mTotalD = 0;
    let mTotalZ = 0;
    let rowsHTML = "";

    for (let d = 1; d <= daysInMonth; d++) {
      const item = mData[d] || {};
      const dAmt = item.dAmount !== undefined ? item.dAmount : (item.amount || 10000);
      const zAmt = item.zAmount !== undefined ? item.zAmount : (item.amount || 10000);
      const isD = Boolean(item.d);
      const isZ = Boolean(item.z);

      if (isD) mTotalD += dAmt;
      if (isZ) mTotalZ += zAmt;

      const dailySum = (isD ? dAmt : 0) + (isZ ? zAmt : 0);

      rowsHTML += `
        <tr>
          <td>${d} ${MONTH_NAMES[curM].substring(0,3)}</td>
          <td class="${isD ? 'filled' : ''}">${isD ? rupiah(dAmt) + ' (✓)' : '-'}</td>
          <td class="${isZ ? 'filled' : ''}">${isZ ? rupiah(zAmt) + ' (✓)' : '-'}</td>
          <td><b>${rupiah(dailySum)}</b></td>
        </tr>
      `;
    }

    grandD += mTotalD;
    grandZ += mTotalZ;

    monthlyBlocksHTML += `
      <div class="pdf-month-block">
        <div class="pdf-month-title">
          <span>📅 ${MONTH_NAMES[curM]} ${curY}</span>
          <span>Dewi: ${rupiah(mTotalD)} | Zhian: ${rupiah(mTotalZ)} | Subtotal: ${rupiah(mTotalD + mTotalZ)}</span>
        </div>
        <table class="pdf-table">
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Setoran Dewi</th>
              <th>Setoran Zhian</th>
              <th>Total Hari Ini</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHTML}
          </tbody>
        </table>
      </div>
    `;

    cursor.setMonth(cursor.getMonth() + 1);
  }

  const todayStr = new Date().toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' });

  container.innerHTML = `
    <div class="pdf-document">
      <div class="pdf-header">
        <h2>💜 LAPORAN TABUNGAN PERNIKAHAN DEWI & ZHIAN</h2>
        <p>Periode: <b>${MONTH_NAMES[startM]} ${startY}</b> s/d <b>${MONTH_NAMES[endM]} ${endY}</b> • Dicetak pada: ${todayStr}</p>
      </div>

      <div class="pdf-grand-summary">
        <div class="pdf-summary-item">
          <strong>TOTAL SETORAN DEWI</strong>
          <span>${rupiah(grandD)}</span>
        </div>
        <div class="pdf-summary-item">
          <strong>TOTAL SETORAN ZHIAN</strong>
          <span>${rupiah(grandZ)}</span>
        </div>
        <div class="pdf-summary-item highlight">
          <strong>GRAND TOTAL BERDUA</strong>
          <span>${rupiah(grandD + grandZ)}</span>
        </div>
      </div>

      ${monthlyBlocksHTML}

      <div class="pdf-footer">
        Dokumen ini dibuat otomatis oleh Sistem Tabungan Pernikahan Dewi & Zhian 💕
      </div>
    </div>
  `;

  container.style.display = "block";

  // Parameter html2pdf
  const opt = {
    margin: [10, 10, 10, 10],
    filename: `Laporan_Tabungan_Dewi_Zhian_${startY}_${endY}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  try {
    await html2pdf().set(opt).from(container.firstElementChild).save();
  } catch (err) {
    console.error("Gagal cetak PDF:", err);
    alert("Gagal men-generate PDF. Coba kembali.");
  } finally {
    container.style.display = "none";
    btnText.textContent = "Unduh PDF";
    modalExport.classList.remove("active");
  }
};

// ==========================================
// MODAL RESET DENGAN VALIDASI BERTINGKAT
// ==========================================
const modalResetMenu = document.getElementById("modalResetMenu");
const modalConfirm = document.getElementById("modalConfirm");
const typedArea = document.getElementById("typedValidationArea");
const validationInput = document.getElementById("validationInput");

let pendingResetAction = null;

document.getElementById("btnOpenResetMenu").onclick = () => modalResetMenu.classList.add("active");
document.getElementById("btnCloseResetMenu").onclick = () => modalResetMenu.classList.remove("active");

document.getElementById("btnChoiceMonth").onclick = () => {
  modalResetMenu.classList.remove("active");
  pendingResetAction = 'MONTH';
  
  document.getElementById("confirmTitle").textContent = "Konfirmasi Reset Bulan Ini";
  document.getElementById("confirmDesc").textContent = `Apakah Anda yakin ingin MENGOSONGKAN catatan di bulan ${document.getElementById("spanSelectedMonth").textContent}?`;
  typedArea.style.display = "none";
  modalConfirm.classList.add("active");
};

document.getElementById("btnChoiceAll").onclick = () => {
  modalResetMenu.classList.remove("active");
  pendingResetAction = 'ALL';
  
  document.getElementById("confirmTitle").textContent = "⚠️ PERINGATAN: RESET TOTAL";
  document.getElementById("confirmDesc").textContent = "Tindakan ini akan MENGHAPUS SEMUA DATA tabungan dari SEMUA BULAN secara permanen!";
  typedArea.style.display = "block";
  validationInput.value = "";
  modalConfirm.classList.add("active");
};

document.getElementById("btnCancelConfirm").onclick = () => {
  modalConfirm.classList.remove("active");
  pendingResetAction = null;
};

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

// Inisialisasi awal
render();

/* =========================================================
   SIM SPP - Rumah Quran Abdillah Ar-Rasyid
   ========================================================= */

const DB = {
  get(k) {
    try { return JSON.parse(localStorage.getItem(k)) || []; }
    catch { return []; }
  },
  set(k, v) { localStorage.setItem(k, JSON.stringify(v)); },
  del(k) { localStorage.removeItem(k); },
  getVal(k) { return localStorage.getItem(k); },
  setVal(k, v) { localStorage.setItem(k, v); }
};

const KEY = {
  santri: 'rqa_santri',
  spp: 'rqa_spp',
  keluar: 'rqa_keluar',
  counter: 'rqa_counter'
};

/* ============ NAVIGASI ============ */
document.querySelectorAll('.menu-item').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.menu-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    const tab = document.getElementById('tab-' + btn.dataset.tab);
    if (tab) tab.classList.add('active');

    if (btn.dataset.tab === 'dashboard') renderDashboard();
    if (btn.dataset.tab === 'santri') renderSantri();
    if (btn.dataset.tab === 'spp') { renderSpp(); isiDropdownSantri(); }
    if (btn.dataset.tab === 'pengeluaran') renderKeluar();
    if (btn.dataset.tab === 'kas') renderKas();
    if (btn.dataset.tab === 'laporan') renderLaporan();
  });
});

/* ============ UTIL ============ */
function rupiah(n) {
  return 'Rp ' + Number(n || 0).toLocaleString('id-ID');
}
function esc(str) {
  return String(str || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
function toast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast ' + type + ' show';
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
}
function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}
function monthStr(d = new Date()) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}
function bulanIndo(ym) {
  if (!ym) return '-';
  const [y, m] = ym.split('-');
  const nama = ['Januari','Februari','Maret','April','Mei','Juni',
                'Juli','Agustus','September','Oktober','November','Desember'];
  return (nama[Number(m) - 1] || m) + ' ' + y;
}

/* ============ MODAL ============ */
function bukaModal(id) {
  document.getElementById(id).classList.add('show');
  document.body.classList.add('modal-open');
}
function tutupModal(id) {
  document.getElementById(id).classList.remove('show');
  if (!document.querySelector('.modal.show')) {
    document.body.classList.remove('modal-open');
  }
}
document.querySelectorAll('.modal').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) tutupModal(m.id); });
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal.show').forEach(m => tutupModal(m.id));
  }
});

/* ============ DASHBOARD ============ */
function renderDashboard() {
  const santri = DB.get(KEY.santri).filter(s => s.status === 'aktif');
  const spp = DB.get(KEY.spp);
  const keluar = DB.get(KEY.keluar);
  const bulanIni = monthStr();

  const masukBulan = spp
    .filter(p => (p.bulan || '').startsWith(bulanIni) || (p.tanggal || '').startsWith(bulanIni))
    .reduce((a, b) => a + Number(b.nominal || 0), 0);
  const keluarBulan = keluar
    .filter(k => (k.tanggal || '').startsWith(bulanIni))
    .reduce((a, b) => a + Number(b.nominal || 0), 0);
  const totalMasuk = spp.reduce((a, b) => a + Number(b.nominal || 0), 0);
  const totalKeluar = keluar.reduce((a, b) => a + Number(b.nominal || 0), 0);

  document.getElementById('statSantri').textContent = santri.length;
  document.getElementById('statMasuk').textContent = rupiah(masukBulan);
  document.getElementById('statKeluar').textContent = rupiah(keluarBulan);
  document.getElementById('statSaldo').textContent = rupiah(totalMasuk - totalKeluar);

  const target = santri.reduce((a, s) => a + Number(s.tarif || 0), 0);
  let html = `<p>Periode: <b>${bulanIndo(bulanIni)}</b></p>`;
  html += `<div class="stats">
    <div class="stat-card"><span class="stat-label">Target SPP</span><span class="stat-value">${rupiah(target)}</span></div>
    <div class="stat-card green"><span class="stat-label">Terealisasi</span><span class="stat-value">${rupiah(masukBulan)}</span></div>
    <div class="stat-card red"><span class="stat-label">Kekurangan</span><span class="stat-value">${rupiah(Math.max(0, target - masukBulan))}</span></div>
  </div>`;

  const belum = [];
  santri.forEach(s => {
    const bayar = spp
      .filter(p => p.nis === s.nis && p.bulan === bulanIni)
      .reduce((a, b) => a + Number(b.nominal || 0), 0);
    if (bayar < s.tarif) belum.push({ ...s, bayar, sisa: s.tarif - bayar });
  });

  if (belum.length) {
    html += `<h4 style="margin:14px 0 8px;">Santri Belum Lunas (${belum.length})</h4>`;
    html += `<div class="table-wrap"><table><thead><tr>
      <th>NIS</th><th>Nama</th><th>Tarif</th><th>Dibayar</th><th>Sisa</th>
    </tr></thead><tbody>`;
    belum.slice(0, 10).forEach(s => {
      html += `<tr>
        <td>${esc(s.nis)}</td>
        <td>${esc(s.nama)}</td>
        <td>${rupiah(s.tarif)}</td>
        <td>${rupiah(s.bayar)}</td>
        <td><span class="badge tunggakan">${rupiah(s.sisa)}</span></td>
      </tr>`;
    });
    html += `</tbody></table></div>`;
    if (belum.length > 10) {
      html += `<p style="margin-top:8px;font-size:12px;">… dan ${belum.length - 10} santri lainnya</p>`;
    }
  } else if (santri.length) {
    html += `<p style="margin-top:12px;color:#0b6e4f;"><b>✅ Semua santri aktif sudah lunas bulan ini.</b></p>`;
  }

  document.getElementById('dashboardTagihan').innerHTML = html;
}

/* ============ SANTRI ============ */
function bukaFormSantri(idx = null) {
  const form = document.getElementById('formSantri');
  form.reset();
  document.getElementById('santriIndex').value = '';

  if (idx !== null && idx !== undefined) {
    const s = DB.get(KEY.santri)[idx];
    if (!s) return;
    document.getElementById('modalSantriTitle').textContent = 'Edit Santri';
    document.getElementById('santriIndex').value = idx;
    document.getElementById('santriNis').value = s.nis;
    document.getElementById('santriNama').value = s.nama;
    document.getElementById('santriWali').value = s.wali || '';
    document.getElementById('santriWa').value = s.wa || '';
    document.getElementById('santriTarif').value = s.tarif;
    document.getElementById('santriStatus').value = s.status || 'aktif';
  } else {
    document.getElementById('modalSantriTitle').textContent = 'Tambah Santri';
    document.getElementById('santriStatus').value = 'aktif';
  }

  bukaModal('modalSantri');
  setTimeout(() => document.getElementById('santriNis').focus(), 100);
}

document.getElementById('formSantri').addEventListener('submit', e => {
  e.preventDefault();
  const data = DB.get(KEY.santri);
  const idx = document.getElementById('santriIndex').value;

  const nis = document.getElementById('santriNis').value.trim();
  const nama = document.getElementById('santriNama').value.trim();

  const dup = data.findIndex((s, i) => s.nis === nis && String(i) !== String(idx));
  if (dup !== -1) { toast('NIS sudah digunakan santri lain!', 'error'); return; }

  const item = {
    nis, nama,
    wali: document.getElementById('santriWali').value.trim(),
    wa: document.getElementById('santriWa').value.trim(),
    tarif: Number(document.getElementById('santriTarif').value) || 0,
    status: document.getElementById('santriStatus').value
  };

  if (idx === '') {
    data.push(item);
    toast('Santri berhasil ditambahkan');
  } else {
    data[Number(idx)] = item;
    toast('Data santri diperbarui');
  }

  DB.set(KEY.santri, data);
  tutupModal('modalSantri');
  renderSantri();
});

function renderSantri() {
  const q = (document.getElementById('cariSantri').value || '').toLowerCase();
  const status = document.getElementById('filterStatus').value;
  const all = DB.get(KEY.santri);

  const data = all
    .map((s, i) => ({ ...s, _idx: i }))
    .filter(s => {
      if (status && s.status !== status) return false;
      if (q) {
        const hay = (s.nis + ' ' + s.nama + ' ' + (s.wali || '')).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

  document.getElementById('counterSantri').textContent = data.length + ' santri';
  const tbody = document.querySelector('#tabelSantri tbody');

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty">Belum ada data santri</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map((s, no) => `
    <tr>
      <td>${no + 1}</td>
      <td><b>${esc(s.nis)}</b></td>
      <td>${esc(s.nama)}</td>
      <td>${esc(s.wali) || '-'}</td>
      <td>${s.wa ? `<a href="https://wa.me/${esc(s.wa)}" target="_blank">${esc(s.wa)}</a>` : '-'}</td>
      <td>${rupiah(s.tarif)}</td>
      <td><span class="badge ${s.status}">${s.status}</span></td>
      <td class="no-print">
        <button class="btn-icon edit" title="Edit" onclick="bukaFormSantri(${s._idx})">✏️</button>
        <button class="btn-icon print" title="Kartu SPP" onclick="kartuSantri(${s._idx})">🧾</button>
        <button class="btn-icon delete" title="Hapus" onclick="hapusSantri(${s._idx})">🗑️</button>
      </td>
    </tr>
  `).join('');
}

function hapusSantri(idx) {
  const s = DB.get(KEY.santri)[idx];
  if (!s) return;
  if (!confirm(`Hapus santri "${s.nama}" (${s.nis})?\n\nRiwayat SPP santri ini juga akan dihapus.`)) return;

  const santri = DB.get(KEY.santri);
  santri.splice(idx, 1);
  DB.set(KEY.santri, santri);

  const spp = DB.get(KEY.spp).filter(p => p.nis !== s.nis);
  DB.set(KEY.spp, spp);

  toast('Santri dihapus');
  renderSantri();
}

function kartuSantri(idx) {
  const s = DB.get(KEY.santri)[idx];
  if (!s) return;
  const riwayat = DB.get(KEY.spp)
    .filter(p => p.nis === s.nis)
    .sort((a, b) => (a.tanggal || '').localeCompare(b.tanggal || ''));
  const total = riwayat.reduce((a, b) => a + Number(b.nominal || 0), 0);

  document.getElementById('kwitansiArea').innerHTML = `
    <h3>KARTU SPP SANTRI</h3>
    <p class="sub">Rumah Quran Abdillah Ar-Rasyid</p>
    <hr>
    <div class="row"><span class="lbl">NIS</span><span><b>${esc(s.nis)}</b></span></div>
    <div class="row"><span class="lbl">Nama</span><span>${esc(s.nama)}</span></div>
    <div class="row"><span class="lbl">Wali</span><span>${esc(s.wali) || '-'}</span></div>
    <div class="row"><span class="lbl">Tarif SPP</span><span>${rupiah(s.tarif)} / bulan</span></div>
    <div class="row"><span class="lbl">Status</span><span>${esc(s.status)}</span></div>
    <hr>
    <p><b>Riwayat Pembayaran:</b></p>
    ${riwayat.length ? `
      <table style="width:100%;font-size:11px;font-family:inherit;">
        <thead><tr><th>Tgl</th><th>Bulan</th><th>Nominal</th></tr></thead>
        <tbody>
          ${riwayat.map(r => `<tr>
            <td>${r.tanggal}</td>
            <td>${bulanIndo(r.bulan)}</td>
            <td>${rupiah(r.nominal)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    ` : '<p style="color:#888;font-style:italic;">Belum ada pembayaran</p>'}
    <div class="amount">Total Dibayar: ${rupiah(total)}</div>
    <div class="sign">
      <p>Petugas,</p><br><br><br>
      <p>____________________</p>
    </div>
  `;
  bukaModal('modalKwitansi');
}

/* ============ SPP ============ */
function isiDropdownSantri() {
  const data = DB.get(KEY.santri).filter(s => s.status === 'aktif');
  const sel = document.getElementById('sppNis');
  const cur = sel.value;
  sel.innerHTML = '<option value="">-- Pilih Santri --</option>' +
    data.map(s => `<option value="${esc(s.nis)}">${esc(s.nis)} - ${esc(s.nama)}</option>`).join('');
  if (cur) sel.value = cur;
}

function bukaFormSpp() {
  isiDropdownSantri();
  document.getElementById('formSpp').reset();
  document.getElementById('sppBulan').value = monthStr();
  bukaModal('modalSpp');
}

document.getElementById('formSpp').addEventListener('submit', e => {
  e.preventDefault();
  const nis = document.getElementById('sppNis').value;
  if (!nis) { toast('Pilih santri dulu', 'error'); return; }

  const santri = DB.get(KEY.santri).find(s => s.nis === nis);
  if (!santri) { toast('Santri tidak ditemukan', 'error'); return; }

  const data = DB.get(KEY.spp);
  const counter = Number(DB.getVal(KEY.counter) || 0) + 1;
  DB.setVal(KEY.counter, counter);

  const now = new Date();
  const noKwitansi = `SPP/RQA/${now.getFullYear()}/${String(counter).padStart(4, '0')}`;

  const item = {
    id: counter,
    tanggal: todayStr(),
    noKwitansi,
    nis: santri.nis,
    nama: santri.nama,
    bulan: document.getElementById('sppBulan').value,
    nominal: Number(document.getElementById('sppNominal').value) || 0,
    metode: document.getElementById('sppMetode').value,
    keterangan: document.getElementById('sppKeterangan').value.trim()
  };

  data.push(item);
  DB.set(KEY.spp, data);
  tutupModal('modalSpp');
  toast('Pembayaran tersimpan');
  renderSpp();
  tampilKwitansiSpp(item);
});

function renderSpp() {
  const q = (document.getElementById('cariSpp').value || '').toLowerCase();
  const bulan = document.getElementById('filterBulanSpp').value;
  const metode = document.getElementById('filterMetode').value;

  const data = DB.get(KEY.spp)
    .filter(p => {
      if (bulan && p.bulan !== bulan) return false;
      if (metode && p.metode !== metode) return false;
      if (q) {
        const hay = (p.nis + ' ' + (p.nama || '') + ' ' + (p.noKwitansi || '')).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));

  document.getElementById('counterSpp').textContent = data.length + ' transaksi';
  const tbody = document.querySelector('#tabelSpp tbody');

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty">Belum ada transaksi SPP</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(p => `
    <tr>
      <td>${p.tanggal}</td>
      <td><small>${esc(p.noKwitansi)}</small></td>
      <td>${esc(p.nis)}</td>
      <td>${esc(p.nama)}</td>
      <td>${bulanIndo(p.bulan)}</td>
      <td><b>${rupiah(p.nominal)}</b></td>
      <td>${esc(p.metode)}</td>
      <td class="no-print">
        <button class="btn-icon print" title="Kwitansi" onclick="cetakUlang(${p.id})">🧾</button>
        <button class="btn-icon delete" title="Hapus" onclick="hapusSpp(${p.id})">🗑️</button>
      </td>
    </tr>
  `).join('');
}

function hapusSpp(id) {
  const p = DB.get(KEY.spp).find(x => x.id === id);
  if (!p) return;
  if (!confirm(`Hapus pembayaran ${p.noKwitansi}?\n\n${p.nama} - ${bulanIndo(p.bulan)} - ${rupiah(p.nominal)}`)) return;
  DB.set(KEY.spp, DB.get(KEY.spp).filter(x => x.id !== id));
  toast('Pembayaran dihapus');
  renderSpp();
}

function cetakUlang(id) {
  const p = DB.get(KEY.spp).find(x => x.id === id);
  if (p) tampilKwitansiSpp(p);
}

function tampilKwitansiSpp(p) {
  document.getElementById('kwitansiArea').innerHTML = `
    <h3>KWITANSI PEMBAYARAN SPP</h3>
    <p class="sub">Rumah Quran Abdillah Ar-Rasyid</p>
    <hr>
    <div class="row"><span class="lbl">No. Kwitansi</span><span><b>${esc(p.noKwitansi)}</b></span></div>
    <div class="row"><span class="lbl">Tanggal</span><span>${p.tanggal}</span></div>
    <hr>
    <div class="row"><span class="lbl">NIS</span><span>${esc(p.nis)}</span></div>
    <div class="row"><span class="lbl">Nama Santri</span><span><b>${esc(p.nama)}</b></span></div>
    <div class="row"><span class="lbl">Pembayaran SPP</span><span>${bulanIndo(p.bulan)}</span></div>
    <div class="row"><span class="lbl">Metode</span><span>${esc(p.metode)}</span></div>
    ${p.keterangan ? `<div class="row"><span class="lbl">Keterangan</span><span>${esc(p.keterangan)}</span></div>` : ''}
    <div class="amount">${rupiah(p.nominal)}</div>
    <div class="sign">
      <p>Petugas,</p><br><br><br>
      <p>____________________</p>
    </div>
  `;
  bukaModal('modalKwitansi');
}

/* ============ PENGELUARAN ============ */
function bukaFormKeluar(idx = null) {
  document.getElementById('formKeluar').reset();
  document.getElementById('keluarIndex').value = '';

  if (idx !== null && idx !== undefined) {
    const k = DB.get(KEY.keluar)[idx];
    if (!k) return;
    document.getElementById('modalKeluarTitle').textContent = 'Edit Pengeluaran';
    document.getElementById('keluarIndex').value = idx;
    document.getElementById('keluarTanggal').value = k.tanggal;
    document.getElementById('keluarKategori').value = k.kategori;
    document.getElementById('keluarUraian').value = k.uraian;
    document.getElementById('keluarNominal').value = k.nominal;
  } else {
    document.getElementById('modalKeluarTitle').textContent = 'Tambah Pengeluaran';
    document.getElementById('keluarTanggal').value = todayStr();
  }
  bukaModal('modalKeluar');
}

document.getElementById('formKeluar').addEventListener('submit', e => {
  e.preventDefault();
  const data = DB.get(KEY.keluar);
  const idx = document.getElementById('keluarIndex').value;

  const item = {
    tanggal: document.getElementById('keluarTanggal').value,
    kategori: document.getElementById('keluarKategori').value,
    uraian: document.getElementById('keluarUraian').value.trim(),
    nominal: Number(document.getElementById('keluarNominal').value) || 0
  };

  if (idx === '') {
    data.push(item);
    toast('Pengeluaran ditambahkan');
  } else {
    data[Number(idx)] = item;
    toast('Pengeluaran diperbarui');
  }

  DB.set(KEY.keluar, data);
  tutupModal('modalKeluar');
  renderKeluar();
});

function renderKeluar() {
  const q = (document.getElementById('cariKeluar').value || '').toLowerCase();
  const bulan = document.getElementById('filterBulanKeluar').value;
  const kategori = document.getElementById('filterKategoriKeluar').value;

  const data = DB.get(KEY.keluar)
    .map((k, i) => ({ ...k, _idx: i }))
    .filter(k => {
      if (bulan && !(k.tanggal || '').startsWith(bulan)) return false;
      if (kategori && k.kategori !== kategori) return false;
      if (q && !(k.uraian || '').toLowerCase().includes(q)) return false;
      return true;
    })
    .sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));

  document.getElementById('counterKeluar').textContent = data.length + ' transaksi';
  const tbody = document.querySelector('#tabelKeluar tbody');

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty">Belum ada pengeluaran</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(k => `
    <tr>
      <td>${k.tanggal}</td>
      <td>${esc(k.kategori)}</td>
      <td>${esc(k.uraian)}</td>
      <td><b>${rupiah(k.nominal)}</b></td>
      <td class="no-print">
        <button class="btn-icon edit" title="Edit" onclick="bukaFormKeluar(${k._idx})">✏️</button>
        <button class="btn-icon delete" title="Hapus" onclick="hapusKeluar(${k._idx})">🗑️</button>
      </td>
    </tr>
  `).join('');
}

function hapusKeluar(idx) {
  const k = DB.get(KEY.keluar)[idx];
  if (!k) return;
  if (!confirm(`Hapus pengeluaran "${k.uraian}" (${rupiah(k.nominal)})?`)) return;
  const data = DB.get(KEY.keluar);
  data.splice(idx, 1);
  DB.set(KEY.keluar, data);
  toast('Pengeluaran dihapus');
  renderKeluar();
}

/* ============ KAS UMUM ============ */
function renderKas() {
  const bulan = document.getElementById('filterBulanKas').value;

  const spp = DB.get(KEY.spp).map(p => ({
    tanggal: p.tanggal,
    uraian: `SPP ${p.nama} (${bulanIndo(p.bulan)})`,
    kategori: 'SPP',
    masuk: Number(p.nominal || 0),
    keluar: 0
  }));

  const keluar = DB.get(KEY.keluar).map(k => ({
    tanggal: k.tanggal,
    uraian: k.uraian,
    kategori: k.kategori,
    masuk: 0,
    keluar: Number(k.nominal || 0)
  }));

  let semua = [...spp, ...keluar]
    .sort((a, b) => (a.tanggal || '').localeCompare(b.tanggal || ''));
  if (bulan) semua = semua.filter(t => (t.tanggal || '').startsWith(bulan));

  let saldo = 0;
  const rows = semua.map(t => {
    saldo += t.masuk - t.keluar;
    return { ...t, saldo };
  });

  const totalMasuk = semua.reduce((a, b) => a + b.masuk, 0);
  const totalKeluar = semua.reduce((a, b) => a + b.keluar, 0);

  document.getElementById('kasMasuk').textContent = rupiah(totalMasuk);
  document.getElementById('kasKeluar').textContent = rupiah(totalKeluar);
  document.getElementById('kasSaldo').textContent = rupiah(totalMasuk - totalKeluar);

  const tbody = document.querySelector('#tabelKas tbody');
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty">Belum ada mutasi kas</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(t => `
    <tr>
      <td>${t.tanggal}</td>
      <td>${esc(t.uraian)}</td>
      <td>${esc(t.kategori)}</td>
      <td style="color:#0b6e4f;">${t.masuk ? rupiah(t.masuk) : '-'}</td>
      <td style="color:#dc2626;">${t.keluar ? rupiah(t.keluar) : '-'}</td>
      <td><b>${rupiah(t.saldo)}</b></td>
    </tr>
  `).join('');
}

/* ============ LAPORAN ============ */
let __lapData = [];

function renderLaporan() {
  let bulan = document.getElementById('lapBulan').value;
  if (!bulan) { bulan = monthStr(); document.getElementById('lapBulan').value = bulan; }

  const santri = DB.get(KEY.santri).filter(s => s.status === 'aktif');
  const spp = DB.get(KEY.spp);

  let totalTarget = 0, totalBayar = 0, countLunas = 0, countTunggakan = 0;
  __lapData = [];

  const rows = santri.map(s => {
    const bayar = spp
      .filter(p => p.nis === s.nis && p.bulan === bulan)
      .reduce((a, b) => a + Number(b.nominal || 0), 0);
    const sisa = Math.max(0, s.tarif - bayar);
    totalTarget += Number(s.tarif || 0);
    totalBayar += bayar;
    if (sisa <= 0) countLunas++; else countTunggakan++;

    const row = { nis: s.nis, nama: s.nama, wali: s.wali, tarif: s.tarif, bayar, sisa };
    __lapData.push(row);
    return row;
  });

  document.getElementById('lapStats').innerHTML = `
    <div class="stat-card"><span class="stat-label">Santri Aktif</span><span class="stat-value">${rows.length}</span></div>
    <div class="stat-card green"><span class="stat-label">Lunas</span><span class="stat-value">${countLunas}</span></div>
    <div class="stat-card red"><span class="stat-label">Tunggakan</span><span class="stat-value">${countTunggakan}</span></div>
    <div class="stat-card blue"><span class="stat-label">Realisasi</span><span class="stat-value">${rupiah(totalBayar)}</span></div>
    <div class="stat-card gold"><span class="stat-label">Target</span><span class="stat-value">${rupiah(totalTarget)}</span></div>
  `;

  let html = `<p style="margin:14px 0;">Periode: <b>${bulanIndo(bulan)}</b></p>`;
  html += `<div class="table-wrap"><table><thead><tr>
    <th>No</th><th>NIS</th><th>Nama</th><th>Wali</th>
    <th>Tarif</th><th>Dibayar</th><th>Sisa</th><th>Status</th>
  </tr></thead><tbody>`;

  if (!rows.length) {
    html += `<tr><td colspan="8" class="empty">Tidak ada santri aktif</td></tr>`;
  } else {
    rows.forEach((r, i) => {
      const status = r.sisa <= 0
        ? `<span class="badge lunas">Lunas</span>`
        : (r.bayar > 0
            ? `<span class="badge sebagian">Sebagian</span>`
            : `<span class="badge tunggakan">Belum Bayar</span>`);
      html += `<tr>
        <td>${i + 1}</td>
        <td>${esc(r.nis)}</td>
        <td>${esc(r.nama)}</td>
        <td>${esc(r.wali) || '-'}</td>
        <td>${rupiah(r.tarif)}</td>
        <td>${rupiah(r.bayar)}</td>
        <td>${r.sisa > 0 ? rupiah(r.sisa) : '-'}</td>
        <td>${status}</td>
      </tr>`;
    });
  }
  html += `</tbody></table></div>`;
  document.getElementById('hasilLaporan').innerHTML = html;
}

function exportLaporanCsv() {
  if (!__lapData.length) { toast('Tampilkan laporan dulu', 'error'); return; }
  const bulan = document.getElementById('lapBulan').value;
  const rows = [['NIS','Nama','Wali','Tarif','Dibayar','Sisa','Status']];
  __lapData.forEach(r => rows.push([
    r.nis, r.nama, r.wali || '', r.tarif, r.bayar, r.sisa,
    r.sisa <= 0 ? 'Lunas' : (r.bayar > 0 ? 'Sebagian' : 'Belum Bayar')
  ]));
  downloadCsv(`laporan-spp-${bulan}.csv`, rows);
}

/* ============ BACKUP ============ */
function exportData() {
  const data = {
    versi: 1,
    tanggal: new Date().toISOString(),
    santri: DB.get(KEY.santri),
    spp: DB.get(KEY.spp),
    keluar: DB.get(KEY.keluar),
    counter: DB.getVal(KEY.counter)
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `backup-rqa-${todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast('Backup berhasil diunduh');
}

function exportSemuaCsv() {
  const santri = DB.get(KEY.santri);
  if (!santri.length) { toast('Belum ada data santri', 'error'); return; }
  const rows = [['NIS','Nama','Wali','WA','Tarif','Status']];
  santri.forEach(s => rows.push([s.nis, s.nama, s.wali || '', s.wa || '', s.tarif, s.status]));
  downloadCsv(`data-santri-${todayStr()}.csv`, rows);
}

function downloadCsv(filename, rows) {
  const csv = rows.map(r =>
    r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')
  ).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!confirm('Data saat ini akan DIGANTI dengan data dari file.\n\nLanjutkan?')) {
        e.target.value = '';
        return;
      }
      DB.set(KEY.santri, data.santri || []);
      DB.set(KEY.spp, data.spp || []);
      DB.set(KEY.keluar, data.keluar || []);
      if (data.counter) DB.setVal(KEY.counter, data.counter);
      toast('Import berhasil!');
      setTimeout(() => location.reload(), 700);
    } catch {
      toast('File tidak valid', 'error');
      e.target.value = '';
    }
  };
  reader.readAsText(file);
}

function hapusSemua() {
  if (!confirm('⚠️ YAKIN hapus SEMUA data?\n\nSemua data santri, SPP, dan pengeluaran akan hilang permanen.')) return;
  if (!confirm('Konfirmasi terakhir: HAPUS SEMUA DATA?')) return;
  Object.values(KEY).forEach(k => DB.del(k));
  toast('Semua data dihapus');
  setTimeout(() => location.reload(), 700);
}

/* ============ INIT ============ */
function init() {
  document.getElementById('lapBulan').value = monthStr();
  renderDashboard();
  renderSantri();
  isiDropdownSantri();
  renderSpp();
  renderKeluar();
}
init();
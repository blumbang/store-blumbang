const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));
const fs = require('fs');
const path = require('path');

const SHEET_ID = process.env.SHEET_ID || '1EAFENHxHio65Dib5bTCkhPJzDZ7FiYG0ESP2ed8_Vm0';

async function fetchSheet(sheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(url);
  const txt = await res.text();
  const m = txt.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\)/);
  if (!m) return [];
  const table = JSON.parse(m[1]).table;
  if (!table || !table.rows) return [];

  let headers = table.cols ? table.cols.map(c => (c.label || '').trim()) : [];
  let dataRows = table.rows;

  if (headers.every(h => !h)) {
    if (!dataRows.length) return [];
    headers = dataRows[0].c.map(c => c ? String(c.v || '').trim() : '');
    dataRows = dataRows.slice(1);
  }

  return dataRows.map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      if (!h) return;
      obj[h] = row.c && row.c[i] ? String(row.c[i].v || '').trim() : '';
    });
    return obj;
  }).filter(r => r.slug && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(r.slug.trim()));
}

function driveThumb(url) {
  if (!url || !url.trim()) return '';
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w800`;
  const m2 = url.match(/id=([a-zA-Z0-9_-]+)/);
  if (m2) return `https://drive.google.com/thumbnail?id=${m2[1]}&sz=w800`;
  return url;
}

function formatHarga(angka) {
  if (!angka) return '—';
  const n = parseInt(String(angka).replace(/\D/g, ''));
  if (isNaN(n)) return angka;
  return 'Rp ' + n.toLocaleString('id-ID');
}

function fieldRow(key, val) {
  if (!val || !val.trim()) return '';
  return `<div class="field-row">
    <div class="field-key">${key}</div>
    <div class="field-val">${val}</div>
  </div>`;
}

function buildLembarHTML(p, c) {
  const nama = p.nama || c.slug || '';
  const kategori = p.kategori || '';
  const harga = formatHarga(p.harga);
  const status = (p.status || 'po').toLowerCase();
  const statusKelas = status.includes('ready') ? 'ready' : status.includes('habis') ? 'habis' : 'po';
  const statusTeks = status.includes('ready') ? 'Ready Stock' : status.includes('habis') ? 'Habis' : 'Pre-Order';
  const tipe = kategori.toLowerCase().includes('batik') ? 'batik' : 'sablon';

  const fotos = [p.foto1, p.foto2, p.foto3].filter(f => f && f.trim());
  const thumb = fotos.length ? driveThumb(fotos[0]) : '';

  const waMsg = encodeURIComponent(`Halo, saya tertarik dengan produk *${nama}* dari Lembar Blumbang. Boleh info lebih lanjut?`);
  const waLink = `https://wa.me/6281234561146?text=${waMsg}`;

  // FOTO HERO
  const fotoHeroHTML = fotos.length
    ? fotos.map((f, i) =>
        `<img src="${driveThumb(f)}" alt="${nama} foto ${i+1}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:${i===0?'.85':'0'};transition:opacity .4s;" id="foto-${i}" loading="${i===0?'eager':'lazy'}">`
      ).join('')
    : `<div class="hero-foto-no-foto"><div class="icon">✦</div><p>Foto segera hadir</p></div>`;

  const fotoDots = fotos.length > 1
    ? fotos.map((_, i) => `<div class="foto-dot ${i===0?'aktif':''}" onclick="gantiFoto(${i})" id="dot-${i}"></div>`).join('')
    : '';

  // ASAL USUL
  let asalHTML = '';
  if (tipe === 'sablon') {
    asalHTML += fieldRow('Desain', c.deskripsi_desain);
    asalHTML += fieldRow('Desainer', c.desainer);
    asalHTML += fieldRow('Sablon', c.pengerjaan_sablon);
    asalHTML += fieldRow('Dibuat di', c.lokasi);
    asalHTML += fieldRow('Selesai', c.tanggal_selesai);
  } else {
    asalHTML += fieldRow('Desain', c.deskripsi_desain);
    asalHTML += fieldRow('Desainer', c.desainer);
    asalHTML += fieldRow('Penjahit', c.penjahit);
    asalHTML += fieldRow('Asal Batik', c.asal_kain_batik);
    asalHTML += fieldRow('Dibuat di', c.lokasi);
    asalHTML += fieldRow('Selesai', c.tanggal_selesai);
  }

  // PROSES
  let prosesHTML = '';
  if (tipe === 'sablon') {
    prosesHTML += fieldRow('Waktu desain', c.waktu_desain);
    prosesHTML += fieldRow('Pengerjaan', c.waktu_pengerjaan);
    prosesHTML += fieldRow('Teknik', c.teknik);
    prosesHTML += fieldRow('Bahan kaos', c.bahan_kaos);
    prosesHTML += fieldRow('Tinta', c.bahan_tinta);
  } else {
    prosesHTML += fieldRow('Pengerjaan', c.waktu_pengerjaan);
    prosesHTML += fieldRow('Teknik jahit', c.teknik_jahit);
    prosesHTML += fieldRow('Bahan kaos', c.bahan_kaos);
    prosesHTML += fieldRow('Bahan batik', c.bahan_batik);
  }

  // GALERI
  const galeriHTML = fotos.length
    ? fotos.map(f => `<div class="galeri-item" onclick="bukaLightbox('${driveThumb(f)}')"><img src="${driveThumb(f)}" alt="${nama}" loading="lazy"></div>`).join('')
      + Array(Math.max(0, 3 - fotos.length)).fill('<div class="galeri-item kosong"><span>✦</span></div>').join('')
    : '';

  // SPESIFIKASI
  const ukuranTags = c.ukuran
    ? c.ukuran.split('/').map(u => `<div class="ukuran-tag">${u.trim()}</div>`).join('')
    : '';

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${nama} · Blumbang</title>
<meta name="description" content="${c.teks_makna || `${nama} — ${kategori} dari Workshop Blumbang ID, Jeto, Klaten.`}">
<link rel="canonical" href="https://lembar.blumbang.id/${p.slug}">
<meta property="og:title" content="${nama} · Blumbang">
<meta property="og:description" content="${c.teks_makna || `${nama} dari Blumbang ID, Klaten.`}">
<meta property="og:url" content="https://lembar.blumbang.id/${p.slug}">
<meta property="og:type" content="product">
${thumb ? `<meta property="og:image" content="${thumb}">` : ''}
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Montserrat:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
html{scroll-behavior:smooth;}
:root{
  --hitam:#080808;--abu:#111111;--abu2:#1a1a1a;
  --border:#252525;--redup:#555;--dim:#888;--terang:#ccc;--putih:#F5F0E8;
  --emas:#C9A84C;--emas-dim:#7a6028;--emas-bg:#0e0900;
  --fd:'Bebas Neue',sans-serif;--fp:'Playfair Display',serif;--fb:'Montserrat',sans-serif;
}
body{background:var(--hitam);color:var(--putih);font-family:var(--fb);overflow-x:hidden;min-height:100vh;}
body::after{content:'';position:fixed;inset:0;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E");pointer-events:none;z-index:9999;}
nav{position:fixed;top:0;left:0;right:0;z-index:200;display:flex;align-items:center;justify-content:space-between;padding:16px 40px;background:rgba(8,8,8,.97);border-bottom:1px solid var(--border);}
.nav-brand{font-family:var(--fd);font-size:1.4rem;letter-spacing:.15em;color:var(--emas);text-decoration:none;}
.nav-back{font-family:var(--fb);font-size:.7rem;font-weight:600;letter-spacing:.2em;color:var(--dim);text-decoration:none;text-transform:uppercase;transition:color .2s;}
.nav-back:hover{color:var(--emas);}
.nav-hamburger{display:none;background:none;border:none;color:var(--emas);font-size:1.4rem;cursor:pointer;}
.nav-mobile{display:none;position:fixed;top:57px;left:0;right:0;background:var(--abu);border-bottom:1px solid var(--border);z-index:199;flex-direction:column;padding:16px 20px;gap:4px;}
.nav-mobile.open{display:flex;}
.nav-mobile a{font-family:var(--fb);font-size:.8rem;font-weight:500;letter-spacing:.12em;color:var(--terang);text-decoration:none;padding:10px 0;border-bottom:1px solid var(--border);text-transform:uppercase;}
.nav-mobile a:last-child{border:none;color:var(--emas);}
#main{padding-top:57px;}
.hero{display:grid;grid-template-columns:1fr 1fr;min-height:90vh;border-bottom:1px solid var(--border);}
.hero-kiri{display:flex;flex-direction:column;justify-content:flex-end;padding:60px 48px;background:var(--abu);border-right:1px solid var(--border);position:relative;overflow:hidden;}
.hero-kiri::before{content:'';position:absolute;top:-40%;left:-20%;width:80%;height:80%;background:radial-gradient(ellipse,rgba(201,168,76,.04) 0%,transparent 70%);pointer-events:none;}
.hero-nomor{font-family:var(--fd);font-size:8rem;color:var(--border);letter-spacing:-.02em;line-height:1;margin-bottom:-16px;user-select:none;}
.hero-kategori{font-family:var(--fb);font-size:.62rem;font-weight:600;letter-spacing:.4em;color:var(--emas);text-transform:uppercase;margin-bottom:12px;}
.hero-nama{font-family:var(--fp);font-size:clamp(2.8rem,5vw,4.5rem);line-height:1.05;color:var(--putih);margin-bottom:20px;font-style:italic;}
.hero-status{display:inline-flex;align-items:center;gap:8px;font-family:var(--fb);font-size:.65rem;font-weight:700;letter-spacing:.25em;text-transform:uppercase;padding:8px 16px;border:1px solid;}
.hero-status.po{border-color:var(--emas);color:var(--emas);}
.hero-status.ready{border-color:#4a7c54;color:#4a7c54;}
.hero-status.habis{border-color:var(--redup);color:var(--redup);}
.hero-status::before{content:'';width:5px;height:5px;border-radius:50%;background:currentColor;}
.hero-harga{font-family:var(--fd);font-size:2rem;letter-spacing:.08em;color:var(--putih);margin-top:20px;}
.hero-tombol{margin-top:28px;display:flex;gap:12px;flex-wrap:wrap;}
.btn-order{display:inline-flex;align-items:center;gap:8px;background:var(--emas);color:var(--hitam);font-family:var(--fb);font-size:.7rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;padding:13px 28px;text-decoration:none;transition:all .2s;}
.btn-order:hover{background:var(--putih);}
.hero-kanan{position:relative;overflow:hidden;background:var(--hitam);}
.hero-foto-wrap{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;}
.hero-foto-nav{position:absolute;bottom:20px;left:50%;transform:translateX(-50%);display:flex;gap:6px;z-index:10;}
.foto-dot{width:6px;height:6px;border-radius:50%;background:rgba(201,168,76,.3);border:1px solid var(--emas-dim);cursor:pointer;transition:all .2s;}
.foto-dot.aktif{background:var(--emas);width:20px;border-radius:3px;}
.hero-foto-no-foto{display:flex;align-items:center;justify-content:center;height:100%;flex-direction:column;gap:12px;color:var(--redup);}
.hero-foto-no-foto .icon{font-size:3rem;opacity:.3;}
.hero-foto-no-foto p{font-family:var(--fb);font-size:.65rem;letter-spacing:.2em;text-transform:uppercase;opacity:.4;}
.garis{height:1px;background:var(--border);}
.konten{max-width:1100px;margin:0 auto;padding:0 40px;}
.sec{padding:64px 0;border-bottom:1px solid var(--border);}
.sec-wrap{display:grid;grid-template-columns:200px 1fr;gap:48px;align-items:start;}
.sec-nomor{font-family:var(--fd);font-size:4rem;color:var(--border);letter-spacing:-.02em;line-height:1;}
.sec-label{font-family:var(--fb);font-size:.6rem;font-weight:600;letter-spacing:.35em;color:var(--emas);text-transform:uppercase;margin-top:6px;}
.sec-isi{display:flex;flex-direction:column;gap:28px;}
.field-row{display:grid;grid-template-columns:160px 1fr;gap:16px;align-items:baseline;}
.field-key{font-family:var(--fb);font-size:.65rem;font-weight:600;letter-spacing:.2em;color:var(--redup);text-transform:uppercase;}
.field-val{font-family:var(--fb);font-size:.9rem;color:var(--putih);line-height:1.7;}
.makna-teks{font-family:var(--fp);font-size:clamp(1.1rem,2vw,1.4rem);line-height:1.9;color:var(--terang);font-style:italic;border-left:2px solid var(--emas-dim);padding-left:28px;}
.galeri{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--border);}
.galeri-item{aspect-ratio:1;overflow:hidden;background:var(--abu);cursor:pointer;position:relative;}
.galeri-item img{width:100%;height:100%;object-fit:cover;transition:transform .4s,opacity .3s;}
.galeri-item:hover img{transform:scale(1.04);opacity:.8;}
.galeri-item.kosong{display:flex;align-items:center;justify-content:center;color:var(--border);}
.galeri-item.kosong span{font-size:1.5rem;opacity:.3;}
.spec-grid{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--border);}
.spec-item{background:var(--abu);padding:20px 24px;}
.spec-key{font-family:var(--fb);font-size:.6rem;font-weight:600;letter-spacing:.25em;color:var(--emas);text-transform:uppercase;margin-bottom:8px;}
.spec-val{font-family:var(--fb);font-size:.85rem;color:var(--putih);line-height:1.6;}
.ukuran-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;}
.ukuran-tag{font-family:var(--fd);font-size:.9rem;letter-spacing:.08em;padding:5px 12px;border:1px solid var(--border);color:var(--terang);}
.cta-bawah{padding:64px 0;text-align:center;}
.cta-judul{font-family:var(--fp);font-size:clamp(1.5rem,3vw,2.2rem);font-style:italic;color:var(--putih);margin-bottom:8px;}
.cta-sub{font-family:var(--fb);font-size:.75rem;color:var(--dim);letter-spacing:.1em;margin-bottom:28px;}
.cta-tombol{display:inline-flex;align-items:center;gap:10px;background:var(--emas);color:var(--hitam);font-family:var(--fb);font-size:.75rem;font-weight:700;letter-spacing:.25em;text-transform:uppercase;padding:16px 36px;text-decoration:none;transition:all .2s;}
.cta-tombol:hover{background:var(--putih);}
footer{padding:32px 40px;border-top:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;}
.footer-brand{font-family:var(--fd);font-size:1.2rem;letter-spacing:.15em;color:var(--emas);}
.footer-links{display:flex;gap:24px;}
.footer-links a{font-family:var(--fb);font-size:.68rem;font-weight:500;letter-spacing:.15em;color:var(--dim);text-decoration:none;transition:color .2s;text-transform:uppercase;}
.footer-links a:hover{color:var(--emas);}
.footer-copy{font-family:var(--fb);font-size:.65rem;color:var(--redup);}
.lightbox{display:none;position:fixed;inset:0;background:rgba(0,0,0,.95);z-index:500;align-items:center;justify-content:center;}
.lightbox.on{display:flex;}
.lightbox img{max-width:90vw;max-height:90vh;object-fit:contain;}
.lightbox-close{position:absolute;top:20px;right:24px;background:none;border:none;color:var(--putih);font-size:1.8rem;cursor:pointer;opacity:.6;}
.lightbox-close:hover{opacity:1;}
.rv{opacity:0;transform:translateY(20px);transition:opacity .55s ease,transform .55s ease;}
.rv.on{opacity:1;transform:translateY(0);}
@media(max-width:768px){
  nav{padding:14px 18px;}
  .nav-hamburger{display:block;}
  .hero{grid-template-columns:1fr;min-height:auto;}
  .hero-kiri{padding:80px 24px 40px;border-right:none;border-bottom:1px solid var(--border);}
  .hero-nomor{font-size:5rem;}
  .hero-kanan{height:60vw;min-height:280px;}
  .sec-wrap{grid-template-columns:1fr;gap:24px;}
  .konten{padding:0 20px;}
  .field-row{grid-template-columns:1fr;gap:4px;}
  .spec-grid{grid-template-columns:1fr;}
  .galeri{grid-template-columns:repeat(3,1fr);}
  footer{padding:24px 20px;flex-direction:column;text-align:center;}
  .footer-links{justify-content:center;}
}
</style>
</head>
<body>
<nav>
  <a href="https://blumbang.id" class="nav-brand">BLUMB✦NG</a>
  <a href="https://store.blumbang.id" class="nav-back"><span>←</span> Store</a>
  <button class="nav-hamburger" onclick="toggleNav()" id="hamburger">☰</button>
</nav>
<div class="nav-mobile" id="nav-mobile">
  <a href="https://blumbang.id">Beranda</a>
  <a href="https://store.blumbang.id">Store</a>
  <a href="https://blumbang.id/sparks">Perjalanan</a>
  <a href="https://blumbang.id/about">Tentang</a>
  <a href="${waLink}">✦ Order Sekarang</a>
</div>

<div id="main">
  <div class="hero">
    <div class="hero-kiri">
      <div class="hero-nomor">✦</div>
      <div class="hero-kategori">${kategori}</div>
      <h1 class="hero-nama">${nama}</h1>
      <div class="hero-status ${statusKelas}">${statusTeks}</div>
      <div class="hero-harga">${harga} <span style="font-family:var(--fb);font-size:.65rem;color:var(--dim);font-weight:400;">/ pcs</span></div>
      <div class="hero-tombol">
        <a class="btn-order" href="${waLink}" target="_blank" id="btn-order">✦ Order via WhatsApp</a>
      </div>
    </div>
    <div class="hero-kanan">
      <div class="hero-foto-wrap" id="foto-wrap">
        ${fotoHeroHTML}
      </div>
      <div class="hero-foto-nav" id="foto-nav">${fotoDots}</div>
    </div>
  </div>

  <div class="konten">
    <div class="sec rv">
      <div class="sec-wrap">
        <div><div class="sec-nomor">01</div><div class="sec-label">Asal Usul</div></div>
        <div class="sec-isi">${asalHTML || '<div class="field-val" style="color:var(--redup)">—</div>'}</div>
      </div>
    </div>
    <div class="sec rv">
      <div class="sec-wrap">
        <div><div class="sec-nomor">02</div><div class="sec-label">Proses</div></div>
        <div class="sec-isi">${prosesHTML || '<div class="field-val" style="color:var(--redup)">—</div>'}</div>
      </div>
    </div>
    <div class="sec rv">
      <div class="sec-wrap">
        <div><div class="sec-nomor">03</div><div class="sec-label">Makna</div></div>
        <div class="sec-isi">
          <div class="makna-teks">${c.teks_makna || '—'}</div>
        </div>
      </div>
    </div>
  </div>

  ${galeriHTML ? `<div class="galeri rv">${galeriHTML}</div>` : ''}

  <div class="konten">
    <div class="sec rv">
      <div class="sec-wrap">
        <div><div class="sec-nomor">04</div><div class="sec-label">Spesifikasi</div></div>
        <div class="sec-isi">
          <div class="spec-grid">
            ${ukuranTags ? `<div class="spec-item"><div class="spec-key">Ukuran</div><div class="ukuran-tags">${ukuranTags}</div></div>` : ''}
            <div class="spec-item"><div class="spec-key">Harga</div><div class="spec-val">${harga} / pcs</div></div>
            <div class="spec-item"><div class="spec-key">Status</div><div class="spec-val">${statusTeks}</div></div>
            ${c.perawatan ? `<div class="spec-item" style="grid-column:1/-1"><div class="spec-key">Cara Perawatan</div><div class="spec-val">${c.perawatan}</div></div>` : ''}
          </div>
        </div>
      </div>
    </div>
    <div class="cta-bawah rv">
      <div class="cta-judul">Tertarik dengan ${nama}?</div>
      <div class="cta-sub">Hubungi kami via WhatsApp untuk info lebih lanjut</div>
      <a class="cta-tombol" href="${waLink}" target="_blank">✦ &nbsp; Order via WhatsApp</a>
    </div>
  </div>
</div>

<footer>
  <div class="footer-brand">BLUMB✦NG</div>
  <div class="footer-links">
    <a href="https://blumbang.id">Beranda</a>
    <a href="https://store.blumbang.id">Store</a>
    <a href="https://blumbang.id/sparks">Perjalanan</a>
    <a href="https://wa.me/6281234561146">WhatsApp</a>
  </div>
  <div class="footer-copy">© 2026 Blumbang · Jeto, Klaten</div>
</footer>

<div class="lightbox" id="lightbox" onclick="tutupLightbox()">
  <button class="lightbox-close" onclick="tutupLightbox()">✕</button>
  <img id="lightbox-img" src="" alt="">
</div>

<script>
function toggleNav(){
  const m=document.getElementById('nav-mobile');
  const h=document.getElementById('hamburger');
  m.classList.toggle('open');
  h.textContent=m.classList.contains('open')?'✕':'☰';
}
function gantiFoto(idx){
  document.querySelectorAll('[id^="foto-"]').forEach((el,i)=>{
    el.style.opacity = i===idx ? '.85' : '0';
  });
  document.querySelectorAll('[id^="dot-"]').forEach((el,i)=>{
    el.className = 'foto-dot' + (i===idx?' aktif':'');
  });
}
function bukaLightbox(src){
  document.getElementById('lightbox-img').src=src;
  document.getElementById('lightbox').classList.add('on');
}
function tutupLightbox(){
  document.getElementById('lightbox').classList.remove('on');
  document.getElementById('lightbox-img').src='';
}
document.addEventListener('keydown',e=>{if(e.key==='Escape')tutupLightbox();});
const observer=new IntersectionObserver(entries=>{
  entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('on');});
},{threshold:0.1});
document.querySelectorAll('.rv').forEach(el=>observer.observe(el));
</script>
</body>
</html>`;
}

async function main() {
  console.log('Fetching sheets...');
  const [produkRows, ceritaRows] = await Promise.all([
    fetchSheet('PRODUK'),
    fetchSheet('CERITA')
  ]);

  console.log(`Produk: ${produkRows.length}, Cerita: ${ceritaRows.length}`);

  const ceritaMap = {};
  ceritaRows.forEach(c => { ceritaMap[c.slug] = c; });

  if (!fs.existsSync('dist')) fs.mkdirSync('dist');

  // Generate index.html — redirect ke store
  fs.writeFileSync('dist/index.html',
    `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <meta http-equiv="refresh" content="0;url=https://store.blumbang.id">
    <title>Lembar · Blumbang</title></head>
    <body><a href="https://store.blumbang.id">Kembali ke Store</a></body></html>`, 'utf8');

  let count = 0;
  for (const p of produkRows) {
    const c = ceritaMap[p.slug] || {};
    const html = buildLembarHTML(p, c);
    const dir = path.join('dist', p.slug);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
    console.log(`Generated: ${p.slug}`);
    count++;
  }

  console.log(`\nDone. ${count} halaman lembar generated.`);
}

main().catch(e => { console.error(e); process.exit(1); });

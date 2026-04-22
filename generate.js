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

  // Coba header dari cols.label dulu, fallback ke rows[0]
  let headers = table.cols ? table.cols.map(c => (c.label || '').trim()) : [];
  let dataRows = table.rows;

  // Kalau semua header kosong, pakai baris pertama sebagai header
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

function buildHTML(produk) {
  const cards = produk.map(p => {
    const status = (p.status || 'po').toLowerCase();
    const statusKelas = status.includes('ready') ? 'ready' : status.includes('habis') ? 'habis' : 'po';
    const statusTeks = status.includes('ready') ? 'Ready' : status.includes('habis') ? 'Habis' : 'PO';
    const thumb = driveThumb(p.foto1);
    const waMsg = encodeURIComponent(`Halo, saya tertarik dengan *${p.nama}*. Boleh info lebih lanjut?`);
    const waLink = `https://wa.me/6281234561146?text=${waMsg}`;
    const lembarLink = `https://lembar.blumbang.id/${p.slug}`;
    const kategoriData = p.kategori || '';

    return `<div class="card" data-kategori="${kategoriData}" onclick="window.location='${lembarLink}'">
      <div class="card-foto">
        ${thumb
          ? `<img src="${thumb}" alt="${p.nama}" loading="lazy">`
          : `<div class="card-foto-ph"><span>✦</span><p>Foto segera hadir</p></div>`
        }
        <div class="card-status ${statusKelas}">${statusTeks}</div>
      </div>
      <div class="card-body">
        <div class="card-kategori">${kategoriData}</div>
        <div class="card-nama">${p.nama}</div>
        <div class="card-harga">${formatHarga(p.harga)}<span class="per-pcs">/ pcs</span></div>
        <div class="card-footer">
          <a class="card-cerita" href="${lembarLink}" onclick="event.stopPropagation()">Baca ceritanya →</a>
          ${statusKelas !== 'habis'
            ? `<a class="card-order" href="${waLink}" target="_blank" onclick="event.stopPropagation()">✦ Order</a>`
            : `<span class="card-order habis">Habis</span>`
          }
        </div>
      </div>
    </div>`;
  }).join('\n');

  const produkJSON = JSON.stringify(produk.map(p => ({
    slug: p.slug, nama: p.nama, kategori: p.kategori
  })));

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Store · Blumbang — Kaos Sablon Manual & Batik dari Klaten</title>
<meta name="description" content="Produk Blumbang — kaos sablon manual, kaos fusion batik, dan batik tulis dari Jeto, Klaten, Jawa Tengah. Setiap produk punya cerita.">
<link rel="canonical" href="https://store.blumbang.id">
<meta name="google-site-verification" content="ZRnMHNQ6xEXIUTJQppUtz51l7S5aujSHtW8RyoDnruU">
<meta property="og:title" content="Store · Blumbang">
<meta property="og:description" content="Kaos sablon manual & fusion batik dari Jeto, Klaten.">
<meta property="og:url" content="https://store.blumbang.id">
<meta property="og:type" content="website">
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Playfair+Display:ital,wght@0,400;1,400&family=Montserrat:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
html{scroll-behavior:smooth;}
:root{
  --hitam:#080808;--abu:#111111;--abu2:#1a1a1a;
  --border:#252525;--redup:#555;--dim:#888;--terang:#ccc;--putih:#F5F0E8;
  --emas:#C9A84C;--emas-dim:#7a6028;
  --fd:'Bebas Neue',sans-serif;--fp:'Playfair Display',serif;--fb:'Montserrat',sans-serif;
}
body{background:var(--hitam);color:var(--putih);font-family:var(--fb);overflow-x:hidden;min-height:100vh;}
body::after{content:'';position:fixed;inset:0;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E");pointer-events:none;z-index:9999;}
nav{position:fixed;top:0;left:0;right:0;z-index:200;display:flex;align-items:center;justify-content:space-between;padding:16px 40px;background:rgba(8,8,8,.97);border-bottom:1px solid var(--border);}
.nav-brand{font-family:var(--fd);font-size:1.4rem;letter-spacing:.15em;color:var(--emas);text-decoration:none;}
.nav-links{display:flex;gap:28px;align-items:center;}
.nav-links a{font-family:var(--fb);font-size:.7rem;font-weight:500;letter-spacing:.15em;color:var(--dim);text-decoration:none;text-transform:uppercase;transition:color .2s;}
.nav-links a:hover,.nav-links a.aktif{color:var(--putih);}
.nav-wa{background:var(--emas);color:var(--hitam)!important;padding:8px 18px;font-weight:700!important;}
.nav-wa:hover{background:var(--putih)!important;}
.nav-hamburger{display:none;background:none;border:none;color:var(--emas);font-size:1.4rem;cursor:pointer;}
.nav-mobile{display:none;position:fixed;top:57px;left:0;right:0;background:var(--abu);border-bottom:1px solid var(--border);z-index:199;flex-direction:column;padding:16px 20px;gap:4px;}
.nav-mobile.open{display:flex;}
.nav-mobile a{font-family:var(--fb);font-size:.8rem;font-weight:500;letter-spacing:.12em;color:var(--terang);text-decoration:none;padding:10px 0;border-bottom:1px solid var(--border);text-transform:uppercase;}
.nav-mobile a:last-child{border:none;color:var(--emas);}
.hero{padding:120px 40px 64px;border-bottom:1px solid var(--border);position:relative;overflow:hidden;}
.hero::before{content:'';position:absolute;top:-50%;right:-20%;width:60%;height:120%;background:radial-gradient(ellipse,rgba(201,168,76,.03) 0%,transparent 70%);pointer-events:none;}
.hero-tag{font-family:var(--fb);font-size:.62rem;font-weight:600;letter-spacing:.5em;color:var(--emas);text-transform:uppercase;margin-bottom:16px;display:block;}
.hero-judul{font-family:var(--fd);font-size:clamp(3rem,7vw,6rem);letter-spacing:.06em;line-height:.95;color:var(--putih);margin-bottom:16px;}
.hero-sub{font-family:var(--fp);font-size:1rem;font-style:italic;color:var(--dim);max-width:480px;line-height:1.8;}
.filter-bar{padding:24px 40px;border-bottom:1px solid var(--border);display:flex;gap:8px;flex-wrap:wrap;align-items:center;}
.filter-label{font-family:var(--fb);font-size:.6rem;font-weight:600;letter-spacing:.3em;color:var(--redup);text-transform:uppercase;margin-right:8px;}
.filter-btn{font-family:var(--fb);font-size:.65rem;font-weight:600;letter-spacing:.2em;text-transform:uppercase;padding:7px 16px;border:1px solid var(--border);color:var(--dim);background:none;cursor:pointer;transition:all .2s;}
.filter-btn:hover,.filter-btn.aktif{border-color:var(--emas);color:var(--emas);}
.filter-btn.aktif{background:rgba(201,168,76,.06);}
.produk-wrap{padding:48px 40px;max-width:1400px;margin:0 auto;}
.produk-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:1px;background:var(--border);}
.card{background:var(--hitam);display:flex;flex-direction:column;cursor:pointer;transition:background .2s;position:relative;overflow:hidden;}
.card:hover{background:var(--abu);}
.card.hidden{display:none;}
.card-foto{aspect-ratio:4/5;overflow:hidden;background:var(--abu2);position:relative;}
.card-foto img{width:100%;height:100%;object-fit:cover;transition:transform .5s,opacity .3s;opacity:.85;}
.card:hover .card-foto img{transform:scale(1.04);opacity:1;}
.card-foto-ph{width:100%;height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px;}
.card-foto-ph span{font-size:2.5rem;opacity:.15;}
.card-foto-ph p{font-family:var(--fb);font-size:.6rem;letter-spacing:.2em;color:var(--redup);text-transform:uppercase;}
.card-status{position:absolute;top:16px;left:16px;font-family:var(--fb);font-size:.58rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;padding:5px 10px;border:1px solid;}
.card-status.po{border-color:var(--emas);color:var(--emas);background:rgba(8,8,8,.8);}
.card-status.ready{border-color:#4a7c54;color:#4a7c54;background:rgba(8,8,8,.8);}
.card-status.habis{border-color:var(--redup);color:var(--redup);background:rgba(8,8,8,.8);}
.card-body{padding:20px 24px 24px;display:flex;flex-direction:column;gap:8px;border-top:1px solid var(--border);}
.card-kategori{font-family:var(--fb);font-size:.58rem;font-weight:600;letter-spacing:.3em;color:var(--emas);text-transform:uppercase;}
.card-nama{font-family:var(--fp);font-size:1.2rem;font-style:italic;color:var(--putih);line-height:1.3;}
.card-harga{font-family:var(--fd);font-size:1.1rem;letter-spacing:.08em;color:var(--terang);margin-top:4px;}
.per-pcs{font-family:var(--fb);font-size:.6rem;color:var(--dim);margin-left:4px;font-weight:400;}
.card-footer{display:flex;align-items:center;justify-content:space-between;margin-top:12px;padding-top:12px;border-top:1px solid var(--border);}
.card-cerita{font-family:var(--fb);font-size:.62rem;font-weight:600;letter-spacing:.2em;color:var(--emas);text-decoration:none;transition:color .2s;text-transform:uppercase;}
.card-cerita:hover{color:var(--putih);}
.card-order{font-family:var(--fb);font-size:.62rem;font-weight:700;letter-spacing:.2em;color:var(--hitam);background:var(--emas);padding:7px 14px;text-decoration:none;text-transform:uppercase;transition:background .2s;}
.card-order:hover{background:var(--putih);}
.card-order.habis{background:var(--redup);cursor:not-allowed;opacity:.5;}
.kosong-state{padding:80px 40px;text-align:center;grid-column:1/-1;}
.kosong-icon{font-size:3rem;opacity:.2;margin-bottom:16px;}
.kosong-teks{font-family:var(--fp);font-style:italic;color:var(--dim);font-size:1rem;}
footer{padding:32px 40px;border-top:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;margin-top:48px;}
.footer-brand{font-family:var(--fd);font-size:1.2rem;letter-spacing:.15em;color:var(--emas);}
.footer-links{display:flex;gap:24px;}
.footer-links a{font-family:var(--fb);font-size:.68rem;font-weight:500;letter-spacing:.15em;color:var(--dim);text-decoration:none;transition:color .2s;text-transform:uppercase;}
.footer-links a:hover{color:var(--emas);}
.footer-copy{font-family:var(--fb);font-size:.65rem;color:var(--redup);}
@media(max-width:768px){
  nav{padding:14px 18px;}
  .nav-links{display:none;}
  .nav-hamburger{display:block;}
  .hero{padding:90px 20px 40px;}
  .filter-bar{padding:16px 20px;}
  .produk-wrap{padding:24px 20px;}
  .produk-grid{grid-template-columns:repeat(auto-fill,minmax(260px,1fr));}
  footer{padding:24px 20px;flex-direction:column;text-align:center;}
  .footer-links{justify-content:center;}
}
</style>
</head>
<body>
<nav>
  <a href="https://blumbang.id" class="nav-brand">BLUMB✦NG</a>
  <div class="nav-links">
    <a href="https://blumbang.id">Beranda</a>
    <a href="https://store.blumbang.id" class="aktif">Store</a>
    <a href="https://blumbang.id/sparks">Perjalanan</a>
    <a href="https://blumbang.id/about">Tentang</a>
    <a href="https://wa.me/6281234561146" class="nav-wa">✦ Order</a>
  </div>
  <button class="nav-hamburger" onclick="toggleNav()" id="hamburger">☰</button>
</nav>
<div class="nav-mobile" id="nav-mobile">
  <a href="https://blumbang.id">Beranda</a>
  <a href="https://store.blumbang.id">Store</a>
  <a href="https://blumbang.id/sparks">Perjalanan</a>
  <a href="https://blumbang.id/about">Tentang</a>
  <a href="https://wa.me/6281234561146">✦ Order Sekarang</a>
</div>
<div class="hero">
  <span class="hero-tag">✦ Blumbang Store</span>
  <div class="hero-judul">PRODUK<br>KAMI</div>
  <div class="hero-sub">Dibuat di Jeto, Klaten. Setiap produk punya cerita — klik untuk membacanya.</div>
</div>
<div class="filter-bar">
  <span class="filter-label">Kategori</span>
  <button class="filter-btn aktif" onclick="filter('semua',this)">Semua</button>
  <button class="filter-btn" onclick="filter('Sablon Manual',this)">Sablon Manual</button>
  <button class="filter-btn" onclick="filter('Kaos Ft Batik',this)">Kaos Ft Batik</button>
  <button class="filter-btn" onclick="filter('Batik Tulis',this)">Batik Tulis</button>
</div>
<div class="produk-wrap">
  <div class="produk-grid" id="produk-grid">
    ${cards}
  </div>
</div>
<footer>
  <div class="footer-brand">BLUMB✦NG</div>
  <div class="footer-links">
    <a href="https://blumbang.id">Beranda</a>
    <a href="https://blumbang.id/sparks">Perjalanan</a>
    <a href="https://blumbang.id/about">Tentang</a>
    <a href="https://wa.me/6281234561146">WhatsApp</a>
  </div>
  <div class="footer-copy">© 2026 Blumbang · Jeto, Klaten</div>
</footer>
<script>
function toggleNav(){
  const m=document.getElementById('nav-mobile');
  const h=document.getElementById('hamburger');
  m.classList.toggle('open');
  h.textContent=m.classList.contains('open')?'✕':'☰';
}
function filter(kategori, btn){
  document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('aktif'));
  btn.classList.add('aktif');
  const cards=document.querySelectorAll('.card');
  let visible=0;
  cards.forEach(c=>{
    if(kategori==='semua'||c.dataset.kategori===kategori){
      c.classList.remove('hidden');visible++;
    } else {
      c.classList.add('hidden');
    }
  });
  const grid=document.getElementById('produk-grid');
  const kosong=grid.querySelector('.kosong-state');
  if(!visible){
    if(!kosong) grid.innerHTML+=\`<div class="kosong-state"><div class="kosong-icon">✦</div><div class="kosong-teks">Belum ada produk di kategori ini.</div></div>\`;
  } else {
    if(kosong) kosong.remove();
  }
}
</script>
</body>
</html>`;
}

async function main() {
  console.log('Fetching sheet PRODUK...');
  const produk = await fetchSheet('PRODUK');
  console.log(`Found ${produk.length} produk`);

  if (!fs.existsSync('dist')) fs.mkdirSync('dist');

  const html = buildHTML(produk);
  fs.writeFileSync('dist/index.html', html, 'utf8');
  console.log('Generated dist/index.html');

  // Auto-generate sitemap
  const today = new Date().toISOString().split('T')[0];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://store.blumbang.id/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;
  fs.writeFileSync('dist/sitemap.xml', sitemap, 'utf8');
  console.log('Generated dist/sitemap.xml');
}

main().catch(e => { console.error(e); process.exit(1); });

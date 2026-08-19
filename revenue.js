/* HyperStream Revenue Engine
 * Static-site friendly monetization layer.
 * Configure checkout/affiliate URLs in REVENUE_CONFIG below.
 */
const REVENUE_CONFIG = {
  proUrl: '#setup-pro-checkout',
  starterPackUrl: '#setup-starter-checkout',
  marketplaceUrl: '#marketplace-coming-soon',
  affiliateUrl: '#creator-stack',
  prices: { pro: '$9.99/mo', pack: '$7' }
};

const revenueStyle = document.createElement('style');
revenueStyle.textContent = `
.revenue-fab{position:fixed;z-index:40;right:20px;top:86px;border:1px solid #ffffff22;background:#0a0d18ee;color:#fff;border-radius:14px;padding:11px 13px;font-size:10px;font-weight:950;letter-spacing:1px;backdrop-filter:blur(20px);box-shadow:0 15px 45px #0008}.revenue-fab:hover{border-color:#67efff88;transform:translateY(-1px)}
.revenue-backdrop{position:fixed;inset:0;z-index:50;background:#000a;backdrop-filter:blur(9px);display:none;align-items:center;justify-content:center;padding:20px}.revenue-backdrop.open{display:flex}
.revenue-modal{width:min(760px,96vw);max-height:90vh;overflow:auto;border:1px solid #ffffff1c;border-radius:26px;background:#080b14f5;box-shadow:0 35px 120px #000c;padding:24px;color:#fff}.revenue-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start}.revenue-kicker{font-size:9px;letter-spacing:2px;color:#67efff;font-weight:950}.revenue-title{font-size:clamp(28px,5vw,48px);line-height:.95;letter-spacing:-2px;margin:8px 0}.revenue-sub{color:#8d98af;font-size:12px;line-height:1.6;max-width:580px}.revenue-close{border:1px solid #ffffff18;background:#111522;color:#fff;border-radius:12px;padding:9px 12px}.revenue-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:20px}.revenue-card{border:1px solid #ffffff12;background:#0c101b;border-radius:18px;padding:16px;min-height:180px;display:flex;flex-direction:column}.revenue-card.featured{border-color:#67efff55;background:linear-gradient(145deg,#101b29,#0c101b)}.revenue-card h3{margin:5px 0;font-size:17px}.revenue-card p{color:#7f8aa1;font-size:10px;line-height:1.5;flex:1}.revenue-price{font-size:20px;font-weight:950}.revenue-btn{display:block;text-align:center;text-decoration:none;border:1px solid #ffffff18;background:#121827;color:#fff;border-radius:11px;padding:10px;font-size:9px;font-weight:950;letter-spacing:.8px;margin-top:10px}.revenue-btn.primary{background:#fff;color:#05050a}.revenue-strip{margin-top:12px;border:1px solid #ffffff12;border-radius:16px;padding:13px;color:#8994aa;font-size:9px;line-height:1.55}.revenue-strip strong{color:#fff}.revenue-note{margin-top:15px;font-size:8px;color:#59657d;line-height:1.5}@media(max-width:700px){.revenue-grid{grid-template-columns:1fr}.revenue-fab{top:auto;bottom:76px;right:10px}}
`;
document.head.appendChild(revenueStyle);

const fab = document.createElement('button');
fab.className='revenue-fab';
fab.textContent='✦ CREATOR PRO';
document.body.appendChild(fab);

const backdrop=document.createElement('div');
backdrop.className='revenue-backdrop';
backdrop.innerHTML=`<div class="revenue-modal" role="dialog" aria-modal="true" aria-label="HyperStream Creator Pro">
  <div class="revenue-head"><div><div class="revenue-kicker">HYPERSTREAM CREATOR ECONOMY</div><div class="revenue-title">Turn creations into a catalog.</div><div class="revenue-sub">Keep the scanner free as the acquisition engine. Monetize the people who want faster creation, premium assets, and distribution. The goal is recurring revenue without turning the site into a giant checkout page.</div></div><button class="revenue-close" aria-label="Close">CLOSE</button></div>
  <div class="revenue-grid">
    <article class="revenue-card"><div class="revenue-kicker">FREE</div><h3>3D Studio</h3><p>Scan, import GLB/GLTF, preview, snapshot and export. This is the traffic magnet.</p><a class="revenue-btn" href="javascript:void(0)">START CREATING</a></article>
    <article class="revenue-card featured"><div class="revenue-kicker">RECURRING</div><h3>Creator Pro</h3><div class="revenue-price">${REVENUE_CONFIG.prices.pro}</div><p>Premium asset library, creator analytics, larger projects and priority marketplace placement.</p><a class="revenue-btn primary" href="${REVENUE_CONFIG.proUrl}">UNLOCK PRO</a></article>
    <article class="revenue-card"><div class="revenue-kicker">ONE-TIME</div><h3>Starter Pack</h3><div class="revenue-price">${REVENUE_CONFIG.prices.pack}</div><p>Curated 3D starter assets, materials and scene presets. Digital delivery keeps fulfillment automatic.</p><a class="revenue-btn" href="${REVENUE_CONFIG.starterPackUrl}">GET THE PACK</a></article>
  </div>
  <div class="revenue-strip"><strong>Future marketplace:</strong> creators list 3D assets and HyperStream takes a platform fee from completed sales. Add creator profiles, listings, checkout and automated digital delivery in the production backend.</div>
  <div class="revenue-strip"><strong>Passive discovery:</strong> every asset page can target long-tail searches such as “free GLB model”, “3D NFT generator”, “Quest 3 3D scanner” and “WebGL NFT creator”, then funnel visitors into the free studio.</div>
  <div class="revenue-note">Payments are intentionally not hard-coded into a static GitHub Pages site. Configure real checkout URLs in REVENUE_CONFIG after creating the payment products. Never put private payment or wallet secrets in this repository.</div>
</div>`;
document.body.appendChild(backdrop);

fab.onclick=()=>backdrop.classList.add('open');
backdrop.querySelector('.revenue-close').onclick=()=>backdrop.classList.remove('open');
backdrop.addEventListener('click',e=>{if(e.target===backdrop)backdrop.classList.remove('open')});
document.addEventListener('keydown',e=>{if(e.key==='Escape')backdrop.classList.remove('open')});

// Lightweight analytics hooks. Replace with your analytics provider if desired.
window.hyperStreamRevenue={open:()=>backdrop.classList.add('open'),config:REVENUE_CONFIG};

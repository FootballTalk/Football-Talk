window.FT_CONFIG = {
  SUPABASE_URL: 'https://cwilgnubzfpmfvoldttm.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_GdbObU6cF2eh3wSQ6pz47A_gTgBDjvH'
};

// Vercel Web Analytics (plain HTML / static-site integration)
window.va = window.va || function () {
  (window.vaq = window.vaq || []).push(arguments);
};
(function () {
  if (document.querySelector('script[src*="/_vercel/insights/script.js"]')) return;
  var script = document.createElement('script');
  script.defer = true;
  script.src = '/_vercel/insights/script.js';
  document.head.appendChild(script);
})();

// Football Talk Founding Partner programme.
// Kept here so the same commercial component can appear on the homepage
// and advertise page without adding another football-navigation tab.
(function () {
  function addFoundingPartnerStyles() {
    if (document.getElementById('ft-founding-partner-styles')) return;
    var style = document.createElement('style');
    style.id = 'ft-founding-partner-styles';
    style.textContent = [
      '.ft-founding{background:#0b0b0e;color:#fff;border-top:4px solid #f7c600;border-bottom:4px solid #f7c600}',
      '.ft-founding-inner{max-width:1180px;margin:auto;padding:22px 24px}',
      '.ft-founding-top{display:grid;grid-template-columns:1fr auto;gap:22px;align-items:center}',
      '.ft-founding-kicker{margin:0 0 5px;color:#f7c600;font-size:11px;font-weight:1000;letter-spacing:.13em}',
      '.ft-founding h2{margin:0;font-family:Archivo Black,Inter,Arial,sans-serif;font-size:clamp(24px,4vw,38px);line-height:1.05}',
      '.ft-founding h2 span{color:#f7c600}',
      '.ft-founding-copy{margin:8px 0 0;max-width:760px;color:#c9c9ce;font-size:14px;line-height:1.5}',
      '.ft-founding-btn{display:inline-block;background:#f7c600;color:#111;text-decoration:none;font-weight:1000;padding:12px 17px;border-radius:8px;text-align:center;white-space:nowrap}',
      '.ft-founding-slots{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-top:16px}',
      '.ft-founding-slot{border:1px solid #4a4a50;border-radius:8px;padding:10px 8px;text-align:center;color:#f7c600;font-size:11px;font-weight:900;letter-spacing:.04em;background:#151518}',
      '.ft-founding-detail{margin:28px 0;background:#111114;border:2px solid #f7c600;border-radius:18px;padding:28px}',
      '.ft-founding-detail-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:28px;align-items:start}',
      '.ft-founding-detail h2{font-family:Archivo Black,Inter,Arial,sans-serif;font-size:clamp(30px,5vw,52px);line-height:1;margin:6px 0 12px}',
      '.ft-founding-detail h2 span{color:#f7c600}',
      '.ft-founding-price{font-family:Archivo Black,Inter,Arial,sans-serif;color:#f7c600;font-size:42px;margin:10px 0 0}',
      '.ft-founding-price small{font-family:Inter,Arial,sans-serif;color:#aaa;font-size:13px}',
      '.ft-founding-list{margin:0;padding-left:20px;color:#d0d0d4;line-height:1.8}',
      '.ft-founding-note{margin-top:14px;color:#aaa;font-size:12px;line-height:1.5}',
      '.ft-founding-detail .ft-founding-btn{margin-top:16px}',
      '@media(max-width:760px){.ft-founding-inner{padding:18px 15px}.ft-founding-top,.ft-founding-detail-grid{grid-template-columns:1fr}.ft-founding-slots{grid-template-columns:repeat(2,1fr)}.ft-founding-slot:last-child{grid-column:1/-1}.ft-founding-btn{width:100%}.ft-founding-detail{padding:22px 17px}.ft-founding-price{font-size:36px}}'
    ].join('');
    document.head.appendChild(style);
  }

  function foundingStrip() {
    var section = document.createElement('section');
    section.className = 'ft-founding';
    section.id = 'founding-partners';
    section.setAttribute('aria-label', 'Football Talk Founding Partners');
    section.innerHTML = '<div class="ft-founding-inner"><div class="ft-founding-top"><div><p class="ft-founding-kicker">FOUNDING COMMERCIAL PARTNERS • 2026/27</p><h2>FIVE BUSINESSES. <span>ONE SEASON.</span></h2><p class="ft-founding-copy">Football Talk is appointing a maximum of five Founding Commercial Partners to support the next stage of our growth — with year-round recognition across the Football Talk brand.</p></div><a class="ft-founding-btn" href="advertise.html#founding-partner-programme">BECOME A FOUNDING PARTNER →</a></div><div class="ft-founding-slots" aria-label="Five founding partner positions"><div class="ft-founding-slot">POSITION 1 • AVAILABLE</div><div class="ft-founding-slot">POSITION 2 • AVAILABLE</div><div class="ft-founding-slot">POSITION 3 • AVAILABLE</div><div class="ft-founding-slot">POSITION 4 • AVAILABLE</div><div class="ft-founding-slot">POSITION 5 • AVAILABLE</div></div></div>';
    return section;
  }

  function foundingDetail() {
    var section = document.createElement('section');
    section.className = 'ft-founding-detail';
    section.id = 'founding-partner-programme';
    section.innerHTML = '<div class="ft-founding-detail-grid"><div><div class="tag">FOUNDING COMMERCIAL PARTNER • 2026/27</div><h2>HELP BUILD THE NEXT CHAPTER OF <span>FOOTBALL TALK.</span></h2><p style="color:#c9c9ce;line-height:1.65">We are selecting a maximum of five businesses to become Football Talk Founding Commercial Partners for 12 months. This is a year-round brand partnership, not a one-off banner placement.</p><div class="ft-founding-price">£1,000 <small>/ 12 months</small></div><a class="ft-founding-btn" id="foundingEnquire" href="#enquiry">ENQUIRE ABOUT A FOUNDING PARTNER POSITION →</a><p class="ft-founding-note">A Founding Partner position remains available until confirmed and paid. Once all five positions are secured, the programme closes for the 2026/27 intake.</p></div><div><ul class="ft-founding-list"><li>Official Football Talk Founding Partner status for 12 months</li><li>Logo and tracked website link in the Founding Partners area</li><li>Dedicated editorial-style partner profile on FootballTalk.uk</li><li>Premium Business Directory presence for 12 months</li><li>Quarterly dedicated social partner features</li><li>Priority first look at selected new Football Talk commercial opportunities</li><li>Category protection within the five Founding Partner positions</li><li>Quarterly performance summary using current verified insights</li><li>Official digital “Football Talk Founding Partner 2026/27” asset for your own channels</li></ul></div></div>';
    return section;
  }

  function wireFoundingEnquiry() {
    var btn = document.getElementById('foundingEnquire');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var type = document.getElementById('enquiryType');
      var pkg = document.getElementById('package');
      var message = document.getElementById('message');
      if (!type || !pkg) return;
      type.value = 'Partnership';
      type.dispatchEvent(new Event('change', { bubbles: true }));
      var value = 'Founding Commercial Partner — £1,000 / 12 months';
      var option = Array.prototype.slice.call(pkg.options).find(function (o) { return o.value === value; });
      if (!option) {
        option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        pkg.appendChild(option);
      }
      pkg.value = value;
      if (message && !message.value) message.value = 'I am interested in one of the five Football Talk Founding Commercial Partner positions for 2026/27.';
    });
  }

  function initFoundingPartners() {
    addFoundingPartnerStyles();
    var page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    if (page === '' || page === 'index.html') {
      if (!document.getElementById('founding-partners')) {
        var hero = document.querySelector('main .hero');
        if (hero) hero.insertAdjacentElement('afterend', foundingStrip());
      }
    }
    if (page === 'advertise.html') {
      if (!document.getElementById('founding-partner-programme')) {
        var intro = document.getElementById('advertisingIntro');
        if (intro) intro.insertAdjacentElement('beforebegin', foundingDetail());
      }
      setTimeout(wireFoundingEnquiry, 0);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initFoundingPartners);
  else initFoundingPartners();
})();

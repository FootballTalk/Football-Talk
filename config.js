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
// Shared commercial component for the homepage and advertise page.
(function () {
  var foundingPackage = 'Founding Commercial Partner — £1,000 / 12 months';

  function addFoundingPartnerStyles() {
    if (document.getElementById('ft-founding-partner-styles')) return;
    var style = document.createElement('style');
    style.id = 'ft-founding-partner-styles';
    style.textContent = [
      '.ft-founding{background:#0b0b0e;color:#fff;border-top:4px solid #f7c600;border-bottom:4px solid #f7c600;max-width:100%;overflow:hidden}',
      '.ft-founding-inner{max-width:1180px;margin:auto;padding:22px 24px}',
      '.ft-founding-top{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:22px;align-items:center}',
      '.ft-founding-top>*{min-width:0}',
      '.ft-founding-kicker{margin:0 0 5px;color:#f7c600;font-size:11px;font-weight:1000;letter-spacing:.13em;overflow-wrap:anywhere}',
      '.ft-founding h2{margin:0;font-family:Archivo Black,Inter,Arial,sans-serif;font-size:clamp(24px,4vw,38px);line-height:1.05;overflow-wrap:anywhere}',
      '.ft-founding h2 span{color:#f7c600}',
      '.ft-founding-copy{margin:8px 0 0;max-width:760px;color:#c9c9ce;font-size:14px;line-height:1.5;overflow-wrap:anywhere}',
      '.ft-founding-btn{display:inline-block;max-width:100%;background:#f7c600;color:#111;text-decoration:none;font-weight:1000;padding:12px 17px;border-radius:8px;text-align:center;white-space:nowrap;overflow-wrap:anywhere}',
      '.ft-founding-slots{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin-top:16px}',
      '.ft-founding-slot{min-width:0;border:1px solid #4a4a50;border-radius:8px;padding:10px 8px;text-align:center;color:#f7c600;font-size:11px;font-weight:900;letter-spacing:.04em;background:#151518;overflow-wrap:anywhere}',
      '.ft-founding-detail{margin:28px 0;background:#111114;border:2px solid #f7c600;border-radius:18px;padding:28px;max-width:100%;overflow:hidden}',
      '.ft-founding-detail-grid{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);gap:28px;align-items:start}',
      '.ft-founding-detail-grid>*{min-width:0;max-width:100%}',
      '.ft-founding-detail h2{font-family:Archivo Black,Inter,Arial,sans-serif;font-size:clamp(30px,5vw,52px);line-height:1;margin:6px 0 12px;overflow-wrap:anywhere}',
      '.ft-founding-detail h2 span{color:#f7c600}',
      '.ft-founding-detail p{max-width:100%;overflow-wrap:anywhere;word-break:normal}',
      '.ft-founding-price{font-family:Archivo Black,Inter,Arial,sans-serif;color:#f7c600;font-size:42px;margin:10px 0 0;max-width:100%;overflow-wrap:anywhere}',
      '.ft-founding-price small{font-family:Inter,Arial,sans-serif;color:#aaa;font-size:13px}',
      '.ft-founding-list{margin:0;padding-left:20px;color:#d0d0d4;line-height:1.8;max-width:100%}',
      '.ft-founding-list li{max-width:100%;padding-left:2px;overflow-wrap:anywhere;word-break:normal}',
      '.ft-founding-note{margin-top:14px;color:#aaa;font-size:12px;line-height:1.5}',
      '.ft-founding-detail .ft-founding-btn{margin-top:16px}',
      '@media(max-width:760px){.ft-founding-inner{padding:18px 15px}.ft-founding-top,.ft-founding-detail-grid{grid-template-columns:minmax(0,1fr)}.ft-founding-slots{grid-template-columns:repeat(2,minmax(0,1fr))}.ft-founding-slot:last-child{grid-column:1/-1}.ft-founding-btn{display:block;width:100%;white-space:normal;line-height:1.25;padding:12px 10px;font-size:13px}.ft-founding-detail{padding:22px 17px}.ft-founding-detail h2{font-size:clamp(29px,8.5vw,42px)}.ft-founding-price{font-size:36px}.ft-founding-list{padding-left:18px}.ft-founding-detail-grid{gap:22px}}',
      '@media(max-width:390px){.ft-founding-detail{padding:20px 14px}.ft-founding-detail h2{font-size:28px}.ft-founding-kicker{font-size:10px;letter-spacing:.09em}.ft-founding-btn{font-size:12px}.ft-founding-list{font-size:15px;line-height:1.65}}'
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

  function applyFoundingFormState() {
    var type = document.getElementById('enquiryType');
    var pkg = document.getElementById('package');
    var title = document.getElementById('formTitle');
    var intro = document.getElementById('formIntro');
    var packageLabel = document.getElementById('packageLabel');
    var messageLabel = document.getElementById('messageLabel');
    var message = document.getElementById('message');
    var btn = document.getElementById('sendButton');
    var note = document.getElementById('formNote');
    if (!type || !pkg || type.value !== 'Founding Partner') return;

    pkg.disabled = false;
    pkg.innerHTML = '<option value="' + foundingPackage + '" selected>' + foundingPackage + '</option>';
    if (title) title.textContent = 'Founding Partner Enquiry';
    if (intro) intro.textContent = 'Tell us about your business and your interest in becoming one of Football Talk’s five Founding Commercial Partners for 2026/27.';
    if (packageLabel) packageLabel.textContent = 'Founding Partner package *';
    if (messageLabel) messageLabel.textContent = 'Tell us about your business and why you are interested in becoming a Founding Partner *';
    if (message) message.placeholder = 'Tell us about your business, your sector and why a Football Talk Founding Partnership interests you...';
    if (btn) btn.textContent = 'SEND FOUNDING PARTNER ENQUIRY →';
    if (note) note.textContent = 'No payment is taken here. We will review your enquiry and contact you before any Founding Partner position is confirmed.';
  }

  function ensureFoundingFormOption() {
    var type = document.getElementById('enquiryType');
    if (!type) return;
    if (!Array.prototype.slice.call(type.options).some(function (o) { return o.value === 'Founding Partner'; })) {
      var option = document.createElement('option');
      option.value = 'Founding Partner';
      option.textContent = 'Founding Partner';
      type.appendChild(option);
    }
    type.addEventListener('change', function () {
      setTimeout(function () {
        if (type.value === 'Founding Partner') applyFoundingFormState();
      }, 0);
    });
  }

  function wireFoundingEnquiry() {
    var foundingBtn = document.getElementById('foundingEnquire');
    if (!foundingBtn) return;
    foundingBtn.addEventListener('click', function () {
      var type = document.getElementById('enquiryType');
      var message = document.getElementById('message');
      if (!type) return;
      type.value = 'Founding Partner';
      type.dispatchEvent(new Event('change', { bubbles: true }));
      setTimeout(function () {
        applyFoundingFormState();
        if (message && !message.value) message.value = 'I am interested in one of the five Football Talk Founding Commercial Partner positions for 2026/27.';
      }, 0);
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
      setTimeout(function () {
        ensureFoundingFormOption();
        wireFoundingEnquiry();
      }, 0);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initFoundingPartners);
  else initFoundingPartners();
})();

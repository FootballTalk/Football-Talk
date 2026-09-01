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

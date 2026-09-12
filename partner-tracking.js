/* Football Talk partner click tracking
   Usage: add data-ft-partner/data-ft-placement to outbound partner links.
   Example:
   <a href="https://partner.example/?utm_source=footballtalk&utm_medium=partner&utm_campaign=eleve_2026" data-ft-partner="eleve" data-ft-placement="partner-profile">Visit partner</a>
*/
(function () {
  'use strict';

  function trackPartnerClick(link) {
    var partner = (link.dataset.ftPartner || '').trim().toLowerCase();
    if (!partner) return;

    var placement = (link.dataset.ftPlacement || 'unspecified').trim().toLowerCase();
    var destination = link.href;

    // Keep the existing Vercel Web Analytics event.
    if (typeof window.va === 'function') {
      window.va('event', {
        name: 'partner_outbound_click',
        data: {
          partner: partner,
          placement: placement,
          destination_host: (function () {
            try { return new URL(destination).hostname; } catch (_) { return 'unknown'; }
          })()
        }
      });
    }

    // Also mirror the click to Football Talk's own lightweight counter so it can
    // be checked independently of the Vercel dashboard. No personal data is sent.
    var payload = JSON.stringify({partner:partner, placement:placement, destination:destination});
    try {
      if (navigator.sendBeacon) {
        var blob = new Blob([payload], {type:'application/json'});
        navigator.sendBeacon('/api/partner-click', blob);
      } else {
        fetch('/api/partner-click', {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:payload,
          keepalive:true,
          credentials:'same-origin'
        }).catch(function () {});
      }
    } catch (_) {}
  }

  document.addEventListener('click', function (event) {
    var link = event.target.closest && event.target.closest('a[data-ft-partner]');
    if (!link) return;
    trackPartnerClick(link);
  }, true);
})();

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

    // Vercel Web Analytics custom event. No personal information is sent.
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
  }

  document.addEventListener('click', function (event) {
    var link = event.target.closest && event.target.closest('a[data-ft-partner]');
    if (!link) return;
    trackPartnerClick(link);
  }, true);
})();

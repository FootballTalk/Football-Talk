// Share one short-lived response across homepage widgets without delaying updates.
(() => {
  let pending = null;
  let cached = null;
  let expiresAt = 0;
  window.ftFetchNews = async () => {
    if (cached && Date.now() < expiresAt) return cached.clone();
    if (!pending) {
      pending = fetch('/api/news', {cache: 'no-store'})
        .then(response => {
          if (!response.ok) throw new Error('News feed unavailable');
          cached = response;
          expiresAt = Date.now() + 15000;
          return response;
        })
        .finally(() => { pending = null; });
    }
    return (await pending).clone();
  };
})();

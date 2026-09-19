const CACHE='football-talk-shell-v2';
const SHELL=['/','/index.html','/styles.css','/pwa-icon.svg'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).catch(()=>{}));
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  event.respondWith(fetch(event.request).then(response=>{
    const copy=response.clone();
    caches.open(CACHE).then(cache=>cache.put(event.request,copy)).catch(()=>{});
    return response;
  }).catch(()=>caches.match(event.request).then(response=>response||caches.match('/'))));
});

self.addEventListener('push',event=>{
  let data={};
  try{data=event.data?event.data.json():{};}catch{data={};}
  const matchId=String(data.matchId||'');
  const safeUrl=/^\d{1,20}$/.test(matchId)?`/match.html?id=${encodeURIComponent(matchId)}`:'/match-centre.html';
  event.waitUntil(self.registration.showNotification(String(data.title||'Football Talk goal alert'),{
    body:String(data.body||'The score has changed.'),
    icon:'/pwa-icon.svg',
    badge:'/pwa-icon.svg',
    tag:String(data.tag||`goal-${matchId||'update'}`),
    renotify:true,
    data:{url:safeUrl}
  }));
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=new URL(event.notification.data?.url||'/match-centre.html',self.location.origin).href;
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(windows=>{
    for(const client of windows){if(client.url===target&&'focus'in client)return client.focus();}
    return clients.openWindow?clients.openWindow(target):undefined;
  }));
});

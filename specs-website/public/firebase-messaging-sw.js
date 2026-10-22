/* Web push handler for SPECS notifications (Firebase Cloud Messaging, data-only messages).
 * Deliberately does not import the Firebase SDK: the payload is plain JSON, so no config is needed here. */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

function parsePayload(event) {
  if (!event.data) return null;
  let raw;
  try { raw = event.data.json(); } catch { return null; }
  const data = raw.data || {};
  const notification = raw.notification || {};
  const title = data.title || notification.title;
  if (!title) return null;
  return {
    title,
    body: data.body || notification.body || '',
    link: data.link || '',
    priority: data.priority || 'normal',
  };
}

self.addEventListener('push', (event) => {
  const message = parsePayload(event);
  if (!message) return;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const visible = windows.filter((client) => client.visibilityState === 'visible');
    if (visible.length) {
      // The user is looking at the site: show an in-page toast instead of a system popup.
      visible.forEach((client) => client.postMessage({ type: 'specs-push', ...message }));
      return;
    }
    await self.registration.showNotification(message.title, {
      body: message.body,
      icon: '/logo.webp',
      badge: '/logo.webp',
      tag: `specs-${message.title}`.slice(0, 80),
      requireInteraction: message.priority === 'urgent',
      data: { link: message.link },
    });
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification.data && event.notification.data.link;
  // Only follow in-app paths or same-origin URLs.
  let target = '/';
  try {
    const url = new URL(link || '/', self.location.origin);
    if (url.origin === self.location.origin) target = url.pathname + url.search + url.hash;
  } catch { /* fall back to home */ }

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if ('focus' in client) {
        await client.focus();
        if ('navigate' in client && link) await client.navigate(target).catch(() => {});
        return;
      }
    }
    await self.clients.openWindow(target);
  })());
});

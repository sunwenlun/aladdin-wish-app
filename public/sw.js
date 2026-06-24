// ============================================
// Aladdin Wish Lamp - Service Worker
// PWA: 离线缓存 + 推送通知 + 后台同步
// ============================================

const CACHE_NAME = 'aladdin-v1';
const STATIC_ASSETS = [
  '/',
  '/wish',
  '/mailbox',
  '/my-wishes',
  '/genie-lamp-icon.png',
  '/manifest.json',
];

// ===== 安装：预缓存静态资源 =====
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

// ===== 激活：清理旧缓存 =====
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// ===== Fetch: 网络优先，失败回退缓存 =====
self.addEventListener('fetch', (event) => {
  // 跳过非 GET 请求和 API 请求
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 成功则缓存副本
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone).catch(() => {});
        });
        return response;
      })
      .catch(() => {
        // 离线回退
        return caches.match(event.request).then((cached) => {
          return cached || caches.match('/');
        });
      })
  );
});

// ===== Push: 推送通知 =====
self.addEventListener('push', (event) => {
  let data = { title: 'Aladdin', body: '', icon: '/genie-lamp-icon.png', url: '/' };

  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch (e) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: '/genie-lamp-icon.png',
    vibrate: [100, 50, 100],
    data: { url: data.url },
    actions: [
      { action: 'open', title: '查看' },
      { action: 'close', title: '忽略' },
    ],
    tag: data.tag || 'aladdin-notification',
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// ===== 通知点击 =====
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 如果已有窗口，聚焦它
      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      // 否则打开新窗口
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// ===== 后台同步（未来扩展） =====
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-wishes') {
    // 未来：后台同步愿望状态
  }
});

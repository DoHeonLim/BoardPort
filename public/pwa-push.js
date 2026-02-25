/* File: public/pwa-push
 * Description: next-pwa 메인 SW가 importScripts로 불러 push 이벤트 처리
 * Author : 임도헌
 *
 * History
 * Date        Author   Status     Description
 * 2025.11.10  임도헌   Created
 * 2026.02.24  임도헌   Modified   푸시 알림 아이콘 로고 변경
 */

self.addEventListener("push", function (event) {
  let data = {};
  try {
    data = event?.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  const title = data.title || "알림";
  const options = {
    // 알림의 본문 내용
    body: data.body || "",
    // 알림에 표시되는 작은 아이콘 (앱 아이콘)
    // data.image가 있으면 그것을 사용하고, 없으면 기본 아이콘 사용
    icon: data.image || "/images/logo-symbol.png",
    // 알림 트레이에 표시되는 작은 아이콘 (상태 표시줄)
    badge: "/images/logo-symbol.png",
    // 알림에 표시되는 큰 이미지
    // 일부 브라우저에서는 알림 아래에 큰 이미지로 표시됨
    image: data.image,
    // [진동시간(ms), 대기시간(ms), 진동시간(ms)]
    vibrate: [200, 100, 200],
    // true로 설정하면 사용자가 직접 닫거나 클릭하기 전까지 알림이 유지됨
    // false면 시스템이 자동으로 알림을 닫을 수 있음
    requireInteraction: true,
    tag: data.tag || "bp-push",
    renotify: !!data.renotify,
    // 정렬 안정화 (일부 플랫폼에서 최신 알림이 위로 오도록)
    timestamp: Date.now(),
    // 알림 클릭 시 필요한 추가 데이터
    data: {
      url: data.link || "/", // 클릭 시 이동
      tag: data.tag || "bp-push",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const target = event?.notification?.data?.url;
  if (!target) return;

  // 이미 열린 클라이언트가 있으면 포커스, 없으면 새 창
  event.waitUntil(
    (async () => {
      const allClients = await clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const client = allClients.find((c) => c.url.includes(location.origin));
      if (client) {
        await client.focus();
        try {
          client.navigate(target);
        } catch {}
        return;
      }
      await clients.openWindow(target);
    })()
  );
});

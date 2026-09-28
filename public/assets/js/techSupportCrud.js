// Live-обновление списка тикетов техподдержки (TechSupportCrudController).
// Тот же приём, что и в ticketApprovalCrud.js (см. её комментарии за полное
// обоснование) — баннер вместо построчного патча таблицы, EasyAdmin рендерит
// список сервером, а не как SPA.
document.addEventListener('DOMContentLoaded', () => {
    if (!document.querySelector('table.datagrid')) return;

    subscribeToTechSupportQueue();
});

async function subscribeToTechSupportQueue() {
    let response;
    try {
        response = await fetch('/admin/tech-supports/mercure-token', { credentials: 'same-origin' });
    } catch {
        return;
    }

    if (!response.ok) return;

    const { token, topic } = await response.json();
    if (!token || !topic) return;

    // Same-origin (хаб проксируется на этот же домен, см. README) — токен
    // передаётся cookie'й mercureAuthorization, которую хаб понимает нативно
    // (нативный EventSource не умеет слать кастомные заголовки).
    document.cookie = `mercureAuthorization=${token}; path=/.well-known/mercure; SameSite=Strict`;

    const url = new URL('/.well-known/mercure', window.location.origin);
    url.searchParams.append('topic', topic);

    const eventSource = new EventSource(url);
    eventSource.onmessage = () => showUpdateBanner();
}

function showUpdateBanner() {
    if (document.getElementById('tech-support-update-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'tech-support-update-banner';
    banner.textContent = '🔄 Есть обновления — нажмите, чтобы обновить список';
    banner.style.cssText = [
        'position:fixed', 'top:0', 'left:50%', 'transform:translateX(-50%)',
        'z-index:2000', 'background:#0d6efd', 'color:#fff', 'padding:10px 24px',
        'border-radius:0 0 8px 8px', 'cursor:pointer', 'font-size:14px',
        'box-shadow:0 2px 8px rgba(0,0,0,.25)',
    ].join(';');

    banner.addEventListener('click', () => window.location.reload());
    document.body.appendChild(banner);
}

// Live-обновление очереди подтверждений (TicketApprovalCrudController).
// EasyAdmin рендерит список сервером (не SPA) — вместо построчного патча
// таблицы просто показываем баннер "Есть обновления", админ сам решает,
// когда перечитать список (перезагрузка страницы сохранила бы фильтры/
// прокрутку хуже, чем то, что он явно нажал кнопку).
document.addEventListener('DOMContentLoaded', () => {
    // Скрипт подключён на все действия CRUD (index/new/edit/detail) —
    // configureAssets() в EasyAdmin не умеет ограничивать JS одной страницей.
    // Подписываемся только там, где реально есть таблица списка.
    if (!document.querySelector('table.datagrid')) return;

    subscribeToTicketApprovals();
});

async function subscribeToTicketApprovals() {
    let response;
    try {
        response = await fetch('/admin/ticket-approvals/mercure-token', { credentials: 'same-origin' });
    } catch {
        return;
    }

    if (!response.ok) return;

    const { token, topic } = await response.json();
    if (!token || !topic) return;

    // Mercure-хаб проксируется на этот же домен (nginx location
    // /.well-known/mercure — см. README) — same-origin, поэтому токен можно
    // передать просто cookie'й, которую хаб понимает нативно (имя
    // mercureAuthorization — часть спецификации Mercure). Native EventSource
    // не умеет слать кастомные заголовки, поэтому именно так, а не Bearer.
    document.cookie = `mercureAuthorization=${token}; path=/.well-known/mercure; SameSite=Strict`;

    const url = new URL('/.well-known/mercure', window.location.origin);
    url.searchParams.append('topic', topic);

    const eventSource = new EventSource(url);
    eventSource.onmessage = () => showUpdateBanner();
}

function showUpdateBanner() {
    if (document.getElementById('ticket-approval-update-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'ticket-approval-update-banner';
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

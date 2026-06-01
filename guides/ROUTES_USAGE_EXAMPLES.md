# Примеры использования ROUTES

## Импорт
```tsx
import { ROUTES } from '../../app/routers/routes';
```

## Использование в navigate()

```tsx
// Простые пути
navigate(ROUTES.HOME);
navigate(ROUTES.FAVORITES);
navigate(ROUTES.MY_TICKETS);
navigate(ROUTES.CREATE_TICKET);

// Пути с параметрами  
navigate(ROUTES.PROFILE_BY_ID(123));
navigate(ROUTES.TICKET_BY_ID(456));
navigate(ROUTES.CATEGORY_TICKETS_BY_ID(789));

// С дополнительными параметрами
navigate(ROUTES.PROFILE_BY_ID(userId), {replace: true});
```

## Использование в Link
```tsx
import { Link } from 'react-router-dom';
import { ROUTES } from '../../app/routers/routes';

// Простые пути
<Link to={ROUTES.HOME}>На главную</Link>
<Link to={ROUTES.FAVORITES}>Избранное</Link>
<Link to={ROUTES.PRIVACY_POLICY}>Политика конфиденциальности</Link>

// С параметрами
<Link to={ROUTES.PROFILE_BY_ID(user.id)}>Профиль пользователя</Link>
<Link to={ROUTES.TICKET_BY_ID(ticket.id)}>Открыть тикет</Link>
```

## Динамическая генерация URL

```tsx
const ticketId = 42;
const profileUrl = ROUTES.PROFILE_BY_ID(ticketId);
// Результат: "/profile/42"

const categoryId = 'electronics';
const categoryUrl = ROUTES.CATEGORY_TICKETS_BY_ID(categoryId);
// Результат: "/ticket/category/electronics"
```

## Использование в onClick
```tsx
const handleClick = () => {
    navigate(ROUTES.TICKET_BY_ID(ticket.id));
};

const handleProfileClick = (userId: number) => {
    navigate(ROUTES.PROFILE_BY_ID(userId));
};
```

## Как изменить путь

Раньше нужно было менять в 10+ местах:
```tsx
// В роутере
{ path: 'my-tickets', element: <MyTickets /> }

// В компоненте 1
navigate('/my-tickets')

// В компоненте 2  
<Link to="/my-tickets">

// и так 10 раз...
```

Теперь меняешь ОДИН РАЗ в `routes.ts`:
```tsx
export const ROUTES = {
    MY_TICKETS: '/ticket/me',  // <- просто измени здесь
    // ...
}
```

И путь обновится везде автоматически! 🎉

<?php

namespace App\Serializer;

use ApiPlatform\Metadata\Get;
use ApiPlatform\State\SerializerContextBuilderInterface;
use App\Entity\User;
use App\Entity\Trait\Readable\G;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Bundle\SecurityBundle\Security;

final readonly class UserContextBuilder implements SerializerContextBuilderInterface
{
    public function __construct(
        private SerializerContextBuilderInterface $decorated,
        private Security                          $security
    ) {}

    public function createFromRequest(Request $request, bool $normalization, ?array $extractedAttributes = null): array
    {
        $context = $this->decorated->createFromRequest($request, $normalization, $extractedAttributes);

        $resourceClass = $context['resource_class'] ?? null;

        if ($normalization) {
            $authenticated = $this->security->isGranted('IS_AUTHENTICATED');

            // Телефоны (G::PHONES_READ) отдаём ТОЛЬКО в карточке пользователя
            // (GET /users/{id}, GET /users/me) и ТОЛЬКО авторизованному — это и есть
            // продуктовое правило "номера видны авторизованным пользователям".
            //
            // Раньше группа добавлялась любому авторизованному запросу к ЛЮБОМУ
            // ресурсу — поэтому номера утекали и в списки (GET /users), и во
            // вложенные объекты (мастер/автор в тикетах, участники чатов, авторы
            // отзывов...): любой зарегистрированный аккаунт мог собрать всю базу
            // телефонов простой пагинацией. Теперь номер получает только тот, кто
            // открыл конкретного пользователя.
            //
            // $operation instanceof Get — именно item-операция: GetCollection —
            // отдельный класс, а вложенные User (resource_class = Ticket, Chat...)
            // сюда не попадают, там условие по $resourceClass ложно. Свои телефоны
            // владелец видит и без этого блока: G::OPS_USERS_ME включает PHONES_READ.
            $operation = $context['operation'] ?? null;
            if ($authenticated && $resourceClass === User::class && $operation instanceof Get) {
                $context['groups'][] = G::PHONES_READ;
            }

            // Если пользователь НЕ авторизован и запрашивает User — только публичная группа
            if ($resourceClass === User::class && !$authenticated) {
                $context['groups'] = ['user:public:read'];
            }
        }

        return $context;
    }
}

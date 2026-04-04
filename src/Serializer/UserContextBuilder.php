<?php

namespace App\Serializer;

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
            // Если пользователь авторизован — добавляем группу телефонов
            if ($this->security->isGranted('IS_AUTHENTICATED')) {
                $context['groups'][] = G::PHONES_READ;
            }

            // Если пользователь НЕ авторизован и запрашивает User — только публичная группа
            if ($resourceClass === User::class && !$this->security->isGranted('IS_AUTHENTICATED')) {
                $context['groups'] = ['user:public:read'];
            }
        }

        return $context;
    }
}

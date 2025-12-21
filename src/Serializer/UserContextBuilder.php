<?php

namespace App\Serializer;

use ApiPlatform\State\SerializerContextBuilderInterface;
use App\Entity\User;
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

        // Применяем только для User и только при чтении (normalization)
        if ($resourceClass === User::class && $normalization) {
            // Если пользователь НЕ авторизован - оставляем только публичную группу
            if (!$this->security->isGranted('IS_AUTHENTICATED')) {
                $context['groups'] = ['user:public:read'];
            }
            // Если авторизован - группы уже установлены из операции (masters:read, clients:read)
        }

        return $context;
    }
}

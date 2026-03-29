<?php

namespace App\State\Localization;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\ApiResource\AppMessages;
use App\State\Trait\LocaleResolveTrait;
use InvalidArgumentException;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class AppErrorLocalizationProvider implements ProviderInterface
{
    use LocaleResolveTrait;

    public function __construct(private readonly RequestStack $requestStack) {}

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): object|array|null
    {
        $locale = $this->resolveLocale();

        if (isset($uriVariables['code'])) {
            try {
                return AppMessages::get($uriVariables['code'], $locale);
            } catch (InvalidArgumentException) {
                throw new NotFoundHttpException("Error code '{$uriVariables['code']}' not found");
            }
        }

        return AppMessages::all($locale);
    }
}


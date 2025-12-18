<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\Entity\Ticket\Ticket;
use App\Entity\Geography\Translation;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

readonly class TicketLocalizationProvider implements ProviderInterface
{
    public function __construct(private ProviderInterface $decorated, private RequestStack $requestStack) {}

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): object|array|null
    {
        // Получаем данные от стандартного провайдера (с применением всех фильтров)
        $result = $this->decorated->provide($operation, $uriVariables, $context);

        $request = $this->requestStack->getCurrentRequest();
        $locale = $request?->query->get('locale', 'tj') ?? 'tj';

        if (!in_array($locale, array_values(Translation::LOCALES))) {
            throw new NotFoundHttpException("Locale not found");
        }

        // Применяем локализацию к результату
        if (is_iterable($result)) {
            foreach ($result as $ticket) {
                if ($ticket instanceof Ticket) {
                    $this->applyLocalization($ticket, $locale);
                }
            }
        } elseif ($result instanceof Ticket) {
            $this->applyLocalization($result, $locale);
        }

        return $result;
    }

    private function applyLocalization(Ticket $ticket, string $locale): void
    {
        foreach ($ticket->getAddresses() as $address) {
            // Province
            $province = $address->getProvince();
            if ($province) {
                $translation = $province->getTranslations()->filter(
                    fn($t) => $t->getLocale() === $locale
                )->first();
                $province->setTitle(
                    $translation?->getTitle()
                    ?? $province->getTranslations()->first()?->getTitle()
                    ?? 'Unknown'
                );
            }

            // City
            $city = $address->getCity();
            if ($city) {
                $translation = $city->getTranslations()->filter(
                    fn($t) => $t->getLocale() === $locale
                )->first();
                $city->setTitle(
                    $translation?->getTitle()
                    ?? $city->getTranslations()->first()?->getTitle()
                    ?? 'Unknown'
                );
            }

            // Suburb
            $suburb = $address->getSuburb();
            if ($suburb) {
                $translation = $suburb->getTranslations()->filter(
                    fn($t) => $t->getLocale() === $locale
                )->first();
                $suburb->setTitle(
                    $translation?->getTitle()
                    ?? $suburb->getTranslations()->first()?->getTitle()
                    ?? 'Unknown'
                );
            }

            // District
            $district = $address->getDistrict();
            if ($district) {
                $translation = $district->getTranslations()->filter(
                    fn($t) => $t->getLocale() === $locale
                )->first();
                $district->setTitle(
                    $translation?->getTitle()
                    ?? $district->getTranslations()->first()?->getTitle()
                    ?? 'Unknown'
                );

                // Settlements
                foreach ($district->getSettlements() as $settlement) {
                    $translation = $settlement->getTranslations()->filter(
                        fn($t) => $t->getLocale() === $locale
                    )->first();
                    $settlement->setTitle(
                        $translation?->getTitle()
                        ?? $settlement->getTranslations()->first()?->getTitle()
                        ?? 'Unknown'
                    );

                    // Villages
                    foreach ($settlement->getVillages() as $village) {
                        $translation = $village->getTranslations()->filter(
                            fn($t) => $t->getLocale() === $locale
                        )->first();
                        $village->setTitle(
                            $translation?->getTitle()
                            ?? $village->getTranslations()->first()?->getTitle()
                            ?? 'Unknown'
                        );
                    }
                }

                // Communities
                foreach ($district->getCommunities() as $community) {
                    $translation = $community->getTranslations()->filter(
                        fn($t) => $t->getLocale() === $locale
                    )->first();
                    $community->setTitle(
                        $translation?->getTitle()
                        ?? $community->getTranslations()->first()?->getTitle()
                        ?? 'Unknown'
                    );
                }
            }

            // Settlement (если есть напрямую)
            $settlement = $address->getSettlement();
            if ($settlement) {
                $translation = $settlement->getTranslations()->filter(
                    fn($t) => $t->getLocale() === $locale
                )->first();
                $settlement->setTitle(
                    $translation?->getTitle()
                    ?? $settlement->getTranslations()->first()?->getTitle()
                    ?? 'Unknown'
                );
            }

            // Community (если есть напрямую)
            $community = $address->getCommunity();
            if ($community) {
                $translation = $community->getTranslations()->filter(
                    fn($t) => $t->getLocale() === $locale
                )->first();
                $community->setTitle(
                    $translation?->getTitle()
                    ?? $community->getTranslations()->first()?->getTitle()
                    ?? 'Unknown'
                );
            }

            // Village (если есть напрямую)
            $village = $address->getVillage();
            if ($village) {
                $translation = $village->getTranslations()->filter(
                    fn($t) => $t->getLocale() === $locale
                )->first();
                $village->setTitle(
                    $translation?->getTitle()
                    ?? $village->getTranslations()->first()?->getTitle()
                    ?? 'Unknown'
                );
            }
        }
    }
}

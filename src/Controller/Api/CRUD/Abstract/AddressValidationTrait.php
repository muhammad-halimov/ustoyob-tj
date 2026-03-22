<?php

namespace App\Controller\Api\CRUD\Abstract;

use App\ApiResource\AppError;
use App\Entity\Geography\Abstract\Address;
use App\Entity\Geography\City\City;
use App\Entity\Geography\City\Suburb;
use App\Entity\Geography\District\Community;
use App\Entity\Geography\District\District;
use App\Entity\Geography\District\Settlement;
use App\Entity\Geography\District\Village;
use App\Entity\Geography\Province\Province;
use App\Entity\Ticket\Ticket;
use App\Service\Extra\ExtractIriService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;

/**
 * Валидация и построение адресной иерархии для тикетов.
 *
 * Используется в PostTicketController и PatchTicketController,
 * где логика идентична: нормализация входного массива address,
 * проверка дубликатов, валидация принадлежности каждого уровня
 * (province → city → suburb, province → district → community/settlement → village).
 *
 * Требования к использующему классу:
 *   - Должен предоставить getExtractIriService(): ExtractIriService
 *   - Должен предоставить getEntityManager(): EntityManagerInterface
 *   - Должен иметь метод json() (наследуется от AbstractController)
 */
trait AddressValidationTrait
{
    abstract protected function getExtractIriService(): ExtractIriService;
    abstract protected function getEntityManager(): EntityManagerInterface;

    /**
     * Нормализует входной массив адресов (объект → массив из одного элемента).
     *
     * @return array[]|JsonResponse — массив адресных объектов или ошибка
     */
    private function normalizeAddressParam(mixed $addressParam): array|JsonResponse
    {
        if (!is_array($addressParam) || empty($addressParam)) {
            return $this->errorJson(AppError::ADDRESS_NOT_FOUND);
        }

        // Если передан один объект вместо массива — оборачиваем
        if (!isset($addressParam[0])) {
            $addressParam = [$addressParam];
        }

        return $addressParam;
    }

    /**
     * Валидирует и создаёт Abstract-сущности из массива адресных данных.
     *
     * @param Ticket   $ticket       Тикет, к которому привязываются адреса
     * @param array[]  $addressList  Нормализованный массив адресов (из normalizeAddressParam)
     * @return JsonResponse|null     null = успех, JsonResponse = ошибка валидации
     */
    private function buildAndValidateAddresses(Ticket $ticket, array $addressList): ?JsonResponse
    {
        $seen = [];
        $iri  = $this->getExtractIriService();
        $em   = $this->getEntityManager();

        foreach ($addressList as $item) {
            if (empty($item['province'])) {
                return $this->errorJson(AppError::PROVINCE_REQUIRED);
            }

            // Ключ дедупликации
            $key = implode(':', [
                $item['province'],
                $item['city'] ?? '',
                $item['suburb'] ?? '',
                $item['district'] ?? '',
                $item['community'] ?? '',
                $item['settlement'] ?? '',
                $item['village'] ?? '',
            ]);

            if (in_array($key, $seen, true)) {
                return $this->errorJson(AppError::DUPLICATE_ADDRESS);
            }
            $seen[] = $key;

            /** @var Province $province */
            $province = $iri->extract($item['province'], Province::class, 'provinces');

            $address = new Address();
            $address->setProvince($province);

            // ── City branch ──
            if (!empty($item['city'])) {
                /** @var City $city */
                $city = $iri->extract($item['city'], City::class, 'cities');

                if ($city->getProvince()?->getId() !== $province->getId()) {
                    return $this->errorJson(AppError::CITY_NOT_IN_PROVINCE);
                }

                $suburb = null;
                if (!empty($item['suburb'])) {
                    /** @var Suburb $suburb */
                    $suburb = $iri->extract($item['suburb'], Suburb::class, 'suburbs');
                    if ($suburb->getCities()?->getId() !== $city->getId()) {
                        return $this->errorJson(AppError::SUBURB_NOT_IN_CITY);
                    }
                }

                $address->setCity($city)->setSuburb($suburb);
            }

            // ── District branch ──
            if (!empty($item['district'])) {
                /** @var District $district */
                $district = $iri->extract($item['district'], District::class, 'districts');

                if ($district->getProvince()?->getId() !== $province->getId()) {
                    return $this->errorJson(AppError::DISTRICT_NOT_IN_PROVINCE);
                }

                $community  = null;
                $settlement = null;
                $village    = null;

                if (!empty($item['community'])) {
                    /** @var Community $community */
                    $community = $iri->extract($item['community'], Community::class, 'communities');
                    if ($community->getDistrict()?->getId() !== $district->getId()) {
                        return $this->errorJson(AppError::COMMUNITY_NOT_IN_DISTRICT);
                    }
                }

                if (!empty($item['settlement'])) {
                    /** @var Settlement $settlement */
                    $settlement = $iri->extract($item['settlement'], Settlement::class, 'settlements');
                    if ($settlement->getDistrict()?->getId() !== $district->getId()) {
                        return $this->errorJson(AppError::SETTLEMENT_NOT_IN_DISTRICT);
                    }
                }

                if (!empty($item['village'])) {
                    if (!$settlement) {
                        return $this->errorJson(AppError::SETTLEMENT_REQUIRED_FOR_VILLAGE);
                    }
                    /** @var Village $village */
                    $village = $iri->extract($item['village'], Village::class, 'villages');
                    if ($village->getSettlement()?->getId() !== $settlement->getId()) {
                        return $this->errorJson(AppError::VILLAGE_NOT_IN_SETTLEMENT);
                    }
                }

                $address
                    ->setDistrict($district)
                    ->setCommunity($community)
                    ->setSettlement($settlement)
                    ->setVillage($village);
            }

            $ticket->addAddress($address);
            $em->persist($address);
        }

        return null;
    }
}

<?php

namespace App\DataFixture\Ticket;

use App\Entity\Extra\Translation;
use App\Entity\Ticket\Ticket;
use App\Entity\Ticket\Unit;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Common\DataFixtures\DependentFixtureInterface;
use Doctrine\Persistence\ObjectManager;

class UnitFixture extends Fixture implements DependentFixtureInterface
{
    public function load(ObjectManager $manager): void
    {
        $unitsData = [
            [
                'title' => 'м³', 'description' => 'Кубический метр', 'ref' => 'cubemeter',
                'translations' => [
                    'ru'  => ['title' => 'м³',    'desc' => 'Кубический метр'],
                    'tj'  => ['title' => 'м³',    'desc' => 'Метри кубӣ'],
                    'eng' => ['title' => 'm³',    'desc' => 'Cubic metre'],
                ],
            ],
            [
                'title' => 'м²', 'description' => 'Квадратный метр', 'ref' => 'squaremeter',
                'translations' => [
                    'ru'  => ['title' => 'м²',    'desc' => 'Квадратный метр'],
                    'tj'  => ['title' => 'м²',    'desc' => 'Метри квадратӣ'],
                    'eng' => ['title' => 'm²',    'desc' => 'Square metre'],
                ],
            ],
            [
                'title' => 'м', 'description' => 'Погонный метр', 'ref' => 'meter',
                'translations' => [
                    'ru'  => ['title' => 'м',     'desc' => 'Погонный метр'],
                    'tj'  => ['title' => 'м',     'desc' => 'Метри тӯлонӣ'],
                    'eng' => ['title' => 'm',     'desc' => 'Linear metre'],
                ],
            ],
            [
                'title' => 'шт', 'description' => 'Поштучно', 'ref' => 'pieces',
                'translations' => [
                    'ru'  => ['title' => 'шт',    'desc' => 'Поштучно'],
                    'tj'  => ['title' => 'дона',  'desc' => 'Ба дона'],
                    'eng' => ['title' => 'pcs',   'desc' => 'Per piece'],
                ],
            ],
            [
                'title' => 'кг', 'description' => 'Килограмм', 'ref' => 'kg',
                'translations' => [
                    'ru'  => ['title' => 'кг',    'desc' => 'Килограмм'],
                    'tj'  => ['title' => 'кг',    'desc' => 'Килограмм'],
                    'eng' => ['title' => 'kg',    'desc' => 'Kilogram'],
                ],
            ],
            [
                'title' => 'т', 'description' => 'Тонна', 'ref' => 'ton',
                'translations' => [
                    'ru'  => ['title' => 'т',     'desc' => 'Тонна'],
                    'tj'  => ['title' => 'т',     'desc' => 'Тонна'],
                    'eng' => ['title' => 't',     'desc' => 'Ton'],
                ],
            ],
            [
                'title' => 'л', 'description' => 'Литр', 'ref' => 'liter',
                'translations' => [
                    'ru'  => ['title' => 'л',     'desc' => 'Литр'],
                    'tj'  => ['title' => 'л',     'desc' => 'Литр'],
                    'eng' => ['title' => 'l',     'desc' => 'Litre'],
                ],
            ],
            [
                'title' => 'комп.', 'description' => 'Комплект', 'ref' => 'kit',
                'translations' => [
                    'ru'  => ['title' => 'комп.', 'desc' => 'Комплект'],
                    'tj'  => ['title' => 'маҷм.', 'desc' => 'Маҷмӯа'],
                    'eng' => ['title' => 'set',   'desc' => 'Set / Kit'],
                ],
            ],
            [
                'title' => 'ч', 'description' => 'Час (почасовая оплата)', 'ref' => 'hour',
                'translations' => [
                    'ru'  => ['title' => 'ч',     'desc' => 'Час (почасовая оплата)'],
                    'tj'  => ['title' => 'соат',  'desc' => 'Соат (музди соатӣ)'],
                    'eng' => ['title' => 'hr',    'desc' => 'Hour (hourly rate)'],
                ],
            ],
            [
                'title' => 'день', 'description' => 'День (посуточная оплата)', 'ref' => 'day',
                'translations' => [
                    'ru'  => ['title' => 'день',  'desc' => 'День (посуточная оплата)'],
                    'tj'  => ['title' => 'рӯз',   'desc' => 'Рӯз (музди рӯзона)'],
                    'eng' => ['title' => 'day',   'desc' => 'Day (daily rate)'],
                ],
            ],
            [
                'title' => 'н/у', 'description' => 'Без единицы', 'ref' => 'pieceless',
                'translations' => [
                    'ru'  => ['title' => 'н/у',   'desc' => 'Без единицы измерения'],
                    'tj'  => ['title' => 'б/в',   'desc' => 'Бе воҳиди ченак'],
                    'eng' => ['title' => 'N/A',   'desc' => 'No unit of measurement'],
                ],
            ],
        ];

        $refs = [];
        foreach ($unitsData as $data) {
            $unit = new Unit();
            $unit->setTitle($data['title']);
            $unit->setDescription($data['description']);

            foreach ($data['translations'] as $locale => $trans) {
                $translation = (new Translation())
                    ->setLocale($locale)
                    ->setTitle($trans['title'])
                    ->setDescription($trans['desc']);
                $unit->addTranslation($translation);
            }

            $manager->persist($unit);
            $refs[$data['ref']] = $unit;
        }

        $refs['pieceless']->addUserTicket($this->getReference('ticket', Ticket::class));
        $refs['pieceless']->addUserTicket($this->getReference('service', Ticket::class));

        foreach ($refs as $ref => $unit) {
            $this->addReference($ref, $unit);
        }

        $manager->flush();
    }

    public function getDependencies(): array
    {
        return [
            TicketFixture::class,
        ];
    }
}

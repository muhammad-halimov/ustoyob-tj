<?php

namespace App\DataFixture\Service;

use App\Entity\Extra\Translation;
use App\Entity\Ticket\Category;
use App\Entity\Ticket\Ticket;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Persistence\ObjectManager;
use ReflectionClass;

class CategoryFixture extends Fixture
{
    public function load(ObjectManager $manager): void
    {
        $categoriesData = [
            'santexnika' => [
                'translations' => [
                    'tj' => 'Сантехника',
                    'ru' => 'Сантехника',
                    'eng' => 'Plumbing',
                ],
                'description' => "Кори сантехникӣ\nСантехнические работы\nPlumbing works",
                'ticket' => 'ticket',
            ],
            'it' => [
                'translations' => [
                    'tj' => 'ТИ',
                    'ru' => 'IT',
                    'eng' => 'IT',
                ],
                'description' => "Барномасозӣ, амнияти кибернетикӣ, devops\nПрограммирование, кибербезопасность, devops\nProgramming, cybersecurity, devops",
                'ticket' => 'service',
            ],
            'beauty' => [
                'translations' => [
                    'tj' => 'Зебоӣ ва саломатӣ',
                    'ru' => 'Красота и здоровье',
                    'eng' => 'Beauty and Health',
                ],
                'description' => "Хизматҳои зебоӣ ва саломатӣ\nУслуги красоты и здоровья\nBeauty and health services",
                'ticket' => null,
            ],
        ];

        foreach ($categoriesData as $key => $data) {
            $category = new Category();

            if ($data['ticket'] !== null) {
                $category->addUserTicket($this->getReference($data['ticket'], Ticket::class));
            }

            $reflection = new ReflectionClass($category);
            /** @noinspection PhpStatementHasEmptyBodyInspection */
            while (!$reflection->hasProperty('translations') && $reflection = $reflection->getParentClass());
            $property = $reflection->getProperty('translations');
            $property->setValue($category, new ArrayCollection());

            foreach ($data['translations'] as $locale => $title) {
                $translation = (new Translation())
                    ->setTitle($title)
                    ->setLocale($locale)
                    ->setCategory($category->setDescription($data['description']));

                $category->addTranslation($translation);
            }

            $manager->persist($category);
            $this->addReference($key, $category);
        }

        $manager->flush();
    }

    public function getDependencies(): array
    {
        return [
            Ticket::class
        ];
    }
}

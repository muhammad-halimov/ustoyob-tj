<?php

namespace App\DataFixture\Service;

use App\Entity\Extra\Translation;
use App\Entity\User\Occupation;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Persistence\ObjectManager;
use ReflectionClass;

class OccupationFixture extends Fixture
{
    public function load(ObjectManager $manager): void
    {
        $occupationsData = [
            'santexnik' => [
                'translations' => [
                    'tj' => 'Сантехники',
                    'ru' => 'Сантехник',
                    'eng' => 'Plumber',
                ],
                'description' => "Кори сантехникӣ\nСантехнические работы\nPlumbing works",
            ],
            'programmer' => [
                'translations' => [
                    'tj' => 'Барномасоз',
                    'ru' => 'Программист',
                    'eng' => 'Programmer',
                ],
                'description' => "Барномасозӣ, амнияти кибернетикӣ, devops\nПрограммирование, кибербезопасность, devops\nProgramming, cybersecurity, devops",
            ],
            'metalist' => [
                'translations' => [
                    'tj' => 'Слесар',
                    'ru' => 'Слесарь',
                    'eng' => 'Metalworker',
                ],
                'description' => "Кор бо металл ва механизмҳо\nРаботы с металлом и механизмами\nMetal and mechanical works",
            ],
        ];

        foreach ($occupationsData as $key => $data) {
            $occupation = new Occupation();

            $reflection = new ReflectionClass($occupation);
            /** @noinspection PhpStatementHasEmptyBodyInspection */
            while (!$reflection->hasProperty('translations') && $reflection = $reflection->getParentClass());
            $property = $reflection->getProperty('translations');
            $property->setValue($occupation, new ArrayCollection());

            foreach ($data['translations'] as $locale => $title) {
                $translation = (new Translation())
                    ->setTitle($title)
                    ->setLocale($locale)
                    ->setOccupation($occupation->setDescription($data['description']));

                $occupation->addTranslation($translation);
            }

            $manager->persist($occupation);
            $this->addReference($key, $occupation);
        }

        $manager->flush();
    }

    public function getDependencies(): array
    {
        return [];
    }
}

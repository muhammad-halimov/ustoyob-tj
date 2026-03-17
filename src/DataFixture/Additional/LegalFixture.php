<?php

namespace App\DataFixture\Additional;

use App\Entity\Extra\Translation;
use App\Entity\Legal\Legal;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;

class LegalFixture extends Fixture
{
    private const array LEGALS = [
        [
            'type'        => 'terms_of_use',
            'translations' => [
                'ru'  => ['title' => 'Политики использования',        'description' => 'Настоящие правила регулируют порядок использования платформы Ustoyob. Пользователь обязан соблюдать условия сервиса, не нарушать права третьих лиц и действовать добросовестно.'],
                'tj'  => ['title' => 'Шартҳои истифодабарӣ',           'description' => 'Ин қоидаҳо тартиби истифодаи платформаи Ustoyob-ро танзим мекунанд. Корбар бояд шартҳои хизматро риоя кунад ва ба ҳуқуқи дигарон халал нарасонад.'],
                'eng' => ['title' => 'Terms of Use',                   'description' => 'These terms govern the use of the Ustoyob platform. Users must comply with service rules, respect the rights of third parties, and act in good faith.'],
            ],
        ],
        [
            'type'        => 'privacy_policy',
            'translations' => [
                'ru'  => ['title' => 'Политика конфиденциальности',   'description' => 'Мы собираем только необходимые персональные данные для предоставления услуг. Ваши данные не передаются третьим лицам без вашего согласия. Вы имеете право запросить удаление своих данных в любое время.'],
                'tj'  => ['title' => 'Сиёсати махфият',               'description' => 'Мо танҳо маълумоти шахсии заруриро барои пешниҳоди хидматҳо ҷамъ мекунем. Маълумоти шумо бидуни розигии шумо ба шахсони сеюм дода намешавад.'],
                'eng' => ['title' => 'Privacy Policy',                 'description' => 'We collect only necessary personal data to provide services. Your data is never shared with third parties without your consent. You may request deletion of your data at any time.'],
            ],
        ],
        [
            'type'        => 'public_offer',
            'translations' => [
                'ru'  => ['title' => 'Публичная оферта',              'description' => 'Настоящая оферта является официальным предложением компании об оказании услуг через платформу Ustoyob. Принятие оферты происходит путём регистрации на платформе.'],
                'tj'  => ['title' => 'Офертаи оммавӣ',               'description' => 'Ин оферта пешниҳоди расмии ширкат барои пешниҳоди хидматҳо тавассути платформаи Ustoyob мебошад. Қабули оферта тавассути бақайдгирӣ дар платформа сурат мегирад.'],
                'eng' => ['title' => 'Public Offer',                   'description' => 'This offer is the official proposal by the company to provide services via the Ustoyob platform. Acceptance of the offer occurs upon registration on the platform.'],
            ],
        ],
    ];

    public function load(ObjectManager $manager): void
    {
        foreach (self::LEGALS as $data) {
            $legal = new Legal();
            $legal->setType($data['type']);

            // Set default title from Russian translation
            $legal->setTitle($data['translations']['ru']['title']);
            $legal->setDescription($data['translations']['ru']['description']);

            foreach ($data['translations'] as $locale => $trans) {
                $translation = (new Translation())
                    ->setLocale($locale)
                    ->setTitle($trans['title'])
                    ->setDescription($trans['description'])
                    ->setLegal($legal);

                $legal->addTranslation($translation);
            }

            $manager->persist($legal);
            $this->addReference('legal_' . $data['type'], $legal);
        }

        $manager->flush();
    }
}

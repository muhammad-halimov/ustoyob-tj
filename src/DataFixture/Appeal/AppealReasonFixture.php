<?php

namespace App\DataFixture\Appeal;

use App\Entity\Appeal\Reason\AppealReason;
use App\Entity\Extra\Translation;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Persistence\ObjectManager;
use ReflectionClass;

class AppealReasonFixture extends Fixture
{
    private const array REASONS = [
        'offend' => [
            'applicableTo' => 'chat',
            'authRequired' => true,
            'translations' => [
                'ru'  => 'Оскорбление/Маты',
                'tj'  => 'Дашном/Фаҳш',
                'eng' => 'Insult/Profanity',
            ],
        ],
        'rude_language' => [
            'applicableTo' => 'chat',
            'authRequired' => true,
            'translations' => [
                'ru'  => 'Грубая лексика',
                'tj'  => 'Забони дағал',
                'eng' => 'Rude Language',
            ],
        ],
        'lateness' => [
            'applicableTo' => 'ticket',
            'authRequired' => true,
            'translations' => [
                'ru'  => 'Опоздание/Отсутствие',
                'tj'  => 'Дер омадан/Набудан',
                'eng' => 'Lateness/Absence',
            ],
        ],
        'bad_quality' => [
            'applicableTo' => 'ticket',
            'authRequired' => true,
            'translations' => [
                'ru'  => 'Плохое качество',
                'tj'  => 'Сифати бад',
                'eng' => 'Bad Quality',
            ],
        ],
        'property_damage' => [
            'applicableTo' => 'ticket',
            'authRequired' => true,
            'translations' => [
                'ru'  => 'Повреждения имущества',
                'tj'  => 'Зарари молу мулк',
                'eng' => 'Property Damage',
            ],
        ],
        'overpricing' => [
            'applicableTo' => 'ticket',
            'authRequired' => true,
            'translations' => [
                'ru'  => 'Завышение стоимости',
                'tj'  => 'Қимати баланд',
                'eng' => 'Overpricing',
            ],
        ],
        'unprofessionalism' => [
            'applicableTo' => 'ticket',
            'authRequired' => true,
            'translations' => [
                'ru'  => 'Непрофессионализм',
                'tj'  => 'Беихтисосӣ',
                'eng' => 'Unprofessionalism',
            ],
        ],
        'fraud' => [
            'applicableTo' => 'overall',
            'authRequired' => false,
            'translations' => [
                'ru'  => 'Мошенничество',
                'tj'  => 'Фиреб',
                'eng' => 'Fraud',
            ],
        ],
        'racism_nazism_xenophobia' => [
            'applicableTo' => 'overall',
            'authRequired' => false,
            'translations' => [
                'ru'  => 'Расизм/Нацизм/Ксенофобия',
                'tj'  => 'Нажодпарастӣ/Нацизм/Бегонаситезӣ',
                'eng' => 'Racism/Nazism/Xenophobia',
            ],
        ],
        'other' => [
            'applicableTo' => 'overall',
            'authRequired' => false,
            'translations' => [
                'ru'  => 'Другое',
                'tj'  => 'Дигар',
                'eng' => 'Other',
            ],
        ],
        'fake_review' => [
            'applicableTo' => 'review',
            'authRequired' => false,
            'translations' => [
                'ru'  => 'Фальшивый отзыв',
                'tj'  => 'Баҳои қалбакӣ',
                'eng' => 'Fake Review',
            ],
        ],
        'offensive_review' => [
            'applicableTo' => 'review',
            'authRequired' => false,
            'translations' => [
                'ru'  => 'Оскорбительный отзыв',
                'tj'  => 'Баҳои дашномдор',
                'eng' => 'Offensive Review',
            ],
        ],
        'unfair_rating' => [
            'applicableTo' => 'review',
            'authRequired' => false,
            'translations' => [
                'ru'  => 'Несправедливая оценка',
                'tj'  => 'Баҳодиҳии ноодилона',
                'eng' => 'Unfair Rating',
            ],
        ],
        'account_issue' => [
            'applicableTo' => 'support',
            'authRequired' => true,
            'translations' => [
                'ru'  => 'Проблемы с аккаунтом',
                'tj'  => 'Мушкилоти аккаунт',
                'eng' => 'Account Issues',
            ],
        ],
        'ads_issue' => [
            'applicableTo' => 'support',
            'authRequired' => true,
            'translations' => [
                'ru'  => 'Проблемы с объявлениями',
                'tj'  => 'Мушкилоти эълонҳо',
                'eng' => 'Ads Issues',
            ],
        ],
        'platform_question' => [
            'applicableTo' => 'support',
            'authRequired' => true,
            'translations' => [
                'ru'  => 'Вопросы по работе платформы',
                'tj'  => 'Саволҳо оид ба кори платформа',
                'eng' => 'Platform Questions',
            ],
        ],
        'tech_issue' => [
            'applicableTo' => 'support',
            'authRequired' => true,
            'translations' => [
                'ru'  => 'Технические проблемы',
                'tj'  => 'Мушкилоти техникӣ',
                'eng' => 'Technical Issues',
            ],
        ],
        'law_question' => [
            'applicableTo' => 'support',
            'authRequired' => true,
            'translations' => [
                'ru'  => 'Юридические вопросы',
                'tj'  => 'Саволҳои ҳуқуқӣ',
                'eng' => 'Legal Questions',
            ],
        ],
        'suggestion' => [
            'applicableTo' => 'support',
            'authRequired' => true,
            'translations' => [
                'ru'  => 'Предложения и фидбек',
                'tj'  => 'Пешниҳодҳо ва фидбек',
                'eng' => 'Suggestions & Feedback',
            ],
        ],
        'urgent_support' => [
            'applicableTo' => 'support',
            'authRequired' => true,
            'translations' => [
                'ru'  => 'Экстренный',
                'tj'  => 'Фаврӣ',
                'eng' => 'Urgent',
            ],
        ],
    ];

    public function load(ObjectManager $manager): void
    {
        foreach (self::REASONS as $code => $data) {
            $reason = new AppealReason();
            $reason->setCode($code);
            $reason->setApplicableTo($data['applicableTo']);
            $reason->setAuthRequired($data['authRequired']);

            // Initialize translations collection via reflection (same pattern as CategoryFixture)
            $reflection = new ReflectionClass($reason);
            /** @noinspection PhpStatementHasEmptyBodyInspection */
            while (!$reflection->hasProperty('translations') && $reflection = $reflection->getParentClass());
            $reflection->getProperty('translations')->setValue($reason, new ArrayCollection());

            foreach ($data['translations'] as $locale => $title) {
                $translation = (new Translation())
                    ->setLocale($locale)
                    ->setTitle($title)
                    ->setReason($reason);

                $reason->addTranslation($translation);
            }

            $manager->persist($reason);
            $this->addReference('appeal_reason_' . $code, $reason);
        }

        $manager->flush();
    }
}

<?php

namespace App\DataFixture\Prod\Additional;

use App\Entity\Extra\Translation;
use App\Entity\Legal\Legal;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Bundle\FixturesBundle\FixtureGroupInterface;
use Doctrine\Persistence\ObjectManager;

/**
 * Юридические документы (Legal) — полные тексты на tj/eng/ru (порядок как в
 * Translation::LOCALES; таджикский — язык по умолчанию и приоритетная версия).
 *
 * Раньше здесь были короткие заглушки в 1-2 предложения прямо в массиве. Теперь
 * полные тексты живут в docs/legal/{tj,eng,ru}/{файл}.md — единый источник
 * правды, который правят/показывают юристу как обычные markdown-файлы, а
 * фикстура только читает их (см. readText()), без дублирования ~11 тыс. слов
 * в PHP. Добавлен 4-й документ — third_party (права третьих лиц, см.
 * Legal::TYPES).
 *
 * Описание отдаётся как обычный текст: DescriptionTrait::getDescription()
 * делает strip_tags(), а админка редактирует его в обычной textarea (см.
 * TranslationCrudController) — поэтому markdown-разметка при загрузке
 * превращается в простой текст с сохранением нумерации и переносов строк.
 *
 * Если файла с полным текстом нет (например, docs/ не попала в деплой),
 * фикстура НЕ падает: подставляется короткий запасной текст из 'short' (см.
 * LEGALS) и в STDERR пишется предупреждение — чтобы подмену было видно, а
 * загрузка справочников не срывалась из-за отсутствия документации.
 *
 * ВАЖНО: в текстах остались плейсхолдеры в квадратных скобках ([НАИМЕНОВАНИЕ /
 * ФИО ОПЕРАТОРА], [АДРЕС], [E-MAIL ДЛЯ ОБРАЩЕНИЙ], [ДАТА ВСТУПЛЕНИЯ В СИЛУ]) —
 * их нужно заполнить в docs/legal/*, прежде чем грузить фикстуры на прод (или
 * поправить готовые записи в админке: Legal → Переводы).
 */
class LegalFixture extends Fixture implements FixtureGroupInterface
{
    public static function getGroups(): array
    {
        return ['prod'];
    }

    /**
     * 'file' — имя markdown-файла в docs/legal/{locale}/ (одинаковое во всех
     * языковых папках). Заголовки заданы явно, а не берутся из H1 файла: H1
     * длиннее колонки title (64 символа).
     */
    private const array LEGALS = [
        [
            'type'   => 'terms_of_use',
            'file'   => 'terms-of-use',
            'titles' => ['tj' => 'Шартҳои истифода', 'eng' => 'Terms of Use', 'ru' => 'Условия использования'],
            'short'  => [
                'tj'  => 'Ин қоидаҳо тартиби истифодаи платформаи USTOYOB.TJ-ро танзим мекунанд. Корбар бояд шартҳои хизматро риоя кунад ва ба ҳуқуқи дигарон халал нарасонад.',
                'eng' => 'These terms govern the use of the USTOYOB.TJ platform. Users must comply with service rules, respect the rights of third parties, and act in good faith.',
                'ru'  => 'Настоящие правила регулируют порядок использования платформы USTOYOB.TJ. Пользователь обязан соблюдать условия сервиса, не нарушать права третьих лиц и действовать добросовестно.',
            ],
        ],
        [
            'type'   => 'privacy_policy',
            'file'   => 'privacy-policy',
            'titles' => ['tj' => 'Сиёсати махфият', 'eng' => 'Privacy Policy', 'ru' => 'Политика конфиденциальности'],
            'short'  => [
                'tj'  => 'Мо танҳо маълумоти шахсии заруриро барои пешниҳоди хидматҳо ҷамъ мекунем. Маълумоти шумо бидуни розигии шумо ба шахсони сеюм дода намешавад. Шумо ҳуқуқ доред дар ҳар вақт несткунии маълумоти худро талаб кунед.',
                'eng' => 'We collect only necessary personal data to provide services. Your data is never shared with third parties without your consent. You may request deletion of your data at any time.',
                'ru'  => 'Мы собираем только необходимые персональные данные для предоставления услуг. Ваши данные не передаются третьим лицам без вашего согласия. Вы имеете право запросить удаление своих данных в любое время.',
            ],
        ],
        [
            'type'   => 'public_offer',
            'file'   => 'public-offer',
            'titles' => ['tj' => 'Офертаи оммавӣ', 'eng' => 'Public Offer', 'ru' => 'Публичная оферта'],
            'short'  => [
                'tj'  => 'Ин оферта пешниҳоди расмии оператори платформаи USTOYOB.TJ барои фароҳам овардани дастрасӣ ба функсияҳои он мебошад. Қабули оферта тавассути бақайдгирӣ ё истифодаи платформа сурат мегирад.',
                'eng' => 'This offer is the official proposal by the USTOYOB.TJ platform operator to provide access to its features. Acceptance of the offer occurs upon registration or use of the platform.',
                'ru'  => 'Настоящая оферта является официальным предложением оператора платформы USTOYOB.TJ о предоставлении доступа к её функциям. Принятие оферты происходит путём регистрации или использования платформы.',
            ],
        ],
        [
            'type'   => 'third_party',
            'file'   => 'third-party-notice',
            'titles' => ['tj' => 'Ҳуқуқи шахсони сеюм', 'eng' => 'Third-Party Rights', 'ru' => 'Права третьих лиц'],
            'short'  => [
                'tj'  => 'Ҳамаи тасвирҳо, логотипҳо, аломатҳои молӣ ва маводҳои дигари шахсони сеюм, ки дар платформаи USTOYOB.TJ намоиш дода мешаванд, моликияти соҳибони худ боқӣ мемонанд. Мундариҷаи Корбарон ба Корбароне тааллуқ дорад, ки онро бор кардаанд.',
                'eng' => 'All images, logos, trademarks and other third-party materials shown on the USTOYOB.TJ platform remain the property of their owners. User content belongs to the users who uploaded it.',
                'ru'  => 'Все изображения, логотипы, товарные знаки и иные материалы третьих лиц, показываемые на платформе USTOYOB.TJ, остаются собственностью их владельцев. Пользовательский контент принадлежит загрузившим его пользователям.',
            ],
        ],
    ];

    public function load(ObjectManager $manager): void
    {
        foreach (self::LEGALS as $data) {
            $legal = new Legal();
            $legal->setType($data['type']);

            $texts = [];
            foreach ($data['titles'] as $locale => $title) {
                $texts[$locale] = $this->readText($locale, $data['file'], $data['short'][$locale]);
            }

            // Значение на самой сущности — фолбэк на таджикский (язык по
            // умолчанию проекта — ?locale=tj, см. AGENTS.md и порядок в
            // Translation::LOCALES): реальный текст по ?locale= подставляет
            // localizeEntityFull() на чтение.
            $legal->setTitle($data['titles']['tj']);
            $legal->setDescription($texts['tj']);

            foreach ($data['titles'] as $locale => $title) {
                $translation = (new Translation())
                    ->setLocale($locale)
                    ->setTitle($title)
                    ->setDescription($texts[$locale])
                    ->setLegal($legal);

                $legal->addTranslation($translation);
            }

            $manager->persist($legal);
            $this->addReference('legal_' . $data['type'], $legal);
        }

        $manager->flush();
    }

    /**
     * Читает docs/legal/{locale}/{file}.md и превращает markdown в обычный
     * текст: убирает заголовок H1 (он в title), маркеры заголовков '#', жирный
     * '**' и курсивную строку-пометку о переводе; нумерация разделов и
     * маркированные списки остаются как есть. Если файла нет — возвращает
     * $fallback (короткий запасной текст).
     */
    private function readText(string $locale, string $file, string $fallback): string
    {
        $path = dirname(__DIR__, 4) . "/docs/legal/{$locale}/{$file}.md";

        // Файла нет — не роняем загрузку справочников, ставим короткий текст.
        if (!is_file($path)) {
            fwrite(STDERR, "LegalFixture: файл {$path} не найден, использован короткий текст.\n");

            return $fallback;
        }

        $text = (string) file_get_contents($path);

        $text = preg_replace('/\A# [^\n]*\n+/u', '', $text);   // H1 — это title
        $text = preg_replace('/^#{2,6}\s*/mu', '', $text);      // "## 1. Раздел" → "1. Раздел"
        $text = preg_replace('/^\*(?!\*)(.+?)\*$/mu', '$1', $text); // *курсивная строка* → без звёздочек
        $text = str_replace('**', '', $text);                   // жирный
        $text = preg_replace("/\n{3,}/", "\n\n", $text);

        return trim($text);
    }
}

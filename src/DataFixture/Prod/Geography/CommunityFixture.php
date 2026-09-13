<?php

namespace App\DataFixture\Prod\Geography;

use App\Entity\Extra\Translation;
use App\Entity\Geography\District\Community;
use App\Entity\Geography\District\District;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Bundle\FixturesBundle\FixtureGroupInterface;
use Doctrine\Common\DataFixtures\DependentFixtureInterface;
use Doctrine\Persistence\ObjectManager;

/**
 * Communities (джамоаты / кварталы) within districts.
 */
class CommunityFixture extends Fixture implements DependentFixtureInterface, FixtureGroupInterface
{
    public static function getGroups(): array
    {
        return ['prod'];
    }

    /**
     * БАГФИКС (13.09.2026, тот же класс проблемы, что и у City/Province/
     * District/Suburb — см. их докблоки): $desc было одной русской строкой
     * независимо от локали. Теперь per-locale, через Translation.
     */
    public function load(ObjectManager $manager): void
    {
        // [$ref, $districtRef, $translations (title+description по локали)]
        $communitiesData = [
            // ── Душанбе ──
            ['comm_sino_zarnisor', 'sino', [
                'tj'  => ['title' => 'Зарнисор', 'description' => 'Ҷамоати Зарнисор, ноҳияи Сино, Душанбе'],
                'ru'  => ['title' => 'Зарнисор', 'description' => 'Джамоати Зарнисор, район Сино, Душанбе'],
                'eng' => ['title' => 'Zarnisor', 'description' => 'Zarnisor Jamoat, Sino District, Dushanbe'],
            ]],
            ['comm_sino_bahor', 'sino', [
                'tj'  => ['title' => 'Баҳор', 'description' => 'Ҷамоати Баҳор, ноҳияи Сино, Душанбе'],
                'ru'  => ['title' => 'Бахор', 'description' => 'Джамоати Бахор, район Сино, Душанбе'],
                'eng' => ['title' => 'Bahor', 'description' => 'Bahor Jamoat, Sino District, Dushanbe'],
            ]],
            ['comm_shev_nav', 'schevchenko', [
                'tj'  => ['title' => 'Навобод', 'description' => 'Ҷамоати Навобод, ноҳияи Шевченко, Душанбе'],
                'ru'  => ['title' => 'Навобод', 'description' => 'Джамоати Навобод, район Шевченко, Душанбе'],
                'eng' => ['title' => 'Navobod', 'description' => 'Navobod Jamoat, Shevchenko District, Dushanbe'],
            ]],
            // ── ГРРП ──
            ['comm_rudaki_rohati', 'rudaki', [
                'tj'  => ['title' => 'Роҳатӣ', 'description' => 'Ҷамоати Роҳатӣ, ноҳияи Рӯдакӣ'],
                'ru'  => ['title' => 'Рохати', 'description' => 'Джамоати Рохати, район Рудаки'],
                'eng' => ['title' => 'Rokhati', 'description' => 'Rokhati Jamoat, Rudaki District'],
            ]],
            ['comm_rudaki_sarband', 'rudaki', [
                'tj'  => ['title' => 'Сарбанд', 'description' => 'Ҷамоати Сарбанд, ноҳияи Рӯдакӣ'],
                'ru'  => ['title' => 'Сарбанд', 'description' => 'Джамоати Сарбанд, район Рудаки'],
                'eng' => ['title' => 'Sarband', 'description' => 'Sarband Jamoat, Rudaki District'],
            ]],
            ['comm_huroson_kofiron', 'huroson', [
                'tj'  => ['title' => 'Кофирниҳон', 'description' => 'Ҷамоати Кофирниҳон, ноҳияи Хуросон'],
                'ru'  => ['title' => 'Кофирниган', 'description' => 'Джамоати Кофирниган, район Хуросон'],
                'eng' => ['title' => 'Kofirnigan', 'description' => 'Kofirnigan Jamoat, Huroson District'],
            ]],
            // ── Согдийская ──
            ['comm_spitamen_shirin', 'spitamen', [
                'tj'  => ['title' => 'Ширин', 'description' => 'Ҷамоати Ширин, ноҳияи Спитамен'],
                'ru'  => ['title' => 'Ширин', 'description' => 'Джамоати Ширин, район Спитамен'],
                'eng' => ['title' => 'Shirin', 'description' => 'Shirin Jamoat, Spitamen District'],
            ]],
            ['comm_mastchoh_zafari', 'mastchoh', [
                'tj'  => ['title' => 'Зафарӣ', 'description' => 'Ҷамоати Зафарӣ, ноҳияи Мастчоҳ'],
                'ru'  => ['title' => 'Зафари', 'description' => 'Джамоати Зафари, район Мастчох'],
                'eng' => ['title' => 'Zafari', 'description' => 'Zafari Jamoat, Mastchoh District'],
            ]],
            // ── Хатлон ──
            ['comm_vakhsh_dusti', 'vakhsh_d', [
                'tj'  => ['title' => 'Дӯстӣ', 'description' => 'Ҷамоати Дӯстӣ, ноҳияи Вахш'],
                'ru'  => ['title' => 'Дусти', 'description' => 'Джамоати Дусти, район Вахш'],
                'eng' => ['title' => 'Dusti', 'description' => 'Dusti Jamoat, Vakhsh District'],
            ]],
            ['comm_vakhsh_nav', 'vakhsh_d', [
                'tj'  => ['title' => 'Нав', 'description' => 'Ҷамоати Нав, ноҳияи Вахш'],
                'ru'  => ['title' => 'Нов', 'description' => 'Джамоати Нов, район Вахш'],
                'eng' => ['title' => 'Nov', 'description' => 'Nov Jamoat, Vakhsh District'],
            ]],
            ['comm_kulob_abdulloev', 'kulob_d', [
                'tj'  => ['title' => 'Абдуллоев', 'description' => 'Ҷамоати Абдуллоев, Кӯлоб'],
                'ru'  => ['title' => 'Абдуллоев', 'description' => 'Джамоати Абдуллоев, Куляб'],
                'eng' => ['title' => 'Abdulloev', 'description' => 'Abdulloev Jamoat, Kulob'],
            ]],
            // ── ГБАО ──
            ['comm_shugnan_main', 'shugnan', [
                'tj'  => ['title' => 'Шуғнон', 'description' => 'Ҷамоати Шуғнон, ноҳияи Шуғнон, ВМКБ'],
                'ru'  => ['title' => 'Шугнан', 'description' => 'Джамоати Шугнан, район Шугнан, ГБАО'],
                'eng' => ['title' => 'Shugnan', 'description' => 'Shugnan Jamoat, Shugnan District, GBAO'],
            ]],
            ['comm_rushan_porshnev', 'rushan', [
                'tj'  => ['title' => 'Поршнев', 'description' => 'Ҷамоати Поршнев, ноҳияи Рӯшон, ВМКБ'],
                'ru'  => ['title' => 'Поршнев', 'description' => 'Джамоати Поршнев, район Рушан, ГБАО'],
                'eng' => ['title' => 'Porshnev', 'description' => 'Porshnev Jamoat, Rushan District, GBAO'],
            ]],
            ['comm_vanj_yamg', 'vanj', [
                'tj'  => ['title' => 'Ямғ', 'description' => 'Ҷамоати Ямғ, ноҳияи Ванҷ, ВМКБ'],
                'ru'  => ['title' => 'Ямг', 'description' => 'Джамоати Ямг, район Ванч, ГБАО'],
                'eng' => ['title' => 'Yamg', 'description' => 'Yamg Jamoat, Vanj District, GBAO'],
            ]],
            // ── ГРРП (новые районы) ──
            ['comm_hisor_gulistonobod', 'hisor_d', [
                'tj'  => ['title' => 'Гулистонобод', 'description' => 'Ҷамоати Гулистонобод, ноҳияи Ҳисор'],
                'ru'  => ['title' => 'Гулистанабад', 'description' => 'Джамоати Гулистанабад, район Гиссар'],
                'eng' => ['title' => 'Gulistonobod', 'description' => 'Gulistonobod Jamoat, Hisor District'],
            ]],
            ['comm_tursunzoda_karatag', 'tursunzoda_d', [
                'tj'  => ['title' => 'Қаратоғ', 'description' => 'Ҷамоати Қаратоғ, ноҳияи Турсунзода'],
                'ru'  => ['title' => 'Каратаг', 'description' => 'Джамоати Каратаг, район Турсунзаде'],
                'eng' => ['title' => 'Karatag', 'description' => 'Karatag Jamoat, Tursunzoda District'],
            ]],
            ['comm_vahdat_gulshan', 'vahdat_d', [
                'tj'  => ['title' => 'Гулшан', 'description' => 'Ҷамоати Гулшан, ноҳияи Ваҳдат'],
                'ru'  => ['title' => 'Гулшан', 'description' => 'Джамоати Гулшан, район Вахдат'],
                'eng' => ['title' => 'Gulshan', 'description' => 'Gulshan Jamoat, Vahdat District'],
            ]],
            // ── Согдийская область (новые районы) ──
            ['comm_isfara_chorku', 'isfara_d', [
                'tj'  => ['title' => 'Чоркӯҳ', 'description' => 'Ҷамоати Чоркӯҳ, ноҳияи Исфара'],
                'ru'  => ['title' => 'Чоркух', 'description' => 'Джамоати Чоркух, район Исфара'],
                'eng' => ['title' => 'Chorku', 'description' => 'Chorku Jamoat, Isfara District'],
            ]],
            ['comm_ghafurov_oim', 'ghafurov', [
                'tj'  => ['title' => 'Ойим', 'description' => 'Ҷамоати Ойим, ноҳияи Б. Ғафуров'],
                'ru'  => ['title' => 'Ойим', 'description' => 'Джамоати Ойим, район Б. Гафурова'],
                'eng' => ['title' => 'Oyim', 'description' => 'Oyim Jamoat, B. Ghafurov District'],
            ]],
            // ── Хатлонская область (новые районы) ──
            ['comm_farkhor_sarikhosor', 'farkhor_d', [
                'tj'  => ['title' => 'Сариҳосор', 'description' => 'Ҷамоати Сариҳосор, ноҳияи Фарҳор'],
                'ru'  => ['title' => 'Сарихосор', 'description' => 'Джамоати Сарихосор, район Фархор'],
                'eng' => ['title' => 'Sarikhosor', 'description' => 'Sarikhosor Jamoat, Farkhor District'],
            ]],
            ['comm_panj_darqad', 'panj', [
                'tj'  => ['title' => 'Дарқад', 'description' => 'Ҷамоати Дарқад, ноҳияи Панҷ'],
                'ru'  => ['title' => 'Даркад', 'description' => 'Джамоати Даркад, район Пяндж'],
                'eng' => ['title' => 'Darqad', 'description' => 'Darqad Jamoat, Panj District'],
            ]],
        ];

        foreach ($communitiesData as [$ref, $distRef, $translations]) {
            $community = new Community();

            // Фолбэк на самой сущности — тот же паттерн, что у City/Province/District/Suburb.
            $community->setDescription($translations['ru']['description']);

            foreach ($translations as $locale => $trans) {
                $community->addTranslation(
                    (new Translation())
                        ->setTitle($trans['title'])
                        ->setDescription($trans['description'])
                        ->setLocale($locale)
                        ->setAddress($community)
                );
            }

            /** @var District $district */
            $district = $this->getReference($distRef, District::class);
            $district->addCommunity($community);

            $manager->persist($community);
            $this->addReference($ref, $community);
        }

        $manager->flush();
    }

    public function getDependencies(): array
    {
        return [DistrictFixture::class];
    }
}

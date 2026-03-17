<?php

namespace App\DataFixture\Geography;

use App\Entity\Extra\Translation;
use App\Entity\Geography\District\Community;
use App\Entity\Geography\District\District;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Common\DataFixtures\DependentFixtureInterface;
use Doctrine\Persistence\ObjectManager;

/**
 * Communities (джамоаты / кварталы) within districts.
 */
class CommunityFixture extends Fixture implements DependentFixtureInterface
{
    public function load(ObjectManager $manager): void
    {
        // [$ref, $districtRef, $translations, $desc]
        $communitiesData = [
            // ── Душанбе ──
            ['comm_sino_zarnisor',   'sino',       ['tj' => 'Зарнисор',    'ru' => 'Зарнисор',    'eng' => 'Zarnisor'],   'Джамоати Зарнисор, район Сино, Душанбе'],
            ['comm_sino_bahor',      'sino',       ['tj' => 'Баҳор',       'ru' => 'Бахор',       'eng' => 'Bahor'],      'Джамоати Бахор, район Сино, Душанбе'],
            ['comm_shev_nav',        'schevchenko',['tj' => 'Навобод',     'ru' => 'Навобод',     'eng' => 'Navobod'],    'Джамоати Навобод, район Шевченко, Душанбе'],
            // ── ГРРП ──
            ['comm_rudaki_rohati',   'rudaki',     ['tj' => 'Роҳатӣ',     'ru' => 'Рохати',      'eng' => 'Rokhati'],    'Джамоати Рохати, район Рудаки'],
            ['comm_rudaki_sarband',  'rudaki',     ['tj' => 'Сарбанд',    'ru' => 'Сарбанд',     'eng' => 'Sarband'],    'Джамоати Сарбанд, район Рудаки'],
            ['comm_huroson_kofiron', 'huroson',    ['tj' => 'Кофирниҳон', 'ru' => 'Кофирниган',  'eng' => 'Kofirnigan'], 'Джамоати Кофирниган, район Хуросон'],
            // ── Согдийская ──
            ['comm_spitamen_shirin', 'spitamen',   ['tj' => 'Ширин',      'ru' => 'Ширин',       'eng' => 'Shirin'],     'Джамоати Ширин, район Спитамен'],
            ['comm_mastchoh_zafari', 'mastchoh',   ['tj' => 'Зафарӣ',    'ru' => 'Зафари',      'eng' => 'Zafari'],     'Джамоати Зафари, район Мастчох'],
            // ── Хатлон ──
            ['comm_vakhsh_dusti',    'vakhsh_d',   ['tj' => 'Дӯстӣ',     'ru' => 'Дусти',       'eng' => 'Dusti'],      'Джамоати Дусти, район Вахш'],
            ['comm_vakhsh_nav',      'vakhsh_d',   ['tj' => 'Нав',        'ru' => 'Нов',         'eng' => 'Nov'],        'Джамоати Нов, район Вахш'],
            ['comm_kulob_abdulloev', 'kulob_d',    ['tj' => 'Абдуллоев', 'ru' => 'Абдуллоев',   'eng' => 'Abdulloev'],  'Джамоати Абдуллоев, Куляб'],
            // ── ГБАО ──
            ['comm_shugnan_main',    'shugnan',    ['tj' => 'Шуғнон',     'ru' => 'Шугнан',      'eng' => 'Shugnan'],    'Джамоати Шугнан, район Шугнан, ГБАО'],
            ['comm_rushan_porshnev', 'rushan',     ['tj' => 'Поршнев',   'ru' => 'Поршнев',     'eng' => 'Porshnev'],   'Джамоати Поршнев, район Рушан, ГБАО'],
        ];

        foreach ($communitiesData as [$ref, $distRef, $translations, $desc]) {
            $community = new Community();
            $community->setDescription($desc);

            foreach ($translations as $locale => $title) {
                $community->addTranslation(
                    (new Translation())->setTitle($title)->setLocale($locale)->setAddress($community)
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

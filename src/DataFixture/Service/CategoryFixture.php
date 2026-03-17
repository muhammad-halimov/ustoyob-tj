<?php

namespace App\DataFixture\Service;

use App\DataFixture\Additional\TicketFixture;
use App\DataFixture\Service\OccupationFixture;
use App\Entity\Extra\Translation;
use App\Entity\Ticket\Category;
use App\Entity\Ticket\Ticket;
use App\Entity\User\Occupation;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\DataFixtures\DependentFixtureInterface;
use Doctrine\Persistence\ObjectManager;
use ReflectionClass;

class CategoryFixture extends Fixture implements DependentFixtureInterface
{
    public function load(ObjectManager $manager): void
    {
        // tickets: [ticketRef, subcategoryOccupationRef]
        // occupation: primary Occupation that represents this category (category→subcategory link)
        $categoriesData = [
            'santexnika' => [
                'translations' => ['tj' => 'Сантехника',              'ru' => 'Сантехника',                    'eng' => 'Plumbing'],
                'description'  => "Кори сантехникӣ\nСантехнические работы\nPlumbing works",
                'occupation'   => 'santexnik',
                'tickets' => [
                    ['t_0', 'santexnik'], ['t_1', 'santexnik'], ['t_2', 'truboprovodchik'],
                    ['t_3', 'santexnik'], ['t_4', 'santexnik'],
                ],
            ],
            'it' => [
                'translations' => ['tj' => 'ТИ',                      'ru' => 'IT',                            'eng' => 'IT'],
                'description'  => "Барномасозӣ, амнияти кибернетикӣ, devops\nПрограммирование, кибербезопасность, devops\nProgramming, cybersecurity, devops",
                'occupation'   => 'programmer',
                'tickets' => [
                    ['t_9',  'programmer'], ['t_10', 'programmer'], ['t_11', 'programmer'],
                    ['t_12', 'programmer'], ['t_13', 'programmer'], ['t_14', 'sysadmin'],
                ],
            ],
            'beauty' => [
                'translations' => ['tj' => 'Зебоӣ ва саломатӣ',       'ru' => 'Красота и здоровье',            'eng' => 'Beauty and Health'],
                'description'  => "Хизматҳои зебоӣ ва саломатӣ\nУслуги красоты и здоровья\nBeauty and health services",
                'occupation'   => 'kosmetolog',
                'tickets' => [
                    ['t_38', 'kosmetolog'], ['t_39', 'masseur'],
                    ['t_42', 'parikmakher'], ['t_45', 'kosmetolog'],
                ],
            ],
            'repair' => [
                'translations' => ['tj' => 'Таъмири хона',             'ru' => 'Ремонт и строительство',       'eng' => 'Repair and Construction'],
                'description'  => "Таъмири хона ва иншоот\nРемонт и строительство\nHome repair and construction",
                'occupation'   => 'stroitel',
                'tickets' => [
                    ['t_18', 'maljar'],   ['t_19', 'plitochnik'], ['t_20', 'stroitel'],
                    ['t_21', 'metalist'], ['t_22', 'stroitel'],
                ],
            ],
            'electricity' => [
                'translations' => ['tj' => 'Барқкашӣ',                 'ru' => 'Электрика',                    'eng' => 'Electrical'],
                'description'  => "Кори барқкашӣ\nЭлектромонтажные работы\nElectrical installation works",
                'occupation'   => 'elektrik',
                'tickets' => [
                    ['t_5', 'elektrik'], ['t_6', 'elektrik'], ['t_7', 'elektrik'], ['t_8', 'elektrik'],
                ],
            ],
            'cleaning' => [
                'translations' => ['tj' => 'Тозакунӣ',                 'ru' => 'Уборка',                       'eng' => 'Cleaning'],
                'description'  => "Хизматҳои тозакунӣ\nУслуги уборки\nCleaning services",
                'occupation'   => 'kliner',
                'tickets' => [
                    ['t_15', 'kliner'], ['t_16', 'kliner'], ['t_17', 'kliner'],
                ],
            ],
            'transport' => [
                'translations' => ['tj' => 'Нақлиёт',                  'ru' => 'Транспорт и перевозки',        'eng' => 'Transport and Logistics'],
                'description'  => "Нақлиёт ва боркашонӣ\nТранспорт и грузоперевозки\nTransport and cargo services",
                'occupation'   => 'voditel',
                'tickets' => [
                    ['t_29', 'gruzchik'], ['t_30', 'voditel'], ['t_31', 'voditel'],
                ],
            ],
            'education' => [
                'translations' => ['tj' => 'Таълим',                   'ru' => 'Образование и репетиторство',  'eng' => 'Education and Tutoring'],
                'description'  => "Таълим ва омӯзгорӣ\nОбразование и репетиторство\nEducation and tutoring",
                'occupation'   => 'repetitor',
                'tickets' => [
                    ['t_26', 'repetitor'], ['t_27', 'language_trainer'], ['t_28', 'programmer'],
                    ['t_46', 'repetitor'],
                ],
            ],
            'auto' => [
                'translations' => ['tj' => 'Таъмири автомобил',        'ru' => 'Авто и автосервис',            'eng' => 'Auto and Car Service'],
                'description'  => "Таъмир ва хизматрасонии автомобил\nАвтосервис и ремонт\nAuto repair and service",
                'occupation'   => 'avtomehanik',
                'tickets' => [
                    ['t_35', 'avtomehanik'], ['t_36', 'avtomehanik'], ['t_37', 'avtomehanik'],
                ],
            ],
            'design' => [
                'translations' => ['tj' => 'Дизайн',                   'ru' => 'Дизайн и творчество',          'eng' => 'Design and Creative'],
                'description'  => "Дизайни графикӣ ва эҷодӣ\nГрафический и творческий дизайн\nGraphic and creative design",
                'occupation'   => 'grafik_dizayner',
                'tickets' => [
                    ['t_23', 'grafik_dizayner'], ['t_24', 'veb_dizayner'],
                    ['t_25', 'grafik_dizayner'], ['t_47', 'grafik_dizayner'],
                ],
            ],
            'legal' => [
                'translations' => ['tj' => 'Хизматҳои ҳуқуқӣ',        'ru' => 'Юридические услуги',           'eng' => 'Legal Services'],
                'description'  => "Машваратҳои ҳуқуқӣ\nЮридические консультации\nLegal consultations",
                'occupation'   => 'yurist',
                'tickets' => [
                    ['t_40', 'yurist'], ['t_41', 'yurist'],
                ],
            ],
            'accounting' => [
                'translations' => ['tj' => 'Бухгалтерия',              'ru' => 'Бухгалтерия и финансы',        'eng' => 'Accounting and Finance'],
                'description'  => "Бухгалтерӣ ва молия\nБухгалтерия и финансы\nAccounting and finance",
                'occupation'   => 'buhgalter',
                'tickets' => [],
            ],
            'photography' => [
                'translations' => ['tj' => 'Аксбардорӣ',               'ru' => 'Фото и видеосъёмка',           'eng' => 'Photography and Videography'],
                'description'  => "Аксбардорӣ ва видеогирӣ\nФото и видеосъёмка\nPhotography and videography",
                'occupation'   => 'fotograf',
                'tickets' => [
                    ['t_32', 'fotograf'], ['t_33', 'videograf'], ['t_34', 'videograf'],
                    ['t_43', 'fotograf'], ['t_44', 'videograf'],
                ],
            ],
            'medicine' => [
                'translations' => ['tj' => 'Тиб ва саломатӣ',          'ru' => 'Медицина и здоровье',          'eng' => 'Medicine and Healthcare'],
                'description'  => "Хизматҳои тиббӣ\nМедицинские услуги\nMedical services",
                'occupation'   => 'vrach',
                'tickets' => [],
            ],
            'fitness' => [
                'translations' => ['tj' => 'Варзиш ва фитнес',         'ru' => 'Спорт и фитнес',               'eng' => 'Sports and Fitness'],
                'description'  => "Варзиш ва фитнес\nСпорт и фитнес\nSports and fitness",
                'occupation'   => 'personal_trainer',
                'tickets' => [],
            ],
            'events' => [
                'translations' => ['tj' => 'Чорабиниҳо',               'ru' => 'Мероприятия и ивент',          'eng' => 'Events and Entertainment'],
                'description'  => "Ташкили чорабиниҳо\nОрганизация мероприятий\nEvent planning and entertainment",
                'occupation'   => 'event_manager',
                'tickets' => [],
            ],
            'security' => [
                'translations' => ['tj' => 'Амнияти объект',           'ru' => 'Охрана и безопасность',        'eng' => 'Security Services'],
                'description'  => "Хизматҳои амнияти\nОхрана и безопасность\nSecurity and guarding services",
                'occupation'   => 'ohrannik',
                'tickets' => [],
            ],
            'animals' => [
                'translations' => ['tj' => 'Нигоҳубини ҳайвонот',      'ru' => 'Уход за животными',            'eng' => 'Pet Care'],
                'description'  => "Нигоҳубини ҳайвонот\nУход за домашними животными\nPet care and grooming",
                'occupation'   => 'veterinar',
                'tickets' => [],
            ],
        ];

        foreach ($categoriesData as $key => $data) {
            $category = new Category();
            $category->setDescription($data['description']);

            $reflection = new ReflectionClass($category);
            /** @noinspection PhpStatementHasEmptyBodyInspection */
            while (!$reflection->hasProperty('translations') && $reflection = $reflection->getParentClass());
            $property = $reflection->getProperty('translations');
            $property->setValue($category, new ArrayCollection());

            foreach ($data['translations'] as $locale => $title) {
                $translation = (new Translation())
                    ->setTitle($title)
                    ->setLocale($locale)
                    ->setCategory($category);

                $category->addTranslation($translation);
            }

            // Link category to its primary occupation (category→subcategory)
            $category->setOccupation($this->getReference($data['occupation'], Occupation::class));

            foreach ($data['tickets'] as [$ticketRef, $subcategoryRef]) {
                /** @var Ticket $ticket */
                $ticket = $this->getReference($ticketRef, Ticket::class);
                $category->addUserTicket($ticket);
                $ticket->setSubcategory($this->getReference($subcategoryRef, Occupation::class));
            }

            $manager->persist($category);
            $this->addReference($key, $category);
        }

        $manager->flush();
    }

    public function getDependencies(): array
    {
        return [
            TicketFixture::class,
            OccupationFixture::class,
        ];
    }
}

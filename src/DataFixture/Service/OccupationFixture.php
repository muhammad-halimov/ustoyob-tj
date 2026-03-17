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
            // Сантехника
            'santexnik' => [
                'translations' => ['tj' => 'Сантехник', 'ru' => 'Сантехник', 'eng' => 'Plumber'],
                'description'  => "Кори сантехникӣ\nСантехнические работы\nPlumbing works",
            ],
            'truboprovodchik' => [
                'translations' => ['tj' => 'Қубурсоз', 'ru' => 'Трубопроводчик', 'eng' => 'Pipefitter'],
                'description'  => "Насби қубурҳо\nМонтаж трубопроводов\nPipe installation",
            ],
            // IT
            'programmer' => [
                'translations' => ['tj' => 'Барномасоз', 'ru' => 'Программист', 'eng' => 'Programmer'],
                'description'  => "Барномасозӣ\nПрограммирование\nProgramming",
            ],
            'sysadmin' => [
                'translations' => ['tj' => 'Маъмури система', 'ru' => 'Системный администратор', 'eng' => 'System Administrator'],
                'description'  => "Идоракунии системаҳо\nАдминистрирование систем\nSystems administration",
            ],
            'network_engineer' => [
                'translations' => ['tj' => 'Муҳандиси шабака', 'ru' => 'Сетевой инженер', 'eng' => 'Network Engineer'],
                'description'  => "Шабакаҳои компютерӣ\nКомпьютерные сети\nComputer networking",
            ],
            // Красота и здоровье
            'parikmakher' => [
                'translations' => ['tj' => 'Сартарош', 'ru' => 'Парикмахер', 'eng' => 'Hairdresser'],
                'description'  => "Сартарошӣ\nПарикмахерские услуги\nHairdressing",
            ],
            'kosmetolog' => [
                'translations' => ['tj' => 'Косметолог', 'ru' => 'Косметолог', 'eng' => 'Cosmetologist'],
                'description'  => "Хизматҳои косметологӣ\nКосметологические услуги\nCosmetology services",
            ],
            'masseur' => [
                'translations' => ['tj' => 'Массажист', 'ru' => 'Массажист', 'eng' => 'Masseur'],
                'description'  => "Массаж\nМассаж\nMassage",
            ],
            // Ремонт и строительство
            'stroitel' => [
                'translations' => ['tj' => 'Сохтмончӣ', 'ru' => 'Строитель', 'eng' => 'Builder'],
                'description'  => "Кори сохтмонӣ\nСтроительные работы\nConstruction works",
            ],
            'plitochnik' => [
                'translations' => ['tj' => 'Плиточник', 'ru' => 'Плиточник', 'eng' => 'Tiler'],
                'description'  => "Гузоштани кафпӯш\nУкладка плитки\nTile laying",
            ],
            'maljar' => [
                'translations' => ['tj' => 'Наққош', 'ru' => 'Маляр', 'eng' => 'Painter'],
                'description'  => "Рангубор\nМалярные работы\nPainting works",
            ],
            // Электрика
            'elektrik' => [
                'translations' => ['tj' => 'Барқкаш', 'ru' => 'Электрик', 'eng' => 'Electrician'],
                'description'  => "Кори барқкашӣ\nЭлектромонтажные работы\nElectrical works",
            ],
            // Уборка
            'kliner' => [
                'translations' => ['tj' => 'Тозакунанда', 'ru' => 'Клинер', 'eng' => 'Cleaner'],
                'description'  => "Тозакунии хона\nУборка помещений\nCleaning services",
            ],
            // Транспорт
            'voditel' => [
                'translations' => ['tj' => 'Ронанда', 'ru' => 'Водитель', 'eng' => 'Driver'],
                'description'  => "Хизматрасонии нақлиётӣ\nВодительские услуги\nDriver services",
            ],
            'gruzchik' => [
                'translations' => ['tj' => 'Борбардор', 'ru' => 'Грузчик', 'eng' => 'Loader'],
                'description'  => "Бордошт ва интиқол\nПогрузка и перевозка\nLoading and transport",
            ],
            // Образование
            'repetitor' => [
                'translations' => ['tj' => 'Омӯзгор-роҳбар', 'ru' => 'Репетитор', 'eng' => 'Tutor'],
                'description'  => "Дарсҳои хусусӣ\nЧастные уроки\nPrivate tutoring",
            ],
            'language_trainer' => [
                'translations' => ['tj' => 'Омӯзгори забон', 'ru' => 'Преподаватель языков', 'eng' => 'Language Teacher'],
                'description'  => "Таълими забонҳо\nОбучение языкам\nLanguage teaching",
            ],
            // Авто
            'avtomehanik' => [
                'translations' => ['tj' => 'Автомеханик', 'ru' => 'Автомеханик', 'eng' => 'Car Mechanic'],
                'description'  => "Таъмири автомобил\nРемонт автомобилей\nCar repair",
            ],
            // Дизайн
            'grafik_dizayner' => [
                'translations' => ['tj' => 'Дизайнери графикӣ', 'ru' => 'Графический дизайнер', 'eng' => 'Graphic Designer'],
                'description'  => "Дизайни графикӣ\nГрафический дизайн\nGraphic design",
            ],
            'veb_dizayner' => [
                'translations' => ['tj' => 'Дизайнери веб', 'ru' => 'Веб-дизайнер', 'eng' => 'Web Designer'],
                'description'  => "Дизайни веб-сайтҳо\nДизайн веб-сайтов\nWeb design",
            ],
            // Юридические услуги
            'yurist' => [
                'translations' => ['tj' => 'Ҳуқуқшинос', 'ru' => 'Юрист', 'eng' => 'Lawyer'],
                'description'  => "Машваратҳои ҳуқуқӣ\nЮридические консультации\nLegal consultations",
            ],
            // Бухгалтерия
            'buhgalter' => [
                'translations' => ['tj' => 'Ҳисобдор', 'ru' => 'Бухгалтер', 'eng' => 'Accountant'],
                'description'  => "Ҳисобдорӣ\nБухгалтерия\nAccounting",
            ],
            // Фото и видео
            'fotograf' => [
                'translations' => ['tj' => 'Аксбардор', 'ru' => 'Фотограф', 'eng' => 'Photographer'],
                'description'  => "Аксбардорӣ\nФотография\nPhotography",
            ],
            'videograf' => [
                'translations' => ['tj' => 'Видеограф', 'ru' => 'Видеограф', 'eng' => 'Videographer'],
                'description'  => "Видеогирӣ\nВидеосъёмка\nVideography",
            ],
            // Медицина
            'vrach' => [
                'translations' => ['tj' => 'Духтур', 'ru' => 'Врач', 'eng' => 'Doctor'],
                'description'  => "Хизматҳои тиббӣ\nМедицинские услуги\nMedical services",
            ],
            'medsestra' => [
                'translations' => ['tj' => 'Ҳамшираи тиббӣ', 'ru' => 'Медсестра', 'eng' => 'Nurse'],
                'description'  => "Ёрии тиббӣ\nМедицинская помощь\nNursing care",
            ],
            // Фитнес
            'personal_trainer' => [
                'translations' => ['tj' => 'Мураббии шахсӣ', 'ru' => 'Персональный тренер', 'eng' => 'Personal Trainer'],
                'description'  => "Машқҳои варзишӣ\nФитнес-тренировки\nFitness training",
            ],
            // Мероприятия
            'event_manager' => [
                'translations' => ['tj' => 'Ташкилотчии чорабинӣ', 'ru' => 'Ивент-менеджер', 'eng' => 'Event Manager'],
                'description'  => "Ташкили чорабиниҳо\nОрганизация мероприятий\nEvent planning",
            ],
            'toastmaster' => [
                'translations' => ['tj' => 'Тамада', 'ru' => 'Тамада', 'eng' => 'Toastmaster'],
                'description'  => "Идораи тӯйхонаҳо\nВедение торжеств\nWedding host",
            ],
            // Охрана
            'ohrannik' => [
                'translations' => ['tj' => 'Посбон', 'ru' => 'Охранник', 'eng' => 'Security Guard'],
                'description'  => "Хизмати посбонӣ\nОхранные услуги\nSecurity services",
            ],
            // Уход за животными
            'veterinar' => [
                'translations' => ['tj' => 'Ветеринар', 'ru' => 'Ветеринар', 'eng' => 'Veterinarian'],
                'description'  => "Табобати ҳайвонот\nВетеринарная помощь\nVeterinary care",
            ],
            'groomer' => [
                'translations' => ['tj' => 'Грумер', 'ru' => 'Грумер', 'eng' => 'Groomer'],
                'description'  => "Нигоҳубини ҳайвонот\nУход за животными\nPet grooming",
            ],
            // Слесарь (уже был)
            'metalist' => [
                'translations' => ['tj' => 'Слесар', 'ru' => 'Слесарь', 'eng' => 'Metalworker'],
                'description'  => "Кор бо металл ва механизмҳо\nРаботы с металлом и механизмами\nMetal and mechanical works",
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

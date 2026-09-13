<?php

namespace App\DataFixture\Prod\Ticket;

use App\Entity\Extra\Translation;
use App\Entity\User\Occupation;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Bundle\FixturesBundle\FixtureGroupInterface;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Persistence\ObjectManager;
use ReflectionClass;

/**
 * Подкатегории (Occupation) — многие ссылаются по ref-ключу из MasterFixture
 * (мастер → своя специальность) и CategoryFixture (категория → её
 * подкатегории, one-to-many через Category::addOccupation() →
 * Occupation::setCategory() — каждая подкатегория принадлежит ровно одной
 * категории).
 *
 * Ref-ключи существующих записей — НЕ переименовывать: они завязаны как
 * минимум на MasterFixture (см. там 'programmer', 'santexnik', 'stroitel',
 * 'voditel', 'elektrik', 'kliner', 'masseur', 'yurist', 'avtomehanik',
 * 'parikmakher', 'fotograf', 'videograf', 'kosmetolog', 'repetitor',
 * 'grafik_dizayner') и на CategoryFixture (тикеты и occupations[] там же).
 * Новые записи ниже дописаны рядом, сгруппированы по категориям для
 * читаемости (реальная привязка к категории — в CategoryFixture::occupations).
 *
 * БАГФИКС (13.09.2026, тот же класс проблемы, что и у CategoryFixture — см.
 * её докблок): раньше 'description' было ОДНОЙ строкой на три языка через
 * \n ("Кори сантехникӣ\nСантехнические работы\nPlumbing works") — набор
 * коротких синонимов title, слепленных вместе, и не per-locale вообще.
 * Теперь description — такой же per-locale перевод, как title (тот же
 * Translation), и это отдельное предложение о том, чем конкретно занимается
 * специалист, а не синоним заголовка. Локализация на чтение — см.
 * OccupationTitleLocalizationProvider::localize() (localizeEntityFull()) и
 * все места, где Occupation встраивается в Category/Ticket/User
 * (CategoryTitleLocalizationProvider, LocalizationService::localizeTicket()/
 * localizeUser(), TicketGeographyLocalizationProvider, FavoriteStateProvider,
 * UserGeographyLocalizationProvider).
 */
class OccupationFixture extends Fixture implements FixtureGroupInterface
{
    public static function getGroups(): array
    {
        return ['prod'];
    }

    public function load(ObjectManager $manager): void
    {
        $occupationsData = [
            // ── Сантехника ──────────────────────────────────────────────
            'santexnik' => [
                'translations' => [
                    'tj'  => ['title' => 'Сантехник', 'description' => 'Ништи обро бартараф мекунад, асбобҳои сантехникиро насб ва пайваст мекунад.'],
                    'ru'  => ['title' => 'Сантехник', 'description' => 'Устраняет засоры и протечки, устанавливает и подключает сантехнические приборы.'],
                    'eng' => ['title' => 'Plumber',   'description' => 'Fixes clogs and leaks, installs and connects plumbing fixtures.'],
                ],
            ],
            'truboprovodchik' => [
                'translations' => [
                    'tj'  => ['title' => 'Қубурсоз', 'description' => 'Қубурҳои обтаъминкунӣ ва гармидиҳиро насб ва иваз мекунад.'],
                    'ru'  => ['title' => 'Трубопроводчик', 'description' => 'Монтирует и заменяет трубопроводы водоснабжения и отопления.'],
                    'eng' => ['title' => 'Pipefitter', 'description' => 'Installs and replaces water supply and heating pipelines.'],
                ],
            ],
            'svarshik' => [
                'translations' => [
                    'tj'  => ['title' => 'Пайвандгар', 'description' => 'Сохторҳои металлӣ ва қубурҳоро барои корҳои сантехникӣ ва сохтмонӣ пайванд мекунад.'],
                    'ru'  => ['title' => 'Сварщик', 'description' => 'Сваривает металлические конструкции и трубы для сантехнических и строительных работ.'],
                    'eng' => ['title' => 'Welder', 'description' => 'Welds metal structures and pipes for plumbing and construction work.'],
                ],
            ],
            'montazhnik_otopleniya' => [
                'translations' => [
                    'tj'  => ['title' => 'Насбкунандаи гармидиҳӣ', 'description' => 'Системаҳои гармидиҳӣ ва таҷҳизоти дегро насб ва танзим мекунад.'],
                    'ru'  => ['title' => 'Монтажник отопления', 'description' => 'Устанавливает и настраивает системы отопления и котельное оборудование.'],
                    'eng' => ['title' => 'Heating Systems Installer', 'description' => 'Installs and configures heating systems and boiler equipment.'],
                ],
            ],

            // ── IT ───────────────────────────────────────────────────────
            'programmer' => [
                'translations' => [
                    'tj'  => ['title' => 'Барномасоз', 'description' => 'Барои сомонаҳо, барномаҳо ва хидматрасониҳо код менависад ва такмил медиҳад.'],
                    'ru'  => ['title' => 'Программист', 'description' => 'Пишет и дорабатывает код для сайтов, приложений и сервисов.'],
                    'eng' => ['title' => 'Programmer', 'description' => 'Writes and refines code for websites, applications and services.'],
                ],
            ],
            'sysadmin' => [
                'translations' => [
                    'tj'  => ['title' => 'Маъмури система', 'description' => 'Серверҳо, шабакаҳо ва компютерҳои кории ширкатро танзим ва нигоҳдорӣ мекунад.'],
                    'ru'  => ['title' => 'Системный администратор', 'description' => 'Настраивает и поддерживает серверы, сети и рабочие компьютеры компании.'],
                    'eng' => ['title' => 'System Administrator', 'description' => 'Configures and maintains company servers, networks and workstations.'],
                ],
            ],
            'network_engineer' => [
                'translations' => [
                    'tj'  => ['title' => 'Муҳандиси шабака', 'description' => 'Шабакаҳои компютерӣ ва таҷҳизоти алоқаро лоиҳакашӣ ва танзим мекунад.'],
                    'ru'  => ['title' => 'Сетевой инженер', 'description' => 'Проектирует и настраивает компьютерные сети и оборудование связи.'],
                    'eng' => ['title' => 'Network Engineer', 'description' => 'Designs and configures computer networks and communication equipment.'],
                ],
            ],
            'mobile_developer' => [
                'translations' => [
                    'tj'  => ['title' => 'Барномасози мобилӣ', 'description' => 'Барномаҳои мобилиро барои iOS ва Android таҳия мекунад.'],
                    'ru'  => ['title' => 'Разработчик мобильных приложений', 'description' => 'Разрабатывает мобильные приложения для iOS и Android.'],
                    'eng' => ['title' => 'Mobile App Developer', 'description' => 'Develops mobile applications for iOS and Android.'],
                ],
            ],
            'qa_engineer' => [
                'translations' => [
                    'tj'  => ['title' => 'Санҷишгари сифат', 'description' => 'Барномаҳо ва сомонаҳоро пеш аз баровардан аз хатогиҳо санҷиш мекунад.'],
                    'ru'  => ['title' => 'Тестировщик (QA)', 'description' => 'Тестирует программы и сайты на ошибки перед выпуском.'],
                    'eng' => ['title' => 'QA Engineer', 'description' => 'Tests software and websites for bugs before release.'],
                ],
            ],
            'data_analyst' => [
                'translations' => [
                    'tj'  => ['title' => 'Таҳлилгари маълумот', 'description' => 'Маълумотро таҳлил мекунад ва барои қабули қарор ҳисобот тайёр мекунад.'],
                    'ru'  => ['title' => 'Аналитик данных', 'description' => 'Анализирует данные и готовит отчёты для принятия решений.'],
                    'eng' => ['title' => 'Data Analyst', 'description' => 'Analyses data and prepares reports for decision-making.'],
                ],
            ],

            // ── Красота и здоровье ──────────────────────────────────────
            'parikmakher' => [
                'translations' => [
                    'tj'  => ['title' => 'Сартарош', 'description' => 'Мӯйсартарошӣ, ороиш ва рангуборкунии мӯйро иҷро мекунад.'],
                    'ru'  => ['title' => 'Парикмахер', 'description' => 'Делает стрижки, укладки и окрашивание волос.'],
                    'eng' => ['title' => 'Hairdresser', 'description' => 'Provides haircuts, styling and hair colouring.'],
                ],
            ],
            'kosmetolog' => [
                'translations' => [
                    'tj'  => ['title' => 'Косметолог', 'description' => 'Расмиёти косметологиро барои нигоҳубини пӯсти рӯй ва бадан анҷом медиҳад.'],
                    'ru'  => ['title' => 'Косметолог', 'description' => 'Проводит косметические процедуры по уходу за кожей лица и тела.'],
                    'eng' => ['title' => 'Cosmetologist', 'description' => 'Performs cosmetic treatments for facial and body skin care.'],
                ],
            ],
            'masseur' => [
                'translations' => [
                    'tj'  => ['title' => 'Массажист', 'description' => 'Массажи табобатӣ ва оромкунандаи баданро иҷро мекунад.'],
                    'ru'  => ['title' => 'Массажист', 'description' => 'Делает лечебный и расслабляющий массаж тела.'],
                    'eng' => ['title' => 'Masseur', 'description' => 'Provides therapeutic and relaxing body massage.'],
                ],
            ],
            'manikyurshitsa' => [
                'translations' => [
                    'tj'  => ['title' => 'Устои маникюр', 'description' => 'Маникюр, педикюр ва дарозкунии нохунро иҷро мекунад.'],
                    'ru'  => ['title' => 'Мастер маникюра', 'description' => 'Делает маникюр, педикюр и наращивание ногтей.'],
                    'eng' => ['title' => 'Manicurist', 'description' => 'Provides manicure, pedicure and nail extensions.'],
                ],
            ],
            'vizazhist' => [
                'translations' => [
                    'tj'  => ['title' => 'Ороишгар', 'description' => 'Барои чорабиниҳо, аксбардорӣ ва рӯйдодҳои махсус ороиши рӯй мекунад.'],
                    'ru'  => ['title' => 'Визажист', 'description' => 'Делает макияж для мероприятий, съёмок и особых случаев.'],
                    'eng' => ['title' => 'Makeup Artist', 'description' => 'Does makeup for events, photoshoots and special occasions.'],
                ],
            ],
            'brovist' => [
                'translations' => [
                    'tj'  => ['title' => 'Устои абрувон', 'description' => 'Абрувону мижгонҳоро ороиш ва рангубор мекунад.'],
                    'ru'  => ['title' => 'Мастер бровей и ресниц', 'description' => 'Оформляет и окрашивает брови и ресницы.'],
                    'eng' => ['title' => 'Brow and Lash Specialist', 'description' => 'Shapes and tints eyebrows and eyelashes.'],
                ],
            ],

            // ── Ремонт и строительство ──────────────────────────────────
            'stroitel' => [
                'translations' => [
                    'tj'  => ['title' => 'Сохтмончӣ', 'description' => 'Корҳои умумии сохтмониро иҷро мекунад: деворчинӣ, пойдевор, скелет.'],
                    'ru'  => ['title' => 'Строитель', 'description' => 'Выполняет общестроительные работы: кладку, фундамент, каркас.'],
                    'eng' => ['title' => 'Builder', 'description' => 'Performs general construction work: masonry, foundation, framing.'],
                ],
            ],
            'plitochnik' => [
                'translations' => [
                    'tj'  => ['title' => 'Плиточник', 'description' => 'Кошинкории сафолиро дар фарш ва девор мегузорад.'],
                    'ru'  => ['title' => 'Плиточник', 'description' => 'Укладывает керамическую плитку на пол и стены.'],
                    'eng' => ['title' => 'Tiler', 'description' => 'Lays ceramic tiles on floors and walls.'],
                ],
            ],
            'maljar' => [
                'translations' => [
                    'tj'  => ['title' => 'Наққош', 'description' => 'Девор, шифт ва рӯйи биноро ранг мекунад.'],
                    'ru'  => ['title' => 'Маляр', 'description' => 'Красит стены, потолки и фасады.'],
                    'eng' => ['title' => 'Painter', 'description' => 'Paints walls, ceilings and building facades.'],
                ],
            ],
            'metalist' => [
                'translations' => [
                    'tj'  => ['title' => 'Слесар', 'description' => 'Сохторҳо ва маснуоти металлиро месозад ва таъмир мекунад.'],
                    'ru'  => ['title' => 'Слесарь', 'description' => 'Изготавливает и ремонтирует металлические конструкции и изделия.'],
                    'eng' => ['title' => 'Metalworker', 'description' => 'Makes and repairs metal structures and products.'],
                ],
            ],
            'shtukatur' => [
                'translations' => [
                    'tj'  => ['title' => 'Сувоккор', 'description' => 'Девор ва шифтро сувоккорӣ ва ҳамвор мекунад.'],
                    'ru'  => ['title' => 'Штукатур', 'description' => 'Выравнивает и штукатурит стены и потолки.'],
                    'eng' => ['title' => 'Plasterer', 'description' => 'Plasters and levels walls and ceilings.'],
                ],
            ],
            'krovelshik' => [
                'translations' => [
                    'tj'  => ['title' => 'Бомсоз', 'description' => 'Боми биноро насб ва таъмир мекунад.'],
                    'ru'  => ['title' => 'Кровельщик', 'description' => 'Устанавливает и ремонтирует кровлю зданий.'],
                    'eng' => ['title' => 'Roofer', 'description' => 'Installs and repairs building roofs.'],
                ],
            ],
            'okonshik' => [
                'translations' => [
                    'tj'  => ['title' => 'Устои тирезаҳои ПХВ', 'description' => 'Тирезаву дарҳои пластикиро насб мекунад.'],
                    'ru'  => ['title' => 'Мастер по установке окон', 'description' => 'Устанавливает пластиковые окна и двери.'],
                    'eng' => ['title' => 'Window Installer', 'description' => 'Installs plastic (PVC) windows and doors.'],
                ],
            ],

            // ── Электрика ────────────────────────────────────────────────
            'elektrik' => [
                'translations' => [
                    'tj'  => ['title' => 'Барқкаш', 'description' => 'Симкашии барқ ва асбобҳои барқиро насб ва таъмир мекунад.'],
                    'ru'  => ['title' => 'Электрик', 'description' => 'Монтирует и ремонтирует электропроводку и электроприборы.'],
                    'eng' => ['title' => 'Electrician', 'description' => 'Installs and repairs electrical wiring and appliances.'],
                ],
            ],
            'energetik' => [
                'translations' => [
                    'tj'  => ['title' => 'Муҳандиси барқ', 'description' => 'Таҷҳизоти энергетикии объектҳоро лоиҳакашӣ ва хизматрасонӣ мекунад.'],
                    'ru'  => ['title' => 'Инженер-энергетик', 'description' => 'Проектирует и обслуживает энергетическое оборудование объектов.'],
                    'eng' => ['title' => 'Power Systems Engineer', 'description' => 'Designs and maintains power equipment for facilities.'],
                ],
            ],
            'liftyor' => [
                'translations' => [
                    'tj'  => ['title' => 'Устои лифт', 'description' => 'Таҷҳизоти лифтро хизматрасонӣ, танзим ва таъмир мекунад.'],
                    'ru'  => ['title' => 'Специалист по лифтам', 'description' => 'Обслуживает, настраивает и ремонтирует лифтовое оборудование.'],
                    'eng' => ['title' => 'Elevator Technician', 'description' => 'Services, adjusts and repairs elevator equipment.'],
                ],
            ],

            // ── Уборка ───────────────────────────────────────────────────
            'kliner' => [
                'translations' => [
                    'tj'  => ['title' => 'Тозакунанда', 'description' => 'Хона, манзил ва идораҳоро дар ҳар андоза тоза мекунад.'],
                    'ru'  => ['title' => 'Клинер', 'description' => 'Убирает квартиры, дома и офисы любой площади.'],
                    'eng' => ['title' => 'Cleaner', 'description' => 'Cleans apartments, houses and offices of any size.'],
                ],
            ],
            'himchistka' => [
                'translations' => [
                    'tj'  => ['title' => 'Устои хушкшӯӣ', 'description' => 'Мебели мулоим, гилем ва матрасро аз ифлосӣ тоза мекунад.'],
                    'ru'  => ['title' => 'Мастер химчистки', 'description' => 'Чистит мягкую мебель, ковры и матрасы от загрязнений.'],
                    'eng' => ['title' => 'Dry Cleaning Specialist', 'description' => 'Dry-cleans upholstered furniture, carpets and mattresses.'],
                ],
            ],
            'moyshik_okon' => [
                'translations' => [
                    'tj'  => ['title' => 'Тозакунандаи тирезаҳо', 'description' => 'Тиреза, витраж ва рӯйи биноро мешӯяд.'],
                    'ru'  => ['title' => 'Мойщик окон', 'description' => 'Моет окна, витражи и фасады зданий.'],
                    'eng' => ['title' => 'Window Cleaner', 'description' => 'Washes windows, glass panels and building facades.'],
                ],
            ],
            'domrabotnitsa' => [
                'translations' => [
                    'tj'  => ['title' => 'Хизматгори хона', 'description' => 'Дар корҳои хонагӣ кӯмак мекунад: тозакунӣ, шустушӯй, пухтупаз.'],
                    'ru'  => ['title' => 'Домработница', 'description' => 'Помогает по хозяйству: уборка, стирка, готовка.'],
                    'eng' => ['title' => 'Housekeeper', 'description' => 'Helps with housework: cleaning, laundry, cooking.'],
                ],
            ],

            // ── Транспорт ────────────────────────────────────────────────
            'voditel' => [
                'translations' => [
                    'tj'  => ['title' => 'Ронанда', 'description' => 'Мусофирон ва борро бо нақлиёти шахсӣ ё хидматӣ интиқол медиҳад.'],
                    'ru'  => ['title' => 'Водитель', 'description' => 'Перевозит пассажиров и грузы на личном или служебном транспорте.'],
                    'eng' => ['title' => 'Driver', 'description' => 'Transports passengers and goods using a private or company vehicle.'],
                ],
            ],
            'gruzchik' => [
                'translations' => [
                    'tj'  => ['title' => 'Борбардор', 'description' => 'Ҳангоми кӯчидан чизҳои вазнинро бор мекунад, фаро мекунад ва мебарорад.'],
                    'ru'  => ['title' => 'Грузчик', 'description' => 'Грузит, разгружает и переносит тяжёлые вещи при переезде.'],
                    'eng' => ['title' => 'Loader', 'description' => 'Loads, unloads and carries heavy items during a move.'],
                ],
            ],
            'kurier' => [
                'translations' => [
                    'tj'  => ['title' => 'Қосид', 'description' => 'Фармоишу бастаҳоро ба суроғаи нишондодашуда мерасонад.'],
                    'ru'  => ['title' => 'Курьер', 'description' => 'Доставляет заказы и посылки по указанному адресу.'],
                    'eng' => ['title' => 'Courier', 'description' => 'Delivers orders and parcels to the specified address.'],
                ],
            ],
            'ekspeditor' => [
                'translations' => [
                    'tj'  => ['title' => 'Экспедитор', 'description' => 'Боркашониро байни шаҳру кишварҳо ташкил ва ҳамроҳӣ мекунад.'],
                    'ru'  => ['title' => 'Экспедитор', 'description' => 'Организует и сопровождает грузоперевозки между городами и странами.'],
                    'eng' => ['title' => 'Freight Forwarder', 'description' => 'Organises and accompanies cargo transport between cities and countries.'],
                ],
            ],
            'taksist' => [
                'translations' => [
                    'tj'  => ['title' => 'Таксӣ ронанда', 'description' => 'Мусофиронро дар дохили шаҳр бо мошини сабукрав интиқол медиҳад.'],
                    'ru'  => ['title' => 'Таксист', 'description' => 'Перевозит пассажиров по городу на легковом автомобиле.'],
                    'eng' => ['title' => 'Taxi Driver', 'description' => 'Drives passengers around the city in a private car.'],
                ],
            ],

            // ── Образование ──────────────────────────────────────────────
            'repetitor' => [
                'translations' => [
                    'tj'  => ['title' => 'Омӯзгор-роҳбар', 'description' => 'Аз фанҳои мактабӣ ва донишгоҳӣ дарсҳои инфиродӣ мегузаронад.'],
                    'ru'  => ['title' => 'Репетитор', 'description' => 'Проводит индивидуальные занятия по школьным и вузовским предметам.'],
                    'eng' => ['title' => 'Tutor', 'description' => 'Gives one-on-one lessons in school and university subjects.'],
                ],
            ],
            'language_trainer' => [
                'translations' => [
                    'tj'  => ['title' => 'Омӯзгори забон', 'description' => 'Кӯдакон ва калонсолонро ба забонҳои хориҷӣ таълим медиҳад.'],
                    'ru'  => ['title' => 'Преподаватель языков', 'description' => 'Обучает иностранным языкам детей и взрослых.'],
                    'eng' => ['title' => 'Language Teacher', 'description' => 'Teaches foreign languages to children and adults.'],
                ],
            ],
            'muzykalny_pedagog' => [
                'translations' => [
                    'tj'  => ['title' => 'Омӯзгори мусиқӣ', 'description' => 'Навохтани асбобҳои мусиқӣ ва сурудхониро таълим медиҳад.'],
                    'ru'  => ['title' => 'Педагог по музыке', 'description' => 'Учит играть на музыкальных инструментах и петь.'],
                    'eng' => ['title' => 'Music Teacher', 'description' => 'Teaches playing musical instruments and singing.'],
                ],
            ],
            'logoped' => [
                'translations' => [
                    'tj'  => ['title' => 'Логопед', 'description' => 'Вайроншавии нутқи кӯдакон ва калонсолонро ислоҳ мекунад.'],
                    'ru'  => ['title' => 'Логопед', 'description' => 'Исправляет нарушения речи у детей и взрослых.'],
                    'eng' => ['title' => 'Speech Therapist', 'description' => 'Corrects speech disorders in children and adults.'],
                ],
            ],
            'trener_shakhmat' => [
                'translations' => [
                    'tj'  => ['title' => 'Мураббии шоҳмот', 'description' => 'Бозии шоҳматро таълим медиҳад ва барои мусобиқаҳо омода мекунад.'],
                    'ru'  => ['title' => 'Тренер по шахматам', 'description' => 'Обучает игре в шахматы и готовит к турнирам.'],
                    'eng' => ['title' => 'Chess Coach', 'description' => 'Teaches chess and prepares players for tournaments.'],
                ],
            ],

            // ── Авто ─────────────────────────────────────────────────────
            'avtomehanik' => [
                'translations' => [
                    'tj'  => ['title' => 'Автомеханик', 'description' => 'Муҳаррик, қисми ҳаракат ва узвҳои мошинро ташхис ва таъмир мекунад.'],
                    'ru'  => ['title' => 'Автомеханик', 'description' => 'Диагностирует и ремонтирует двигатель, ходовую часть и узлы автомобиля.'],
                    'eng' => ['title' => 'Car Mechanic', 'description' => 'Diagnoses and repairs engine, suspension and other car parts.'],
                ],
            ],
            'avtoelektrik' => [
                'translations' => [
                    'tj'  => ['title' => 'Автобарқкаш', 'description' => 'Хароботии барқи мошинро муайян ва бартараф мекунад.'],
                    'ru'  => ['title' => 'Автоэлектрик', 'description' => 'Находит и устраняет неисправности в электрике автомобиля.'],
                    'eng' => ['title' => 'Auto Electrician', 'description' => 'Finds and fixes faults in car electrical systems.'],
                ],
            ],
            'shinomontazhnik' => [
                'translations' => [
                    'tj'  => ['title' => 'Шиномонтажник', 'description' => 'Чарх ва дискҳои мошинро иваз ва мувозинат мекунад.'],
                    'ru'  => ['title' => 'Шиномонтажник', 'description' => 'Меняет и балансирует автомобильные шины и диски.'],
                    'eng' => ['title' => 'Tyre Fitter', 'description' => 'Replaces and balances car tyres and wheels.'],
                ],
            ],
            'avtomoyshik' => [
                'translations' => [
                    'tj'  => ['title' => 'Автошӯянда', 'description' => 'Мошинро аз берун ва дарун мешӯяд, аз ҷумла бо ташриф ба ҷои муштарӣ.'],
                    'ru'  => ['title' => 'Мойщик автомобилей', 'description' => 'Моет автомобиль снаружи и внутри, в том числе с выездом.'],
                    'eng' => ['title' => 'Car Washer', 'description' => 'Washes cars inside and out, including mobile on-site service.'],
                ],
            ],

            // ── Дизайн ───────────────────────────────────────────────────
            'grafik_dizayner' => [
                'translations' => [
                    'tj'  => ['title' => 'Дизайнери графикӣ', 'description' => 'Лого, баннер ва макетҳои рекламиро эҷод мекунад.'],
                    'ru'  => ['title' => 'Графический дизайнер', 'description' => 'Создаёт логотипы, баннеры и рекламные макеты.'],
                    'eng' => ['title' => 'Graphic Designer', 'description' => 'Creates logos, banners and advertising layouts.'],
                ],
            ],
            'veb_dizayner' => [
                'translations' => [
                    'tj'  => ['title' => 'Дизайнери веб', 'description' => 'Дизайни сомона ва интерфейси барномаҳои мобилиро таҳия мекунад.'],
                    'ru'  => ['title' => 'Веб-дизайнер', 'description' => 'Разрабатывает дизайн сайтов и мобильных интерфейсов.'],
                    'eng' => ['title' => 'Web Designer', 'description' => 'Designs websites and mobile app interfaces.'],
                ],
            ],
            'interior_dizayner' => [
                'translations' => [
                    'tj'  => ['title' => 'Дизайнери дохилӣ', 'description' => 'Дизайни дохилии манзил, хона ва идораҳоро лоиҳакашӣ мекунад.'],
                    'ru'  => ['title' => 'Дизайнер интерьера', 'description' => 'Проектирует дизайн интерьера квартир, домов и офисов.'],
                    'eng' => ['title' => 'Interior Designer', 'description' => 'Designs interiors for apartments, houses and offices.'],
                ],
            ],
            'illustrator' => [
                'translations' => [
                    'tj'  => ['title' => 'Тасвиргар', 'description' => 'Барои китоб, бренд ва реклама расм мекашад.'],
                    'ru'  => ['title' => 'Иллюстратор', 'description' => 'Рисует иллюстрации для книг, брендов и рекламы.'],
                    'eng' => ['title' => 'Illustrator', 'description' => 'Draws illustrations for books, brands and advertising.'],
                ],
            ],
            'modelyer' => [
                'translations' => [
                    'tj'  => ['title' => 'Дӯзандаи либос', 'description' => 'Тарҳи либосро таҳия карда, онро бо фармоиш медӯзад.'],
                    'ru'  => ['title' => 'Модельер', 'description' => 'Разрабатывает модели и шьёт одежду на заказ.'],
                    'eng' => ['title' => 'Fashion Designer', 'description' => 'Designs and sews custom-made clothing.'],
                ],
            ],

            // ── Юридические услуги ───────────────────────────────────────
            'yurist' => [
                'translations' => [
                    'tj'  => ['title' => 'Ҳуқуқшинос', 'description' => 'Оид ба масъалаҳои ҳуқуқӣ машварат медиҳад ва ҳуҷҷат тартиб медиҳад.'],
                    'ru'  => ['title' => 'Юрист', 'description' => 'Консультирует по правовым вопросам и составляет документы.'],
                    'eng' => ['title' => 'Lawyer', 'description' => 'Advises on legal matters and drafts documents.'],
                ],
            ],
            'advokat' => [
                'translations' => [
                    'tj'  => ['title' => 'Адвокат', 'description' => 'Манфиати мизоҷро дар суд намояндагӣ ва ҳимоя мекунад.'],
                    'ru'  => ['title' => 'Адвокат', 'description' => 'Представляет и защищает интересы клиента в суде.'],
                    'eng' => ['title' => 'Advocate', 'description' => "Represents and defends the client's interests in court."],
                ],
            ],
            'nalogovy_konsultant' => [
                'translations' => [
                    'tj'  => ['title' => 'Мушовири андоз', 'description' => 'Оид ба ҳисоботи андоз ва беҳинасозии андоз машварат медиҳад.'],
                    'ru'  => ['title' => 'Налоговый консультант', 'description' => 'Консультирует по налоговой отчётности и оптимизации налогов.'],
                    'eng' => ['title' => 'Tax Consultant', 'description' => 'Advises on tax reporting and tax optimisation.'],
                ],
            ],

            // ── Бухгалтерия ──────────────────────────────────────────────
            'buhgalter' => [
                'translations' => [
                    'tj'  => ['title' => 'Ҳисобдор', 'description' => 'Баҳисобгирии бухгалтериро пеш мебарад ва ҳисоботи молиявӣ тайёр мекунад.'],
                    'ru'  => ['title' => 'Бухгалтер', 'description' => 'Ведёт бухгалтерский учёт и готовит финансовую отчётность.'],
                    'eng' => ['title' => 'Accountant', 'description' => 'Maintains bookkeeping and prepares financial statements.'],
                ],
            ],
            'auditor' => [
                'translations' => [
                    'tj'  => ['title' => 'Аудитор', 'description' => 'Ҳисоботи молиявии ширкатро аз рӯи мутобиқат бо талабот месанҷад.'],
                    'ru'  => ['title' => 'Аудитор', 'description' => 'Проверяет финансовую отчётность компании на соответствие требованиям.'],
                    'eng' => ['title' => 'Auditor', 'description' => "Checks a company's financial statements for compliance."],
                ],
            ],
            'kadrovik' => [
                'translations' => [
                    'tj'  => ['title' => 'Мутахассиси кадрҳо', 'description' => 'Коргузории кадриро пеш бурда, кормандонро ба кор мегирад.'],
                    'ru'  => ['title' => 'Специалист по кадрам', 'description' => 'Ведёт кадровое делопроизводство и оформляет сотрудников.'],
                    'eng' => ['title' => 'HR Specialist', 'description' => 'Manages HR records and handles employee onboarding.'],
                ],
            ],

            // ── Фото и видео ─────────────────────────────────────────────
            'fotograf' => [
                'translations' => [
                    'tj'  => ['title' => 'Аксбардор', 'description' => 'Дар чорабиниҳо акс мегирад, портрет ва аксбардории предметиро иҷро мекунад.'],
                    'ru'  => ['title' => 'Фотограф', 'description' => 'Снимает фотографии на мероприятиях, портреты и предметную съёмку.'],
                    'eng' => ['title' => 'Photographer', 'description' => 'Shoots event photography, portraits and product photos.'],
                ],
            ],
            'videograf' => [
                'translations' => [
                    'tj'  => ['title' => 'Видеограф', 'description' => 'Видеои чорабинӣ, клип ва роликҳои рекламиро мегирад.'],
                    'ru'  => ['title' => 'Видеограф', 'description' => 'Снимает видео мероприятий, клипов и рекламных роликов.'],
                    'eng' => ['title' => 'Videographer', 'description' => 'Films events, music videos and advertising clips.'],
                ],
            ],
            'montazher_video' => [
                'translations' => [
                    'tj'  => ['title' => 'Монтажёри видео', 'description' => 'Маводи видеоии гирифташударо монтаж ва коркард мекунад.'],
                    'ru'  => ['title' => 'Видеомонтажёр', 'description' => 'Монтирует и обрабатывает отснятый видеоматериал.'],
                    'eng' => ['title' => 'Video Editor', 'description' => 'Edits and processes recorded video footage.'],
                ],
            ],
            'retusher' => [
                'translations' => [
                    'tj'  => ['title' => 'Ретушгар', 'description' => 'Аксҳоро дар муҳаррирони графикӣ коркард ва беҳтар мекунад.'],
                    'ru'  => ['title' => 'Ретушёр', 'description' => 'Обрабатывает и улучшает фотографии в графических редакторах.'],
                    'eng' => ['title' => 'Photo Retoucher', 'description' => 'Edits and enhances photos using graphic editing software.'],
                ],
            ],

            // ── Медицина ─────────────────────────────────────────────────
            'vrach' => [
                'translations' => [
                    'tj'  => ['title' => 'Духтур', 'description' => 'Беморонро аз рӯи ихтисоси худ машварат ва табобат мекунад.'],
                    'ru'  => ['title' => 'Врач', 'description' => 'Консультирует и лечит пациентов по своему профилю.'],
                    'eng' => ['title' => 'Doctor', 'description' => 'Consults and treats patients within their medical specialty.'],
                ],
            ],
            'medsestra' => [
                'translations' => [
                    'tj'  => ['title' => 'Ҳамшираи тиббӣ', 'description' => 'Расмиёти тиббӣ ва нигоҳубини бемор дар хонаро иҷро мекунад.'],
                    'ru'  => ['title' => 'Медсестра', 'description' => 'Выполняет медицинские процедуры и уход за пациентом на дому.'],
                    'eng' => ['title' => 'Nurse', 'description' => 'Performs medical procedures and patient care at home.'],
                ],
            ],
            'stomatolog' => [
                'translations' => [
                    'tj'  => ['title' => 'Дандонпизишк', 'description' => 'Дандонҳоро табобат ва протез мекунад.'],
                    'ru'  => ['title' => 'Стоматолог', 'description' => 'Лечит и протезирует зубы.'],
                    'eng' => ['title' => 'Dentist', 'description' => 'Treats teeth and provides dental prosthetics.'],
                ],
            ],
            'farmatsevt' => [
                'translations' => [
                    'tj'  => ['title' => 'Дорусоз', 'description' => 'Доруворро интихоб карда, оид ба истифодаи он машварат медиҳад.'],
                    'ru'  => ['title' => 'Фармацевт', 'description' => 'Подбирает и консультирует по применению лекарственных препаратов.'],
                    'eng' => ['title' => 'Pharmacist', 'description' => 'Selects medications and advises on their proper use.'],
                ],
            ],

            // ── Фитнес ───────────────────────────────────────────────────
            'personal_trainer' => [
                'translations' => [
                    'tj'  => ['title' => 'Мураббии шахсӣ', 'description' => 'Барномаи машқро тартиб дода, бо мизоҷ ба таври инфиродӣ кор мекунад.'],
                    'ru'  => ['title' => 'Персональный тренер', 'description' => 'Составляет программу тренировок и занимается индивидуально с клиентом.'],
                    'eng' => ['title' => 'Personal Trainer', 'description' => 'Designs a training programme and coaches clients one-on-one.'],
                ],
            ],
            'yoga_instruktor' => [
                'translations' => [
                    'tj'  => ['title' => 'Омӯзгори йога', 'description' => 'Барои ҳар сатҳи омодагӣ дарсҳои йога мегузаронад.'],
                    'ru'  => ['title' => 'Инструктор йоги', 'description' => 'Проводит занятия йогой для любого уровня подготовки.'],
                    'eng' => ['title' => 'Yoga Instructor', 'description' => 'Runs yoga classes for any level of experience.'],
                ],
            ],
            'trener_plavaniya' => [
                'translations' => [
                    'tj'  => ['title' => 'Мураббии шиноварӣ', 'description' => 'Кӯдакон ва калонсолонро дар ҳар сатҳ ба шиноварӣ таълим медиҳад.'],
                    'ru'  => ['title' => 'Тренер по плаванию', 'description' => 'Обучает плаванию детей и взрослых любого уровня.'],
                    'eng' => ['title' => 'Swimming Coach', 'description' => 'Teaches swimming to children and adults of any level.'],
                ],
            ],
            'dietolog' => [
                'translations' => [
                    'tj'  => ['title' => 'Диетолог', 'description' => 'Барои ҳадафҳои мизоҷ реҷаи ғизои инфиродӣ тартиб медиҳад.'],
                    'ru'  => ['title' => 'Диетолог', 'description' => 'Составляет индивидуальный план питания под цели клиента.'],
                    'eng' => ['title' => 'Nutritionist', 'description' => "Creates a personalised nutrition plan for the client's goals."],
                ],
            ],

            // ── Мероприятия ──────────────────────────────────────────────
            'event_manager' => [
                'translations' => [
                    'tj'  => ['title' => 'Ташкилотчии чорабинӣ', 'description' => 'Ҷашну чорабиниҳоро аз оғоз то анҷом ташкил мекунад.'],
                    'ru'  => ['title' => 'Ивент-менеджер', 'description' => 'Организует праздники и мероприятия под ключ.'],
                    'eng' => ['title' => 'Event Manager', 'description' => 'Organises celebrations and events from start to finish.'],
                ],
            ],
            'toastmaster' => [
                'translations' => [
                    'tj'  => ['title' => 'Тамада', 'description' => 'Тӯй, солгард ва дигар маросимҳоро идора мекунад.'],
                    'ru'  => ['title' => 'Тамада', 'description' => 'Ведёт свадьбы, юбилеи и другие торжества.'],
                    'eng' => ['title' => 'Toastmaster', 'description' => 'Hosts weddings, anniversaries and other celebrations.'],
                ],
            ],
            'dj' => [
                'translations' => [
                    'tj'  => ['title' => 'Диҷей', 'description' => 'Ҳамроҳии мусиқии чорабиниҳоро таъмин мекунад.'],
                    'ru'  => ['title' => 'Диджей', 'description' => 'Обеспечивает музыкальное сопровождение мероприятий.'],
                    'eng' => ['title' => 'DJ', 'description' => 'Provides musical entertainment for events.'],
                ],
            ],
            'dekorator' => [
                'translations' => [
                    'tj'  => ['title' => 'Ороишгари чорабинӣ', 'description' => 'Толор ва фазои маросимро бо ороиш ва тӯб ороиш медиҳад.'],
                    'ru'  => ['title' => 'Декоратор мероприятий', 'description' => 'Оформляет зал и пространство для торжеств декором и шарами.'],
                    'eng' => ['title' => 'Event Decorator', 'description' => 'Decorates event venues and spaces with décor and balloons.'],
                ],
            ],
            'animator' => [
                'translations' => [
                    'tj'  => ['title' => 'Аниматори кӯдакон', 'description' => 'Дар ҷашнҳо барномаҳои бозигарӣ барои кӯдакон мегузаронад.'],
                    'ru'  => ['title' => 'Детский аниматор', 'description' => 'Проводит игровые программы для детей на праздниках.'],
                    'eng' => ['title' => "Children's Entertainer", 'description' => 'Runs game and play programmes for children at parties.'],
                ],
            ],

            // ── Охрана и безопасность ────────────────────────────────────
            'ohrannik' => [
                'translations' => [
                    'tj'  => ['title' => 'Посбон', 'description' => 'Муҳофизати объект ва назорати воридшавиро таъмин мекунад.'],
                    'ru'  => ['title' => 'Охранник', 'description' => 'Обеспечивает охрану объекта и контроль доступа.'],
                    'eng' => ['title' => 'Security Guard', 'description' => 'Provides site security and access control.'],
                ],
            ],
            'telohranitel' => [
                'translations' => [
                    'tj'  => ['title' => 'Мӯҳофиз', 'description' => 'Бехатарии ҷисмонии шахсии мизоҷро таъмин мекунад.'],
                    'ru'  => ['title' => 'Телохранитель', 'description' => 'Обеспечивает личную физическую безопасность клиента.'],
                    'eng' => ['title' => 'Bodyguard', 'description' => 'Provides personal physical protection for the client.'],
                ],
            ],
            'montazhnik_signalizacii' => [
                'translations' => [
                    'tj'  => ['title' => 'Насбкунандаи сигнализатсия', 'description' => 'Сигнализатсия ва камераҳои назоратро насб мекунад.'],
                    'ru'  => ['title' => 'Монтажник сигнализации', 'description' => 'Устанавливает сигнализацию и камеры видеонаблюдения.'],
                    'eng' => ['title' => 'Alarm and CCTV Installer', 'description' => 'Installs alarm systems and CCTV cameras.'],
                ],
            ],
            'master_zamkov' => [
                'translations' => [
                    'tj'  => ['title' => 'Қулфсоз', 'description' => 'Қулфи дарро мекушояд, насб мекунад ва иваз мекунад.'],
                    'ru'  => ['title' => 'Мастер по замкам', 'description' => 'Вскрывает, устанавливает и меняет дверные замки.'],
                    'eng' => ['title' => 'Locksmith', 'description' => 'Opens, installs and replaces door locks.'],
                ],
            ],

            // ── Уход за животными ────────────────────────────────────────
            'veterinar' => [
                'translations' => [
                    'tj'  => ['title' => 'Ветеринар', 'description' => 'Ҳайвоноти хонагиро муоина ва табобат мекунад ва машварат медиҳад.'],
                    'ru'  => ['title' => 'Ветеринар', 'description' => 'Осматривает, лечит и консультирует по здоровью домашних животных.'],
                    'eng' => ['title' => 'Veterinarian', 'description' => 'Examines, treats and advises on the health of pets.'],
                ],
            ],
            'groomer' => [
                'translations' => [
                    'tj'  => ['title' => 'Грумер', 'description' => 'Мӯйи ҳайвоноти хонагиро сартарошӣ ва тартиб медиҳад.'],
                    'ru'  => ['title' => 'Грумер', 'description' => 'Стрижёт и приводит в порядок шерсть домашних животных.'],
                    'eng' => ['title' => 'Groomer', 'description' => "Trims and grooms pets' fur and coat."],
                ],
            ],
            'dog_trainer' => [
                'translations' => [
                    'tj'  => ['title' => 'Мураббии саг', 'description' => 'Сагҳоро тарбия мекунад ва мушкилоти рафториро ислоҳ мекунад.'],
                    'ru'  => ['title' => 'Кинолог', 'description' => 'Дрессирует собак и исправляет поведенческие проблемы.'],
                    'eng' => ['title' => 'Dog Trainer', 'description' => 'Trains dogs and corrects behavioural issues.'],
                ],
            ],
            'petsitter' => [
                'translations' => [
                    'tj'  => ['title' => 'Нигоҳубини ҳайвонот', 'description' => 'Дар набудани соҳиб ба ҳайвони хонагӣ нигоҳубин ва гардиш мекунад.'],
                    'ru'  => ['title' => 'Петситтер', 'description' => 'Присматривает за питомцем и выгуливает его в отсутствие хозяина.'],
                    'eng' => ['title' => 'Pet Sitter', 'description' => 'Looks after and walks a pet while the owner is away.'],
                ],
            ],

            // ── Ремонт бытовой техники (новая категория) ──────────────────
            'master_holodilnikov' => [
                'translations' => [
                    'tj'  => ['title' => 'Устои яхдон', 'description' => 'Яхдон ва фризерро дар хона таъмир мекунад.'],
                    'ru'  => ['title' => 'Мастер по ремонту холодильников', 'description' => 'Ремонтирует холодильники и морозильные камеры на дому.'],
                    'eng' => ['title' => 'Refrigerator Repair Technician', 'description' => 'Repairs refrigerators and freezers at home.'],
                ],
            ],
            'master_stiralnyh_mashin' => [
                'translations' => [
                    'tj'  => ['title' => 'Устои мошини либосшӯӣ', 'description' => 'Мошини либосшӯии ҳар маркаро таъмир мекунад.'],
                    'ru'  => ['title' => 'Мастер по ремонту стиральных машин', 'description' => 'Ремонтирует стиральные машины любых марок.'],
                    'eng' => ['title' => 'Washing Machine Repair Technician', 'description' => 'Repairs washing machines of any brand.'],
                ],
            ],
            'master_konditsionerov' => [
                'translations' => [
                    'tj'  => ['title' => 'Устои кондитсионер', 'description' => 'Кондитсионерро насб, тоза ва таъмир мекунад.'],
                    'ru'  => ['title' => 'Мастер по ремонту кондиционеров', 'description' => 'Устанавливает, чистит и ремонтирует кондиционеры.'],
                    'eng' => ['title' => 'Air Conditioner Repair Technician', 'description' => 'Installs, cleans and repairs air conditioners.'],
                ],
            ],
            'master_televizorov' => [
                'translations' => [
                    'tj'  => ['title' => 'Устои телевизор', 'description' => 'Телевизор ва дигар электроникаи рӯзғорро таъмир мекунад.'],
                    'ru'  => ['title' => 'Мастер по ремонту телевизоров', 'description' => 'Ремонтирует телевизоры и другую бытовую электронику.'],
                    'eng' => ['title' => 'TV Repair Technician', 'description' => 'Repairs TVs and other household electronics.'],
                ],
            ],

            // ── Мебель (новая категория) ───────────────────────────────────
            'sborshik_mebeli' => [
                'translations' => [
                    'tj'  => ['title' => 'Ҷамъкунандаи мебел', 'description' => 'Мебели навро мувофиқи дастури истеҳсолкунанда ҷамъоварӣ мекунад.'],
                    'ru'  => ['title' => 'Сборщик мебели', 'description' => "Собирает новую мебель по инструкции производителя."],
                    'eng' => ['title' => 'Furniture Assembler', 'description' => "Assembles new furniture according to the manufacturer's instructions."],
                ],
            ],
            'obivshik_mebeli' => [
                'translations' => [
                    'tj'  => ['title' => 'Рӯйпӯшкунандаи мебел', 'description' => 'Рӯйпӯши мебели мулоимро иваз ва нав мекунад.'],
                    'ru'  => ['title' => 'Обивщик мебели', 'description' => 'Перетягивает и обновляет обивку мягкой мебели.'],
                    'eng' => ['title' => 'Furniture Upholsterer', 'description' => 'Reupholsters and refreshes soft furniture covers.'],
                ],
            ],
            'stolyar' => [
                'translations' => [
                    'tj'  => ['title' => 'Дуредгар', 'description' => 'Маснуоти чӯбӣ ва мебели фармоишӣ месозад.'],
                    'ru'  => ['title' => 'Столяр', 'description' => 'Изготавливает изделия из дерева и мебель на заказ.'],
                    'eng' => ['title' => 'Carpenter', 'description' => 'Makes wooden items and custom furniture.'],
                ],
            ],
            'mebelshik_na_zakaz' => [
                'translations' => [
                    'tj'  => ['title' => 'Мебелсози фармоишӣ', 'description' => 'Мебелро мувофиқи андозаи инфиродӣ лоиҳакашӣ ва месозад.'],
                    'ru'  => ['title' => 'Мебельщик на заказ', 'description' => 'Проектирует и изготавливает мебель по индивидуальным размерам.'],
                    'eng' => ['title' => 'Custom Furniture Maker', 'description' => 'Designs and builds furniture to custom sizes.'],
                ],
            ],

            // ── Няни и уход за детьми (новая категория) ────────────────────
            'nyanya' => [
                'translations' => [
                    'tj'  => ['title' => 'Дояи бача', 'description' => 'Дар хона аз кӯдакон нигоҳубин мекунад ва бо онҳо машғул мешавад.'],
                    'ru'  => ['title' => 'Няня', 'description' => 'Присматривает за детьми и занимается с ними дома.'],
                    'eng' => ['title' => 'Nanny', 'description' => 'Looks after children and engages with them at home.'],
                ],
            ],
            'guvernantka' => [
                'translations' => [
                    'tj'  => ['title' => 'Гувернантка', 'description' => 'Бо тарбия ва таълими хонагии кӯдак машғул мешавад.'],
                    'ru'  => ['title' => 'Гувернантка', 'description' => "Занимается домашним воспитанием и обучением ребёнка."],
                    'eng' => ['title' => 'Governess', 'description' => "Handles a child's home upbringing and education."],
                ],
            ],
            'detsky_animator' => [
                'translations' => [
                    'tj'  => ['title' => 'Аниматори бачагона', 'description' => 'Дар ҷашни кӯдакона барномаи фароғатӣ мегузаронад.'],
                    'ru'  => ['title' => 'Детский аниматор на праздник', 'description' => 'Проводит развлекательную программу на детском празднике.'],
                    'eng' => ['title' => "Children's Party Entertainer", 'description' => "Runs an entertainment programme at a children's party."],
                ],
            ],

            // ── Швейные услуги (новая категория) ───────────────────────────
            'shvea' => [
                'translations' => [
                    'tj'  => ['title' => 'Дӯзанда', 'description' => 'Либосро бо фармоиши инфиродӣ медӯзад ва ислоҳ мекунад.'],
                    'ru'  => ['title' => 'Швея', 'description' => 'Шьёт и ремонтирует одежду по индивидуальному заказу.'],
                    'eng' => ['title' => 'Seamstress', 'description' => 'Sews and alters clothing to individual order.'],
                ],
            ],
            'zakroyshik' => [
                'translations' => [
                    'tj'  => ['title' => 'Буришгари либос', 'description' => 'Пеш аз дӯхтан матоъро мувофиқи андозаи инфиродӣ мебурад.'],
                    'ru'  => ['title' => 'Закройщик', 'description' => 'Раскраивает ткань по индивидуальным меркам перед пошивом.'],
                    'eng' => ['title' => 'Pattern Cutter', 'description' => 'Cuts fabric to custom measurements before sewing.'],
                ],
            ],
            'vyshivalshitsa' => [
                'translations' => [
                    'tj'  => ['title' => 'Гулдӯз', 'description' => 'Нақшу навиштаҷотро дар матоъ бо даст ё мошин гулдӯзӣ мекунад.'],
                    'ru'  => ['title' => 'Вышивальщица', 'description' => 'Вышивает узоры и надписи на ткани вручную или на машине.'],
                    'eng' => ['title' => 'Embroiderer', 'description' => 'Embroiders patterns and text on fabric by hand or machine.'],
                ],
            ],

            // ── Переводческие услуги (новая категория) ─────────────────────
            'perevodchik_ustny' => [
                'translations' => [
                    'tj'  => ['title' => 'Тарҷумони шифоҳӣ', 'description' => 'Нутқи шифоҳиро дар мулоқот ва чорабиниҳо тарҷума мекунад.'],
                    'ru'  => ['title' => 'Устный переводчик', 'description' => 'Переводит устную речь на встречах и мероприятиях.'],
                    'eng' => ['title' => 'Interpreter', 'description' => 'Interprets spoken language at meetings and events.'],
                ],
            ],
            'perevodchik_pismenny' => [
                'translations' => [
                    'tj'  => ['title' => 'Тарҷумони хаттӣ', 'description' => 'Ҳуҷҷат ва матнро ба таври хаттӣ тарҷума мекунад.'],
                    'ru'  => ['title' => 'Письменный переводчик', 'description' => 'Переводит документы и тексты письменно.'],
                    'eng' => ['title' => 'Translator', 'description' => 'Translates documents and texts in writing.'],
                ],
            ],
            'gid_perevodchik' => [
                'translations' => [
                    'tj'  => ['title' => 'Роҳнамо-тарҷумон', 'description' => 'Сайёҳонро дар экскурсияҳо бо тарҷума ҳамроҳӣ мекунад.'],
                    'ru'  => ['title' => 'Гид-переводчик', 'description' => 'Сопровождает туристов с переводом на экскурсиях.'],
                    'eng' => ['title' => 'Tour Guide-Interpreter', 'description' => 'Accompanies tourists on guided tours with translation.'],
                ],
            ],

            // ── Кулинария и кейтеринг (новая категория) ────────────────────
            'povar' => [
                'translations' => [
                    'tj'  => ['title' => 'Ошпаз', 'description' => 'Хӯрокро дар хона, чорабинӣ ё бо фармоиш тайёр мекунад.'],
                    'ru'  => ['title' => 'Повар', 'description' => 'Готовит блюда дома, на мероприятиях или под заказ.'],
                    'eng' => ['title' => 'Cook', 'description' => 'Cooks meals at home, for events, or to order.'],
                ],
            ],
            'konditer' => [
                'translations' => [
                    'tj'  => ['title' => 'Қаннодгар', 'description' => 'Бо фармоиш торт ва ширинӣ мепазад.'],
                    'ru'  => ['title' => 'Кондитер', 'description' => 'Печёт торты и десерты на заказ.'],
                    'eng' => ['title' => 'Confectioner', 'description' => 'Bakes custom cakes and desserts.'],
                ],
            ],
            'keytering_specialist' => [
                'translations' => [
                    'tj'  => ['title' => 'Мутахассиси кейтеринг', 'description' => 'Дар чорабиниҳо хӯрокворӣ ва хизматрасонии дастархонро ташкил мекунад.'],
                    'ru'  => ['title' => 'Специалист кейтеринга', 'description' => 'Организует питание и обслуживание стола на мероприятиях.'],
                    'eng' => ['title' => 'Catering Specialist', 'description' => 'Organises catering and table service for events.'],
                ],
            ],
            'barista' => [
                'translations' => [
                    'tj'  => ['title' => 'Бариста', 'description' => 'Барои меҳмонон ва чорабиниҳо нӯшокиҳои қаҳва тайёр мекунад.'],
                    'ru'  => ['title' => 'Бариста', 'description' => 'Готовит кофейные напитки для гостей и мероприятий.'],
                    'eng' => ['title' => 'Barista', 'description' => 'Prepares coffee drinks for guests and events.'],
                ],
            ],

            // ── Недвижимость (новая категория) ─────────────────────────────
            'rieltor' => [
                'translations' => [
                    'tj'  => ['title' => 'Риэлтор', 'description' => 'Дар хариду фурӯш ва иҷораи манзил кӯмак мекунад.'],
                    'ru'  => ['title' => 'Риэлтор', 'description' => 'Помогает купить, продать или снять недвижимость.'],
                    'eng' => ['title' => 'Real Estate Agent', 'description' => 'Helps buy, sell or rent real estate.'],
                ],
            ],
            'otsenshik_nedvizhimosti' => [
                'translations' => [
                    'tj'  => ['title' => 'Баҳодиҳандаи амволи ғайриманқул', 'description' => 'Арзиши бозории манзил, хона ва қитъаро баҳо медиҳад.'],
                    'ru'  => ['title' => 'Оценщик недвижимости', 'description' => 'Оценивает рыночную стоимость квартир, домов и участков.'],
                    'eng' => ['title' => 'Property Appraiser', 'description' => 'Assesses the market value of flats, houses and land plots.'],
                ],
            ],
            'upravlyayuschy_nedvizhimostyu' => [
                'translations' => [
                    'tj'  => ['title' => 'Мудири амволи ғайриманқул', 'description' => 'Иҷора ва хизматрасонии амволи ғайриманқулро идора мекунад.'],
                    'ru'  => ['title' => 'Управляющий недвижимостью', 'description' => 'Управляет сдачей в аренду и обслуживанием недвижимости.'],
                    'eng' => ['title' => 'Property Manager', 'description' => 'Manages the renting out and upkeep of properties.'],
                ],
            ],

            // ── Ландшафт и сад (новая категория) ────────────────────────────
            'sadovnik' => [
                'translations' => [
                    'tj'  => ['title' => 'Боғбон', 'description' => 'Аз боғ, чаман ва растаниҳои қитъа нигоҳубин мекунад.'],
                    'ru'  => ['title' => 'Садовник', 'description' => 'Ухаживает за садом, газоном и растениями на участке.'],
                    'eng' => ['title' => 'Gardener', 'description' => 'Cares for a garden, lawn and plants on the property.'],
                ],
            ],
            'landshaftny_dizayner' => [
                'translations' => [
                    'tj'  => ['title' => 'Дизайнери ландшафт', 'description' => 'Ободонӣ ва сабзукунии ҳудудро лоиҳакашӣ мекунад.'],
                    'ru'  => ['title' => 'Ландшафтный дизайнер', 'description' => 'Проектирует благоустройство и озеленение территории.'],
                    'eng' => ['title' => 'Landscape Designer', 'description' => 'Designs landscaping and greenery for an outdoor area.'],
                ],
            ],
            'agronom' => [
                'translations' => [
                    'tj'  => ['title' => 'Агроном', 'description' => 'Оид ба парвариш ва нигоҳубини растаниҳо машварат медиҳад.'],
                    'ru'  => ['title' => 'Агроном', 'description' => 'Консультирует по выращиванию и уходу за растениями.'],
                    'eng' => ['title' => 'Agronomist', 'description' => 'Advises on growing and caring for plants.'],
                ],
            ],

            // ── Ремонт компьютеров и телефонов (новая категория) ──────────
            'master_computerov' => [
                'translations' => [
                    'tj'  => ['title' => 'Устои компютер', 'description' => 'Компютеру ноутбукро ташхис ва таъмир мекунад.'],
                    'ru'  => ['title' => 'Мастер по ремонту компьютеров', 'description' => 'Диагностирует и ремонтирует компьютеры и ноутбуки.'],
                    'eng' => ['title' => 'Computer Repair Technician', 'description' => 'Diagnoses and repairs computers and laptops.'],
                ],
            ],
            'master_telefonov' => [
                'translations' => [
                    'tj'  => ['title' => 'Устои телефон', 'description' => 'Экран, батарея ва дигар қисмҳои телефонро таъмир мекунад.'],
                    'ru'  => ['title' => 'Мастер по ремонту телефонов', 'description' => 'Ремонтирует экраны, батареи и другие компоненты телефонов.'],
                    'eng' => ['title' => 'Phone Repair Technician', 'description' => 'Repairs screens, batteries and other phone components.'],
                ],
            ],
            'master_planshetov' => [
                'translations' => [
                    'tj'  => ['title' => 'Устои планшет', 'description' => 'Планшетро таъмир ва хароботии онро бартараф мекунад.'],
                    'ru'  => ['title' => 'Мастер по ремонту планшетов', 'description' => 'Ремонтирует планшеты и устраняет их неисправности.'],
                    'eng' => ['title' => 'Tablet Repair Technician', 'description' => 'Repairs tablets and fixes their faults.'],
                ],
            ],
            'master_printerov' => [
                'translations' => [
                    'tj'  => ['title' => 'Устои принтер', 'description' => 'Принтерро таъмир мекунад ва картриҷро пур мекунад.'],
                    'ru'  => ['title' => 'Мастер по ремонту принтеров', 'description' => 'Ремонтирует принтеры и заправляет картриджи.'],
                    'eng' => ['title' => 'Printer Repair Technician', 'description' => 'Repairs printers and refills cartridges.'],
                ],
            ],

            // ── Разнорабочие услуги (новая категория) ──────────────────────
            'raznorabochiy' => [
                'translations' => [
                    'tj'  => ['title' => 'Коргари ёрирасон', 'description' => 'Мувофиқи хости мизоҷ намудҳои гуногуни кори ҷисмониро иҷро мекунад.'],
                    'ru'  => ['title' => 'Разнорабочий', 'description' => 'Выполняет разные виды физической работы по просьбе клиента.'],
                    'eng' => ['title' => 'General Labourer', 'description' => "Performs various kinds of physical work at the client's request."],
                ],
            ],
            'podsobnik' => [
                'translations' => [
                    'tj'  => ['title' => 'Ёрдамчии сохтмон', 'description' => 'Дар сохтмон ва интиқоли бор кӯмак мекунад.'],
                    'ru'  => ['title' => 'Подсобный рабочий', 'description' => 'Помогает на стройке и с переноской грузов.'],
                    'eng' => ['title' => 'Construction Helper', 'description' => 'Helps on construction sites and with moving loads.'],
                ],
            ],
            'master_na_chas' => [
                'translations' => [
                    'tj'  => ['title' => 'Уста барои корҳои хурд', 'description' => 'Таъмири хурди рӯзгорро иҷро мекунад: раф, мебел, сантехника.'],
                    'ru'  => ['title' => 'Мастер на час', 'description' => 'Выполняет мелкий бытовой ремонт: полки, мебель, сантехника.'],
                    'eng' => ['title' => 'Handyman', 'description' => 'Handles small household fixes: shelves, furniture, plumbing.'],
                ],
            ],

            // ── Ювелирные и часовые услуги (новая категория) ────────────────
            'yuvelir' => [
                'translations' => [
                    'tj'  => ['title' => 'Заргар', 'description' => 'Зевари заргариро месозад ва таъмир мекунад.'],
                    'ru'  => ['title' => 'Ювелир', 'description' => 'Изготавливает и ремонтирует ювелирные украшения.'],
                    'eng' => ['title' => 'Jeweller', 'description' => 'Makes and repairs jewellery.'],
                ],
            ],
            'chasovshik' => [
                'translations' => [
                    'tj'  => ['title' => 'Соатсоз', 'description' => 'Соатҳои механикӣ ва электрониро таъмир ва танзим мекунад.'],
                    'ru'  => ['title' => 'Часовщик', 'description' => 'Ремонтирует и настраивает механические и электронные часы.'],
                    'eng' => ['title' => 'Watchmaker', 'description' => 'Repairs and adjusts mechanical and electronic watches.'],
                ],
            ],
            'graver' => [
                'translations' => [
                    'tj'  => ['title' => 'Кандакор', 'description' => 'Рӯи металл, зевар ва тӯҳфаҳо кандакорӣ мекунад.'],
                    'ru'  => ['title' => 'Гравёр', 'description' => 'Наносит гравировку на металл, украшения и сувениры.'],
                    'eng' => ['title' => 'Engraver', 'description' => 'Engraves metal, jewellery and souvenirs.'],
                ],
            ],

            // ── Психология и консультации (новая категория) ─────────────────
            'psycholog' => [
                'translations' => [
                    'tj'  => ['title' => 'Равоншинос', 'description' => 'Оид ба масъалаҳои шахсӣ машваратҳои равоншиносӣ мегузаронад.'],
                    'ru'  => ['title' => 'Психолог', 'description' => 'Проводит психологические консультации по личным вопросам.'],
                    'eng' => ['title' => 'Psychologist', 'description' => 'Provides psychological counselling on personal matters.'],
                ],
            ],
            'semeynyy_konsultant' => [
                'translations' => [
                    'tj'  => ['title' => 'Мушовири оилавӣ', 'description' => 'Дар ҳалли ихтилофу мушкилоти оилавӣ кӯмак мекунад.'],
                    'ru'  => ['title' => 'Семейный консультант', 'description' => 'Помогает решать конфликты и проблемы в семье.'],
                    'eng' => ['title' => 'Family Counsellor', 'description' => 'Helps resolve family conflicts and problems.'],
                ],
            ],
            'coach' => [
                'translations' => [
                    'tj'  => ['title' => 'Коуч', 'description' => 'Ба мизоҷ дар рушди шахсӣ ва касбӣ кӯмак мекунад.'],
                    'ru'  => ['title' => 'Коуч личностного роста', 'description' => 'Помогает клиенту в личностном и карьерном развитии.'],
                    'eng' => ['title' => 'Personal Development Coach', 'description' => "Helps clients with personal and career development."],
                ],
            ],

            // ── Печать и полиграфия (новая категория) ───────────────────────
            'tipograf' => [
                'translations' => [
                    'tj'  => ['title' => 'Чопгар', 'description' => 'Маҳсулоти полиграфӣ чоп мекунад: корти визитӣ, буклет, баннер.'],
                    'ru'  => ['title' => 'Печатник', 'description' => 'Печатает полиграфическую продукцию: визитки, буклеты, баннеры.'],
                    'eng' => ['title' => 'Printer Operator', 'description' => 'Prints promotional materials: business cards, booklets, banners.'],
                ],
            ],
            'dizayner_pechati' => [
                'translations' => [
                    'tj'  => ['title' => 'Дизайнери маводи чопӣ', 'description' => 'Барои маҳсулоти чопӣ макет таҳия мекунад.'],
                    'ru'  => ['title' => 'Дизайнер печатной продукции', 'description' => 'Разрабатывает макеты для печатной продукции.'],
                    'eng' => ['title' => 'Print Designer', 'description' => 'Creates layouts for printed materials.'],
                ],
            ],

            // ── Обувные и кожаные изделия (новая категория) ─────────────────
            'sapozhnik' => [
                'translations' => [
                    'tj'  => ['title' => 'Мӯзадӯз', 'description' => 'Пойафзолро таъмир ва тоза мекунад.'],
                    'ru'  => ['title' => 'Сапожник', 'description' => 'Ремонтирует и чистит обувь.'],
                    'eng' => ['title' => 'Shoemaker', 'description' => 'Repairs and cleans footwear.'],
                ],
            ],
            'kozhevnik' => [
                'translations' => [
                    'tj'  => ['title' => 'Устои чарм', 'description' => 'Сумка, тасма ва дигар маснуоти чармиро таъмир мекунад.'],
                    'ru'  => ['title' => 'Мастер по коже', 'description' => 'Ремонтирует сумки, ремни и другие изделия из кожи.'],
                    'eng' => ['title' => 'Leather Craftsman', 'description' => 'Repairs bags, belts and other leather goods.'],
                ],
            ],
        ];

        foreach ($occupationsData as $key => $data) {
            $occupation = new Occupation();

            // Значение на самой сущности — фолбэк на русский (тот же
            // паттерн, что у CategoryFixture/LegalFixture): реальное
            // per-locale значение резолвится на чтение через
            // localizeEntityFull() (см. докблок класса выше).
            $occupation->setDescription($data['translations']['ru']['description']);

            $reflection = new ReflectionClass($occupation);
            /** @noinspection PhpStatementHasEmptyBodyInspection */
            while (!$reflection->hasProperty('translations') && $reflection = $reflection->getParentClass());
            $property = $reflection->getProperty('translations');
            $property->setValue($occupation, new ArrayCollection());

            foreach ($data['translations'] as $locale => $trans) {
                $translation = (new Translation())
                    ->setTitle($trans['title'])
                    ->setDescription($trans['description'])
                    ->setLocale($locale)
                    ->setOccupation($occupation);

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

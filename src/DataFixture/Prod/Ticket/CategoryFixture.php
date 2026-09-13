<?php

namespace App\DataFixture\Prod\Ticket;

use App\Entity\Extra\Translation;
use App\Entity\Ticket\Category;
use App\Entity\User\Occupation;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Bundle\FixturesBundle\FixtureGroupInterface;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\DataFixtures\DependentFixtureInterface;
use Doctrine\Persistence\ObjectManager;
use ReflectionClass;

/**
 * ЧИСТО прод-данные — не зависит ни от чего из App\DataFixture\Dev, чтобы
 * `doctrine:fixtures:load --group=prod` реально грузил только это, без
 * dev-тикетов/пользователей. Привязка dev-тикетов к конкретным подкатегориям
 * (раньше жила прямо тут, под ключом 'tickets') переехала в отдельную
 * dev-фикстуру — см. App\DataFixture\Dev\Additional\TicketCategoryLinkFixture.
 */
class CategoryFixture extends Fixture implements DependentFixtureInterface, FixtureGroupInterface
{
    public static function getGroups(): array
    {
        return ['prod'];
    }

    public function load(ObjectManager $manager): void
    {
        // occupations: ВСЕ подкатегории этой категории (one-to-many,
        // Category::addOccupation() → Occupation::setCategory()) — раньше
        // привязывалась только одна "основная" профессия. Теперь — полный список.
        //
        // БАГФИКС (13.09.2026, по задаче "описание категории не переведено"):
        // раньше 'description' было ОДНОЙ строкой на три языка через \n
        // ("Кори сантехникӣ\nСантехнические работы\nPlumbing works") —
        // не реальный перевод, а слепленные вместе короткие ярлыки-синонимы
        // заголовка, и отдавался клиенту ЦЕЛИКОМ независимо от ?locale=
        // (Category::$description не был per-locale вообще, в отличие от
        // $title, который уже шёл через Translation). Теперь description —
        // такой же per-locale перевод, как title (тот же Translation,
        // тот же паттерн, что уже используется в LegalFixture), и это
        // РЕАЛЬНЫЙ описательный текст (что входит в категорию, какие услуги
        // ожидать), а не набор синонимов заголовка. Локализация на чтение —
        // см. CategoryTitleLocalizationProvider::localize() (localizeEntityFull()
        // вместо localizeEntity()) и правки в местах, где Category
        // встраивается в Ticket (LocalizationService::localizeTicket(),
        // TicketGeographyLocalizationProvider, FavoriteStateProvider).
        $categoriesData = [
            'santexnika' => [
                'translations' => [
                    'tj'  => ['title' => 'Сантехника', 'description' => 'Насбу таъмири лӯлакашии об, канализатсия ва системаҳои гармидиҳӣ. Бартараф кардани ништи об, иваз кардани лӯлаҳо ва асбобҳои сантехникӣ, насби системаҳои гармидиҳии ҳама гуна мураккабӣ.'],
                    'ru'  => ['title' => 'Сантехника', 'description' => 'Установка и ремонт водопровода, канализации и систем отопления. Устранение протечек, замена труб и сантехнических приборов, монтаж отопительных систем любой сложности.'],
                    'eng' => ['title' => 'Plumbing',   'description' => 'Installation and repair of water supply, sewage and heating systems. Fixing leaks, replacing pipes and plumbing fixtures, and installing heating systems of any complexity.'],
                ],
                'occupations'  => ['santexnik', 'truboprovodchik', 'svarshik', 'montazhnik_otopleniya'],
            ],
            'it' => [
                'translations' => [
                    'tj'  => ['title' => 'ТИ', 'description' => 'Таҳияи сомонаҳо, барномаҳои мобилӣ ва таъминоти барномавӣ, танзими серверҳо ва шабакаҳо, санҷиш ва таҳлили маълумот. Ҳама чиз барои лоиҳаҳои рақамӣ дар ҳар андоза.'],
                    'ru'  => ['title' => 'IT', 'description' => 'Разработка сайтов, мобильных приложений и программного обеспечения, настройка серверов и сетей, тестирование и анализ данных. Всё для цифровых проектов любого масштаба.'],
                    'eng' => ['title' => 'IT', 'description' => 'Development of websites, mobile apps and software, server and network configuration, testing and data analysis. Everything for digital projects of any scale.'],
                ],
                'occupations'  => ['programmer', 'sysadmin', 'network_engineer', 'mobile_developer', 'qa_engineer', 'data_analyst'],
            ],
            'beauty' => [
                'translations' => [
                    'tj'  => ['title' => 'Зебоӣ ва саломатӣ', 'description' => 'Нигоҳубини пӯст ва бадан, мӯйсартарошӣ ва ороиши мӯй, маникюр ва педикюр, ороиши рӯй ва ислоҳи абрувон. Ғамхории касбӣ дар бораи зебоӣ ва саломатии шумо дар хона ё салон.'],
                    'ru'  => ['title' => 'Красота и здоровье', 'description' => 'Уход за кожей и телом, стрижки и укладки, маникюр и педикюр, макияж и коррекция бровей. Профессиональная забота о вашей красоте и здоровье на дому или в салоне.'],
                    'eng' => ['title' => 'Beauty and Health', 'description' => 'Skin and body care, haircuts and styling, manicure and pedicure, makeup and eyebrow shaping. Professional care for your beauty and health at home or in a salon.'],
                ],
                'occupations'  => ['kosmetolog', 'masseur', 'parikmakher', 'manikyurshitsa', 'vizazhist', 'brovist'],
            ],
            'repair' => [
                'translations' => [
                    'tj'  => ['title' => 'Таъмири хона', 'description' => 'Корҳои сохтмонӣ ва пардозӣ бо ҳар гуна мураккабӣ: гузоштани кошинкорӣ, ранг кардан, гаҷкорӣ, бомпӯшонӣ ва насби тирезаҳо. Таъмири хонаҳо, манзилҳо ва бинои тиҷоратӣ аз оғоз то анҷом.'],
                    'ru'  => ['title' => 'Ремонт и строительство', 'description' => 'Строительные и отделочные работы любой сложности: кладка плитки, покраска, штукатурка, кровля и установка окон. Ремонт квартир, домов и коммерческих помещений под ключ.'],
                    'eng' => ['title' => 'Repair and Construction', 'description' => 'Construction and finishing works of any complexity: tiling, painting, plastering, roofing and window installation. Turnkey renovation of apartments, houses and commercial premises.'],
                ],
                'occupations'  => ['stroitel', 'plitochnik', 'maljar', 'metalist', 'shtukatur', 'krovelshik', 'okonshik'],
            ],
            'electricity' => [
                'translations' => [
                    'tj'  => ['title' => 'Барқкашӣ', 'description' => 'Насб ва таъмири симкашии барқ, пайваст кардани техникаи маишӣ, бартараф кардани халалҳои шабакаи барқ, хизматрасонии лифтҳо. Кори бехатар ва босифат бо барқ.'],
                    'ru'  => ['title' => 'Электрика', 'description' => 'Монтаж и ремонт электропроводки, подключение бытовой техники, устранение неполадок в электросетях, обслуживание лифтов. Безопасная и качественная работа с электричеством.'],
                    'eng' => ['title' => 'Electrical', 'description' => 'Installation and repair of electrical wiring, connecting household appliances, troubleshooting electrical networks, and elevator maintenance. Safe and quality electrical work.'],
                ],
                'occupations'  => ['elektrik', 'energetik', 'liftyor'],
            ],
            'cleaning' => [
                'translations' => [
                    'tj'  => ['title' => 'Тозакунӣ', 'description' => 'Тозакунии манзилҳо, хонаҳо ва идораҳо, тозакунии кимиёвии мебел ва гилемҳо, шустани тирезаҳо, кӯмак дар хона. Тозагӣ ва тартиб бе ташвиши иловагӣ.'],
                    'ru'  => ['title' => 'Уборка', 'description' => 'Уборка квартир, домов и офисов, химчистка мебели и ковров, мытьё окон, помощь по дому. Чистота и порядок без лишних хлопот.'],
                    'eng' => ['title' => 'Cleaning', 'description' => 'Cleaning of apartments, houses and offices, dry cleaning of furniture and carpets, window washing, and household help. Cleanliness and order without extra hassle.'],
                ],
                'occupations'  => ['kliner', 'himchistka', 'moyshik_okon', 'domrabotnitsa'],
            ],
            'transport' => [
                'translations' => [
                    'tj'  => ['title' => 'Нақлиёт', 'description' => 'Интиқоли одамон ва бор, хизматрасонии борбардорон ва курерҳо, расонидан ва экспедитсия. Интиқоли зуд ва боэътимод ба ҳар нуқта.'],
                    'ru'  => ['title' => 'Транспорт и перевозки', 'description' => 'Перевозка людей и грузов, услуги грузчиков и курьеров, доставка и экспедирование. Быстрая и надёжная транспортировка в любую точку.'],
                    'eng' => ['title' => 'Transport and Logistics', 'description' => 'Transportation of people and goods, loading and courier services, delivery and freight forwarding. Fast and reliable transport to any destination.'],
                ],
                'occupations'  => ['voditel', 'gruzchik', 'kurier', 'ekspeditor', 'taksist'],
            ],
            'education' => [
                'translations' => [
                    'tj'  => ['title' => 'Таълим', 'description' => 'Дарсҳои инфиродӣ ва гурӯҳӣ аз фанҳои мактабӣ ва забонҳои хориҷӣ, таълими мусиқӣ, логопедия, шоҳмот. Инкишоф ва таълим барои кӯдакон ва калонсолон.'],
                    'ru'  => ['title' => 'Образование и репетиторство', 'description' => 'Индивидуальные и групповые занятия по школьным предметам и иностранным языкам, обучение музыке, логопедия, шахматы. Развитие и обучение для детей и взрослых.'],
                    'eng' => ['title' => 'Education and Tutoring', 'description' => 'Individual and group lessons in school subjects and foreign languages, music education, speech therapy, and chess. Development and learning for children and adults.'],
                ],
                'occupations'  => ['repetitor', 'language_trainer', 'muzykalny_pedagog', 'logoped', 'trener_shakhmat'],
            ],
            'auto' => [
                'translations' => [
                    'tj'  => ['title' => 'Таъмири автомобил', 'description' => 'Ташхис ва таъмири мошинҳо, барқи мошин, васлкунии чарх ва шустушӯй. Хизматрасонии пурраи автомобилӣ барои нигоҳ доштани мошини шумо дар ҳолати солим.'],
                    'ru'  => ['title' => 'Авто и автосервис', 'description' => 'Диагностика и ремонт автомобилей, электрика, шиномонтаж и мойка. Полный автосервис для поддержания вашего авто в исправном состоянии.'],
                    'eng' => ['title' => 'Auto and Car Service', 'description' => 'Car diagnostics and repair, auto electrics, tire fitting and car washing. Full auto service to keep your vehicle in perfect condition.'],
                ],
                'occupations'  => ['avtomehanik', 'avtoelektrik', 'shinomontazhnik', 'avtomoyshik'],
            ],
            'design' => [
                'translations' => [
                    'tj'  => ['title' => 'Дизайн', 'description' => 'Дизайни графикӣ ва веб, дизайни дохилӣ, иллюстратсия ва тарҳрезии либос. Ҳалли эҷодӣ барои брендҳо, сомонаҳо ва фазоҳо.'],
                    'ru'  => ['title' => 'Дизайн и творчество', 'description' => 'Графический и веб-дизайн, дизайн интерьера, иллюстрации и создание моделей одежды. Творческие решения для брендов, сайтов и пространств.'],
                    'eng' => ['title' => 'Design and Creative', 'description' => 'Graphic and web design, interior design, illustration and clothing pattern making. Creative solutions for brands, websites and spaces.'],
                ],
                'occupations'  => ['grafik_dizayner', 'veb_dizayner', 'interior_dizayner', 'illustrator', 'modelyer'],
            ],
            'legal' => [
                'translations' => [
                    'tj'  => ['title' => 'Хизматҳои ҳуқуқӣ', 'description' => 'Машваратҳои ҳуқуқӣ, намояндагӣ дар суд, кӯмак дар омода кардани ҳуҷҷатҳо ва машварати андозӣ. Ҳимояи ҳуқуқ ва манфиатҳои шумо.'],
                    'ru'  => ['title' => 'Юридические услуги', 'description' => 'Юридические консультации, представительство в суде, помощь в оформлении документов и налоговое консультирование. Защита ваших прав и интересов.'],
                    'eng' => ['title' => 'Legal Services', 'description' => 'Legal consultations, court representation, assistance with document preparation and tax advisory. Protecting your rights and interests.'],
                ],
                'occupations'  => ['yurist', 'advokat', 'nalogovy_konsultant'],
            ],
            'accounting' => [
                'translations' => [
                    'tj'  => ['title' => 'Бухгалтерия', 'description' => 'Пешбурди баҳисобгирӣ, аудит, коргузории кадрӣ. Тартиби молиявӣ ва ҳисоботдиҳӣ барои бизнес дар ҳар андоза.'],
                    'ru'  => ['title' => 'Бухгалтерия и финансы', 'description' => 'Ведение бухгалтерии, аудит, кадровое делопроизводство. Финансовый порядок и отчётность для бизнеса любого размера.'],
                    'eng' => ['title' => 'Accounting and Finance', 'description' => 'Bookkeeping, auditing, and HR administration. Financial order and reporting for businesses of any size.'],
                ],
                'occupations'  => ['buhgalter', 'auditor', 'kadrovik'],
            ],
            'photography' => [
                'translations' => [
                    'tj'  => ['title' => 'Аксбардорӣ', 'description' => 'Аксбардорӣ ва видеогирии чорабиниҳо, портретҳо ва реклама, монтажи видео ва ретуши аксҳо. Хотираи бадеии босифати рӯйдодҳои шумо.'],
                    'ru'  => ['title' => 'Фото и видеосъёмка', 'description' => 'Фото- и видеосъёмка мероприятий, портретов и рекламы, монтаж видео и ретушь фотографий. Качественная визуальная память ваших событий.'],
                    'eng' => ['title' => 'Photography and Videography', 'description' => 'Photo and video shooting of events, portraits and advertising, video editing and photo retouching. High-quality visual memories of your moments.'],
                ],
                'occupations'  => ['fotograf', 'videograf', 'montazher_video', 'retusher'],
            ],
            'medicine' => [
                'translations' => [
                    'tj'  => ['title' => 'Тиб ва саломатӣ', 'description' => 'Машваратҳои духтурон, хизматрасонии ҳамшираҳои шафқат ва дандонпизишкон, кӯмаки фармасевтҳо. Ғамхорӣ дар бораи саломатии шумо аз ҷониби мутахассисони соҳибихтисос.'],
                    'ru'  => ['title' => 'Медицина и здоровье', 'description' => 'Консультации врачей, услуги медсестёр и стоматологов, помощь фармацевтов. Забота о вашем здоровье от квалифицированных специалистов.'],
                    'eng' => ['title' => 'Medicine and Healthcare', 'description' => 'Doctor consultations, nursing and dental services, and pharmacist assistance. Care for your health from qualified specialists.'],
                ],
                'occupations'  => ['vrach', 'medsestra', 'stomatolog', 'farmatsevt'],
            ],
            'fitness' => [
                'translations' => [
                    'tj'  => ['title' => 'Варзиш ва фитнес', 'description' => 'Машқҳои инфиродӣ, йога, таълими шино ва машваратҳои диетолог. Роҳ ба сӯи бадани солим ва тарзи ҳаёти фаъол.'],
                    'ru'  => ['title' => 'Спорт и фитнес', 'description' => 'Персональные тренировки, йога, обучение плаванию и консультации диетологов. Путь к здоровому телу и активному образу жизни.'],
                    'eng' => ['title' => 'Sports and Fitness', 'description' => 'Personal training, yoga, swimming lessons and dietitian consultations. Your path to a healthy body and an active lifestyle.'],
                ],
                'occupations'  => ['personal_trainer', 'yoga_instruktor', 'trener_plavaniya', 'dietolog'],
            ],
            'events' => [
                'translations' => [
                    'tj'  => ['title' => 'Чорабиниҳо', 'description' => 'Ташкили ҷашнҳо ва чорабиниҳо, тамошобинони маросимҳо ва DJ-ҳо, ороиш ва аниматорон барои кӯдакон. Рӯйдодҳои фаромӯшнашаванда аз оғоз то анҷом.'],
                    'ru'  => ['title' => 'Мероприятия и ивент', 'description' => 'Организация праздников и мероприятий, ведущие и диджеи, декор и аниматоры для детей. Незабываемые события под ключ.'],
                    'eng' => ['title' => 'Events and Entertainment', 'description' => 'Organizing celebrations and events, hosts and DJs, decoration and entertainers for children. Unforgettable turnkey events.'],
                ],
                'occupations'  => ['event_manager', 'toastmaster', 'dj', 'dekorator', 'animator'],
            ],
            'security' => [
                'translations' => [
                    'tj'  => ['title' => 'Амнияти объект', 'description' => 'Муҳофизати объектҳо ва бехатарии шахсӣ, насби сигнализатсия, хизматрасонии устоҳои қулф. Ҳимояи боэътимоди шумо ва амволатон.'],
                    'ru'  => ['title' => 'Охрана и безопасность', 'description' => 'Охрана объектов и личная безопасность, установка сигнализации, услуги мастеров по замкам. Надёжная защита вас и вашего имущества.'],
                    'eng' => ['title' => 'Security Services', 'description' => 'Site security and personal safety, alarm system installation, and locksmith services. Reliable protection for you and your property.'],
                ],
                'occupations'  => ['ohrannik', 'telohranitel', 'montazhnik_signalizacii', 'master_zamkov'],
            ],
            'animals' => [
                'translations' => [
                    'tj'  => ['title' => 'Нигоҳубини ҳайвонот', 'description' => 'Кӯмаки байторӣ, грум, тарбия ва нигоҳубини муваққатии ҳайвоноти хонагӣ. Ғамхорӣ дар бораи ҳайвоноти хонагии шумо дар дастони боэътимод.'],
                    'ru'  => ['title' => 'Уход за животными', 'description' => 'Ветеринарная помощь, груминг, дрессировка и передержка домашних животных. Забота о ваших питомцах в надёжных руках.'],
                    'eng' => ['title' => 'Pet Care', 'description' => 'Veterinary care, grooming, training and pet sitting for domestic animals. Caring for your pets in trusted hands.'],
                ],
                'occupations'  => ['veterinar', 'groomer', 'dog_trainer', 'petsitter'],
            ],

            // ── Новые категории ──────────────────────────────────────────
            'appliance_repair' => [
                'translations' => [
                    'tj'  => ['title' => 'Таъмири техникаи рӯзгор', 'description' => 'Таъмири яхдонҳо, мошинҳои либосшӯӣ, кондитсионерҳо ва телевизорҳо дар хона. Барқарор кардани тезтари кори техникаи маишии шумо.'],
                    'ru'  => ['title' => 'Ремонт бытовой техники', 'description' => 'Ремонт холодильников, стиральных машин, кондиционеров и телевизоров на дому. Быстрое восстановление работы вашей бытовой техники.'],
                    'eng' => ['title' => 'Appliance Repair', 'description' => 'Repair of refrigerators, washing machines, air conditioners and TVs at home. Quick restoration of your household appliances.'],
                ],
                'occupations'  => ['master_holodilnikov', 'master_stiralnyh_mashin', 'master_konditsionerov', 'master_televizorov'],
            ],
            'furniture' => [
                'translations' => [
                    'tj'  => ['title' => 'Мебел', 'description' => 'Ҷамъоварӣ ва таъмири мебел, часпондани матоъ ва дуредгарӣ, сохтани мебели фармоишӣ. Мебели босифат барои хона ва идораи шумо.'],
                    'ru'  => ['title' => 'Мебель', 'description' => 'Сборка и ремонт мебели, обивка и столярные работы, изготовление мебели на заказ. Качественная мебель для вашего дома и офиса.'],
                    'eng' => ['title' => 'Furniture', 'description' => 'Furniture assembly and repair, upholstery and carpentry work, custom furniture making. Quality furniture for your home and office.'],
                ],
                'occupations'  => ['sborshik_mebeli', 'obivshik_mebeli', 'stolyar', 'mebelshik_na_zakaz'],
            ],
            'childcare' => [
                'translations' => [
                    'tj'  => ['title' => 'Нигоҳубини кӯдакон', 'description' => 'Хизматрасонии нянягиҳо ва мураббиён, аниматорони кӯдакона барои ҷашнҳо. Нигоҳубини ғамхорона ва фароғат барои фарзандони шумо.'],
                    'ru'  => ['title' => 'Няни и уход за детьми', 'description' => 'Услуги нянь и гувернанток, детская анимация для праздников. Заботливый присмотр и досуг для ваших детей.'],
                    'eng' => ['title' => 'Childcare', 'description' => "Nanny and governess services, children's entertainment for parties. Caring supervision and leisure activities for your kids."],
                ],
                'occupations'  => ['nyanya', 'guvernantka', 'detsky_animator'],
            ],
            'sewing' => [
                'translations' => [
                    'tj'  => ['title' => 'Хизматҳои дӯзандагӣ', 'description' => 'Дӯхтан ва ислоҳи либос ба фармоиш, буриши матоъ, гулдӯзӣ. Ҳалли инфиродии дӯзандагӣ барои ҳар гуна либос.'],
                    'ru'  => ['title' => 'Швейные услуги', 'description' => 'Пошив и ремонт одежды на заказ, раскрой тканей, вышивка. Индивидуальные швейные решения для любого гардероба.'],
                    'eng' => ['title' => 'Tailoring and Sewing', 'description' => 'Custom clothing sewing and alterations, fabric cutting, embroidery. Individual sewing solutions for any wardrobe.'],
                ],
                'occupations'  => ['shvea', 'zakroyshik', 'vyshivalshitsa'],
            ],
            'translation' => [
                'translations' => [
                    'tj'  => ['title' => 'Хизматҳои тарҷумонӣ', 'description' => 'Тарҷумаи шифоҳӣ ва хаттӣ ба забонҳои гуногун, хизматрасонии гидҳои тарҷумон. Муоширати возеҳ бе монеаҳои забонӣ.'],
                    'ru'  => ['title' => 'Переводческие услуги', 'description' => 'Устный и письменный перевод на разные языки, услуги гидов-переводчиков. Понятная коммуникация без языковых барьеров.'],
                    'eng' => ['title' => 'Translation Services', 'description' => 'Oral and written translation into various languages, tour guide-interpreter services. Clear communication without language barriers.'],
                ],
                'occupations'  => ['perevodchik_ustny', 'perevodchik_pismenny', 'gid_perevodchik'],
            ],
            'catering' => [
                'translations' => [
                    'tj'  => ['title' => 'Ошпазӣ ва кейтеринг', 'description' => 'Пухтани хӯрок ва ширинӣ, кейтеринг барои чорабиниҳо, хизматрасонии баристо. Ҳалли болаззат барои ҳар вазъият.'],
                    'ru'  => ['title' => 'Кулинария и кейтеринг', 'description' => 'Приготовление блюд и десертов, кейтеринг для мероприятий, услуги бариста. Вкусные решения для любого случая.'],
                    'eng' => ['title' => 'Cooking and Catering', 'description' => 'Cooking dishes and desserts, catering for events, barista services. Delicious solutions for any occasion.'],
                ],
                'occupations'  => ['povar', 'konditer', 'keytering_specialist', 'barista'],
            ],
            'realestate' => [
                'translations' => [
                    'tj'  => ['title' => 'Амволи ғайриманқул', 'description' => 'Хариду фурӯш ва иҷораи амволи ғайриманқул, арзёбӣ ва идоракунии он. Ҳамроҳии касбии муомилот бо манзил.'],
                    'ru'  => ['title' => 'Недвижимость', 'description' => 'Покупка, продажа и аренда недвижимости, её оценка и управление. Профессиональное сопровождение сделок с жильём.'],
                    'eng' => ['title' => 'Real Estate', 'description' => 'Buying, selling and renting property, its valuation and management. Professional support for real estate transactions.'],
                ],
                'occupations'  => ['rieltor', 'otsenshik_nedvizhimosti', 'upravlyayuschy_nedvizhimostyu'],
            ],
            'landscaping' => [
                'translations' => [
                    'tj'  => ['title' => 'Боғдорӣ ва ландшафт', 'description' => 'Нигоҳубини боғ, дизайни ландшафт ва машваратҳои агрономӣ. Ҳудуди зебо ва тозаи тамоми сол.'],
                    'ru'  => ['title' => 'Ландшафт и сад', 'description' => 'Уход за садом, ландшафтный дизайн и агрономические консультации. Красивая и ухоженная территория круглый год.'],
                    'eng' => ['title' => 'Landscaping and Gardening', 'description' => 'Garden care, landscape design and agronomic consultations. A beautiful, well-maintained area all year round.'],
                ],
                'occupations'  => ['sadovnik', 'landshaftny_dizayner', 'agronom'],
            ],
            'device_repair' => [
                'translations' => [
                    'tj'  => ['title' => 'Таъмири компютер ва телефон', 'description' => 'Таъмири компютерҳо, телефонҳо, планшетҳо ва принтерҳо. Барқарорсозии тезтари дастгоҳҳои шумо бидуни аз даст додани маълумот.'],
                    'ru'  => ['title' => 'Ремонт компьютеров и телефонов', 'description' => 'Ремонт компьютеров, телефонов, планшетов и принтеров. Быстрое восстановление ваших устройств без потери данных.'],
                    'eng' => ['title' => 'Computer and Phone Repair', 'description' => 'Repair of computers, phones, tablets and printers. Quick restoration of your devices without data loss.'],
                ],
                'occupations'  => ['master_computerov', 'master_telefonov', 'master_planshetov', 'master_printerov'],
            ],
            'handyman' => [
                'translations' => [
                    'tj'  => ['title' => 'Хизматҳои ёрирасон', 'description' => 'Таъмири хурди рӯзгор ва кӯмаки ҷисмонӣ дар хона барои як соат. Ҳалли тези масъалаҳои рӯзмарра бе харҷи иловагӣ.'],
                    'ru'  => ['title' => 'Разнорабочие услуги', 'description' => 'Мелкий бытовой ремонт и физическая помощь по дому на час. Быстрое решение бытовых задач без лишних затрат.'],
                    'eng' => ['title' => 'Handyman Services', 'description' => 'Small household repairs and physical help around the house by the hour. Quick solutions to everyday tasks without extra costs.'],
                ],
                'occupations'  => ['raznorabochiy', 'podsobnik', 'master_na_chas'],
            ],
            'jewelry_watches' => [
                'translations' => [
                    'tj'  => ['title' => 'Заргарӣ ва соатсозӣ', 'description' => 'Сохтан ва таъмири маснуоти заргарӣ ва соат, гравюра. Маҳорате, ки арзиши зевари шуморо нигоҳ медорад.'],
                    'ru'  => ['title' => 'Ювелирные и часовые услуги', 'description' => 'Изготовление и ремонт ювелирных изделий и часов, гравировка. Мастерство, сохраняющее ценность ваших украшений.'],
                    'eng' => ['title' => 'Jewellery and Watch Services', 'description' => 'Making and repairing jewellery and watches, engraving. Craftsmanship that preserves the value of your accessories.'],
                ],
                'occupations'  => ['yuvelir', 'chasovshik', 'graver'],
            ],
            'psychology' => [
                'translations' => [
                    'tj'  => ['title' => 'Равоншиносӣ ва машварат', 'description' => 'Машваратҳои равоншиносӣ, терапияи оилавӣ ва коучинг. Дастгирӣ дар роҳи мувозинати дохилӣ ва рушди шахсӣ.'],
                    'ru'  => ['title' => 'Психология и консультации', 'description' => 'Психологические консультации, семейная терапия и коучинг. Поддержка на пути к внутреннему балансу и личностному росту.'],
                    'eng' => ['title' => 'Psychology and Counselling', 'description' => 'Psychological counselling, family therapy and coaching. Support on the path to inner balance and personal growth.'],
                ],
                'occupations'  => ['psycholog', 'semeynyy_konsultant', 'coach'],
            ],
            'printing' => [
                'translations' => [
                    'tj'  => ['title' => 'Чоп ва полиграфия', 'description' => 'Чопи маҳсулоти рекламавӣ ва полиграфӣ, таҳияи макетҳо ва дизайн барои чоп. Полиграфияи босифат барои бизнес.'],
                    'ru'  => ['title' => 'Печать и полиграфия', 'description' => 'Печать рекламной и полиграфической продукции, разработка макетов и дизайна для печати. Качественная полиграфия для бизнеса.'],
                    'eng' => ['title' => 'Printing Services', 'description' => 'Printing of promotional and print materials, layout and print design development. Quality printing for business.'],
                ],
                'occupations'  => ['tipograf', 'dizayner_pechati'],
            ],
            'shoe_leather' => [
                'translations' => [
                    'tj'  => ['title' => 'Пойафзол ва маснуоти чармӣ', 'description' => 'Таъмири пойафзол ва маснуоти чармӣ, барқарорсозии ашёи чармин. Умри ашёи дӯстдоштаи шуморо дароз мекунем.'],
                    'ru'  => ['title' => 'Обувь и изделия из кожи', 'description' => 'Ремонт обуви и изделий из кожи, реставрация кожаных вещей. Продлеваем жизнь вашим любимым вещам.'],
                    'eng' => ['title' => 'Shoe and Leather Repair', 'description' => 'Repair of footwear and leather goods, restoration of leather items. Extending the life of your favorite belongings.'],
                ],
                'occupations'  => ['sapozhnik', 'kozhevnik'],
            ],
        ];

        foreach ($categoriesData as $key => $data) {
            $category = new Category();

            // Значение на самой сущности — фолбэк на русский (тот же паттерн,
            // что уже применяется в LegalFixture): реальное per-locale
            // значение резолвится на чтение через localizeEntityFull()
            // (см. докблок $categoriesData выше), а это — то, что останется,
            // если локализация почему-то не сработает (например, вызов кода
            // напрямую с сущностью, минуя API-провайдеры).
            $category->setDescription($data['translations']['ru']['description']);

            $reflection = new ReflectionClass($category);
            /** @noinspection PhpStatementHasEmptyBodyInspection */
            while (!$reflection->hasProperty('translations') && $reflection = $reflection->getParentClass());
            $property = $reflection->getProperty('translations');
            $property->setValue($category, new ArrayCollection());

            foreach ($data['translations'] as $locale => $trans) {
                $translation = (new Translation())
                    ->setTitle($trans['title'])
                    ->setDescription($trans['description'])
                    ->setLocale($locale)
                    ->setCategory($category);

                $category->addTranslation($translation);
            }

            // Category ↔ Occupation, многие-ко-многим — ВСЕ подкатегории,
            // не только одна "основная" (см. докблок $categoriesData выше).
            foreach ($data['occupations'] as $occupationRef) {
                $category->addOccupation($this->getReference($occupationRef, Occupation::class));
            }

            $manager->persist($category);
            $this->addReference($key, $category);
        }

        $manager->flush();
    }

    public function getDependencies(): array
    {
        return [
            OccupationFixture::class,
        ];
    }
}

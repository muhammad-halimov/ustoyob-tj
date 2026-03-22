<?php

namespace App\DataFixture\Ticket;

use App\DataFixture\Additional\ReviewFIxture;
use App\Entity\Review\Review;
use App\Entity\Ticket\Ticket;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Common\DataFixtures\DependentFixtureInterface;
use Doctrine\Persistence\ObjectManager;

class TicketFixture extends Fixture implements DependentFixtureInterface
{
    public function load(ObjectManager $manager): void
    {
        // t_0…t_41 — original tickets; t_42…t_47 — new service tickets
        // Named refs are listed per-entry for easy lookup.
        $ticketsData = [
            // ── Сантехника (t_0..t_4) ──
            ['title' => 'Починить смеситель',               'description' => 'Сломался смеситель на кухне, нужно починить срочно.',                                  'budget' => 200,  'active' => true, 'service' => false, 'refs' => ['ticket']],
            ['title' => 'Замена унитаза',                    'description' => 'Нужно заменить старый унитаз на новый, есть новый в наличии.',                          'budget' => 250,  'active' => true, 'service' => false, 'refs' => ['ticket_unitaz']],
            ['title' => 'Прочистка засора в трубах',         'description' => 'Засор в ванной комнате, вода не уходит. Нужна прочистка.',                              'budget' => 120,  'active' => true, 'service' => false, 'refs' => []],
            ['title' => 'Установка бойлера',                 'description' => 'Нужно установить бойлер на 80 литров в ванной комнате.',                                'budget' => 300,  'active' => true, 'service' => false, 'refs' => []],
            ['title' => 'Сантехник на дом',                  'description' => 'Профессиональный сантехник, выполняем любые работы быстро и качественно!',              'budget' => 150,  'active' => true, 'service' => true,  'refs' => ['service_santex']],
            // ── Электрика (t_5..t_8) ──
            ['title' => 'Установка розеток и выключателей',  'description' => 'Требуется электрик для установки розеток и выключателей в 3-комнатной квартире.',        'budget' => 150,  'active' => true, 'service' => false, 'refs' => []],
            ['title' => 'Монтаж электропроводки',            'description' => 'Нужна полная замена электропроводки в частном доме, 4 комнаты.',                         'budget' => 800,  'active' => true, 'service' => false, 'refs' => ['ticket_provodka']],
            ['title' => 'Установка люстры',                  'description' => 'Нужно снять старую люстру и установить новую в зале.',                                   'budget' => 80,   'active' => true, 'service' => false, 'refs' => ['ticket_lyustra']],
            ['title' => 'Электрик — выездная бригада',       'description' => 'Электромонтажные работы любой сложности. Опыт 10 лет. Звоните!',                        'budget' => 200,  'active' => true, 'service' => true,  'refs' => ['service_elektrik']],
            // ── IT (t_9..t_14) ──
            ['title' => 'Починка ноутбуков',                 'description' => 'Занимаемся починкой ноутбуков, качественно и быстро, звоните!',                         'budget' => 200,  'active' => true, 'service' => true,  'refs' => ['service']],
            ['title' => 'Разработка сайта-визитки',          'description' => 'Нужен простой сайт-визитка для малого бизнеса с формой обратной связи.',                'budget' => 500,  'active' => true, 'service' => false, 'refs' => ['ticket_it']],
            ['title' => 'Настройка 1С',                      'description' => 'Нужно настроить и обновить 1С на предприятии, 5 рабочих мест.',                          'budget' => 400,  'active' => true, 'service' => false, 'refs' => ['ticket_1c']],
            ['title' => 'Создание интернет-магазина',         'description' => 'Нужен интернет-магазин для продажи одежды с корзиной и оплатой онлайн.',                'budget' => 1500, 'active' => true, 'service' => false, 'refs' => []],
            ['title' => 'SEO-оптимизация сайта',             'description' => 'Требуется SEO-аудит и оптимизация существующего сайта компании.',                        'budget' => 600,  'active' => true, 'service' => false, 'refs' => []],
            ['title' => 'Настройка сервера Linux',           'description' => 'Нужна настройка VPS под веб-приложение: Nginx, PHP, MySQL, SSL.',                        'budget' => 350,  'active' => true, 'service' => false, 'refs' => []],
            // ── Уборка (t_15..t_17) ──
            ['title' => 'Генеральная уборка квартиры',       'description' => 'Нужна генеральная уборка двухкомнатной квартиры после ремонта.',                        'budget' => 300,  'active' => true, 'service' => false, 'refs' => ['ticket_uborka']],
            ['title' => 'Уборка офиса',                      'description' => 'Ежедневная уборка офиса площадью 100 кв.м., 5 дней в неделю.',                          'budget' => 500,  'active' => true, 'service' => false, 'refs' => []],
            ['title' => 'Клининговая служба',                'description' => 'Профессиональная уборка квартир, офисов и загородных домов. Все средства наши.',         'budget' => 250,  'active' => true, 'service' => true,  'refs' => ['service_kliner']],
            // ── Ремонт (t_18..t_22) ──
            ['title' => 'Покраска стен в зале',              'description' => 'Нужно покрасить стены в зале площадью 25 кв.м., материалы есть.',                       'budget' => 180,  'active' => true, 'service' => false, 'refs' => ['ticket_remont']],
            ['title' => 'Укладка плитки в ванной',           'description' => 'Нужна укладка кафельной плитки в ванной 6 кв.м., плитка есть.',                         'budget' => 400,  'active' => true, 'service' => false, 'refs' => ['ticket_plitka']],
            ['title' => 'Натяжные потолки',                  'description' => 'Установка натяжного потолка в зале и двух спальнях.',                                    'budget' => 700,  'active' => true, 'service' => false, 'refs' => []],
            ['title' => 'Установка межкомнатных дверей',     'description' => 'Установка 4 межкомнатных дверей, двери куплены, нужен монтаж.',                         'budget' => 320,  'active' => true, 'service' => false, 'refs' => []],
            ['title' => 'Бригада отделочников',              'description' => 'Выполняем все виды отделочных работ: штукатурка, шпаклёвка, покраска, обои.',           'budget' => 1000, 'active' => true, 'service' => true,  'refs' => ['service_stroitel']],
            // ── Дизайн (t_23..t_25) ──
            ['title' => 'Дизайн логотипа',                   'description' => 'Нужен логотип для кафе в современном стиле, с несколькими вариантами.',                 'budget' => 350,  'active' => true, 'service' => false, 'refs' => ['ticket_logo']],
            ['title' => 'Дизайн интерьера квартиры',         'description' => 'Нужен дизайн-проект для трёхкомнатной квартиры, 80 кв.м.',                              'budget' => 900,  'active' => true, 'service' => false, 'refs' => []],
            ['title' => 'Разработка фирменного стиля',       'description' => 'Нужен полный фирменный стиль: логотип, палитра, шрифты, визитки.',                      'budget' => 700,  'active' => true, 'service' => false, 'refs' => []],
            // ── Образование (t_26..t_28) ──
            ['title' => 'Репетитор по математике',           'description' => 'Ищу репетитора по математике для подготовки к экзаменам, 9 класс.',                     'budget' => 100,  'active' => true, 'service' => false, 'refs' => ['ticket_matem']],
            ['title' => 'Репетитор по английскому',          'description' => 'Нужен репетитор по английскому для ребёнка 7 лет, начальный уровень.',                   'budget' => 80,   'active' => true, 'service' => false, 'refs' => []],
            ['title' => 'Онлайн-курс по Python',             'description' => 'Ищу преподавателя Python для онлайн-занятий с нуля, 2 раза в неделю.',                  'budget' => 200,  'active' => true, 'service' => false, 'refs' => []],
            // ── Транспорт (t_29..t_31) ──
            ['title' => 'Перевозка мебели',                  'description' => 'Нужен грузовой транспорт для перевозки мебели при переезде.',                            'budget' => 250,  'active' => true, 'service' => false, 'refs' => ['ticket_pereezd']],
            ['title' => 'Грузоперевозки по городу',          'description' => 'Газель 3 тонны. Грузчики в команде. Переезды, доставка стройматериалов.',               'budget' => 300,  'active' => true, 'service' => true,  'refs' => ['service_transport']],
            ['title' => 'Корпоративный трансфер',            'description' => 'Нужен водитель для ежедневного развоза сотрудников, 8 человек, утро/вечер.',             'budget' => 450,  'active' => true, 'service' => false, 'refs' => ['ticket_transfer']],
            // ── Фото / Видео (t_32..t_34) ──
            ['title' => 'Фотосессия на природе',             'description' => 'Ищу фотографа для семейной фотосессии на природе, 2–3 часа.',                           'budget' => 400,  'active' => true, 'service' => false, 'refs' => ['ticket_foto']],
            ['title' => 'Видеосъёмка свадьбы',               'description' => 'Нужен видеограф на свадьбу, полный день, монтаж включён.',                              'budget' => 1200, 'active' => true, 'service' => false, 'refs' => ['ticket_svadba']],
            ['title' => 'Аэросъёмка объекта дроном',         'description' => 'Нужна аэросъёмка строительного объекта дроном для отчёта.',                             'budget' => 500,  'active' => true, 'service' => false, 'refs' => []],
            // ── Авто (t_35..t_37) ──
            ['title' => 'Замена масла и фильтров',           'description' => 'Нужна замена масла и масляного фильтра, Chevrolet Nexia 3.',                             'budget' => 60,   'active' => true, 'service' => false, 'refs' => ['ticket_maslo']],
            ['title' => 'Кузовной ремонт без покраски',      'description' => 'Вмятина на заднем крыле, нужен кузовной ремонт без покраски.',                          'budget' => 150,  'active' => true, 'service' => false, 'refs' => ['ticket_kuzov']],
            ['title' => 'Автосервис — полный комплекс',      'description' => 'Диагностика, ТО, ремонт двигателя и ходовой части. Опытные мастера.',                   'budget' => 500,  'active' => true, 'service' => true,  'refs' => ['service_avto']],
            // ── Красота / Здоровье (t_38..t_39) ──
            ['title' => 'Маникюр на дому',                   'description' => 'Ищу мастера маникюра, работающего на дому или с выездом к клиенту.',                    'budget' => 50,   'active' => true, 'service' => false, 'refs' => ['ticket_manikur']],
            ['title' => 'Массаж — расслабляющий',            'description' => 'Профессиональный массажист с опытом 5 лет. Выезд на дом. Звоните!',                     'budget' => 100,  'active' => true, 'service' => true,  'refs' => ['service_masseur']],
            // ── Юридические услуги (t_40..t_41) ──
            ['title' => 'Составление договора аренды',       'description' => 'Нужна помощь юриста в составлении договора аренды квартиры.',                           'budget' => 80,   'active' => true, 'service' => false, 'refs' => ['ticket_dogovor']],
            ['title' => 'Юридическая консультация',          'description' => 'Юрист с опытом 8 лет. Консультации по гражданскому, семейному и трудовому праву.',      'budget' => 60,   'active' => true, 'service' => true,  'refs' => ['service_yurist']],
            // ── Новые сервисные тикеты (t_42..t_47) ──
            ['title' => 'Парикмахер на выезд',               'description' => 'Стрижки и укладки на дому. Мужские, женские, детские. Качественно и недорого!',         'budget' => 80,   'active' => true, 'service' => true,  'refs' => ['service_parikm']],
            ['title' => 'Фотограф — портретная съёмка',      'description' => 'Индивидуальные, семейные и деловые портреты. Ретушь включена.',                         'budget' => 350,  'active' => true, 'service' => true,  'refs' => ['service_foto']],
            ['title' => 'Видеограф — профессиональная съёмка', 'description' => 'Свадьбы, юбилеи, корпоративы. Качественный монтаж и цветокоррекция.',               'budget' => 600,  'active' => true, 'service' => true,  'refs' => ['service_video']],
            ['title' => 'Косметолог на дом',                 'description' => 'Уходовые процедуры для лица и тела с выездом к клиенту. Сертифицированный специалист.', 'budget' => 120,  'active' => true, 'service' => true,  'refs' => ['service_kosm']],
            ['title' => 'Репетитор онлайн',                  'description' => 'Занятия по математике, физике и химии для школьников и студентов. Онлайн.',             'budget' => 90,   'active' => true, 'service' => true,  'refs' => ['service_rep']],
            ['title' => 'Дизайнер на заказ',                 'description' => 'Логотипы, фирменный стиль, баннеры, упаковка. Быстро и профессионально.',               'budget' => 400,  'active' => true, 'service' => true,  'refs' => ['service_design']],
        ];

        $refs = [];
        $idx = 0;
        foreach ($ticketsData as $data) {
            $t = new Ticket();
            $t->setTitle($data['title']);
            $t->setDescription($data['description']);
            $t->setBudget($data['budget']);
            $t->setActive($data['active']);
            $t->setService($data['service']);
            $manager->persist($t);

            $refs['t_' . $idx] = $t;
            foreach ($data['refs'] as $namedRef) {
                $refs[$namedRef] = $t;
            }
            $idx++;
        }

        // ── Link reviews to service tickets (master reviews: 2 per master) ──
        // master 0 = hujandi  (t_9)
        $refs['t_9']->addReview($this->getReference('review_0', Review::class));
        $refs['t_9']->addReview($this->getReference('review_1', Review::class));
        // master 1 = firdawsi (t_4)
        $refs['t_4']->addReview($this->getReference('review_2', Review::class));
        $refs['t_4']->addReview($this->getReference('review_3', Review::class));
        // master 2 = mavlono  (t_22)
        $refs['t_22']->addReview($this->getReference('review_4', Review::class));
        $refs['t_22']->addReview($this->getReference('review_5', Review::class));
        // master 3 = kamoliddin (t_30)
        $refs['t_30']->addReview($this->getReference('review_6', Review::class));
        $refs['t_30']->addReview($this->getReference('review_7', Review::class));
        // master 4 = rustam_e (t_8)
        $refs['t_8']->addReview($this->getReference('review_8', Review::class));
        $refs['t_8']->addReview($this->getReference('review_9', Review::class));
        // master 5 = latofat  (t_17)
        $refs['t_17']->addReview($this->getReference('review_10', Review::class));
        $refs['t_17']->addReview($this->getReference('review_11', Review::class));
        // master 6 = shoira   (t_39)
        $refs['t_39']->addReview($this->getReference('review_12', Review::class));
        $refs['t_39']->addReview($this->getReference('review_13', Review::class));
        // master 7 = bahodir  (t_41)
        $refs['t_41']->addReview($this->getReference('review_14', Review::class));
        $refs['t_41']->addReview($this->getReference('review_15', Review::class));
        // master 8 = timur    (t_37)
        $refs['t_37']->addReview($this->getReference('review_16', Review::class));
        $refs['t_37']->addReview($this->getReference('review_17', Review::class));
        // master 9 = gulnora  (t_42)
        $refs['t_42']->addReview($this->getReference('review_18', Review::class));
        $refs['t_42']->addReview($this->getReference('review_19', Review::class));
        // master 10 = alisher (t_43)
        $refs['t_43']->addReview($this->getReference('review_20', Review::class));
        $refs['t_43']->addReview($this->getReference('review_21', Review::class));
        // master 11 = nodir   (t_44)
        $refs['t_44']->addReview($this->getReference('review_22', Review::class));
        $refs['t_44']->addReview($this->getReference('review_23', Review::class));
        // master 12 = firuza  (t_45)
        $refs['t_45']->addReview($this->getReference('review_24', Review::class));
        $refs['t_45']->addReview($this->getReference('review_25', Review::class));
        // master 13 = jahongir (t_46)
        $refs['t_46']->addReview($this->getReference('review_26', Review::class));
        $refs['t_46']->addReview($this->getReference('review_27', Review::class));
        // master 14 = saidakbar (t_47)
        $refs['t_47']->addReview($this->getReference('review_28', Review::class));
        $refs['t_47']->addReview($this->getReference('review_29', Review::class));

        // ── Link reviews to client order tickets (client reviews: 2 per client) ──
        // client 0 = rudaki   (t_0)
        $refs['t_0']->addReview($this->getReference('review_30', Review::class));
        $refs['t_0']->addReview($this->getReference('review_31', Review::class));
        // client 1 = huroson  (t_15)
        $refs['t_15']->addReview($this->getReference('review_32', Review::class));
        $refs['t_15']->addReview($this->getReference('review_33', Review::class));
        // client 2 = navruz   (t_10)
        $refs['t_10']->addReview($this->getReference('review_34', Review::class));
        $refs['t_10']->addReview($this->getReference('review_35', Review::class));
        // client 3 = sitora   (t_32)
        $refs['t_32']->addReview($this->getReference('review_36', Review::class));
        $refs['t_32']->addReview($this->getReference('review_37', Review::class));
        // client 4 = zafar    (t_29)
        $refs['t_29']->addReview($this->getReference('review_38', Review::class));
        $refs['t_29']->addReview($this->getReference('review_39', Review::class));
        // client 5 = dilnoza  (t_38)
        $refs['t_38']->addReview($this->getReference('review_40', Review::class));
        $refs['t_38']->addReview($this->getReference('review_41', Review::class));
        // client 6 = bobur    (t_1)
        $refs['t_1']->addReview($this->getReference('review_42', Review::class));
        $refs['t_1']->addReview($this->getReference('review_43', Review::class));
        // client 7 = kamola   (t_7)
        $refs['t_7']->addReview($this->getReference('review_44', Review::class));
        $refs['t_7']->addReview($this->getReference('review_45', Review::class));
        // client 8 = sardor   (t_11)
        $refs['t_11']->addReview($this->getReference('review_46', Review::class));
        $refs['t_11']->addReview($this->getReference('review_47', Review::class));
        // client 9 = malika   (t_33)
        $refs['t_33']->addReview($this->getReference('review_48', Review::class));
        $refs['t_33']->addReview($this->getReference('review_49', Review::class));
        // client 10 = jasur   (t_35)
        $refs['t_35']->addReview($this->getReference('review_50', Review::class));
        $refs['t_35']->addReview($this->getReference('review_51', Review::class));
        // client 11 = munira  (t_40)
        $refs['t_40']->addReview($this->getReference('review_52', Review::class));
        $refs['t_40']->addReview($this->getReference('review_53', Review::class));
        // client 12 = parviz  (t_36)
        $refs['t_36']->addReview($this->getReference('review_54', Review::class));
        $refs['t_36']->addReview($this->getReference('review_55', Review::class));
        // client 13 = shahlo  (t_23)
        $refs['t_23']->addReview($this->getReference('review_56', Review::class));
        $refs['t_23']->addReview($this->getReference('review_57', Review::class));
        // client 14 = suhrab  (t_31)
        $refs['t_31']->addReview($this->getReference('review_58', Review::class));
        $refs['t_31']->addReview($this->getReference('review_59', Review::class));

        foreach ($refs as $ref => $obj) {
            $this->addReference($ref, $obj);
        }

        $manager->flush();
    }

    public function getDependencies(): array
    {
        return [
            ReviewFIxture::class,
        ];
    }
}


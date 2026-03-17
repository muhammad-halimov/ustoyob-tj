<?php

namespace App\DataFixture\Additional;

use App\Entity\Review\Review;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;

class ReviewFIxture extends Fixture
{
    public function load(ObjectManager $manager): void
    {
        // Indices 0-29:  type="master" (2 reviews per master, 15 masters)
        // Indices 30-59: type="client" (2 reviews per client, 15 clients)
        // Linking master/client users is done in MasterFixture / ClientFixture.
        // Linking to tickets is done in TicketFixture.
        $reviewsData = [
            // ── Отзывы о мастерах (type=master, 0-29) ──
            // 0-1: hujandi (programmer)
            ['type' => 'master', 'rating' => 5.0, 'description' => 'Ноутбук починили за один день, всё объяснили доступно. Мастер — профессионал!'],
            ['type' => 'master', 'rating' => 4.5, 'description' => 'Сайт сделали в срок, всё работает отлично. Немного затянули с правками, но результатом доволен.'],
            // 2-3: firdawsi (santexnik)
            ['type' => 'master', 'rating' => 5.0, 'description' => 'Отличный мастер! Починил смеситель быстро и аккуратно, всё работает идеально.'],
            ['type' => 'master', 'rating' => 4.0, 'description' => 'Установил бойлер профессионально, убрал за собой. Немного дольше ожидаемого.'],
            // 4-5: mavlono (stroitel)
            ['type' => 'master', 'rating' => 5.0, 'description' => 'Бригада отделала квартиру под ключ — стены идеально ровные, покраска отличная!'],
            ['type' => 'master', 'rating' => 3.5, 'description' => 'Строитель неплохой, но работу выполнил так себе, честно.'],
            // 6-7: kamoliddin (voditel)
            ['type' => 'master', 'rating' => 4.5, 'description' => 'Перевезли мебель аккуратно, ничего не поцарапали. Водитель очень вежливый.'],
            ['type' => 'master', 'rating' => 5.0, 'description' => 'Курьер доставил всё быстро и без повреждений. Очень доволен сервисом!'],
            // 8-9: rustam_e (elektrik)
            ['type' => 'master', 'rating' => 4.5, 'description' => 'Электрик пришёл вовремя, всё сделал качественно. Рекомендую!'],
            ['type' => 'master', 'rating' => 2.0, 'description' => 'Опоздал на 2 часа и не предупредил. Работу сделал нормально, но осадок остался.'],
            // 10-11: latofat (kliner)
            ['type' => 'master', 'rating' => 5.0, 'description' => 'Клинеры убрали квартиру идеально. Сверкает как новая! Очень рекомендую.'],
            ['type' => 'master', 'rating' => 4.0, 'description' => 'Уборка хорошая, но заняла больше времени, чем планировалось.'],
            // 12-13: shoira (masseur)
            ['type' => 'master', 'rating' => 5.0, 'description' => 'Массаж великолепный! Профессионал своего дела, руки золотые.'],
            ['type' => 'master', 'rating' => 4.5, 'description' => 'Приятная атмосфера, умелые руки. Обязательно вернусь ещё.'],
            // 14-15: bahodir (yurist)
            ['type' => 'master', 'rating' => 5.0, 'description' => 'Юрист быстро и чётко составил договор. Никаких лишних вопросов.'],
            ['type' => 'master', 'rating' => 4.5, 'description' => 'Консультация прошла продуктивно. Объяснил всё доступно и по делу.'],
            // 16-17: timur (avtomehanik)
            ['type' => 'master', 'rating' => 4.0, 'description' => 'Масло и фильтры заменили быстро. Цена адекватная.'],
            ['type' => 'master', 'rating' => 3.5, 'description' => 'Диагностика проведена, но объяснение немного невнятное.'],
            // 18-19: gulnora (parikmakher)
            ['type' => 'master', 'rating' => 5.0, 'description' => 'Шикарная стрижка! Именно то, что хотел. Руки мастера золотые.'],
            ['type' => 'master', 'rating' => 4.5, 'description' => 'Отличная работа, аккуратная и быстрая. Остался очень доволен.'],
            // 20-21: alisher (fotograf)
            ['type' => 'master', 'rating' => 5.0, 'description' => 'Фотографии получились потрясающие! Мастер с отличным чувством кадра.'],
            ['type' => 'master', 'rating' => 4.0, 'description' => 'Фотосессия прошла хорошо. Несколько снимков хотелось бы переснять, но в целом доволен.'],
            // 22-23: nodir (videograf)
            ['type' => 'master', 'rating' => 5.0, 'description' => 'Видеограф снял свадьбу безупречно. Монтаж выше всяких похвал!'],
            ['type' => 'master', 'rating' => 4.5, 'description' => 'Качественная работа. Видеограф профессиональный и ответственный.'],
            // 24-25: firuza (kosmetolog)
            ['type' => 'master', 'rating' => 5.0, 'description' => 'Косметолог — настоящий профи! Кожа стала намного лучше.'],
            ['type' => 'master', 'rating' => 4.0, 'description' => 'Хорошие процедуры, чувствую себя обновлённой. Спасибо!'],
            // 26-27: jahongir (repetitor)
            ['type' => 'master', 'rating' => 5.0, 'description' => 'Репетитор объясняет доступно и терпеливо. Оценки сына заметно выросли!'],
            ['type' => 'master', 'rating' => 4.5, 'description' => 'Хороший педагог, занятия продуктивные. Ребёнок с удовольствием ходит на уроки.'],
            // 28-29: saidakbar (grafik_dizayner)
            ['type' => 'master', 'rating' => 5.0, 'description' => 'Дизайнер сделал логотип лучше, чем я мог представить. Чётко, красиво, профессионально!'],
            ['type' => 'master', 'rating' => 4.5, 'description' => 'Работал быстро, правки принял сразу. Результат превзошёл ожидания.'],

            // ── Отзывы о клиентах (type=client, 30-59) ──
            // 30-31: rudaki
            ['type' => 'client', 'rating' => 5.0, 'description' => 'Хороший клиент, даже помог с установкой 😁 Приятно работать с такими людьми.'],
            ['type' => 'client', 'rating' => 4.5, 'description' => 'Вежливый заказчик, всё объяснил заранее, материалы подготовил. Приятно работать.'],
            // 32-33: huroson
            ['type' => 'client', 'rating' => 3.0, 'description' => 'Клиент несколько раз менял задание по ходу, но в итоге рассчитался честно.'],
            ['type' => 'client', 'rating' => 4.0, 'description' => 'Нормальный клиент, оплатил сразу после выполнения работы.'],
            // 34-35: navruz
            ['type' => 'client', 'rating' => 5.0, 'description' => 'Отличный заказчик! Предоставил все материалы заранее, не мешал работать.'],
            ['type' => 'client', 'rating' => 4.5, 'description' => 'Оставил хороший отзыв и дал чаевые. Рекомендую как заказчика!'],
            // 36-37: sitora
            ['type' => 'client', 'rating' => 5.0, 'description' => 'Чёткое техзадание, быстрые ответы, оплата без задержек. Идеальный клиент!'],
            ['type' => 'client', 'rating' => 3.5, 'description' => 'Клиент понравился, но слишком много правок в самый последний момент.'],
            // 38-39: zafar
            ['type' => 'client', 'rating' => 2.5, 'description' => 'Долго не открывал дверь, потерял час рабочего времени. Не самый организованный.'],
            ['type' => 'client', 'rating' => 4.0, 'description' => 'Адекватный заказчик, цену не занижал. Работать приятно.'],
            // 40-41: dilnoza
            ['type' => 'client', 'rating' => 5.0, 'description' => 'Дилноза — идеальная клиентка. Всё чётко, оплата сразу.'],
            ['type' => 'client', 'rating' => 4.5, 'description' => 'Приятная в общении. Заранее предупредила об изменениях в расписании.'],
            // 42-43: bobur
            ['type' => 'client', 'rating' => 4.0, 'description' => 'Бобур — адекватный заказчик, материалы подготовлены заранее.'],
            ['type' => 'client', 'rating' => 3.5, 'description' => 'Клиент нормальный, но немного медлительный в ответах.'],
            // 44-45: kamola
            ['type' => 'client', 'rating' => 5.0, 'description' => 'Камола — отличная хозяйка. Встретила тепло, угостила чаем 😊'],
            ['type' => 'client', 'rating' => 4.5, 'description' => 'Всё подготовлено, доступ предоставлен вовремя. Рекомендую.'],
            // 46-47: sardor
            ['type' => 'client', 'rating' => 4.0, 'description' => 'Сардор знает, чего хочет. Техзадание чёткое, правки минимальны.'],
            ['type' => 'client', 'rating' => 5.0, 'description' => 'Прекрасный клиент! Доверяет мастеру и не вмешивается в работу.'],
            // 48-49: malika
            ['type' => 'client', 'rating' => 4.5, 'description' => 'Малика — ответственная заказчица. Всё согласовала заранее.'],
            ['type' => 'client', 'rating' => 5.0, 'description' => 'Свадьба прошла идеально во многом благодаря её организации!'],
            // 50-51: jasur
            ['type' => 'client', 'rating' => 3.5, 'description' => 'Жасур немного торопил, но оплатил честно и вовремя.'],
            ['type' => 'client', 'rating' => 4.0, 'description' => 'Нормальный клиент. Приехал сам, что удобно.'],
            // 52-53: munira
            ['type' => 'client', 'rating' => 5.0, 'description' => 'Мунира — чёткий клиент. Объяснила задачу кратко и по сути.'],
            ['type' => 'client', 'rating' => 4.5, 'description' => 'Оплатила быстро, документы подписала без вопросов.'],
            // 54-55: parviz
            ['type' => 'client', 'rating' => 4.0, 'description' => 'Парвиз был доступен на связи весь день. Удобно работать.'],
            ['type' => 'client', 'rating' => 3.5, 'description' => 'Клиент неплохой, но немного не понимал объём работ изначально.'],
            // 56-57: shahlo
            ['type' => 'client', 'rating' => 5.0, 'description' => 'Шахло — идеальная клиентка. Чёткий бриф, вовремя оплатила.'],
            ['type' => 'client', 'rating' => 4.5, 'description' => 'Шахло понравилась как заказчик — гибкая, но с чётким видением.'],
            // 58-59: suhrab
            ['type' => 'client', 'rating' => 4.0, 'description' => 'Сухроб — спокойный клиент, не суетится. Работать приятно.'],
            ['type' => 'client', 'rating' => 3.5, 'description' => 'Немного задержал оплату, но в итоге всё нормально.'],
        ];

        $reviews = [];
        foreach ($reviewsData as $i => $data) {
            $review = new Review();
            $review->setType($data['type']);
            $review->setRating($data['rating']);
            $review->setDescription($data['description']);
            $manager->persist($review);
            $reviews[$i] = $review;
            $this->addReference('review_' . $i, $review);
        }

        // Legacy refs for backward-compat
        $this->addReference('forMaster', $reviews[0]);
        $this->addReference('forClient', $reviews[30]);

        $manager->flush();
    }

    public function getDependencies(): array
    {
        return [];
    }
}

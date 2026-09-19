<?php

namespace App\DataFixture\Dev\Additional;

use App\DataFixture\Prod\Ticket\CategoryFixture;
use App\DataFixture\Prod\Ticket\OccupationFixture;
use App\DataFixture\Prod\Ticket\UnitFixture;
use App\Entity\Ticket\Category;
use App\Entity\Ticket\Ticket;
use App\Entity\Ticket\Unit;
use App\Entity\User\Occupation;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Bundle\FixturesBundle\FixtureGroupInterface;
use Doctrine\Common\DataFixtures\DependentFixtureInterface;
use Doctrine\Persistence\ObjectManager;

/**
 * Связывает dev-тикеты (см. TicketFixture) с прод-категориями/подкатегориями
 * и с юнитом 'pieceless' — чисто демо-данные для локальной разработки.
 *
 * Раньше эта привязка жила прямо в CategoryFixture/UnitFixture (Prod), из-за
 * чего у тех была жёсткая зависимость на Dev\TicketFixture, и
 * `doctrine:fixtures:load --group=prod` всё равно тянул dev-тикеты/отзывы/
 * пользователей вслед за ней (--group фильтрует стартовый набор, но
 * getDependencies() всё равно подтягивает зависимости целиком, независимо
 * от группы). Вынесено сюда, чтобы Prod-фикстуры были самодостаточны.
 */
class TicketCategoryLinkFixture extends Fixture implements DependentFixtureInterface, FixtureGroupInterface
{
    public static function getGroups(): array
    {
        return ['dev'];
    }

    public function load(ObjectManager $manager): void
    {
        // [categoryRef, [[ticketRef, subcategoryOccupationRef], ...]]
        $links = [
            'santexnika' => [
                ['t_0', 'santexnik'], ['t_1', 'santexnik'], ['t_2', 'truboprovodchik'],
                ['t_3', 'santexnik'], ['t_4', 'santexnik'],
            ],
            'it' => [
                ['t_9',  'programmer'], ['t_10', 'programmer'], ['t_11', 'programmer'],
                ['t_12', 'programmer'], ['t_13', 'programmer'], ['t_14', 'sysadmin'],
            ],
            'beauty' => [
                ['t_38', 'kosmetolog'], ['t_39', 'masseur'],
                ['t_42', 'parikmakher'], ['t_45', 'kosmetolog'],
            ],
            'repair' => [
                ['t_18', 'maljar'],   ['t_19', 'plitochnik'], ['t_20', 'stroitel'],
                ['t_21', 'metalist'], ['t_22', 'stroitel'],
            ],
            'electricity' => [
                ['t_5', 'elektrik'], ['t_6', 'elektrik'], ['t_7', 'elektrik'], ['t_8', 'elektrik'],
            ],
            'cleaning' => [
                ['t_15', 'kliner'], ['t_16', 'kliner'], ['t_17', 'kliner'],
            ],
            'transport' => [
                ['t_29', 'gruzchik'], ['t_30', 'voditel'], ['t_31', 'voditel'],
            ],
            'education' => [
                ['t_26', 'repetitor'], ['t_27', 'language_trainer'], ['t_28', 'programmer'],
                ['t_46', 'repetitor'],
            ],
            'auto' => [
                ['t_35', 'avtomehanik'], ['t_36', 'avtomehanik'], ['t_37', 'avtomehanik'],
            ],
            'design' => [
                ['t_23', 'grafik_dizayner'], ['t_24', 'veb_dizayner'],
                ['t_25', 'grafik_dizayner'], ['t_47', 'grafik_dizayner'],
            ],
            'legal' => [
                ['t_40', 'yurist'], ['t_41', 'yurist'],
            ],
            'photography' => [
                ['t_32', 'fotograf'], ['t_33', 'videograf'], ['t_34', 'videograf'],
                ['t_43', 'fotograf'], ['t_44', 'videograf'],
            ],
        ];

        foreach ($links as $categoryRef => $pairs) {
            /** @var Category $category */
            $category = $this->getReference($categoryRef, Category::class);

            foreach ($pairs as [$ticketRef, $subcategoryRef]) {
                /** @var Ticket $ticket */
                $ticket = $this->getReference($ticketRef, Ticket::class);
                $category->addUserTicket($ticket);
                $ticket->setSubcategory($this->getReference($subcategoryRef, Occupation::class));
            }
        }

        // Юнит 'pieceless' — тестовые тикеты без единицы измерения.
        /** @var Unit $pieceless */
        $pieceless = $this->getReference('pieceless', Unit::class);
        $pieceless->addUserTicket($this->getReference('ticket', Ticket::class));
        $pieceless->addUserTicket($this->getReference('service', Ticket::class));

        $manager->flush();
    }

    public function getDependencies(): array
    {
        return [
            TicketFixture::class,
            CategoryFixture::class,
            OccupationFixture::class,
            UnitFixture::class,
        ];
    }
}

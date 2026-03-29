<?php

namespace App\Tests\Unit\Service\Extra;

use App\Entity\Ticket\Ticket;
use App\Service\Extra\ExtractIriService;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\EntityRepository;
use InvalidArgumentException;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class ExtractIriServiceTest extends TestCase
{
    private EntityManagerInterface&MockObject $em;
    private ExtractIriService                $service;

    protected function setUp(): void
    {
        $this->em      = $this->createMock(EntityManagerInterface::class);
        $this->service = new ExtractIriService($this->em);
    }

    private function mockRepo(?object $entity): void
    {
        $repo = $this->createMock(EntityRepository::class);
        $repo->method('find')->willReturn($entity);
        $this->em->method('getRepository')->willReturn($repo);
    }

    // ── happy paths ───────────────────────────────────────────────────────────

    public function testExtractFromIri(): void
    {
        $ticket = new Ticket();
        $this->mockRepo($ticket);

        $result = $this->service->extract('/api/tickets/42', Ticket::class, 'tickets');

        $this->assertSame($ticket, $result);
    }

    public function testExtractFromNumericId(): void
    {
        $ticket = new Ticket();
        $this->mockRepo($ticket);

        $result = $this->service->extract('42', Ticket::class, 'tickets');

        $this->assertSame($ticket, $result);
    }

    // ── error paths ───────────────────────────────────────────────────────────

    public function testExtractThrowsWhenEntityClassIsNull(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->service->extract('/api/tickets/42', null, 'tickets');
    }

    public function testExtractThrowsNotFoundWhenEntityMissing(): void
    {
        $this->mockRepo(null);

        $this->expectException(NotFoundHttpException::class);
        $this->service->extract('/api/tickets/99', Ticket::class, 'tickets');
    }

    public function testExtractIdFromNestedIri(): void
    {
        $ticket = new Ticket();

        $repo = $this->createMock(EntityRepository::class);
        $repo->expects($this->once())
            ->method('find')
            ->with('7')
            ->willReturn($ticket);

        $this->em->method('getRepository')->willReturn($repo);

        $result = $this->service->extract('/api/tickets/7', Ticket::class, 'tickets');
        $this->assertSame($ticket, $result);
    }
}

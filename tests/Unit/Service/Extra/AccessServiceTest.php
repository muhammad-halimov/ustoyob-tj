<?php

namespace App\Tests\Unit\Service\Extra;

use App\Entity\User;
use App\Entity\User\BlackList;
use App\Repository\User\BlackListRepository;
use App\Service\Extra\AccessService;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\Security\Core\Exception\TokenNotFoundException;

class AccessServiceTest extends TestCase
{
    private Security&MockObject           $security;
    private BlackListRepository&MockObject $blackList;
    private AccessService                 $service;

    protected function setUp(): void
    {
        $this->security  = $this->createMock(Security::class);
        $this->blackList = $this->createMock(BlackListRepository::class);
        $this->service   = new AccessService($this->security, $this->blackList);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private function activeUser(array $roles = ['ROLE_CLIENT']): User
    {
        $user = new User();
        $user->setRoles($roles);
        $user->setActive(true);
        $user->setApproved(true);
        return $user;
    }

    private function mockFullyAuthenticated(User $user): void
    {
        $this->security->method('isGranted')->with('IS_AUTHENTICATED_FULLY')->willReturn(true);
        $this->security->method('getUser')->willReturn($user);
    }

    // ── check(): authentication guards ───────────────────────────────────────

    public function testCheckThrowsWhenUserIsNull(): void
    {
        $this->expectException(TokenNotFoundException::class);
        $this->service->check(null);
    }

    public function testCheckThrowsWhenNotFullyAuthenticated(): void
    {
        $user = $this->activeUser();
        $this->security->method('isGranted')->willReturn(false);
        $this->security->method('getUser')->willReturn($user);

        $this->expectException(AccessDeniedHttpException::class);
        $this->service->check($user);
    }

    public function testCheckThrowsWhenSecurityReturnsNullUser(): void
    {
        $user = $this->activeUser();
        $this->security->method('isGranted')->willReturn(true);
        $this->security->method('getUser')->willReturn(null);

        $this->expectException(TokenNotFoundException::class);
        $this->service->check($user);
    }

    // ── check(): activeAndApproved guard ─────────────────────────────────────

    public function testCheckThrowsWhenUserNotActive(): void
    {
        $user = new User();
        $user->setRoles(['ROLE_CLIENT']);
        $user->setActive(false);
        $user->setApproved(true);

        $this->mockFullyAuthenticated($user);

        $this->expectException(AccessDeniedHttpException::class);
        $this->service->check($user, 'triple', true);
    }

    public function testCheckThrowsWhenUserNotApproved(): void
    {
        $user = new User();
        $user->setRoles(['ROLE_CLIENT']);
        $user->setActive(true);
        $user->setApproved(false);

        $this->mockFullyAuthenticated($user);

        $this->expectException(AccessDeniedHttpException::class);
        $this->service->check($user, 'triple', true);
    }

    public function testCheckAllowsInactiveUserWhenActiveAndApprovedFalse(): void
    {
        $user = new User();
        $user->setRoles(['ROLE_CLIENT']);
        $user->setActive(false);
        $user->setApproved(false);

        $this->mockFullyAuthenticated($user);

        $this->assertTrue($this->service->check($user, 'triple', false));
    }

    // ── check(): grade levels ─────────────────────────────────────────────────

    #[DataProvider('gradeAllowedProvider')]
    public function testCheckReturnsTrue(string $grade, array $roles): void
    {
        $user = $this->activeUser($roles);
        $this->mockFullyAuthenticated($user);
        $this->assertTrue($this->service->check($user, $grade));
    }

    public static function gradeAllowedProvider(): array
    {
        return [
            'triple + ROLE_ADMIN'   => ['triple', ['ROLE_ADMIN']],
            'triple + ROLE_CLIENT'  => ['triple', ['ROLE_CLIENT']],
            'triple + ROLE_MASTER'  => ['triple', ['ROLE_MASTER']],
            'double + ROLE_CLIENT'  => ['double', ['ROLE_CLIENT']],
            'double + ROLE_MASTER'  => ['double', ['ROLE_MASTER']],
            'client + ROLE_CLIENT'  => ['client', ['ROLE_CLIENT']],
            'master + ROLE_MASTER'  => ['master', ['ROLE_MASTER']],
            'admin  + ROLE_ADMIN'   => ['admin',  ['ROLE_ADMIN']],
        ];
    }

    #[DataProvider('gradeDeniedProvider')]
    public function testCheckThrowsForWrongRole(string $grade, array $roles): void
    {
        $user = $this->activeUser($roles);
        $this->mockFullyAuthenticated($user);

        $this->expectException(AccessDeniedHttpException::class);
        $this->service->check($user, $grade);
    }

    public static function gradeDeniedProvider(): array
    {
        return [
            'double blocks ROLE_ADMIN'  => ['double', ['ROLE_ADMIN']],
            'client blocks ROLE_MASTER' => ['client', ['ROLE_MASTER']],
            'client blocks ROLE_ADMIN'  => ['client', ['ROLE_ADMIN']],
            'master blocks ROLE_CLIENT' => ['master', ['ROLE_CLIENT']],
            'master blocks ROLE_ADMIN'  => ['master', ['ROLE_ADMIN']],
            'admin  blocks ROLE_CLIENT' => ['admin',  ['ROLE_CLIENT']],
            'admin  blocks ROLE_MASTER' => ['admin',  ['ROLE_MASTER']],
        ];
    }

    public function testCheckThrowsForUnknownGrade(): void
    {
        $user = $this->activeUser(['ROLE_ADMIN']);
        $this->mockFullyAuthenticated($user);

        $this->expectException(AccessDeniedHttpException::class);
        $this->service->check($user, 'superadmin');
    }

    // ── checkBlackList() ──────────────────────────────────────────────────────

    public function testCheckBlackListThrowsWhenAuthorIsBlacklisted(): void
    {
        $author = $this->activeUser(['ROLE_CLIENT']);
        $target = $this->activeUser(['ROLE_MASTER']);

        $this->mockFullyAuthenticated($author);

        $this->blackList
            ->method('findDuplicate')
            ->willReturnOnConsecutiveCalls(new BlackList());

        $this->expectException(AccessDeniedHttpException::class);
        $this->service->checkBlackList($author, $target);
    }

    public function testCheckBlackListPassesWhenNoBlocking(): void
    {
        $author = $this->activeUser(['ROLE_CLIENT']);
        $target = $this->activeUser(['ROLE_MASTER']);

        $this->mockFullyAuthenticated($target);

        $this->blackList->method('findDuplicate')->willReturn(null);

        $this->assertTrue($this->service->checkBlackList($author, $target));
    }
}

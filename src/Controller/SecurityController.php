<?php

namespace App\Controller;

use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use LogicException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Authentication\AuthenticationUtils;

class SecurityController extends AbstractController
{
    #[Route(path: '/login', name: 'app_login')]
    public function login(AuthenticationUtils    $authenticationUtils,
                          UserRepository         $repository,
                          EntityManagerInterface $entityManager): Response
    {
        if ($this->getUser())
            return $this->redirectToRoute('admin');

        $userAdmin = $repository->findOneBy(['email' => 'admin@admin.com']);

        if (!$userAdmin) {
            $userAdmin = (new User())
                ->setEmail('admin@admin.com')
                ->setRoles(['ROLE_ADMIN'])
                ->setPassword('$2y$13$dKHroammGwy5m..V51QWzeoMwdltwX.sn2kU.xwa1Z52wrZ4qAqya');
            $entityManager->persist($userAdmin);
            $entityManager->flush();
        }

        $error = $authenticationUtils->getLastAuthenticationError();
        $lastUsername = $authenticationUtils->getLastUsername();

        return $this->render('@EasyAdmin/page/login.html.twig', [
            'error' => $error,

            'last_username' => $lastUsername,

            'translation_domain' => 'admin',

            'csrf_token_intention' => 'authenticate',

            'target_path' => $this->generateUrl('admin'),

            'username_label' => 'Почта',

            'password_label' => 'Пароль',

            'sign_in_label' => 'Вход',

            'forgot_password_enabled' => false,

            'forgot_password_path' => '#',//$this->generateUrl('app_how_reset'),

            'forgot_password_label' => 'Забыли пароль?',

            'remember_me_enabled' => true,

            'remember_me_parameter' => 'custom_remember_me_param',

            'remember_me_checked' => true,

            'remember_me_label' => 'Запомнить',
        ]);
    }

    #[Route(path: '/logout', name: 'app_logout')]
    public function logout(): void
    {
        throw new LogicException('This method can be blank - it will be intercepted by the logout key on your firewall.');
    }
}

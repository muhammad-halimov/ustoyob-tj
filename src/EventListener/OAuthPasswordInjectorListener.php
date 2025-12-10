<?php

namespace App\EventListener;

use App\Repository\UserRepository;
use Symfony\Component\EventDispatcher\Attribute\AsEventListener;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\KernelEvents;

#[AsEventListener(event: KernelEvents::REQUEST, priority: 10)]
readonly class OAuthPasswordInjectorListener
{
    public function __construct(
        private UserRepository $userRepository
    ) {}

    public function onKernelRequest(RequestEvent $event): void
    {
//        $request = $event->getRequest();
//
//        // Проверяем, что это запрос на authentication_token
//        if ($request->getPathInfo() !== '/api/authentication_token' || !$request->isMethod('POST')) {
//            return;
//        }
//
//        $content = $request->getContent();
//        $data = json_decode($content, true);
//
//        if (!is_array($data) || !isset($data['email'])) {
//            return;
//        }
//
//        // Если пароль уже есть - ничего не делаем
//        if (isset($data['password'])) {
//            return;
//        }
//
//        $email = $data['email'];
//        $user = $this->userRepository->findOneBy(['email' => $email]);
//
//        if (!$user) {
//            return;
//        }
//
//        $oauthType = $user->getOauthType();
//
//        // Если это OAuth пользователь - добавляем пустой пароль
//        if ($oauthType && $oauthType->hasAnyProvider()) {
//            $data['password'] = ''; // Добавляем пустой пароль
//            $request->initialize(
//                $request->query->all(),
//                $request->request->all(),
//                $request->attributes->all(),
//                $request->cookies->all(),
//                $request->files->all(),
//                $request->server->all(),
//                json_encode($data) // Обновленный content
//            );
//        }
    }
}

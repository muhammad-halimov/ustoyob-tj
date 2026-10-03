<?php

namespace App\Service\Notification\Sms;

/**
 * Отправка SMS. Сейчас единственная реализация — TwilioSmsSender (Symfony
 * подставляет её сюда сама — она одна); другой провайдер — ещё одна
 * реализация этого интерфейса, остальной код (коды подтверждения, входа,
 * восстановления пароля) от провайдера не зависит: коды генерирует и
 * проверяет сам бэкенд (PhoneCodeService), провайдер только доставляет текст.
 */
interface SmsSenderInterface
{
    /**
     * @param string $phone Номер в E.164 (+992901234567), см. PhoneNumberUtil.
     * @throws SmsException SMS не ушло (провайдер не настроен, отказал, недоступен).
     */
    public function send(string $phone, string $text): void;
}

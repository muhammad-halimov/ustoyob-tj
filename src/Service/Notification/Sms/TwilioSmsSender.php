<?php

namespace App\Service\Notification\Sms;

use App\Service\Extra\PhoneNumberUtil;
use Psr\Log\LoggerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Contracts\HttpClient\HttpClientInterface;
use Throwable;

/**
 * SMS через Twilio Programmable Messaging (REST API, без SDK):
 * POST /2010-04-01/Accounts/{AccountSid}/Messages.json.
 *
 * ENV (.env.local, в репозиторий не коммитятся):
 *   TWILIO_ACCOUNT_SID            — AC…, Twilio Console → Account Info
 *   TWILIO_AUTH_TOKEN             — там же
 *   TWILIO_FROM                   — отправитель: купленный номер Twilio (+1…) или буквенное имя (UstoYob)
 *   TWILIO_MESSAGING_SERVICE_SID  — MG…, вместо TWILIO_FROM, если отправка идёт через Messaging Service
 *
 * Не настроено: в dev (APP_DEBUG) текст SMS — с кодом — пишется в лог, чтобы
 * вход/регистрацию по телефону можно было проверить без Twilio; на проде —
 * SmsException (иначе пользователь ждал бы код, который никуда не ушёл).
 */
class TwilioSmsSender implements SmsSenderInterface
{
    private const string API = 'https://api.twilio.com/2010-04-01/Accounts/%s/Messages.json';

    public function __construct(
        private readonly HttpClientInterface $httpClient,
        private readonly LoggerInterface     $logger,
        #[Autowire('%kernel.debug%')]
        private readonly bool                $debug,
        #[Autowire('%env(default::TWILIO_ACCOUNT_SID)%')]
        private readonly ?string             $accountSid = null,
        #[Autowire('%env(default::TWILIO_AUTH_TOKEN)%')]
        private readonly ?string             $authToken = null,
        #[Autowire('%env(default::TWILIO_FROM)%')]
        private readonly ?string             $from = null,
        #[Autowire('%env(default::TWILIO_MESSAGING_SERVICE_SID)%')]
        private readonly ?string             $messagingServiceSid = null,
    ) {}

    public function isConfigured(): bool
    {
        return $this->accountSid && $this->authToken && ($this->from || $this->messagingServiceSid);
    }

    public function send(string $phone, string $text): void
    {
        if (!$this->isConfigured()) {
            if ($this->debug) {
                $this->logger->warning('Twilio не настроен — SMS не отправлено, текст только в логе (dev)', ['to' => $phone, 'text' => $text]);
                return;
            }
            throw new SmsException('Twilio не настроен: нужны TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN и TWILIO_FROM или TWILIO_MESSAGING_SERVICE_SID');
        }

        $body = ['To' => $phone, 'Body' => $text];
        if ($this->messagingServiceSid) $body['MessagingServiceSid'] = $this->messagingServiceSid;
        else $body['From'] = $this->from;

        try {
            $response = $this->httpClient->request('POST', sprintf(self::API, rawurlencode($this->accountSid)), [
                'auth_basic' => [$this->accountSid, $this->authToken],
                'body'       => $body,
                'timeout'    => 10,
            ]);
            $status = $response->getStatusCode();
            $data   = $response->toArray(false);
        } catch (Throwable $e) {
            throw new SmsException('Twilio недоступен: ' . $e->getMessage(), 0, $e);
        }

        if ($status >= 300) {
            // https://www.twilio.com/docs/api/errors — code/message объясняют причину
            // (21211 неверный номер, 21408 страна не включена в Geo permissions, 21610 номер отписался…)
            throw new SmsException(sprintf('Twilio %d, ошибка %s: %s', $status, $data['code'] ?? '?', $data['message'] ?? ''));
        }

        $this->logger->info('SMS отправлено', ['to' => PhoneNumberUtil::mask($phone), 'sid' => $data['sid'] ?? null]);
    }
}

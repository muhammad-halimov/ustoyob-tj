<?php

namespace App\Service\Notification\Sms;

use RuntimeException;

/** SMS не отправлено — см. SmsSenderInterface::send(). */
class SmsException extends RuntimeException {}

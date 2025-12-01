<?php

namespace App\Dto\User;

class AccountConfirmOutput
{
    public bool $success;
    public ?string $message = null;
    public ?string $redirectUrl = null;
}

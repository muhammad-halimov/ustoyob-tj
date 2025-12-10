<?php

use App\Kernel;
use Symfony\Component\Dotenv\Dotenv;

require_once dirname(__DIR__).'/vendor/autoload_runtime.php';

$dotenv = new Dotenv();
$dotenv->load(dirname(__DIR__) . '/.oauth.credentials');

if (file_exists(dirname(__DIR__) . '/.oauth.credentials.local')) {
    $dotenv->overload(dirname(__DIR__) . '/.oauth.credentials.local');
}

return function (array $context) {
    return new Kernel($context['APP_ENV'], (bool) $context['APP_DEBUG']);
};

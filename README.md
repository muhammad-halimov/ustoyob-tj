### Техническое задание (ТЗ) для поиска мастеров

**Название проекта:** USTOYOB8TJ (от тадж. "Usto" - мастер, "Yob" - находчик) <br>
**Миссия:** Сделать поиск и найм мастеров любой категории простым, быстрым и безопасным для каждого жителя Таджикистана, используя только интуитивно понятные визуальные элементы.

### Запуск
- rebase .env to .env.local
- change DATABASE_URL

then:

```
composer i

composer u

php bin/console d:d:c

php bin/console d:s:u -f

php bin/console d:f:l

php bin/console lexik:jwt:generate-keypair --overwrite

php bin/console secrets:set APP_SECRET

symfony serve
```

- set APP_SECRET at .env.local

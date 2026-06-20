# AGENTS.md

## Project Snapshot
- Stack: Symfony 7.4 + API Platform 4 + Doctrine ORM (PostgreSQL), PHP >=8.4 (`composer.json`).
- API-first backend for ustoyob.tj: most public behavior lives in `src/Entity/*` `#[ApiResource]` metadata, not in route files.
- Runtime infra dependencies: Redis (`framework.cache` pools), Mercure hub, JWT keypair, refresh-token cookies (`config/packages/*.yaml`).

## Architecture That Matters
- `src/Entity/*`: domain model + operation declarations (example: `src/Entity/User.php`, `src/Entity/Ticket/Ticket.php`).
- `src/Controller/Api/CRUD/*`: custom operation controllers; many extend shared templates under `src/Controller/Api/CRUD/Abstract/`.
- `src/Dto/*`: explicit input/output payloads for custom operations (`input:`/`output:` in ApiResource operations).
- `src/State/*`: API Platform state providers used for localization and access-aware collection shaping.
- `src/Service/*`: cross-cutting logic (auth, localization, OAuth, IRI extraction, access checks).

## Request/Response Patterns
- Prefer operation-level controllers on resources over standalone route controllers.
- Reuse abstract CRUD controllers (`AbstractApiPostController`, `AbstractApiPatchController`) before creating one-off flow.
- Return errors via `errorJson(AppMessages::...)` from `AbstractApiHelperController`; message + HTTP code come from `src/ApiResource/AppMessages.php`.
- Serialization groups are centralized in `src/Entity/Trait/Readable/G.php`; reuse constants like `G::OPS_TICKETS_FULL`.

## Auth, Security, and Identity
- API auth is stateless JWT under firewall `api`; admin panel uses form login under firewall `admin` (`config/packages/security.yaml`).
- Access token is read from `Authorization: Bearer` only (query token extractor is disabled) (`config/packages/lexik_jwt_authentication.yaml`).
- Refresh token strategy: HttpOnly cookie + single-use refresh tokens (`config/packages/gesdinet_jwt_refresh_token.yaml`, `src/Service/Auth/RefreshTokenService.php`).
- Fine-grained role checks are centralized in `src/Service/Extra/AccessService.php` (`grade`: `triple`, `double`, `client`, etc.).
- Never hash passwords manually in controllers; `src/EventListener/UserListener.php` hashes on `prePersist/preUpdate`.

## Localization and API Shape
- `?locale=tj|eng|ru` is first-class. Request listener sets global message locale early (`src/EventListener/AppErrorLocaleListener.php`).
- GET localization is mostly done in API Platform providers (`src/State/Localization/*Provider.php`) via `LocalizationService`.
- If a controller returns entity data after mutation, call localization in `afterFetch(...)` (see `ApiPostTicketController`, `ApiPatchTicketController`).

## Integrations and Cross-Component Flows
- OAuth is resource-driven (`src/ApiResource/OAuth/GeneralOAuth.php`, `src/ApiResource/OAuth/ProfileOAuth.php`) with provider services in `src/Service/OAuth/*`.
- Telegram webhook endpoint is `/webhook` (`src/Controller/Api/CRUD/POST/TechSupport/Telegram/TelegramBotController.php`).
- Ticket view counting happens on `kernel.response` with Redis IP dedupe (`src/EventSubscriber/TicketViewSubscriber.php`).
- Sensitive endpoint throttling is centralized in `src/EventSubscriber/ApiRateLimitSubscriber.php` + `config/packages/rate_limiter.yaml`.

## Developer Workflows (Verified Commands)
- Initial setup sequence is documented in `README.md`; it uses Doctrine create/update/fixtures and JWT key generation.
- Run API/server locally with Symfony CLI (`symfony serve`) and optional Mercure container (`docker compose --env-file .env.local up -d --force-recreate mercure`).
- Run tests: `php bin/phpunit` (see `phpunit.dist.xml`; existing tests are currently unit-focused under `tests/Unit/Service/Extra`).
- Useful project commands: `php bin/console app:create-admin`, `php bin/console app:delete-unactivated-users`, `php bin/console app:test-redis`.

## Practical Guardrails for Agents
- Before adding new endpoints, check if an existing `ApiResource` operation can be extended instead of introducing new routing style.
- Keep error codes consistent by adding/reusing constants in `AppMessages` rather than ad-hoc response strings.
- Keep locale fallback behavior (`tj` default) aligned with `Translation::LOCALES` and existing listeners/providers.
- Respect the mixed API + admin app model: changes in `security.yaml` can impact both JWT API access and EasyAdmin login behavior.


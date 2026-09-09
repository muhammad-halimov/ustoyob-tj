# USTOYOB.TJ API — Reference for Frontend Integration

**BREAKING (06.09.2026): every entity ID is now a UUID string, not an integer.** All primary keys across the whole API (`Ticket.id`, `User.id`, `Category.id`, `TicketApproval.id`, everything) switched from auto-increment integers to UUIDv7 strings (e.g. `"01a0781d-0592-7152-8740-31dcf966cf93"`) — done in one shot (schema recreated, no data migration, project pre-release). Anything on the frontend typed `id: number` needs to become `id: string`; any client-side sorting/parsing that assumed a numeric, sequential ID (e.g. "newest = highest id") no longer works — UUIDv7 IDs are still roughly time-ordered as strings (safe to string-sort ascending for creation order), but arithmetic on them (`id + 1`, `id > 5`) is meaningless. IRIs (`/api/tickets/{id}`) and query filters (`?author={id}`) are unaffected in shape — just pass the UUID string exactly as returned.

**New on `Ticket`: `slug` field** — a decorative, non-persisted, always-live transliteration of `title` (e.g. `"Ремонт крана"` → `"remont-krana"`), for building readable share URLs. It is NOT an identifier — the backend never looks at it for entity resolution. Recommended pattern: build links as `/tickets/{id}?slug={slug}` (query string, ignored server-side) rather than putting it in the path, so no routing changes are needed on either side.

Base URL: `/api`
Formats: `application/ld+json` (default), `application/json`, `multipart/form-data` (uploads), PATCH uses `application/merge-patch+json`
Auth: JWT Bearer (Lexik) + HttpOnly refresh-token cookie (Gesdinet)
Pagination: page-based, `?page=`, `?itemsPerPage=` (client-controlled where enabled), default 25 / max 50
Locale: `?locale=tj|eng|ru` (default `tj`) — controls localized `title`/`description` fields on translatable entities (Province, District, City, Suburb, Community, Settlement, Village, Category, Occupation, Unit, Legal, AppealReason). The raw `translations` collection is never exposed — the API always returns a flattened, already-localized `title`/`description` string.
Swagger/OpenAPI: enabled at API Platform's default docs entrypoint.

Error format: JSON body `{ "code": "<error_code>", "message": "<localized message>" }` with matching HTTP status. Full catalogue: `GET /api/app-messages` (list) / `GET /api/app-messages/{code}` (single). Message language follows the same `?locale=` param.

**This is now the format for essentially every business-logic/auth/permission error in the API** — `401`/`403` from `AccessService` (used by nearly every authenticated endpoint: `authentication_required`, `access_denied`, `extra_denied`, `user_blocked`), every OAuth error (`oauth_invalid_state`, `oauth_code_exchange_failed`, etc.), `email_already_exists`/`login_already_exists`/`user_underage` on `POST /users` — **fixed 27.08.2026, systemic fix**. Until then, anything thrown as a raw PHP exception outside a controller (i.e. from a *service* — `AccessService`, all four OAuth services, `LinkOAuthProviderController`, `ExtractIriService`) actually reached the client as API Platform's generic Problem+JSON shape below, **silently losing `code` entirely** — only `message`-driven controllers using their own explicit JSON-building (`errorJson()`) ever produced the documented `{code, message}` shape. This is exactly what the original Instagram OAuth bug report earlier in this doc's history looked like (`{"title":"An error occurred","detail":"...","status":400,"type":"/errors/400"}`, no `code` at all) — now fixed everywhere via a single `AppMessageException` + a global exception listener, so `code` is reliably present on every error from this catalogue regardless of where in the code it's thrown from. If you still see the shape below from any endpoint, that's a bug worth reporting — it shouldn't happen anymore for anything in the `AppMessages` catalogue:
```ts
interface GenericProblemJson {  // legacy/fallback shape — should no longer appear for AppMessages-catalogue errors
  title: string;
  detail: string;
  status: number;
  type: string;
}
```

**Separate, still-current second format — plain field-level validation** (`422`, not part of the `AppMessages` catalogue, not localized by `?locale=`): a `#[Assert\*]` constraint failing on an *individual field* that isn't one of the special business-rule cases above (e.g. `password` too short/missing required character classes, `phone` format) still comes back as API Platform's standard `ConstraintViolationList`:
```ts
interface ConstraintViolationList {
  status: 422;
  violations: { propertyPath: string; message: string; code: string | null }[];
  detail: string;   // all violations joined
  title: string;
}
```
Distinguish the two formats by shape (`violations` array present vs. a flat `code`/`message`), not by status code alone.

---

## 1. AUTH

| Method | Path | Body | Response | Notes |
|---|---|---|---|---|
| POST | `/api/authentication_token` | `{ email, password }` | `{ token, refresh_token_expiration }` | Symfony json_login + Lexik JWT. Sets refresh-token HttpOnly cookie. |
| POST | `/api/refresh_token` | — (cookie-based) | `{ token, refresh_token_expiration }` | Rotates refresh token (single_use: true). |
| POST | `/api/invalidate_token` | — | — | Symfony firewall logout. |
| POST | `/api/logout` | — | `{ success: bool, message }` | App-level logout endpoint (custom). |
| POST | `/api/users` | User registration payload (see §3), validation groups `Default,registration` | User | Public registration. Automatically sends the confirmation email (same one `POST /confirm-account-tokenless/` resends) right after the account is created — **fixed** (was previously not wired up at all despite the confirm/resend endpoints already existing; a fresh registration got no email and just sat `active=false` with no way to become active except the admin manually resending from EasyAdmin). A transport failure (SMTP down, etc.) is logged server-side and does **not** fail the registration request itself — the account is still created `201`, just without an email having gone out; the user can still trigger `POST /confirm-account-tokenless/` afterward once authenticated. |
| POST | `/api/confirm-account/` | `{ token }` | `{ success, message, redirectUrl }` | Confirms account via emailed token. |
| POST | `/api/confirm-account-tokenless/` | — (Bearer auth) | `{ success, message, redirectUrl }` | Confirms already-authenticated user. |
| POST | `/api/change-password/send-otp/` | `{ email }` | — | Sends OTP code to email. |
| POST | `/api/change-password/` | `{ email, code (6 digits), newPassword }` | — | Password strength: min 8 chars, upper+lower+digit+special. |
| POST | `/api/users/grant-role` | `{ role: "ROLE_MASTER" \| "ROLE_CLIENT" }` | `{ message }` | One-time role grant for a fresh account (errors if already has a role). |

## 2. OAUTH

| Method | Path | Body / Query | Response |
|---|---|---|---|
| GET | `/api/auth/google/url` | — | `{ url }` |
| POST | `/api/auth/google/callback` | `{ code, state, role? }` | `{ user, token, message, status }` |
| GET | `/api/auth/instagram/url` | — | `{ url }` |
| POST | `/api/auth/instagram/callback` | `{ code, state, role? }` | `{ user, token, message, status }` |
| GET | `/api/auth/facebook/url` | — | `{ url }` |
| POST | `/api/auth/facebook/callback` | `{ code, state, role? }` | `{ user, token, message, status }` |
| POST | `/api/auth/telegram/callback` | `{ id, hash, authDate, username?, firstName?, lastName?, photoUrl?, role? }` | `{ user, token, message, status }` |
| POST | `/api/profile/oauth/link` | (Bearer) | — |
| DELETE | `/api/profile/oauth/unlink/{provider}` | (Bearer) | — |
| GET | `/api/profile/oauth/providers` | (Bearer) | — |

`provider` values: `google`, `facebook`, `instagram`, `telegram`.

**Instagram-specific limitation (Meta platform restriction, not fixable server-side)**: since Meta shut down the Instagram Basic Display API (Dec 4, 2024), `instagram_business_basic` (what this app uses) only works for **Professional** (Business/Creator) Instagram accounts — a **Personal** account can complete the OAuth consent screen and code exchange fine, but the profile-fetch step then fails. Surfaced as its own error code `oauth_instagram_professional_required` (`400`) rather than the generic `oauth_code_exchange_failed`, with a user-facing message telling them to switch their Instagram account to Professional (Settings → Account type). Frontend should handle this code distinctly (e.g. show that specific guidance) rather than a generic "login failed" toast.

**Google-specific**: `POST /auth/google/callback` used to be able to crash with a raw `500` (not the `oauth_code_exchange_failed` `400` you'd expect) if Google's certs endpoint was transiently unreachable while verifying the `id_token` — fixed; a transient failure there now also comes back as the normal `oauth_code_exchange_failed` `400` like every other provider-side hiccup.

**Telegram-specific, `hash`/`authDate` now required (fixed 27.08.2026, breaking change)**: `POST /auth/telegram/callback` used to accept just `{ id, username?, firstName?, lastName?, photoUrl?, role? }` and verify the request by making a live call to Telegram's Bot API (`getChat`) — which not only failed to prove the request actually came from the claimed account, but **broke login/registration entirely for any user who had never started a conversation with the bot** (`getChat` on a private chat the bot has no prior context on returns "chat not found" — this is documented Telegram Bot API behavior, not a bug specific to this backend). That's very likely the cause of any "user not found" report from Telegram login. Fixed: the endpoint now requires `hash` and `authDate` (the same fields Telegram Login Widget already provides, and that `POST /profile/oauth/link` already required) and verifies the widget's HMAC signature instead — no live Telegram call anymore, no dependency on the user having interacted with the bot before, and it actually proves authenticity (which the old check didn't). `oauth_id_hash_required`-style rejection isn't reused here since these are now plain `#[Assert\NotBlank]` DTO fields (missing → standard `ConstraintViolationList`, `422`); `oauth_telegram_expired` (`auth_date` older than 600s) and `oauth_invalid_signature` (bad hash) are the same `{code, message}` codes `/profile/oauth/link` already used for the same checks.

**New required env var, `TELEGRAM_AUTH_BOT_TOKEN`** (03.09.2026, follow-up fix): the HMAC check above needs the token of whichever bot the Login Widget is actually configured for on the frontend (`data-telegram-login="ustoyobtj_auth_bot"`) — **not** `TELEGRAM_BOT_TOKEN`, which is a *different* bot (`ustoyobtj_tech_support_bot`, used only for tech-support notifications — `AbstractMailerService`/`TelegramBotController`/`NotifyNewTechSupportTelegramBotService`, unrelated to login). Deploying the `hash`/`authDate` fix without also setting `TELEGRAM_AUTH_BOT_TOKEN` to the *auth* bot's own token (from [@BotFather](https://t.me/BotFather)) makes every single login attempt fail with `oauth_invalid_signature`, since the signature is necessarily computed with a different bot's secret than the one that actually signed it — this is exactly what happened on first deploy.

## 3. USERS

| Method | Path | Notes |
|---|---|---|
| GET | `/api/users/social-networks` | → `SocialNetworkOutput[]` `{ id, network }` (distinct networks in use) |
| GET | `/api/users/me` | Full own profile (groups: masters/clients/usersMe/phonesRead) |
| GET | `/api/users/{id}` | Public profile |
| GET | `/api/users` | Collection. Filters: `active`(bool), `atHome`(bool), `rating`(range: `rating[gte]` etc.), `occupation`(exact), `gender`(exact), `socialNetworks`(exact), address filter (see §6), roles filter (`roles[]`), `image` (exists) |
| POST | `/api/users` | Register (see body below) |
| POST | `/api/users/{id}/upload-images` | multipart, field `imageFile[]` |
| PATCH | `/api/users/{id}` | Owner or admin only |
| DELETE | `/api/users/{id}` | Owner or admin only |
| POST | `/api/users/ping` | (Bearer) marks user online (updates `lastSeen`) |
| POST | `/api/users/offline` | (Bearer) marks user offline |

### User entity
```ts
interface User {
  id: string;
  email: string | null;                // BREAKING (05.09.2026): only present on GET /users/me (own profile) now — see note below
  login: string | null;
  name: string | null;
  surname: string | null;
  patronymic: string | null;           // masters/clients/tech-support only
  rating: number | null;               // 0–5
  gender: 'gender_female' | 'gender_male' | 'gender_neutral';
  image: string | null;                // filename, build full URL client-side
  imageExternalUrl: string | null;     // e.g. OAuth avatar (read-only)
  description: string | null;
  dateOfBirth: string | null;          // BREAKING (09.09.2026): only present on GET /users/me (own profile) now — see note below
  atHome: boolean | null;
  active: boolean;                     // read-only
  approved: boolean;                   // read-only
  banned: boolean;                     // read-only, admin-only (EasyAdmin), see note below
  lastSeen: string | null;             // ISO datetime, read-only
  isOnline: boolean;                   // computed, read-only (lastSeen within 2 min)
  reviewsCount: number;                // computed, read-only
  roles: string[];                     // read-only, e.g. ["ROLE_MASTER","ROLE_USER"]
  socialNetworks: SocialNetwork[];
  education: Education[];
  occupation: Occupation[];            // master's occupations/subcategories
  addresses: Address[];
  phones: Phone[];                     // read groups: phonesRead; write groups: phonesWrite
  oauthProviders: OAuthProvider[];     // only on /users/me
  cookiesAgreed: boolean;              // only on /users/me, owner-writable via PATCH /users/{id}, versioned (EntityRevision)
  createdAt: string;
  updatedAt: string | null;
}

interface Phone {
  id: string;
  phone: string;          // normalized, e.g. "+992xxxxxxxxx"
  countryCode: string;    // e.g. "+992"
  main: boolean;
  verified: boolean;      // read-only
}

interface Education {
  id: string;
  title: string | null;
  description: string | null;
  beginning: number | null;   // year
  ending: number | null;      // year
  graduated: boolean | null;
  occupation: Occupation | null;
}

interface SocialNetwork {
  id: string;
  network: string;   // instagram|telegram|whatsapp|facebook|vk|youtube|site|viber|imo|twitter|linkedin|google|wechat
  handle: string | null;
}

interface OAuthProvider {
  id: string;
  provider: 'google' | 'facebook' | 'instagram' | 'telegram';
  providerId: string;
}
```
`User.ROLES` = `{ ROLE_ADMIN, ROLE_MASTER, ROLE_CLIENT }` (+ implicit `ROLE_USER`). There's also `ROLE_SUPER_ADMIN` (not in this map — assigned outside the normal role-grant flow): it's a superset of `ROLE_ADMIN` — a `ROLE_SUPER_ADMIN` account satisfies every "`ROLE_ADMIN` only" check documented below (`roles` in `GET /users/*` responses will show both, e.g. `["ROLE_SUPER_ADMIN","ROLE_ADMIN","ROLE_USER"]`) and additionally bypasses `active`/`approved` gating entirely.
`User.GENDERS` = `{ gender_female, gender_male, gender_neutral }`.
`Phone.CODES`: `+992, +998, +996, +7, +1, +44, +49, +33, +86, +81, +91, +971, +380, +375`.

Registration body (`POST /api/users`): standard User writable fields — `email`, `password`, `name`, `surname`, `patronymic?`, `gender?`, `dateOfBirth?`, phones etc. (validation groups `registration`). A duplicate `email` → `409 email_already_exists`, duplicate `login` → `409 login_already_exists`, `dateOfBirth` under 18 → `400 user_underage` — all three are the standard `{code, message}` `AppMessages` shape (see "Error format" above), checked in `UserListener`/`User::validateDateOfBirth()` on both create and update (so this applies to `PATCH /users/{id}` too, not just registration).

`User.banned` — same mechanism as `Ticket.banned` (§4): never writable via the API, toggled only from EasyAdmin by ROLE_SUPER_ADMIN. Setting it forces `active=false`/`approved=false` immediately, and while `true` neither can be set back to `true` through any code path — including self-activation via `POST /confirm-account/` (token) and `POST /confirm-account-tokenless/` (resend). On top of the entity-level guard, `AccessService::check()` now hard-rejects a banned user (`403 access_denied`) on **every** authenticated endpoint that goes through `checkedUser()` — unconditionally, regardless of the `activeAndApproved` flag some endpoints pass `false` for (that flag only relaxes the "email not confirmed yet" gate, not a ban). `ROLE_SUPER_ADMIN` still bypasses everything, same as it already did for active/approved.

**`User.email` — BREAKING (05.09.2026): now only visible on `GET /users/me`.** Previously `email` was serialized wherever a `User` gets embedded whole (`Ticket.author`/`Ticket.master`, `Review.master`/`Review.client`, `Chat`/`ChatMessage` participants, `Favorite`/`BlackList` targets, `TechSupport.author`) — meaning any authenticated (or even anonymous, for public `/tickets`/`/reviews`) caller could read any other user's email just by viewing a ticket, review, or chat they're part of. Fixed: `email` is gone from every one of those response shapes, including the **public single/collection profile** `GET /users/{id}` / `GET /users` (it never showed there either, before or after — only the embedded-elsewhere leak is what's new here). If any frontend code reads `ticket.master.email`, `review.client.email`, `chat.replyAuthor.email`, etc. to show a contact address, it now gets `undefined` — there's no replacement field; contacting another user is expected to go through the chat/appeal system, not raw email.

**`User.dateOfBirth` — BREAKING (09.09.2026): now only visible on `GET /users/me`.** Same class of bug as `email` above, same fix, same day-late discovery: it was serialized under the `MASTERS`/`CLIENTS` groups, which are exactly the groups the **public, unauthenticated** `GET /users/{id}` and `GET /users` normalize with — meaning anyone's exact birth date was readable by anyone, no login required. It was also visible in `TechSupport`/`TechSupportMessage` embeds (admin-facing) — dropped from there too, an admin handling a support ticket doesn't need the requester's exact birth date to do so. If any frontend code reads `master.dateOfBirth`, `client.dateOfBirth`, etc. on someone else's profile, it now gets `undefined`; it's still present (and writable) on your own `GET /users/me` / `PATCH /users/{id}` as before. If a public profile needs to show an age instead of hiding it entirely, that would need a new computed `age: number` field server-side — doesn't exist yet, ask backend if the product actually wants that.

## 4. TICKETS (services/listings)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/tickets/me` | Own tickets (as author or master), regardless of `approved` |
| GET | `/api/tickets/{id}` | Public single |
| GET | `/api/tickets` | Public collection. Filters: `active`,`service`,`negotiableBudget` (bool); `master`,`author` (exists); `category`,`subcategory`,`master`,`author` (exact), `description` (partial); address filter (§6); range filters `budget`,`master.rating`,`author.rating`,`reviewsCount` |
| POST | `/api/tickets` | body: `TicketInput` |
| POST | `/api/tickets/{id}/upload-images` | multipart `imageFile[]`. `403 access_denied` if `banned` |
| PATCH | `/api/tickets/{id}` | body: `TicketPatchInput`. `403 access_denied` if `banned` — blocks the *entire* request before any field is touched, not just specific fields |

```ts
interface TicketInput {
  title?: string;
  description?: string;
  notice?: string;
  active?: boolean;
  budget?: number;
  negotiableBudget?: boolean;
  priority?: number;      // no fixed enum server-side (unlike TechSupport.PRIORITIES) — plain nullable int
  category?: string;      // IRI e.g. "/api/categories/1"
  subcategory?: string;   // IRI to Occupation
  unit?: string;          // IRI to Unit
  address: object[];      // raw address components, see AddressFilter/§6
}
interface TicketPatchInput extends TicketInput {
  images?: { image: string }[];   // reorder/prune existing MultipleImage refs by filename
}

interface Ticket {
  id: string;
  notice: string | null;
  budget: number | null;
  negotiableBudget: boolean | null;
  priority: number | null;
  service: boolean | null;         // true = "service offer", false = "listing/request"
  active: boolean | null;
  approved: boolean;               // read-only, admin-gated visibility
  banned: boolean;                 // read-only, admin-only (EasyAdmin), see note below
  viewsCount: number;
  responsesCount: number;
  reviewsCount: number;
  title: string | null;
  description: string | null;
  category: Category | null;
  subcategory: Occupation | null;
  unit: Unit | null;
  author: User | null;
  master: User | null;
  addresses: Address[];
  images: MultipleImage[];
  createdAt: string;
  updatedAt: string | null;
}
```

`Ticket.approved` is also reset to `false` automatically whenever a content-affecting field changes (`title`, `description`, `notice`, `budget`, `negotiableBudget`, `service`, `priority`, `category`, `subcategory`, `unit`) — same field list `TicketListener` already used for the admin re-review notification (new `TicketApproval` → least-loaded-admin assignment → Telegram/email notification, see §15 for the audit trail this writes). A previously-approved ticket drops out of public `/tickets` listings again until an admin re-approves. **`addresses` triggers the exact same reset/re-review cycle**, just via a separate code path (`TicketListener::onFlush()`, since it's a collection change, not a scalar field diff) — changing which addresses are attached to a ticket is content-affecting too, not exempt like `active` is.

**`POST /tickets` now also triggers the same admin review cycle immediately on creation — fixed 05.09.2026.** Before this fix, `TicketListener` only created a `TicketApproval` (and thus only ever notified an admin) in reaction to a *subsequent edit* — a brand-new ticket, as originally submitted, generated no `TicketApproval` and no notification at all; the admin only found out once the author changed something. Now every `POST /tickets` immediately creates a `TicketApproval` summarizing the ticket's initial content (every populated field from the list above, plus `addresses` if any were sent), assigns the least-loaded admin, and fires the same Telegram/email notification — no frontend change needed, this is purely server-side.

`active` is deliberately **not** in that list (it used to be): flipping it is a routine "pause/resume my own listing" toggle, not a content edit. A `PATCH` that only changes `active` is applied directly — no new `TicketApproval`, no admin notification, no `EntityRevision`, and `approved` is left untouched. Changing `active` together with an actual content field still goes through the full re-review cycle for that field as usual; `active` itself just isn't part of what triggers it.

`Ticket.banned` — not present in `TicketInput`/`TicketPatchInput` at all (never writable via the API, `#[ApiProperty(writable: false)]`), toggled only from EasyAdmin by ROLE_SUPER_ADMIN. While `true`: `PATCH /tickets/{id}` rejects the whole request (`403 access_denied`) before touching *any* field — including otherwise author-writable ones like `active` — and `POST /tickets/{id}/upload-images` rejects the same way for non-admins. Same enforcement point (`ApiPostUniversalImageController::performAdditionalChecks`) also drives the analogous `TechSupport.STATUS_BANNED` lock. Entity-level invariant (enforced in `Ticket::setBanned/setActive/setApproved`, not just at the controller): setting `banned=true` immediately forces `active=false` and `approved=false` (which also drops the ticket out of public `/tickets` listings, since `approved=false` already gates visibility), and while `banned=true` neither field can be flipped back to `true` through any code path — including the `TicketApproval::setApproved(true)` cascade.

### Category / Unit / Occupation (catalogue, read-only for frontend)
```
GET /api/categories        GET /api/categories/{id}   filters: occupations, title, description(partial)
GET /api/units              GET /api/units/{id}
GET /api/occupations        GET /api/occupations/{id}
```
```ts
interface Category { id: string; title: string; description: string|null; image: string|null; priority: number|null; occupations: Occupation[]; }
interface Unit     { id: string; title: string; description: string|null; priority: number|null; }
interface Occupation { id: string; title: string; description: string|null; image: string|null; priority: number|null; category: Category | null; }
```
**Breaking change**: `Occupation.categories: Category[]` → `Occupation.category: Category | null`. A subcategory belongs to exactly one category — was modeled as many-to-many (join table), now a real one-to-many (`category_id` FK on `occupation`), since nothing ever actually used a subcategory spanning multiple categories and the old shape let that happen by accident with no validation catching it. `Category.occupations` is unaffected — still an array, still every subcategory under that category.

## 5. CHATS

| Method | Path | Notes |
|---|---|---|
| GET | `/api/chats/{id}` | |
| GET | `/api/chats/{id}/subscribe` | Returns Mercure subscriber JWT for this chat's SSE topic (`chat:{id}`) |
| GET | `/api/chats/{id}/messages` | Paginated, newest first. Query: `?page=` `?itemsPerPage=` (default 25, max 50) |
| GET | `/api/chats/inbox-token` | Mercure token covering ALL of the caller's chats (global unread badge) |
| GET | `/api/chats/me` | Query: `?ticket=<id>` `?active=true|false`. Sorted by most-recent-activity first (last message time, or the chat's own `createdAt` if it has no messages yet) |
| POST | `/api/chats` | body: `ChatPostInput` |
| POST | `/api/chats/{id}/read` | marks messages read, no body |
| PATCH | `/api/chats/{id}` | body: `ChatPatchInput` |
| DELETE | `/api/chats/{id}` | "Delete for me" — see below, not a hard delete |

| Method | Path | Notes |
|---|---|---|
| GET | `/api/chat-messages/{id}` | |
| POST | `/api/chat-messages` | body: `ChatMessagePostInput` |
| POST | `/api/chat-messages/{id}/upload-images` | multipart `imageFile[]` |
| PATCH | `/api/chat-messages/{id}` | body: `ChatMessagePatchInput`. `chat` is accepted in the body but no longer used for the ownership check (that reads the message's real `chat` now) — kept for backwards compat, has no effect |
| DELETE | `/api/chat-messages/{id}` | **Soft delete** — see below, not a hard delete |

**Edit/delete restrictions on `ChatMessage`** — identical mechanism to `TechSupportMessage` below (shared code, `AbstractApiHelperController`), minus the "operator reacted" lock (chat has no operator/appellant distinction, both sides are peers). See the `TechSupportMessage` section for the full breakdown of `edit_window_expired` / `edit_too_different` / `message_already_deleted` and how soft delete works — same codes, same `edited`/`deletedByAuthor` fields, same rules, just without `tech_support_message_edit_locked`.

Photo-only messages (no text): omit `description`, send `""`, or send `null` on `POST /chat-messages` (all three normalize to `""` server-side), then attach the photo via the separate `upload-images` call. No `empty_text` error — text is fully optional at creation time.

```ts
interface ChatPostInput  { replyAuthor?: string /* User IRI */; ticket?: string /* Ticket IRI */; }
interface ChatPatchInput { active: boolean; }
interface ChatMessagePostInput  { chat: string /* Chat IRI, required */; description?: string; replyTo?: string /* ChatMessage IRI */; }
interface ChatMessagePatchInput { chat?: string; description?: string; images?: { image: string }[]; }

interface Chat {
  id: string;
  active: boolean | null;
  author: User | null;        // read-only (set from bearer on creation)
  replyAuthor: User | null;
  ticket: Ticket | null;
  images: MultipleImage[];    // computed: aggregated from all messages, newest first, read-only
  // NOTE: no `messages` field — was a single unbounded array, now GET /chats/{id}/messages instead
  lastMessage: ChatMessage | null;  // computed, read-only — for inbox previews without a second request per chat
  unreadCount: number;              // computed, read-only — messages from the OTHER participant with readAt still null
  mercureTopic: string;       // "chat:{id}" — subscribe via Mercure hub using the token from /subscribe
  createdAt: string;
  updatedAt: string | null;
}

interface ChatMessage {
  id: string;
  chat: Chat | null;
  author: User | null;        // read-only
  replyTo: ChatMessage | null;
  readAt: string | null;      // read-only
  description: string | null;
  edited: boolean;            // read-only — true once PATCHed at least once, stays true forever after
  deletedByAuthor: boolean;   // read-only — true after a soft delete; description is then the localized placeholder — see §11 TECH SUPPORT
  images: MultipleImage[];
  createdAt: string;
  updatedAt: string | null;
}
```
Real-time: Mercure. Fetch a subscribe token (`/chats/{id}/subscribe` or `/chats/inbox-token`), then open an EventSource against the Mercure hub URL with that JWT, subscribed to topic `chat:{id}` (per-chat) — hub URL is not part of this API's JSON, get it from app config/`.well-known/mercure` discovery.

**"Delete for me"** (`DELETE /api/chats/{id}`): not a hard delete for either party by itself. It sets a per-participant hidden flag (internal only — not part of the `Chat` shape above, not exposed via the API at all: no reason to tell the caller a chat they hid is hidden, and no reason to tell the other participant their counterpart hid it) and always returns `204`. A chat hidden by the caller stops showing up in **that caller's own** `GET /api/chats/me` — the other participant still sees it normally, and `GET /api/chats/{id}` by direct id still works for both sides regardless of either flag (hiding only affects the list, not direct access). Once **both** sides have called `DELETE`, the chat — and its messages/photos — are actually deleted, in that same request that flips the second flag. Calling `DELETE` again after already hiding it is a no-op (still `204`).

Hiding isn't permanent by itself: `POST /chat-messages` on that chat resets **both** hidden flags back to `false`, regardless of which side sends it or which side hid it — a chat with new activity un-hides for everyone rather than staying hidden forever with no way back.

## 6. GEOGRAPHY

```
GET /api/provinces          GET /api/provinces/{id}
GET /api/districts          GET /api/districts/{id}    filters: province.id, communities.id, settlements.id, settlements.villages.id (exact); title/description/province.title/communities.title/settlements.title/settlements.villages.title (partial, translation-aware)
GET /api/cities             GET /api/cities/{id}       filters: province.id, suburbs.id (exact); title/description/province.title/suburbs.title (partial)
```
Suburb, Community, Settlement, Village have **no direct endpoints** — they only appear nested inside District/City/Settlement responses.

```ts
interface Province { id: string; title: string; description: string|null; image: string|null; cities: City[]; districts: District[]; }
interface District { id: string; title: string; description: string|null; image: string|null; province: Province; settlements: Settlement[]; communities: Community[]; }
interface City      { id: string; title: string; description: string|null; image: string|null; province: Province; suburbs: Suburb[]; }
interface Suburb     { id: string; title: string; description: string|null; image: string|null; }
interface Community  { id: string; title: string; description: string|null; image: string|null; }
interface Settlement { id: string; title: string; description: string|null; image: string|null; villages: Village[]; }
interface Village    { id: string; title: string; description: string|null; image: string|null; }
```
`Province.PROVINCES` (labels): Душанбе, ГРРП, ГБАО, Согдийская область, Хатлонская область.

**Address** (embedded, no own endpoint — attached to User/Ticket via `addresses[]`, written as raw component IRIs/objects in `TicketInput.address` / User payload):
```ts
interface Address {
  id: string;
  province: Province | null;
  city: City | null;
  suburb: Suburb | null;
  district: District | null;
  settlement: Settlement | null;
  community: Community | null;
  village: Village | null;
}
```
`AddressFilter` on `/api/users` and `/api/tickets`: filter by nested geography, e.g. `?address.province=<id>`, `?address.city=<id>`, etc. — inspect `AddressFilter` at request time if exact param names are needed; the frontend agent should confirm via a live OPTIONS/GET call.

**Hierarchy validation** (enforced on every write that embeds an `Address`, i.e. `POST`/`PATCH /tickets`, `POST`/`PATCH /users` addresses): each filled level must actually belong to its parent — `city`/`district` must belong to the given `province`, `suburb` to the given `city`, `community`/`settlement` to the given `district`, `village` to the given `settlement`. A mismatch (e.g. a `city` from one province combined with a `province` it doesn't belong to) is rejected with `422` and one of `city_not_in_province`/`district_not_in_province`/`community_not_in_district`/`suburb_not_in_city`/`settlement_not_in_district`/`village_not_in_settlement`. Since `Address` has no own endpoint (always arrives nested inside `Ticket.addresses`/`User.addresses`), this only actually fires because both entities cascade validation into the collection (`#[Assert\Valid]`) — worth knowing if a previously-accepted malformed address payload starts getting rejected now.

## 7. GALLERIES

| Method | Path | Notes |
|---|---|---|
| GET | `/api/galleries/me` | |
| GET | `/api/galleries` | filter: `user` (exact) |
| POST | `/api/galleries` | no body — creates empty gallery for bearer |
| POST | `/api/galleries/{id}/upload-images` | multipart `imageFile[]` |
| PATCH | `/api/galleries/{id}` | body: `GalleryPatchInput` |
| DELETE | `/api/galleries/{id}` | owner or admin |

```ts
interface GalleryPatchInput { images?: { image: string }[]; }
interface Gallery { id: string; user: User; images: MultipleImage[]; createdAt: string; updatedAt: string|null; }
```

## 8. REVIEWS

| Method | Path | Notes |
|---|---|---|
| GET | `/api/reviews/me` | |
| GET | `/api/reviews/{id}` | |
| GET | `/api/reviews` | Filters: `ticket.service`(bool); `ticket`,`master`,`client`,`images`(exists); `type`,`master`,`client`,`ticket`,`ticket.title`(exact/partial); `rating`(range) |
| POST | `/api/reviews/{id}/upload-images` | multipart `imageFile[]` |
| POST | `/api/reviews` | body: `ReviewPostInput` |
| PATCH | `/api/reviews/{id}` | body: `ReviewPatchInput`. See edit restrictions below |
| DELETE | `/api/reviews/{id}` | owner-side only (client reviewing master or vice-versa) |

**Visibility**: `GET /api/reviews` (collection) and `GET /api/reviews/{id}` both hide a review if either side (`master` or `client`, whichever is filled) currently has `active=false` or `approved=false` — checked on **both** sides, not just the one matching `type`, since the other side is still serialized in full in the response. Also hides a review if its `ticket` is filled and that ticket's own `approved` is `false` (a ticket dropping out of `/tickets` — see §4 — pulls its reviews out of `/reviews` too). `GET /reviews/me` is unaffected — it goes through its own controller/repository call, not this filter.

**Edit restrictions on `PATCH /reviews/{id}`** — same shared mechanism as `ChatMessage`/`TechSupportMessage` (see §11 TECH SUPPORT for the full breakdown): `edit_window_expired` (`403`, 24h from `createdAt`) and `edit_too_different` (`400`, `description` must stay ≥50% similar to the original — omit the field entirely to leave it untouched, that's exempt). No soft delete / `edited` flag / operator-lock for `Review` — those are message-specific, not part of this.

`images` on `ReviewPatchInput` is now optional and behaves like everywhere else (see §14): omit it to leave photos untouched, send `[]` to remove all of them. **Previously this field defaulted to `[]` and had no gate at all**, so it ran unconditionally on *every* PATCH — editing just `rating`, with no mention of `images`, used to silently wipe all of a review's photos. Fixed; omitting `images` is now safe.

```ts
interface ReviewPostInput  { type?: 'client'|'master'; rating: number; ticket?: string /* IRI */; description?: string; master?: string /* IRI */; client?: string /* IRI */; }
interface ReviewPatchInput { rating: number; description?: string; images?: { image: string }[]; }

interface Review {
  id: string;
  rating: number | null;         // 0–5
  type: 'client' | 'master';     // "Отзыв клиенту" | "Отзыв мастеру"
  title: string | null;
  description: string | null;
  ticket: Ticket | null;
  master: User | null;
  client: User | null;
  images: MultipleImage[];
  createdAt: string;
  updatedAt: string | null;
}
```

## 9. APPEALS (жалобы/complaints)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/appeals/me` | own appeals (as author) |
| GET | `/api/appeals/{id}` | **ROLE_ADMIN only** |
| GET | `/api/appeals` | **ROLE_ADMIN only**. Filters: `type`,`title`(partial),`description`(partial),`reason`,`author`,`respondent` |
| POST | `/api/appeals` | body: `AppealInput` |
| POST | `/api/appeals/{id}/upload-images` | multipart `imageFile[]` |

```ts
interface AppealInput {
  type?: 'ticket' | 'chat' | 'review' | 'user';
  title?: string;
  description?: string;
  reason?: string;       // AppealReason IRI
  respondent?: string;   // User IRI
  ticket?: string;       // Ticket IRI (also required alongside chat/review depending on type)
  chat?: string;         // Chat IRI (type=chat)
  review?: string;       // Review IRI (type=review)
}

interface Appeal {   // base shape; subtype adds `chat` or `review`
  id: string;
  title: string | null;
  description: string | null;
  type: 'ticket' | 'chat' | 'review' | 'user';
  reason: AppealReason | null;
  author: User | null;
  respondent: User | null;
  ticket: Ticket | null;
  chat?: Chat | null;      // present only for type=chat (AppealChat)
  review?: Review | null;  // present only for type=review (AppealReview)
  images: MultipleImage[];
  createdAt: string;
  updatedAt: string | null;
}
```
`Appeal.TYPES` labels: Услуга/Объявление→ticket, Чат→chat, Отзыв→review, Пользователь→user. Concrete subclasses: `AppealChat`, `AppealReview`, `AppealTicket`, `AppealUser` (single-table-ish via `type` discriminator, all served through the same `/api/appeals*` endpoints).

```
GET /api/appeal-reasons          GET /api/appeal-reasons/{id}
```
filters: `applicableTo`(exact), `authRequired`(bool)
```ts
interface AppealReason {
  id: string;
  code: string;
  title: string;                 // localized
  applicableTo: 'chat'|'ticket'|'review'|'user'|'support'|'overall';
  authRequired: boolean;
}
```

## 10. FAVORITES & BLACKLIST

| Method | Path | Notes |
|---|---|---|
| GET | `/api/favorites/me` | filter: `type` (CollectionEntryTypeFilter — likely `?type=user` or `?type=ticket`) |
| POST | `/api/favorites` | body: `{ user?: IRI, ticket?: IRI }` (exactly one) |
| DELETE | `/api/favorites/{id}` | owner or admin |
| GET | `/api/black-lists/me` | no filters — every entry is a user-block, nothing else |
| POST | `/api/black-lists` | body: `{ user: IRI }` — blocks that user in chat |
| DELETE | `/api/black-lists/{id}` | owner or admin — **unblocks** |

Self-referencing is allowed: a user can favorite their own `user` IRI or their own `ticket` IRI — no ownership check blocks it server-side. `409 already_added` means this exact `(owner, target)` pair already exists for the caller, not a permission error.

```ts
interface CollectionEntryInput { user?: string; ticket?: string; }  // IRIs, mutually exclusive
interface Favorite  { id: string; type: string; user: User|null; ticket: Ticket|null; createdAt: string; updatedAt: string|null; }

interface BlackListInput { user: string; }  // IRI, required — no ticket option anymore
interface BlackList { id: string; user: User; createdAt: string; updatedAt: string|null; }  // no `type`, no `ticket` — a block is always exactly one user
```
`GET /api/favorites/me` additionally hides entries whose target `ticket` isn't `approved` yet, or whose target `user` isn't `active`+`approved` — filtered at the query level, so pagination/`totalItems` reflect only what's actually visible.

**BlackList semantics (redesigned)** — blocking is chat-only and asymmetric:
- `POST /black-lists { user: IRI }` blocks that user from messaging you. There's no `ticket` variant anymore (removed).
- Only the **blocked** user is restricted — the one who created the block can still send messages if they want; the restriction targets the block's target, not both sides (previously it blocked both directions).
- Restriction covers exactly two things: `POST /chats` (starting a new conversation) and `POST /chat-messages` (sending in an existing one, `403 user_blocked`) — plus attaching photos to your own chat message via `upload-images`. Nothing else is gated: reviews, tickets, favoriting, profile viewing all remain fully available to the blocked user, in both directions.
- Existing chat history is never touched — messages already sent stay visible and unmodified to both parties; the block only prevents *new* writes from the blocked side.
- `PATCH /chats/{id}` (toggling `active`) is unaffected by blocking — that's not "writing" in this sense.
- `DELETE /black-lists/{id}` unblocks immediately.

## 11. TECH SUPPORT

| Method | Path | Notes |
|---|---|---|
| GET | `/api/tech-supports` | ROLE_ADMIN: all tickets |
| GET | `/api/tech-supports/me` | any authed user: own (as author or administrant) |
| GET | `/api/tech-supports/user/{id}` | ROLE_ADMIN: by user |
| GET | `/api/tech-supports/admin/{id}` | ROLE_ADMIN: by assigned admin |
| GET | `/api/tech-supports/{id}` | author/administrant/admin |
| GET | `/api/tech-supports/{id}/subscribe` | Returns Mercure subscriber JWT for this ticket's SSE topic (`tech-support:{id}`). **Only** the ticket's author or its assigned `administrant` can call this — unlike the plain GET above, a generic ROLE_ADMIN without an assignment is rejected (`403 ownership_mismatch`). This is a private 1:1 channel, not an admin monitoring tool. |
| GET | `/api/tech-supports/inbox-token` | Mercure token covering ALL of the caller's tickets at once (as author or administrant — same scope as `/tech-supports/me`). Empty set → `{ token: null, topics: [] }` |
| POST | `/api/tech-supports` | body: `TechSupportPostInput`. Works for guests too (no Bearer) — then `guestEmail` is required |
| POST | `/api/tech-supports/{id}/read` | Marks all unread messages of this ticket as read for the caller (sets `readAt`). "Unread" = `author != caller` and `readAt` still `null`. Access: author, assigned `administrant`, **or any `ROLE_ADMIN`** (broader than `/subscribe`, which stays author+assigned-only). `403 ownership_mismatch` otherwise. No body, `204 No Content`. |
| PATCH | `/api/tech-supports/{id}` | body: `TechSupportPatchInput`. **Author**: `status` (state machine below) + `title`/`description`/`images`, the last three subject to the same 24h edit window as below. **Admin**: everything the author can, plus `reason`/`priority` (no time limit — moderation, not content). Fields outside what the caller is allowed to touch are silently no-op (200, field just doesn't change), no error thrown — except `title`/`description`/`images` past the 24h window, which *does* error (`edit_window_expired`), for both author and admin. |
| PATCH | `/api/tech-supports/{id}/assign` | ROLE_ADMIN, body: `TechSupportAssignInput` |
| POST | `/api/tech-supports/{id}/upload-images` | multipart `imageFile[]` |

```ts
// Общая база для POST и PATCH — тот же паттерн, что TicketInput → TicketPatchInput.
interface TechSupportInput { title?: string; reason?: string /* AppealReason IRI */; priority?: string; description?: string; }
interface TechSupportPostInput extends TechSupportInput { guestEmail?: string; }
interface TechSupportPatchInput extends TechSupportInput {
  status?: 'new'|'renewed'|'in_progress'|'resolved'|'closed'|'banned';
  images?: { image: string }[];   // author or admin, within the 24h window below; reorder/prune existing MultipleImage refs by filename, same syncImages() mechanism as Chat/Ticket
}
interface TechSupportAssignInput { administrant: string /* User IRI */; }

// Deliberately trimmed shape — only these 6 fields are ever exposed for
// `administrant`, everywhere it appears (TechSupport.administrant). No `id`.
interface AdministrantPublic {
  name: string | null;
  surname: string | null;
  patronymic: string | null;
  lastSeen: string | null;
  image: string | null;
  imageExternalUrl: string | null;
}

interface TechSupport {
  id: string;
  title: string | null;
  description: string | null;
  priority: number | null;              // 1 low .. 4 urgent
  reason: AppealReason | null;
  status: string;                       // read-only, see STATUSES
  administrant: AdministrantPublic | null; // read-only, trimmed shape (see above) — NOT a full User
  author: User | null;                  // read-only, full User shape (unaffected)
  guestEmail: string | null;            // only set for guest-created tickets
  guestAccessToken: string | null;      // returned ONLY in the POST response, lets a guest upload images afterwards
  images: MultipleImage[];
  messages: TechSupportMessage[];
  mercureTopic: string;                 // "tech-support:{id}" — subscribe via Mercure hub using the token from /subscribe
  createdAt: string;
  updatedAt: string | null;
}
```
`TechSupport.STATUSES`: new, renewed, in_progress, resolved, closed, **banned**.
`TechSupport.PRIORITIES`: 1=Низкий, 2=Средний, 3=Высокий, 4=Экстренный.

**Status transitions on `PATCH /tech-supports/{id}`**: `ROLE_ADMIN` (incl. `ROLE_SUPER_ADMIN`) can set `status` to *any* value from *any* current value — no restrictions, including out of `banned` (unban). The **author** can only self-transition `resolved → renewed` or `closed → renewed` (reopen — e.g. the ticket was closed with no response, and the client comes back); every other status change by a non-admin returns `403 extra_denied`. Not subject to the edit window below — status changes are always available regardless of ticket age.

**`title`/`description`/`images` edit window on `PATCH /tech-supports/{id}`**: same mechanism as `Review`/`ChatMessage`/`TechSupportMessage` (`AbstractApiHelperController::isPastEditWindow()`, 24h default) — `403 edit_window_expired` once the ticket is older than 24h from `createdAt`. Applies to *both* author and admin equally (unlike `reason`/`priority`, which stay admin-only and unrestricted by time).

**`banned`** — reachable only by `ROLE_ADMIN`, from any status (including `closed`). While a ticket is `banned`, the **author loses all interaction**: `POST /tech-support-messages` and `POST /tech-supports/{id}/upload-images` both return `403 access_denied` for the author/guest — only `ROLE_ADMIN` can still post messages or images on a banned ticket. Unlike before, admin CAN move it back out of `banned` via `PATCH .../{id}`.

Real-time: Mercure, same mechanism as Chat (§5). Fetch a subscribe token (`/tech-supports/{id}/subscribe` or `/tech-supports/inbox-token`), then open an EventSource against the Mercure hub URL with that JWT, subscribed to topic `tech-support:{id}`. Three event types on this topic:
- `{"type":"created","data":{...TechSupportMessage...}}` — new message posted. Editing/deleting a `TechSupportMessage` does *not* emit an event; poll GET for that.
- `{"type":"updated","data":{...TechSupport...}}` — status changed via `PATCH /tech-supports/{id}` (by either admin or author's self-transitions). Only fires on an actual status change, not on other field edits (title/description/priority/reason PATCHed alone do *not* emit an event — see `images_updated` below for the one exception). `data` shape matches the normal `TechSupport` GET response.
- `{"type":"images_updated","data":{...TechSupport...}}` — the ticket's own photo set changed: uploaded (`POST /tech-supports/{id}/upload-images`), detached via `PATCH /tech-supports/{id}` `images`, or removed by moderation (`DELETE /api/multiple-images/{id}`). Fires on **any** of these three paths — listens on the photo itself, not on a specific controller. `data` is the full `TechSupport`, same shape as `updated`/GET — read `data.images` for the current set. Distinct from `updated` on purpose: `updated` stays reserved for status changes, so existing frontend code that special-cases it on that assumption doesn't need to change. **This does not cover `TechSupportMessage` photos** — a message's own attached images changing is still silent, same as any other message edit (see the `created`-only note above).

| Method | Path | Notes |
|---|---|---|
| GET | `/api/tech-support-messages/{id}` | |
| POST | `/api/tech-support-messages` | body: `TechSupportMessagePostInput` |
| PATCH | `/api/tech-support-messages/{id}` | body: `TechSupportMessagePatchInput`. See edit restrictions below |
| DELETE | `/api/tech-support-messages/{id}` | **Soft delete** — see below, not a hard delete |
| POST | `/api/tech-support-messages/{id}/upload-images` | multipart `imageFile[]` |

Photo-only messages (no text): omit `description`, send `description: ""`, or send `description: null` on `POST /tech-support-messages` (all three are equivalent — normalized to `""` server-side), then attach the photo via the separate `upload-images` call — same two-step pattern as `ChatMessage`. There's no `empty_text` error anymore; text is fully optional at creation time either way.

```ts
interface TechSupportMessagePostInput  { techSupport?: string /* IRI */; description?: string; }
interface TechSupportMessagePatchInput { description?: string; images?: { image: string }[]; }  // images: same syncImages() mechanism as ChatMessagePatchInput — reorder/prune by filename, either field alone is enough (400 nothing_to_update if both omitted)
interface TechSupportMessage {
  id: string;
  author: User|null;
  techSupport: TechSupport|null;
  description: string|null;
  readAt: string | null;   // ISO datetime, read-only — set via POST /tech-supports/{id}/read
  edited: boolean;         // read-only — true once the text has been PATCHed at least once, stays true forever after
  deletedByAuthor: boolean; // read-only — true after a soft delete; description is then the localized placeholder (below)
  images: MultipleImage[];
  createdAt: string;
  updatedAt: string|null;
}
```
Note: marking read does **not** emit a Mercure event (unlike Chat, where `/chats/{id}/read` triggers an `"updated"` SSE so the sender sees a second checkmark live) — `TechSupportMessageListener` only publishes on message creation. Poll/re-fetch to see updated `readAt`.

**Edit/delete restrictions — shared across `Review`, `ChatMessage`, `TechSupportMessage`.** One mechanism (`AbstractApiHelperController::isPastEditWindow()`/`isEditTooDifferent()`), same error codes everywhere, not three separate implementations — only the window *length* differs:
- **Edit window** (`edit_window_expired`, `403`) — from the message/review's `createdAt`. Applies to *any* editor. **15 minutes** for `ChatMessage`/`TechSupportMessage` (`AbstractApiHelperController::MESSAGE_EDIT_WINDOW`) — a chat/ticket reply is corrected right away or not at all. **24 hours** for `Review` (default of `isPastEditWindow()`) — a review is expected to be revisited/refined over a longer span.
- **No full rewrites** (`edit_too_different`, `400`) — new text must be at least 50% similar to the old one (PHP `similar_text()`); clearing to `""` (text removed, photo kept, where applicable) is exempt. Blocks turning a PATCH into a de-facto delete-and-replace — same threshold, same helper, for all three entities.
- **Already deleted** (`message_already_deleted`, `410`) — `ChatMessage`/`TechSupportMessage` only (`Review` has no soft delete) — a softly-deleted message can't be edited at all.

**TechSupportMessage-only, on top of the above**: **locked once the operator reacted** (`tech_support_message_edit_locked`, `403`) — only gates the *appellant* editing (the ticket's own `author`); the administrant editing their own messages isn't subject to this. "Reacted" = the message's `readAt` is set, OR the administrant has sent at least one later message in the same ticket (no `replyTo` concept here unlike `ChatMessage`, so "responded" means "posted anything afterward"). `ChatMessage`/`Review` have no operator concept, so no equivalent lock.

**Soft delete on `DELETE /tech-support-messages/{id}` and `DELETE /chat-messages/{id}`**: author OR any `ROLE_ADMIN` (moderation — same "any admin, not just the assigned one" principle already used for posting into a ticket). Not subject to any of the edit restrictions above — deletion is for removing accidentally-shared sensitive content, not "editing", so it stays available at any time. Sets `description` to a localized placeholder (tj/eng/ru — see `AppMessages::MESSAGE_DELETED_PLACEHOLDER`), `deletedByAuthor: true`, and removes all attached photos (logged in the audit trail same as any other photo removal). **Locale resolution here is its own thing, not `AppMessages`'s usual `?locale=` default**: an explicit `?locale=tj` or `?locale=ru` is honored, but if `?locale=` is omitted entirely the placeholder defaults to **`eng`** (not `tj` like every other error/message response) — this text gets written into the DB permanently, so an unspecified language shouldn't silently pick a language nobody asked for. The row itself is never physically deleted — the description change flows through the same update path as a normal edit, so it's captured in the audit trail automatically. Calling `DELETE` again on an already-deleted message is a no-op (`204`). `Review` has no delete endpoint covered by this — unaffected.

## 12. LEGAL

```
GET /api/legals        GET /api/legals/{id}
```
filters: `type`(exact), `title`, `description`(partial)
```ts
interface Legal { id: string; type: 'terms_of_use'|'privacy_policy'|'public_offer'; title: string; description: string|null; }
```

## 13. APP MESSAGES (error/message catalogue)

```
GET /api/app-messages          → { code, message, http }[]
GET /api/app-messages/{code}   → { code, message, http }
```
Use to map backend error `code` → localized display text without hardcoding strings client-side; respects `?locale=`.

## 14. SHARED / CROSS-CUTTING TYPES

```ts
interface MultipleImage {
  id: string;
  author: User | null;
  image: string;        // filename — build full URL via configured storage base path
  priority: number | null;
  createdAt: string;
  updatedAt: string | null;
}
```
Universal image upload pattern — every resource that has images exposes:
`POST /api/{resource}/{id}/upload-images` — `multipart/form-data`, field `imageFile[]` (multiple files, each ≤10MB, png/jpeg/jpg/webp) → `{ message: string, count: number }`.
Reordering/removing already-uploaded images on PATCH: pass `images: [{ image: "<filename>" }, ...]` in entity's Patch DTO (Ticket, Review, Chat message, Tech support ticket, Tech support message — Gallery is its own case, see below) — order defines new `priority`; filenames omitted from the array are detached.

**Omitted vs. explicit `[]`** — these two are now meaningfully different and it matters: omitting `images` from the PATCH body entirely leaves the entity's photos untouched (not part of this edit); sending `images: []` explicitly detaches **all** of them (the "delete the last photo" case). Applies to `Ticket`, `Review`, `ChatMessage`, `TechSupportMessage`, and `TechSupport` (ticket-level). **This was broken until now** on all of those except `TechSupportMessage`/`ChatMessage`'s DTO shape (and `Gallery`, see below) — `images: []` was silently indistinguishable from omitting the field and did nothing; fixed by making the field nullable end-to-end. If you already have client code sending `{"images":[]}` to clear photos and it appeared to no-op, it should now actually work.

`Gallery` is the one exception to "omit = untouched": `GalleryPatchInput.images` is effectively **required**, not optional — `PATCH /galleries/{id}` with no `images` key (or `null`) returns `400 invalid_json` rather than a no-op, since a gallery PATCH only exists to touch images in the first place.

Admin photo moderation — `DELETE /api/multiple-images/{id}` — **ROLE_ADMIN/ROLE_SUPER_ADMIN only**, no ownership check at all (unlike the PATCH-based removal above, which only the entity's own author/participant can do). Deletes by the photo's own id regardless of which entity owns it — a client-side "which resource is this on" lookup isn't needed. Logs the same `EntityRevision` (`entityType: "multiple_image"`, `action: "deleted"`) as PATCH-triggered removal, so moderation deletions show up in the same audit trail either way.

## 15. AUDIT TRAIL (entity revisions)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/entity-revisions` | **ROLE_ADMIN only**. Filters: `entityType`, `entityId`, `parentId`, `entity`, `action` (all exact) |
| GET | `/api/entity-revisions/{id}` | **ROLE_ADMIN only** |

No `POST`/`PATCH`/`DELETE` — rows are written only by server-side listeners, never through the API, and physically cannot be modified/removed via it (`405` on both).

```ts
interface EntityRevision {
  id: string;
  entityType: string;              // e.g. "ticket"
  entityId: string;
  parentId: string | null;         // id of the entity this one nests under — see below; null if there isn't one
  entity: string | null;           // short class name of whatever parentId refers to — see below
  action: 'updated' | 'deleted';
  snapshot: Record<string, unknown>;  // shape depends on entityType/action — see per-entity notes below
  actor: User | null;              // who made the change; null if the account was since deleted
  actorLabel: string | null;       // actor's email, snapshotted at write time — survives account deletion (actor doesn't: FK is ON DELETE SET NULL)
  actorId: string | null;          // actor's id, same snapshot (plain column, no FK — survives deletion same as actorLabel)
  actorName: string | null;        // actor's first name, same snapshot
  actorSurname: string | null;     // actor's last name, same snapshot
  reason: string | null;           // optional, mostly for moderator deletions
  expiresAt: string | null;        // when this row becomes eligible for deletion; null = kept forever
  createdAt: string;
}
```

**`parentId`**: the id of whatever directly owns `entityId` (the immediate FK, not the topmost ancestor) — lets you find every revision nested under one object even when they span different `entityType`s. Per `entityType`: `ticket` → always `null` (root of the hierarchy); `chat_message` → the id of its `Chat` (`ChatMessage.chat`, not the chat's `Ticket`); `tech_support_message` → the id of its `TechSupport`; `review` → the id of its `Ticket`; `multiple_image` → the id of whichever entity owned the deleted photo; `user` → always `null` (root, same as `ticket`).

**`entity`**: the short class name of whatever `parentId` points to (`"Ticket"`, `"Chat"`, `"TechSupport"`, `"Review"`, `"ChatMessage"`, `"TechSupportMessage"`, `"Gallery"`, `"Appeal"`) — or, for a root `entityType` with no parent (`"ticket"`, `"user"`), the class name of the row itself (`"Ticket"`, `"User"`). Lets you filter/group without having to know which `entityType`s nest under which parent. Admin-panel translation table: `EntityRevision::ENTITIES` (`App\Entity\Extra\EntityRevision`).

**Retention**: every revision defaults to `expiresAt = createdAt + 14 days`. A writer can pass `null` instead to keep a specific row forever — nothing currently does, but the field/mechanism supports it. Expiry is not automatic/DB-enforced — actual deletion only happens when `php bin/console app:prune-entity-revisions` runs (cron, not wired up by default in this repo). `expiresAt` is read-only from the API regardless (no write operations on this resource at all).

`entityType` values currently written, and what triggers each. For `action: "updated"`, `snapshot[field]` is always `{ old: <previous value>, new: <value after the edit> }` — both sides included, not just the previous one:

- **`ticket`** — on every `PATCH /tickets/{id}` that changes at least one of `title`/`description`/`notice`/`budget`/`negotiableBudget`/`service`/`priority`/`category`/`subcategory`/`unit`. `snapshot` contains only the fields that actually changed (association fields like `category`/`subcategory`/`unit` are stored as their id, not the embedded object, on both `old` and `new`). Same trigger also resets `Ticket.approved` to `false` — see §4. `active` does **not** trigger this (see §4) — a PATCH that only flips `active` writes no revision at all. **`addresses`** also writes a `ticket` revision (separate code path — a collection change, not a scalar diff), shaped as `snapshot: { address: { old: AddressSnapshot[], new: AddressSnapshot[] } }` where each `AddressSnapshot` is `{ province, city, suburb, district, community, settlement, village }` and each of those is `{ id: string, title: string | null } | null` — the full attached-addresses list on each side (not a diff of individual address fields), compared as a set (order doesn't matter).
- **`chat_message`** — on `PATCH /chat-messages/{id}` that changes `description`. `{ action: "updated", snapshot: { description: { old: "...", new: "..." } } }`.
- **`tech_support_message`** — on `PATCH /tech-support-messages/{id}` that changes `description`. Same shape as `chat_message`.
- **`review`** — on `PATCH /reviews/{id}` that changes `description` and/or `rating`. `snapshot` contains only whichever of the two actually changed, each as an `{ old, new }` pair.
- **`user`** — on `PATCH /users/{id}` that changes `cookiesAgreed` (currently the only watched field for `User` — most other fields are either moderation-only, already covered elsewhere, or too sensitive to snapshot, e.g. `password`). `{ action: "updated", snapshot: { cookiesAgreed: { old: false, new: true } } }`. Note: `TechSupport` (the ticket itself — `title`/`description`/`images`, see §11) is **not** currently written to the audit trail despite having the same 24h edit window as the entities above; only `TechSupportMessage` (the messages within it) is.
- **`multiple_image`** — not an old/new edit-snapshot like the above (deleted photos have no "new" value); `{ action: "deleted" }` whenever one or more existing photos are dropped from any entity's `images` array on PATCH (Ticket/Review/Chat message/Tech support/Tech support message/Gallery/Appeal — anything with `HasImagesInterface`, all funnel through the same `syncImages()` helper), or via `DELETE /api/multiple-images/{id}` (admin moderation, see above). **One row per batch, not per photo** — if a single PATCH drops 3 photos at once, that's one `EntityRevision` listing all 3, not three separate rows. `entityId` is the *first* deleted photo's own id (there's no single id once it's a batch — the full list is in `snapshot`). `snapshot: { images: [{ image: "<full path, e.g. /uploads/tickets/abc123.png>" }, ...] }` — full path (`uri_prefix` + directory + filename, matching what `EntityDirectoryNamerService` actually resolves it to), not just the bare filename.

`reason` is writable from the admin panel only (not set by any listener, not writable via this API at all) — a free-text note an admin can attach after the fact, e.g. to explain a moderator-triggered deletion.

Note: for `chat_message`/`tech_support_message`/`review`, editing is currently allowed by *any* party of the parent relationship (both chat participants, or either review side), not strictly the original message/review author — see the ownership checks on the respective `PATCH` endpoints. `actor` on the revision reflects whoever actually made the request, which may not be the original author.

Every entity uses IRIs (`/api/resource/{id}`) for relations in write payloads (standard API Platform / Hydra convention), and returns embedded objects (or IRIs, depending on `normalizationContext`) on read.

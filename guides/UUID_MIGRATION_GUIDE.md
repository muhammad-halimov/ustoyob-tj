# UUID Migration Guide (Backend, 06–07.09.2026)

## TL;DR

The backend (`ustoyob-tj`) switched **every entity's primary key** from an
auto-increment integer to a **UUIDv7 string**. This was a clean-slate switch
(schema dropped and recreated, no legacy data preserved — the project isn't
released yet) done in a single pass across the whole API. Full backend-side
details live in `ustoyob-tj/API_REFERENCE.md` (see the "BREAKING" note at the
very top) — this guide is the frontend-facing translation of that change,
plus concrete spots in *this* repo that need attention.

## What actually changed

- Every `id` field returned by the API (`Ticket`, `User`, `Category`,
  `TicketApproval`, `Chat`, `ChatMessage`, `Review`, `Appeal` and its
  subtypes, `TechSupport`, `Gallery`, geography entities — literally
  everything) is now a string that looks like:

  ```
  01a0781d-0592-7152-8740-31dcf966cf93
  ```

  (36 chars, 5 hyphen-separated groups, lowercase hex.)

- IRIs are unaffected in *shape* — still `/api/tickets/{id}` — only what's
  inside `{id}` changed from digits to this string.

- Query filters (`?author=`, `?ticket=`, `?province=`, `?city=`, `?user=`,
  etc.) still work exactly the same way — just pass the UUID string instead
  of a number.

- New on `Ticket`: a `slug` field — a decorative, non-persisted, always-live
  transliteration of `title` (e.g. `"Ремонт крана"` → `"remont-krana"`). It
  is **not** an identifier and the backend never looks at it to resolve
  anything. It exists purely so you can build nicer share/SEO URLs:
  `/tickets/{id}?slug={slug}` — put it in the query string (not the path),
  the backend ignores it entirely, so no routing changes are needed on
  either side.

- UUIDv7 IDs are still roughly time-ordered as *strings* — a plain string
  comparison/sort of two UUIDv7 values approximates creation order the same
  way the old auto-increment id did. What no longer works is **arithmetic or
  numeric comparison** on an id (`id + 1`, `id > 5`, `Number(id)`,
  `parseInt(id)`) — those will silently produce garbage (`NaN`, `0`, or a
  truncated/wrong number) instead of throwing, which is the dangerous part.

## 🚨 The one bug you almost certainly have already (found and confirmed in this repo)

There's a shared helper pattern used in several places to pull an id out of
an IRI string, e.g. `"/api/tickets/123"` → `123`. It works by regex-matching
`\d+` (digits only) at the end of the string, then `parseInt()`-ing it:

```ts
// src/utils/chatUtils.ts:31 — the shared extractId() helper
const extractId = (obj: any): number | undefined => {
    if (obj?.id) return typeof obj.id === 'number' ? obj.id : parseInt(String(obj.id));
    const iri = obj?.['@id'];
    if (iri) {
        const match = String(iri).match(/\/(\d+)$/);   // <-- never matches a UUID
        if (match) return parseInt(match[1]);
    }
    return undefined;
};
```

Against a real UUID IRI (`/api/tickets/01a0781d-...`) this regex **never
matches** — `\d+` stops at the first non-digit character (`0`, then `1`,
`a`...). The function silently returns `undefined` instead of the real id.
This is the *exact same class of bug* that was found and fixed on the
backend (`ExtractIriService` there had the identical `\d+` regex, extracting
just `"01"` from a UUID and corrupting inserts) — same root cause, same fix
needed here.

**Every file below has this same pattern and needs the regex (and the
`number` return type) fixed:**

- `src/utils/chatUtils.ts` — lines 31–37 (`extractId` helper, shared/exported
  logic used by chat code), and lines 130, 136 (inline duplicates of the same
  match-and-parseInt for `ticket` embedded in a `Chat`).
- `src/pages/tickets/ticket/Ticket.tsx` — line 554–557 (a **second**,
  file-local copy of the same `extractId` helper — same bug, independently).
- `src/pages/tickets/category/Category.tsx` — line 117.
- `src/pages/favorites/Favorites.tsx` — line 147.
- `src/pages/main/recommendations/Recommendations.tsx` — line 86.
- `src/pages/main/search/search/Search.tsx` — line 924.

All six are the same one-liner shape:
```ts
const m = String(iri).match(/\/\d+$/); return m ? parseInt(m[0].slice(1)) : null;
```
or the `/\/(\d+)$/` + `parseInt(match[1])` variant. The fix is the same
everywhere: stop assuming digits, take the id as a string.

```ts
// Fixed version — matches any id shape (int today, UUID now, whatever later)
const extractId = (obj: any): string | undefined => {
    if (obj?.id) return String(obj.id);
    const iri = obj?.['@id'];
    if (iri) {
        const match = String(iri).match(/\/([^/]+)$/);   // last path segment, any format
        if (match) return match[1];
    }
    return undefined;
};
```

Note the return type also has to become `string` (not `number`) — every
caller of these helpers that then does `Number(id)`, arithmetic, or
`typeof id === 'number'` narrowing on the result needs the same treatment
(see next section — several of them do exactly that).

## Other concrete `Number(id)` / `parseInt(id)` spots found in this repo

These aren't a shared helper — they're one-off coercions on route params or
API response ids that assumed a numeric id and will now produce `NaN` or a
wrong value:

- `src/pages/tickets/ticket/Ticket.tsx:139,152` — `fetchOrder(parseInt(id))`
  where `id` comes from the route param.
- `src/pages/tickets/crud/CreateEdit.tsx:136` — `fetchTicketData(Number(id))`.
- `src/pages/profile/Profile.tsx:386,396,3093,3108,3147` —
  `Number(profileData.id)` used both for API calls and for `===` comparisons
  against other ids (`e.user?.id === Number(profileData.id)`) — the
  comparison side is doubly broken: `Number(uuid)` is `NaN`, and `NaN === NaN`
  is `false`, so this would always silently fail to match, not throw.
- `src/pages/OAuth/TelegramCallbackPage.tsx:67` — `parseInt(id, 10)` —
  **check before touching**: this is likely the Telegram user's own numeric
  chat id (external to our API, comes from the Telegram Login Widget), not
  one of our entity ids. If so, leave it alone — same distinction the
  backend had to make (Telegram's own ids stayed `int`, only our entities
  became UUID).

## Type changes

Roughly 120 places in this repo currently type an `id` field as `number`
(`grep -rn "id: number" src` to enumerate them yourself — the exact list will
drift as you fix things, so treat the number above as "a lot", not gospel).
The mechanical fix is `id: number` → `id: string` wherever that id comes from
this API. A few things make this less painful than it sounds:

- The route-builder helpers in `src/app/routers/routes.ts`
  (`TICKET_BY_ID`, `USER_BY_ID`, `PROVINCE_BY_ID`, etc.) are **already**
  typed `(id: number | string) => ...` — they were written defensively and
  need no changes at all. Anywhere you're just building a URL, you're
  already covered.
- HTML `<select>`/form values are strings in the DOM regardless of what
  TypeScript thinks the id "should" be — most form code won't notice the
  switch except where it explicitly parses the value back to a number.
- If anything in this repo is generated from an OpenAPI/Swagger spec
  (codegen'd API client types), regenerate it against the updated backend —
  the string type will just fall out of that automatically instead of
  needing manual edits.

## What did NOT change

- Endpoint paths, HTTP methods, request/response envelope shapes (`hydra:*`
  fields, pagination params, error `{code, message}` shape) — untouched.
- Auth (JWT payload still keys off `username`/email, not the numeric id it
  never used anyway).
- Telegram Login Widget's own numeric chat id (external, not one of our
  entities — see the `TelegramCallbackPage.tsx` note above).

## Verifying a fix

Any UUID from the API matches:
```
^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$
```
If you need a quick manual sanity check against a running backend, any
`GET` on a list endpoint (e.g. `/api/tickets?itemsPerPage=1`) will show the
new shape directly in the `id` field of the response.

## Full backend-side reference

`ustoyob-tj/API_REFERENCE.md` (same machine, path:
`/Users/muhammad/Desktop/ustoyob-tj/API_REFERENCE.md`) has the complete,
endpoint-by-endpoint backend reference, including this migration's note at
the top and everything else that changed recently (error format, OAuth,
notification wording, etc.) — worth skimming if something here is
ambiguous.

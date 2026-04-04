<?php

namespace App\Entity\Trait\Readable;

/**
 * Центральный реестр всех групп сериализации.
 *
 * Единственное место, где хранятся строковые ключи групп.
 * Все трейты и сущности ссылаются только сюда.
 *
 * Использование в атрибутах:
 *   use App\Entity\Trait\G;
 *   #[Groups([G::MASTERS, G::LEGALS, G::MASTER_TICKETS, G::CLIENT_TICKETS])]
 *
 * Использование в PHP-коде (нормализация, тесты):
 *   $normalizer->normalize($entity, 'json', ['groups' => G::TICKETS]);
 */
final class G
{
    // ─── User / person contexts ────────────────────────────────────────────

    const string USER_PUBLIC = 'user:public:read';
    const string USERS_ME    = 'users:me:read';
    const string MASTERS     = 'masters:read';
    const string CLIENTS     = 'clients:read';
    const string SOCIAL      = 'social:read';

    // ─── Write groups ──────────────────────────────────────────────────────────

    const string PHONES_WRITE = 'users:phones:write';
    const string PHONE_WRITE  = 'phone:write';
    const string PHONES_READ  = 'users:phones:read';

    // ─── Catalogue contexts ────────────────────────────────────────────────

    const string OCCUPATIONS = 'occupations:read';
    const string CATEGORIES  = 'categories:read';
    const string UNITS       = 'units:read';

    // ─── Misc entity contexts ──────────────────────────────────────────────

    const string LEGALS      = 'legals:read';
    const string FAVORITES   = 'favorites:read';
    const string BLACK_LISTS = 'blackLists:read';
    const string GALLERIES   = 'galleries:read';

    // ─── Ticket contexts ───────────────────────────────────────────────────

    const string MASTER_TICKETS = 'masterTickets:read';
    const string CLIENT_TICKETS = 'clientTickets:read';

    // ─── Review contexts ───────────────────────────────────────────────────

    const string REVIEWS        = 'reviews:read';
    const string REVIEWS_CLIENT = 'reviewsClient:read';

    // ─── Chat contexts ─────────────────────────────────────────────────────

    const string CHATS         = 'chats:read';
    const string CHAT_MESSAGES = 'chatMessages:read';

    // ─── TechSupport contexts ──────────────────────────────────────────────

    const string TECH_SUPPORT          = 'techSupport:read';
    const string TECH_SUPPORT_MESSAGES = 'techSupportMessages:read';

    // ─── Geography contexts ────────────────────────────────────────────────

    const string CITIES    = 'cities:read';
    const string DISTRICTS = 'districts:read';
    const string PROVINCES = 'provinces:read';

    // ─── Appeal contexts ───────────────────────────────────────────────────

    const string APPEAL        = 'appeal:read';
    const string APPEAL_CHAT   = 'appeal:chat:read';
    const string APPEAL_TICKET = 'appeal:ticket:read';
    const string APPEAL_REVIEW = 'appeal:review:read';
    const string APPEAL_USER   = 'appeal:user:read';
    const string APPEAL_REASON = 'appeal:reason:read';

    // ─── Extra field groups ────────────────────────────────────────────────

    const string TICKET_IMAGES = 'ticketImages:read';

    // ─── Composite constants (for runtime PHP code, NOT for #[Groups] attributes) ─

    const array PERSONS   = [self::USER_PUBLIC, self::MASTERS, self::CLIENTS];
    const array CATALOGUE = [self::OCCUPATIONS, self::CATEGORIES, self::UNITS];
    const array TICKETS   = [self::MASTER_TICKETS, self::CLIENT_TICKETS];
    const array REVIEW_ALL = [self::REVIEWS, self::REVIEWS_CLIENT];
    const array CHAT_ALL  = [self::CHATS, self::CHAT_MESSAGES];
    const array TECH_ALL  = [self::TECH_SUPPORT, self::TECH_SUPPORT_MESSAGES];
    const array GEO       = [self::CITIES, self::DISTRICTS, self::PROVINCES];
    const array APPEALS   = [self::APPEAL, self::APPEAL_CHAT, self::APPEAL_TICKET, self::APPEAL_REVIEW, self::APPEAL_USER];

    // ─── Operation group sets — use in normalizationContext ───────────────
    //     PHP 8.1+ constant arrays work in attributes.
    //     When operations differ, define BASE + FULL variants.

    const array OPS_USERS_ME     = [self::MASTERS, self::CLIENTS, self::USERS_ME];
    const array OPS_USERS_PUBLIC = [self::MASTERS, self::CLIENTS, self::USER_PUBLIC];

    const array OPS_TICKETS      = [self::MASTER_TICKETS, self::CLIENT_TICKETS];
    const array OPS_TICKETS_FULL = [self::MASTER_TICKETS, self::CLIENT_TICKETS, self::TICKET_IMAGES];

    const array OPS_REVIEWS      = [self::REVIEWS, self::REVIEWS_CLIENT];

    const array OPS_CHATS        = [self::CHATS];
    const array OPS_CHAT_MSGS    = [self::CHAT_MESSAGES];

    const array OPS_TECH_SUPPORT = [self::TECH_SUPPORT];
    const array OPS_TECH_MSGS    = [self::TECH_SUPPORT_MESSAGES];

    const array OPS_GALLERIES    = [self::GALLERIES];
    const array OPS_FAVORITES    = [self::FAVORITES];
    const array OPS_BLACK_LISTS  = [self::BLACK_LISTS];
    const array OPS_LEGALS       = [self::LEGALS];

    const array OPS_CATEGORIES   = [self::CATEGORIES];
    const array OPS_UNITS        = [self::UNITS];
    const array OPS_OCCUPATIONS  = [self::OCCUPATIONS];

    const array OPS_CITIES       = [self::CITIES];
    const array OPS_PROVINCES    = [self::PROVINCES];
    const array OPS_DISTRICTS    = [self::DISTRICTS];

    const array OPS_APPEAL_REASON = [self::APPEAL_REASON];
    const array OPS_APPEALS       = [self::APPEAL, self::APPEAL_CHAT, self::APPEAL_TICKET, self::APPEAL_REVIEW, self::APPEAL_USER];
}

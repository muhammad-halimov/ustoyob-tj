<?php

namespace App\ApiResource;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use App\State\Localization\AppErrorLocalizationProvider;
use InvalidArgumentException;

#[ApiResource(
    shortName: 'AppMessages',
    operations: [
        new GetCollection(uriTemplate: '/app-messages'),
        new Get(uriTemplate: '/app-messages/{code}'),
    ],
    paginationEnabled: false,
    provider: AppErrorLocalizationProvider::class,
)]
class AppMessages
{
    // ── CRUD ──────────────────────────────────────────────────────────────────
    const string RESOURCE_CREATED               = 'resource_created';
    const string RESOURCE_UPDATED               = 'resource_updated';
    const string RESOURCE_DELETED               = 'resource_deleted';
    const string RESOURCE_NOT_FOUND             = 'resource_not_found';

    // ── Authentication ────────────────────────────────────────────────────────
    const string INVALID_CREDENTIALS            = 'invalid_credentials';
    const string PASSWORD_REQUIRED              = 'password_required';
    const string OAUTH_ONLY_ACCOUNT             = 'oauth_only_account';
    const string TOKEN_NOT_FOUND                = 'token_not_found';
    const string TOKEN_INVALID_OR_EXPIRED       = 'token_invalid_or_expired';
    const string AUTHENTICATION_REQUIRED        = 'authentication_required';

    // ── User ──────────────────────────────────────────────────────────────────
    const string USER_NOT_FOUND                 = 'user_not_found';
    const string USER_ALREADY_ACTIVATED         = 'user_already_activated';
    const string OTP_INVALID_OR_EXPIRED         = 'otp_invalid_or_expired';
    const string PASSWORD_CHANGED               = 'password_changed';
    const string ACCESS_DENIED                  = 'access_denied';
    const string OWNERSHIP_MISMATCH             = 'ownership_mismatch';
    const string AUTH_REQUIRED_FOR_CHAT_APPEALS = 'auth_required_for_chat_appeals';

    // ── Chat & Messaging ──────────────────────────────────────────────────────
    const string CHAT_NOT_FOUND                 = 'chat_not_found';
    const string CHAT_ALREADY_EXISTS            = 'chat_already_exists';
    const string CHAT_WITH_SELF                 = 'chat_with_self';
    const string MISSING_CHAT                   = 'missing_chat';
    const string CHAT_MESSAGE_NOT_FOUND         = 'chat_message_not_found';
    const string CHAT_REPLY_AUTHOR_MISMATCH     = 'chat_reply_author_mismatch';
    const string NOTHING_TO_UPDATE              = 'nothing_to_update';

    // ── Entities ──────────────────────────────────────────────────────────────
    const string TICKET_NOT_FOUND               = 'ticket_not_found';
    const string CLIENT_NOT_FOUND               = 'client_not_found';
    const string MASTER_NOT_FOUND               = 'master_not_found';
    const string GALLERY_NOT_FOUND              = 'gallery_not_found';
    const string TECH_SUPPORT_NOT_FOUND         = 'tech_support_not_found';
    const string ADDRESS_NOT_FOUND              = 'address_not_found';
    const string APPEAL_REASON_NOT_FOUND        = 'appeal_reason_not_found';
    const string RESPONDENT_NOT_FOUND           = 'respondent_not_found';
    const string REVIEW_NOT_FOUND               = 'review_not_found';

    // ── Collection Entries ────────────────────────────────────────────────────
    const string ALREADY_ADDED                  = 'already_added';
    const string CANNOT_ADD_YOURSELF            = 'cannot_add_yourself';
    const string NO_INTERACTIONS                = 'no_interactions';

    // ── Input Validation ──────────────────────────────────────────────────────
    const string MISSING_REQUIRED_FIELDS        = 'missing_required_fields';
    const string INVALID_JSON                   = 'invalid_json';
    const string NO_FILES_PROVIDED              = 'no_files_provided';
    const string IMAGE_FILENAME_REQUIRED        = 'image_filename_required';
    const string PROVIDE_USER_OR_TICKET_IRI     = 'provide_user_or_ticket_iri';
    const string PROVIDE_ONLY_ONE_IRI           = 'provide_only_one_iri';
    const string MISSING_TICKET                 = 'missing_ticket';
    const string MISSING_REVIEW                 = 'missing_review';
    const string MISSING_RESPONDENT             = 'missing_respondent';
    const string WRONG_REVIEW_TYPE              = 'wrong_review_type';
    const string WRONG_SUPPORT_REASON           = 'wrong_support_reason';
    const string INVALID_RATING                 = 'invalid_rating';
    const string EXTRA_DENIED                   = 'extra_denied';
    const string GALLERY_EXISTS_PATCH_INSTEAD   = 'gallery_exists_patch_instead';
    const string EMPTY_TEXT                     = 'empty_text';
    const string CLIENT_PARAM_REQUIRED          = 'client_param_required';
    const string MASTER_PARAM_REQUIRED          = 'master_param_required';
    const string PROVINCE_REQUIRED              = 'province_required';
    const string SETTLEMENT_REQUIRED_FOR_VILLAGE = 'settlement_required_for_village';
    const string SUBCATEGORY_NOT_IN_CATEGORY    = 'subcategory_not_in_category';
    const string NOTHING_CHANGING               = 'nothing_changing';
    const string WRONG_TECH_SUPPORT_STATUS      = 'wrong_tech_support_status';

    // ── Appeal ────────────────────────────────────────────────────────────────
    const string APPEAL_TICKET_MISMATCH         = 'appeal_ticket_mismatch';
    const string APPEAL_CHAT_MISMATCH           = 'appeal_chat_mismatch';
    const string WRONG_APPEAL_TYPE              = 'wrong_appeal_type';

    // ── Review ────────────────────────────────────────────────────────────────
    const string REVIEW_ALREADY_EXISTS          = 'review_already_exists';
    const string REVIEW_NOT_MASTER              = 'review_not_master';
    const string REVIEW_CLIENT_ROLE_MISMATCH    = 'review_client_role_mismatch';
    const string REVIEW_CLIENT_TICKET_MISMATCH  = 'review_client_ticket_mismatch';
    const string REVIEW_NOT_CLIENT              = 'review_not_client';
    const string REVIEW_MASTER_ROLE_MISMATCH    = 'review_master_role_mismatch';
    const string REVIEW_MASTER_SERVICE_MISMATCH = 'review_master_service_mismatch';

    // ── Role ──────────────────────────────────────────────────────────────────
    const string ROLE_ALREADY_ADMIN             = 'role_already_admin';
    const string ROLE_ALREADY_MASTER            = 'role_already_master';
    const string ROLE_ALREADY_CLIENT            = 'role_already_client';
    const string WRONG_ROLE                     = 'wrong_role';

    // ── Abstract / Location ────────────────────────────────────────────────────
    const string DUPLICATE_ADDRESS              = 'duplicate_address';
    const string CITY_NOT_IN_PROVINCE           = 'city_not_in_province';
    const string DISTRICT_NOT_IN_PROVINCE       = 'district_not_in_province';
    const string COMMUNITY_NOT_IN_DISTRICT      = 'community_not_in_district';
    const string SUBURB_NOT_IN_CITY             = 'suburb_not_in_city';
    const string SETTLEMENT_NOT_IN_DISTRICT     = 'settlement_not_in_district';
    const string VILLAGE_NOT_IN_SETTLEMENT      = 'village_not_in_settlement';

    // ── OAuth ─────────────────────────────────────────────────────────────────
    const string OAUTH_NOT_LINKED               = 'oauth_not_linked';
    const string OAUTH_LAST_AUTH_METHOD         = 'oauth_last_auth_method';
    const string OAUTH_PROVIDER_TAKEN           = 'oauth_provider_taken';
    const string OAUTH_ALREADY_LINKED           = 'oauth_already_linked';
    const string OAUTH_INVALID_PROVIDER         = 'oauth_invalid_provider';
    const string OAUTH_ID_HASH_REQUIRED         = 'oauth_id_hash_required';
    const string OAUTH_TELEGRAM_EXPIRED         = 'oauth_telegram_expired';
    const string OAUTH_INVALID_STATE            = 'oauth_invalid_state';
    const string OAUTH_CODE_STATE_REQUIRED      = 'oauth_code_state_required';
    const string OAUTH_INVALID_SIGNATURE        = 'oauth_invalid_signature';
    const string OAUTH_CODE_EXCHANGE_FAILED     = 'oauth_code_exchange_failed';
    const string OAUTH_UNVERIFIED_EMAIL         = 'oauth_unverified_email';

    /** Locale active for the current request (set by AppErrorLocaleListener). */
    private static string $locale = 'tj';

    public static function setLocale(string $locale): void
    {
        self::$locale = in_array($locale, ['tj', 'eng', 'ru'], true) ? $locale : 'tj';
    }

    // ─────────────────────────────────────────────────────────────────────────
    // REGISTRY  ['messages' => ['tj'=>…,'eng'=>…,'ru'=>…], 'http' => int]
    // ─────────────────────────────────────────────────────────────────────────
    private const array REGISTRY = [
        // Crud
        self::RESOURCE_CREATED               => ['http' => 200, 'messages' => ['tj' => 'Захира сохта шуд',                                                                         'eng' => 'Resource created',                                             'ru' => 'Ресурс создан']],
        self::RESOURCE_UPDATED               => ['http' => 200, 'messages' => ['tj' => 'Захира танзим карда шуд',                                                                  'eng' => 'Resource updated',                                             'ru' => 'Ресурс обновлен']],
        self::RESOURCE_DELETED               => ['http' => 204, 'messages' => ['tj' => 'Захира аз байн рафт',                                                                      'eng' => 'Resource deleted',                                             'ru' => 'Ресурс удален']],
        self::RESOURCE_NOT_FOUND             => ['http' => 404, 'messages' => ['tj' => 'Захира ёфт нашуд',                                                                         'eng' => 'Resource not found',                                           'ru' => 'Ресурс не найден']],
        // Authentication
        self::INVALID_CREDENTIALS            => ['http' => 401, 'messages' => ['tj' => 'Маълумоти нодуруст',                                                                       'eng' => 'Invalid credentials',                                          'ru' => 'Неверные учётные данные']],
        self::PASSWORD_REQUIRED              => ['http' => 401, 'messages' => ['tj' => 'Рамз зарур аст',                                                                           'eng' => 'Password is required',                                         'ru' => 'Пароль обязателен']],
        self::OAUTH_ONLY_ACCOUNT             => ['http' => 401, 'messages' => ['tj' => 'Ин ҳисоб OAuth-тасдиқро истифода мебарад',                                                 'eng' => 'This account uses OAuth authentication',                       'ru' => 'Этот аккаунт использует OAuth аутентификацию']],
        self::TOKEN_NOT_FOUND                => ['http' => 401, 'messages' => ['tj' => 'Токен ёфт нашуд',                                                                          'eng' => 'Token not found',                                              'ru' => 'Токен не найден']],
        self::TOKEN_INVALID_OR_EXPIRED       => ['http' => 400, 'messages' => ['tj' => 'Токен нодуруст ё мӯҳлаташ гузаштааст',                                                    'eng' => 'Token is invalid or expired',                                  'ru' => 'Токен недействителен или истёк']],
        self::AUTHENTICATION_REQUIRED        => ['http' => 401, 'messages' => ['tj' => 'Тасдиқ зарур аст',                                                                         'eng' => 'Authentication required',                                      'ru' => 'Требуется аутентификация']],
        // User
        self::USER_NOT_FOUND                 => ['http' => 404, 'messages' => ['tj' => 'Корбар ёфт нашуд',                                                                         'eng' => 'User not found',                                               'ru' => 'Пользователь не найден']],
        self::USER_ALREADY_ACTIVATED         => ['http' => 403, 'messages' => ['tj' => 'Корбар аллакай фаъол ва тасдиқшудааст',                                                    'eng' => 'User already activated and approved',                          'ru' => 'Пользователь уже активирован и подтверждён']],
        self::OTP_INVALID_OR_EXPIRED         => ['http' => 400, 'messages' => ['tj' => 'Рамзи якдафъа нодуруст ё мӯҳлаташ гузаштааст',                                           'eng' => 'OTP code is invalid or expired',                               'ru' => 'OTP-код недействителен или истёк']],
        self::PASSWORD_CHANGED               => ['http' => 200, 'messages' => ['tj' => 'Рамз бомуваффақият иваз карда шуд',                                                       'eng' => 'Password changed successfully',                                'ru' => 'Пароль успешно изменён']],
        self::ACCESS_DENIED                  => ['http' => 403, 'messages' => ['tj' => 'Дастрасӣ рад шуд',                                                                         'eng' => 'Access denied',                                                'ru' => 'Доступ запрещён']],
        self::OWNERSHIP_MISMATCH             => ['http' => 403, 'messages' => ['tj' => 'Моликият мувофиқ нест',                                                                    'eng' => "Ownership doesn't match",                                      'ru' => 'Права владения не совпадают']],
        self::AUTH_REQUIRED_FOR_CHAT_APPEALS => ['http' => 401, 'messages' => ['tj' => 'Барои шикоятҳои чат тасдиқ зарур аст',                                                    'eng' => 'Authentication required for chat appeals',                     'ru' => 'Для жалоб в чате требуется аутентификация']],
        // Chat
        self::CHAT_NOT_FOUND                 => ['http' => 404, 'messages' => ['tj' => 'Чат ёфт нашуд',                                                                            'eng' => 'Chat not found',                                               'ru' => 'Чат не найден']],
        self::CHAT_ALREADY_EXISTS            => ['http' => 409, 'messages' => ['tj' => 'Чат аллакай вуҷуд дорад',                                                                  'eng' => 'Chat already exists',                                          'ru' => 'Чат уже существует']],
        self::CHAT_WITH_SELF                 => ['http' => 403, 'messages' => ['tj' => 'Шумо наметавонед бо худатон чат кунед',                                                    'eng' => 'You cannot post a chat with yourself',                         'ru' => 'Нельзя создать чат с самим собой']],
        self::MISSING_CHAT                   => ['http' => 400, 'messages' => ['tj' => 'Чат нест',                                                                                  'eng' => 'Missing chat',                                                 'ru' => 'Чат отсутствует']],
        self::CHAT_MESSAGE_NOT_FOUND         => ['http' => 404, 'messages' => ['tj' => 'Паёми чат ёфт нашуд',                                                                      'eng' => 'Chat message not found',                                       'ru' => 'Сообщение чата не найдено']],
        self::CHAT_REPLY_AUTHOR_MISMATCH     => ['http' => 400, 'messages' => ['tj' => 'Эҳтимол муаллифи билет/устод бо муаллифи ҷавоб мувофиқ нест',                             'eng' => "Probably ticket's author/master doesn't match to reply author", 'ru' => 'Автор билета/мастера не совпадает с автором ответа']],
        self::NOTHING_TO_UPDATE              => ['http' => 400, 'messages' => ['tj' => 'Чизе барои навсозӣ нест',                                                                  'eng' => 'Nothing to update',                                            'ru' => 'Нечего обновлять']],
        // Entities
        self::TICKET_NOT_FOUND               => ['http' => 404, 'messages' => ['tj' => 'Билет ёфт нашуд',                                                                          'eng' => 'Ticket not found',                                             'ru' => 'Билет не найден']],
        self::CLIENT_NOT_FOUND               => ['http' => 404, 'messages' => ['tj' => 'Муштарӣ ёфт нашуд',                                                                        'eng' => 'Client not found',                                             'ru' => 'Клиент не найден']],
        self::MASTER_NOT_FOUND               => ['http' => 404, 'messages' => ['tj' => 'Устод ёфт нашуд',                                                                          'eng' => 'Master not found',                                             'ru' => 'Мастер не найден']],
        self::GALLERY_NOT_FOUND              => ['http' => 404, 'messages' => ['tj' => 'Галерея ёфт нашуд',                                                                        'eng' => 'Gallery not found',                                            'ru' => 'Галерея не найдена']],
        self::TECH_SUPPORT_NOT_FOUND         => ['http' => 404, 'messages' => ['tj' => 'Дастгирии техникӣ ёфт нашуд',                                                             'eng' => 'Tech support not found',                                       'ru' => 'Техподдержка не найдена']],
        self::ADDRESS_NOT_FOUND              => ['http' => 404, 'messages' => ['tj' => 'Суроға ёфт нашуд',                                                                         'eng' => 'Abstract not found',                                            'ru' => 'Адрес не найден']],
        self::APPEAL_REASON_NOT_FOUND        => ['http' => 404, 'messages' => ['tj' => 'Сабаби шикоят ёфт нашуд',                                                                  'eng' => 'Appeal reason not found',                                      'ru' => 'Причина жалобы не найдена']],
        self::RESPONDENT_NOT_FOUND           => ['http' => 404, 'messages' => ['tj' => 'Ҷавобгар ёфт нашуд',                                                                       'eng' => 'Respondent not found',                                         'ru' => 'Ответчик не найден']],
        self::REVIEW_NOT_FOUND               => ['http' => 404, 'messages' => ['tj' => 'Баррасӣ ёфт нашуд',                                                                        'eng' => 'Review not found',                                             'ru' => 'Отзыв не найден']],
        // Collection Entries
        self::ALREADY_ADDED                  => ['http' => 409, 'messages' => ['tj' => 'Аллакай илова шудааст',                                                                    'eng' => 'Already added',                                                'ru' => 'Уже добавлено']],
        self::CANNOT_ADD_YOURSELF            => ['http' => 422, 'messages' => ['tj' => 'Шумо наметавонед худро илова кунед',                                                       'eng' => 'Cannot add yourself',                                          'ru' => 'Нельзя добавить самого себя']],
        self::NO_INTERACTIONS                => ['http' => 422, 'messages' => ['tj' => 'Байни корбарон ягон робита нест',                                                          'eng' => 'No interactions between users',                                 'ru' => 'Нет взаимодействий между пользователями']],
        // Input Validation
        self::MISSING_REQUIRED_FIELDS        => ['http' => 400, 'messages' => ['tj' => 'Майдонҳои зарурӣ нопурра аст',                                                             'eng' => 'Missing required fields',                                      'ru' => 'Отсутствуют обязательные поля']],
        self::INVALID_JSON                   => ['http' => 400, 'messages' => ['tj' => 'Маълумоти JSON нодуруст аст',                                                              'eng' => 'Invalid JSON data',                                            'ru' => 'Некорректные JSON данные']],
        self::NO_FILES_PROVIDED              => ['http' => 400, 'messages' => ['tj' => 'Файлҳо пешниҳод нашудаанд',                                                                'eng' => 'No files provided',                                            'ru' => 'Файлы не предоставлены']],
        self::IMAGE_FILENAME_REQUIRED        => ['http' => 400, 'messages' => ['tj' => 'Номи файли тасвир зарур аст',                                                              'eng' => 'Image filename is required',                                   'ru' => 'Имя файла изображения обязательно']],
        self::PROVIDE_USER_OR_TICKET_IRI     => ['http' => 400, 'messages' => ['tj' => 'IRI-и «корбар» ё «билет»-ро пешниҳод кунед',                                              'eng' => 'Provide either "user" or "ticket" IRI',                         'ru' => 'Укажите IRI «пользователя» или «билета»']],
        self::PROVIDE_ONLY_ONE_IRI           => ['http' => 400, 'messages' => ['tj' => 'Танҳо яке аз «корбар» ё «билет»-ро пешниҳод кунед, на ҳарду',                             'eng' => 'Provide only one of "user" or "ticket", not both',              'ru' => 'Укажите только одно: «пользователь» или «билет»']],
        self::MISSING_TICKET                 => ['http' => 400, 'messages' => ['tj' => 'Билет нест',                                                                                'eng' => 'Missing ticket',                                               'ru' => 'Билет отсутствует']],
        self::MISSING_REVIEW                 => ['http' => 400, 'messages' => ['tj' => 'Баррасӣ нест',                                                                              'eng' => 'Missing review',                                               'ru' => 'Отзыв отсутствует']],
        self::MISSING_RESPONDENT             => ['http' => 400, 'messages' => ['tj' => 'Ҷавобгар барои шикояти корбар нест',                                                       'eng' => 'Missing respondent for user appeal',                           'ru' => 'Ответчик для жалобы пользователя отсутствует']],
        self::WRONG_REVIEW_TYPE              => ['http' => 400, 'messages' => ['tj' => 'Навъи баррасии нодуруст',                                                                  'eng' => 'Wrong review type',                                            'ru' => 'Неверный тип отзыва']],
        self::WRONG_SUPPORT_REASON           => ['http' => 400, 'messages' => ['tj' => 'Сабаби дастгирии нодуруст',                                                                'eng' => 'Wrong support reason',                                         'ru' => 'Неверная причина обращения']],
        self::INVALID_RATING                 => ['http' => 400, 'messages' => ['tj' => 'Рейтинг бояд аз 1 то 5 бошад',                                                             'eng' => 'Rating must be between 1 and 5',                               'ru' => 'Рейтинг должен быть от 1 до 5']],
        self::EXTRA_DENIED                   => ['http' => 403, 'messages' => ['tj' => 'Дастрасӣ маҳдуд аст',                                                                      'eng' => 'Extra denied',                                                 'ru' => 'Доступ ограничен']],
        self::GALLERY_EXISTS_PATCH_INSTEAD   => ['http' => 400, 'messages' => ['tj' => 'Ин корбар галерея дорад, ба ҷои он patch истифода баред',                                  'eng' => 'This user has gallery, patch instead',                          'ru' => 'У этого пользователя есть галерея, используйте patch']],
        self::EMPTY_TEXT                     => ['http' => 400, 'messages' => ['tj' => 'Матн холӣ аст',                                                                             'eng' => 'Empty text',                                                   'ru' => 'Пустой текст']],
        self::CLIENT_PARAM_REQUIRED          => ['http' => 400, 'messages' => ['tj' => 'Параметри муштарӣ зарур аст',                                                              'eng' => 'Client parameter is required',                                 'ru' => 'Параметр клиента обязателен']],
        self::MASTER_PARAM_REQUIRED          => ['http' => 400, 'messages' => ['tj' => 'Параметри устод зарур аст',                                                                'eng' => 'Master parameter is required',                                 'ru' => 'Параметр мастера обязателен']],
        self::PROVINCE_REQUIRED              => ['http' => 400, 'messages' => ['tj' => 'Вилоят зарур аст',                                                                         'eng' => 'Province is required',                                         'ru' => 'Регион обязателен']],
        self::SETTLEMENT_REQUIRED_FOR_VILLAGE => ['http' => 400, 'messages' => ['tj' => 'Маҳалла зарур аст, агар деҳа нишон дода шавад',                                          'eng' => 'Settlement is required when village is specified',              'ru' => 'Требуется населённый пункт при указании деревни']],
        self::SUBCATEGORY_NOT_IN_CATEGORY    => ['http' => 422, 'messages' => ['tj' => 'Зербахш ба ин бахш тааллуқ надорад',                                                       'eng' => "Subcategory doesn't belong to this category",                  'ru' => 'Подкатегория не принадлежит данной категории']],
        self::NOTHING_CHANGING               => ['http' => 400, 'messages' => ['tj' => 'Ягон тағирот нест',                                                                        'eng' => 'Nothing to change',                                            'ru' => 'Нечего изменять']],
        self::WRONG_TECH_SUPPORT_STATUS      => ['http' => 400, 'messages' => ['tj' => 'Навъи ҳолати нодуруст. Форматҳо [new, renewed, in_progress, resolved, closed]',           'eng' => 'Wrong status type. Formats [new, renewed, in_progress, resolved, closed]', 'ru' => 'Неверный тип статуса. Форматы [new, renewed, in_progress, resolved, closed]']],
        // Appeal
        self::APPEAL_TICKET_MISMATCH         => ['http' => 400, 'messages' => ['tj' => 'Билети ҷавобгар мувофиқ нест',                                                             'eng' => "Respondent's ticket doesn't match",                            'ru' => 'Билет ответчика не совпадает']],
        self::APPEAL_CHAT_MISMATCH           => ['http' => 400, 'messages' => ['tj' => 'Чати ҷавобгар мувофиқ нест',                                                               'eng' => "Respondent's chat doesn't match",                              'ru' => 'Чат ответчика не совпадает']],
        self::WRONG_APPEAL_TYPE              => ['http' => 400, 'messages' => ['tj' => 'Навъи шикояти нодуруст',                                                                   'eng' => 'Wrong appeal type',                                            'ru' => 'Неверный тип жалобы']],
        // Review
        self::REVIEW_ALREADY_EXISTS          => ['http' => 409, 'messages' => ['tj' => 'Шумо аллакай барои ин билет баррасӣ гузоштед',                                              'eng' => 'You have already submitted a review for this ticket',           'ru' => 'Вы уже оставили отзыв для этого билета']],
        self::REVIEW_NOT_MASTER              => ['http' => 403, 'messages' => ['tj' => 'Шумо бидуни устод будан наметавонед баррасии муштарӣ гузоред',                             'eng' => "You can't post a client review while not being a master",       'ru' => 'Нельзя оставить отзыв клиенту, не будучи мастером']],
        self::REVIEW_CLIENT_ROLE_MISMATCH    => ['http' => 403, 'messages' => ['tj' => 'Нақши муштарӣ мувофиқ нест',                                                               'eng' => "Client's role doesn't match",                                  'ru' => 'Роль клиента не совпадает']],
        self::REVIEW_CLIENT_TICKET_MISMATCH  => ['http' => 404, 'messages' => ['tj' => 'Билети муштарӣ мувофиқ нест',                                                              'eng' => "Client's ticket doesn't match",                                'ru' => 'Билет клиента не совпадает']],
        self::REVIEW_NOT_CLIENT              => ['http' => 403, 'messages' => ['tj' => 'Шумо бидуни муштарӣ будан наметавонед баррасии устод гузоред',                             'eng' => "You can't post a master review while not being a client",       'ru' => 'Нельзя оставить отзыв мастеру, не будучи клиентом']],
        self::REVIEW_MASTER_ROLE_MISMATCH    => ['http' => 403, 'messages' => ['tj' => 'Нақши устод мувофиқ нест',                                                                 'eng' => "Master's role doesn't match",                                  'ru' => 'Роль мастера не совпадает']],
        self::REVIEW_MASTER_SERVICE_MISMATCH => ['http' => 404, 'messages' => ['tj' => 'Хизмати устод мувофиқ нест',                                                               'eng' => "Master's service doesn't match",                               'ru' => 'Услуга мастера не совпадает']],
        // Role
        self::ROLE_ALREADY_ADMIN             => ['http' => 403, 'messages' => ['tj' => 'Шумо администратор ҳастед',                                                                'eng' => "You're admin",                                                 'ru' => 'Вы администратор']],
        self::ROLE_ALREADY_MASTER            => ['http' => 403, 'messages' => ['tj' => 'Шумо устод ҳастед',                                                                        'eng' => "You're master",                                                'ru' => 'Вы мастер']],
        self::ROLE_ALREADY_CLIENT            => ['http' => 403, 'messages' => ['tj' => 'Шумо муштарӣ ҳастед',                                                                      'eng' => "You're client",                                                'ru' => 'Вы клиент']],
        self::WRONG_ROLE                     => ['http' => 400, 'messages' => ['tj' => 'Нақши нодуруст пешниҳод шудааст',                                                          'eng' => 'Wrong role provided',                                          'ru' => 'Указана неверная роль']],
        // Abstract / Location
        self::DUPLICATE_ADDRESS              => ['http' => 422, 'messages' => ['tj' => 'Суроғаи такрорӣ ошкор шуд',                                                               'eng' => 'Duplicate address detected',                                   'ru' => 'Обнаружен дублирующийся адрес']],
        self::CITY_NOT_IN_PROVINCE           => ['http' => 422, 'messages' => ['tj' => 'Шаҳр ба вилояти нишондодашуда тааллуқ надорад',                                           'eng' => 'City does not belong to the specified province',                'ru' => 'Город не принадлежит указанному региону']],
        self::DISTRICT_NOT_IN_PROVINCE       => ['http' => 422, 'messages' => ['tj' => 'Ноҳия ба вилояти нишондодашуда тааллуқ надорад',                                          'eng' => 'District does not belong to the specified province',            'ru' => 'Район не принадлежит указанному региону']],
        self::COMMUNITY_NOT_IN_DISTRICT      => ['http' => 422, 'messages' => ['tj' => 'Ҷамоат ба ноҳияи нишондодашуда тааллуқ надорад',                                         'eng' => 'Community does not belong to the specified district',           'ru' => 'Джамоат не принадлежит указанному району']],
        self::SUBURB_NOT_IN_CITY             => ['http' => 422, 'messages' => ['tj' => 'Маҳаллаи шаҳр ба шаҳри нишондодашуда тааллуқ надорад',                                   'eng' => 'Suburb does not belong to the specified city',                  'ru' => 'Подрайон не принадлежит указанному городу']],
        self::SETTLEMENT_NOT_IN_DISTRICT     => ['http' => 422, 'messages' => ['tj' => 'Маҳалла ба ноҳияи нишондодашуда тааллуқ надорад',                                        'eng' => 'Settlement does not belong to the specified district',          'ru' => 'Населённый пункт не принадлежит указанному району']],
        self::VILLAGE_NOT_IN_SETTLEMENT      => ['http' => 422, 'messages' => ['tj' => 'Деҳа ба маҳаллаи нишондодашуда тааллуқ надорад',                                         'eng' => 'Village does not belong to the specified settlement',           'ru' => 'Деревня не принадлежит указанному населённому пункту']],
        // OAuth
        self::OAUTH_NOT_LINKED               => ['http' => 400, 'messages' => ['tj' => 'Провайдер ба ин ҳисоб пайваст нашудааст',                                                  'eng' => 'Provider is not linked to this account',                        'ru' => 'Провайдер не привязан к этому аккаунту']],
        self::OAUTH_LAST_AUTH_METHOD         => ['http' => 400, 'messages' => ['tj' => 'Охирин усули тасдиқро ҷудо кардан мумкин нест',                                            'eng' => 'Cannot unlink the last authentication method',                  'ru' => 'Нельзя отвязать последний метод аутентификации']],
        self::OAUTH_PROVIDER_TAKEN           => ['http' => 400, 'messages' => ['tj' => 'Ин ҳисоби провайдер ба корбари дигар пайваст шудааст',                                    'eng' => 'This provider account is already linked to another user',       'ru' => 'Аккаунт провайдера уже привязан к другому пользователю']],
        self::OAUTH_ALREADY_LINKED           => ['http' => 400, 'messages' => ['tj' => 'Ин провайдер аллакай ба ҳисоби шумо пайваст шудааст',                                     'eng' => 'This provider is already linked to your account',               'ru' => 'Провайдер уже привязан к вашему аккаунту']],
        self::OAUTH_INVALID_PROVIDER         => ['http' => 400, 'messages' => ['tj' => 'Провайдери нодуруст',                                                                       'eng' => 'Invalid provider',                                             'ru' => 'Неверный провайдер']],
        self::OAUTH_ID_HASH_REQUIRED         => ['http' => 400, 'messages' => ['tj' => 'id ва hash барои Telegram зарур аст',                                                      'eng' => 'id and hash are required for Telegram',                         'ru' => 'id и hash обязательны для Telegram']],
        self::OAUTH_TELEGRAM_EXPIRED         => ['http' => 400, 'messages' => ['tj' => 'Маълумоти тасдиқи Telegram мӯҳлаташ гузаштааст',                                          'eng' => 'Expired Telegram auth data',                                   'ru' => 'Данные авторизации Telegram устарели']],
        self::OAUTH_INVALID_STATE            => ['http' => 400, 'messages' => ['tj' => 'Ҳолат нодуруст ё мӯҳлаташ гузаштааст',                                                    'eng' => 'Invalid or expired state',                                     'ru' => 'Недействительное или истёкшее состояние']],
        self::OAUTH_CODE_STATE_REQUIRED      => ['http' => 400, 'messages' => ['tj' => 'code ва state зарур аст',                                                                  'eng' => 'code and state are required',                                  'ru' => 'code и state обязательны']],
        self::OAUTH_INVALID_SIGNATURE        => ['http' => 400, 'messages' => ['tj' => 'Имзои Telegram нодуруст аст',                                                              'eng' => 'Invalid Telegram signature',                                   'ru' => 'Неверная подпись Telegram']],
        self::OAUTH_CODE_EXCHANGE_FAILED     => ['http' => 400, 'messages' => ['tj' => 'Мубодилаи код бо провайдер ноком шуд',                                                     'eng' => 'Failed to exchange code with the OAuth provider',               'ru' => 'Не удалось обменять код с провайдером']],
        self::OAUTH_UNVERIFIED_EMAIL         => ['http' => 400, 'messages' => ['tj' => 'Почтаи электронӣ аз ҷониби провайдер тасдиқ нашудааст',                                    'eng' => 'Email is not verified by the OAuth provider',                   'ru' => 'Email не подтверждён провайдером']],
    ];

    public function __construct(
        public readonly string $code,
        public readonly string $message,
        public readonly int    $http,
    ) {}

    public static function get(string $code, ?string $locale = null): self
    {
        $data   = self::REGISTRY[$code] ?? throw new InvalidArgumentException("Unknown error code: $code");
        $locale = $locale ?? self::$locale;
        return new self($code, $data['messages'][$locale] ?? $data['messages']['eng'], $data['http']);
    }

    /** @return self[] */
    public static function all(?string $locale = null): array
    {
        $locale = $locale ?? self::$locale;
        return array_map(
            static fn(string $code, array $data) => new self($code, $data['messages'][$locale] ?? $data['messages']['eng'], $data['http']),
            array_keys(self::REGISTRY),
            self::REGISTRY,
        );
    }
}

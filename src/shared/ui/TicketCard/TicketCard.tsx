import styles from './TicketCard.module.scss';
import { useTranslation } from 'react-i18next';
import { useLanguageChange } from '../../../hooks/useLanguageChange';
import { useTranslatedName } from '../../../hooks/useTranslatedName';
import { useTranslatedText } from '../../../hooks/useTranslatedText';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useFavorites } from '../useFavorites';
import { ROUTES } from '../../../app/routers/routes';
import { truncateText } from '../../../utils/textHelper';
// Re-export for backward compatibility (other files import truncateText from TicketCard)
export { truncateText };

interface AnnouncementCardProps {
  title: string;
  description: string;
  price: number;
  unit: string;
  address: string;
  date: string; // Может быть как отформатированная дата, так и ISO строка
  author: string;
  authorId?: number;
  category?: string;
  subcategory?: string;
  timeAgo?: string; // Может быть как отформатированное время, так и ISO строка
  ticketType?: string | boolean; // Принимаем либо строку, либо boolean
  userRole?: 'client' | 'master' | null; // Добавляем userRole для условного отображения
  onClick?: () => void;
  // Пропсы для избранного - внешнее управление
  isFavorite?: boolean;
  onFavoriteClick?: (e: React.MouseEvent) => void;
  isLikeLoading?: boolean;
  // Пропсы для избранного - внутреннее управление
  ticketId?: number;
  useManagedFavorites?: boolean;
  // Новые пропсы для рейтинга и отзывов
  userRating?: number;
  userReviewCount?: number;
  // Новые пропсы для редактирования и активности (MyTickets)
  showEditButton?: boolean;
  onEditClick?: (e: React.MouseEvent) => void;
  showActiveToggle?: boolean;
  isActive?: boolean;
  onActiveToggle?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

// truncateText moved to src/utils/textHelper.ts
// Re-exported above for backward compatibility

// Функция для получения правильного падежа в русском языке
const getRussianPlural = (number: number, forms: [string, string, string]): string => {
  const cases = [2, 0, 1, 1, 1, 2];
  return forms[number % 100 > 4 && number % 100 < 20 ? 2 : cases[number % 10 < 5 ? number % 10 : 5]];
};

// Универсальная функция для форматирования даты с переводами
export const formatLocalizedDate = (dateString: string, t: any): string => {
  try {
    if (!dateString) return 'Дата не указана';
    
    // Проверяем, является ли строка ISO форматом или числовым timestamp
    const date = new Date(dateString);
    
    // Если дата невалидна
    if (isNaN(date.getTime())) {
      return dateString; // возвращаем как есть
    }
    
    // Проверяем, содержит ли строка уже переведенные названия месяцев (но не ISO символы)
    const hasTranslatedMonth = /\b(январ|феврал|март|апрел|май|июн|июл|август|сентябр|октябр|ноябр|декабр|january|february|march|april|may|june|july|august|september|october|november|december|декабри|январи|феврали|марти|апрели|маи|июни|июли|августи|сентябри|октябри|ноябри)\w*/i.test(dateString);
    
    if (hasTranslatedMonth) {
      return dateString; // уже отформатировано
    }
    
    const months = t('time.months', { returnObjects: true }) as string[] || [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    
    return `${day} ${month} ${year}`;
  } catch {
    return dateString; // в случае ошибки возвращаем исходную строку
  }
};
export const getTimeAgo = (dateString: string, t: any): string => {
  try {
    if (!dateString) return t('time.recentlyAgo');
    
    const date = new Date(dateString);
    
    // Проверяем, что дата валидна
    if (isNaN(date.getTime())) {
      console.warn('Invalid date passed to getTimeAgo:', dateString);
      return t('time.recentlyAgo');
    }
    
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    // Защита от отрицательных значений (даты из будущего)
    if (diffInSeconds < 0) {
      return t('time.justNow');
    }
    
    if (diffInSeconds < 60) return t('time.justNow');
    
    if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      if (minutes === 1) {
        return t('time.minuteAgo');
      } else if (minutes < 5) {
        return t('time.minutesAgo', { count: minutes });
      } else {
        return t('time.minutesPluralAgo', { count: minutes });
      }
    }
    
    if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      if (hours === 1) {
        return t('time.hourAgo');
      } else if (hours < 5) {
        return t('time.hoursAgo', { count: hours });
      } else {
        return t('time.hoursPluralAgo', { count: hours });
      }
    }
    
    const days = Math.floor(diffInSeconds / 86400);
    if (days === 1) {
      return t('time.dayAgo');
    } else if (days < 5) {
      return t('time.daysAgo', { count: days });
    } else {
      return t('time.daysPluralAgo', { count: days });
    }
  } catch (error) {
    console.warn('Error in getTimeAgo:', error, 'for date:', dateString);
    return t('time.recentlyAgo');
  }
};

export function TicketCard({
  title,
  description,
  price,
  unit,
  address,
  date,
  author,
  authorId,
  category,
  subcategory,
  timeAgo,
  ticketType,
  onClick,
  isFavorite: externalIsFavorite,
  onFavoriteClick: externalOnFavoriteClick,
  isLikeLoading: externalIsLikeLoading,
  ticketId,
  useManagedFavorites,
  userRating,
  userReviewCount,
  showEditButton = false,
  onEditClick,
  showActiveToggle = false,
  isActive = true,
  onActiveToggle
}: AnnouncementCardProps) {
  const { t, i18n } = useTranslation('components');
  const [, forceUpdate] = useState({});
  
  // Транслитерация имени автора (автоопределение языка)
  const translatedAuthor = useTranslatedName(author);
  
  // Перевод заголовка и описания тикета
  const translatedTitle = useTranslatedText(title, 'ru');
  const translatedDescription = useTranslatedText(description, 'ru');
  
  // Автоматически включаем управляемое состояние, если передан ticketId и не задано явно useManagedFavorites
  const shouldUseManagedFavorites = useManagedFavorites !== undefined ? useManagedFavorites : !!ticketId;
  
  // Используем внутреннее управление избранным если включено
  const managedFavorites = useFavorites({
    itemId: ticketId || 0,
    itemType: 'ticket',
    onSuccess: () => console.log('🎉 Favorite action successful'),
    onError: (message) => console.error('❌ Favorite action error:', message)
  });

  // Проверяем статус избранного при монтировании если используем управляемое состояние
  useEffect(() => {
    if (shouldUseManagedFavorites && ticketId) {
      managedFavorites.checkFavoriteStatus();
    }
  }, [shouldUseManagedFavorites, ticketId]);

  // Выбираем источник данных для избранного
  const isFavorite = shouldUseManagedFavorites ? managedFavorites.isLiked : (externalIsFavorite || false);
  const isLikeLoading = shouldUseManagedFavorites ? managedFavorites.isLikeLoading : (externalIsLikeLoading || false);

  const handleFavoriteClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isLikeLoading) return;
    if (shouldUseManagedFavorites) {
      managedFavorites.handleLikeClick();
    } else if (externalOnFavoriteClick) {
      externalOnFavoriteClick(e as React.MouseEvent);
    }
  };

  const onFavoriteClick = handleFavoriteClick;
  
  // Хук для реактивного обновления переводов
  useLanguageChange(() => {
    // Принудительно обновляем компонент при смене языка
    forceUpdate({});
  });

  // Форматируем дату с переводами
  const formattedDate = formatLocalizedDate(date, t);
  
  // Форматируем время с переводами
  const formattedTimeAgo = timeAgo ? getTimeAgo(timeAgo, t) : undefined;

  // Унифицированная функция для определения типа тикета и его перевода
  const getTicketTypeDisplay = (): string | null => {
    if (typeof ticketType === 'boolean') {
      // Для boolean (как в Recommendations): true = услуга от мастера, false = заказ от клиента
      return ticketType ? t('ticketTypes.serviceFromMaster') : t('ticketTypes.orderFromClient');
    } else if (typeof ticketType === 'string') {
      // Для строк (как в Category и Favorites)
      if (ticketType === 'master' || ticketType === 'Услуга от мастера') {
        return t('ticketTypes.serviceFromMaster');
      } else if (ticketType === 'client' || ticketType === 'Заказ от клиента') {
        return t('ticketTypes.orderFromClient');
      }
      // Если уже переведенная строка, возвращаем как есть
      return ticketType;
    }
    
    return null;
  };

  const displayTicketType = getTicketTypeDisplay();

  return (
    <div className={styles.card} onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div className={styles.card_top_controls}>
        {displayTicketType && (
          <div className={styles.card_ticketType}>
            {displayTicketType}
          </div>
        )}
        <div className={styles.card_top_actions}>
          {showActiveToggle && (
            <div
              className={styles.card_active_toggle}
              onClick={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
            >
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={onActiveToggle}
                />
                <span className={styles.slider}></span>
              </label>
              <span className={styles.toggle_label}>
                {isActive ? 'Активно' : 'Неактивно'}
              </span>
            </div>
          )}
          {showEditButton && (
            <button
              className={styles.card_edit_button}
              onClick={onEditClick}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); if (onEditClick) onEditClick(e as unknown as React.MouseEvent); }}
              title="Редактировать"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7.2302 20.59L2.4502 21.59L3.4502 16.81L17.8902 2.29001C18.1407 2.03889 18.4385 1.83982 18.7663 1.70424C19.0941 1.56865 19.4455 1.49925 19.8002 1.50001C20.5163 1.50001 21.203 1.78447 21.7094 2.29082C22.2157 2.79717 22.5002 3.48392 22.5002 4.20001C22.501 4.55474 22.4315 4.90611 22.296 5.23391C22.1604 5.56171 21.9613 5.85945 21.7102 6.11001L7.2302 20.59Z" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                <path d="M0.549805 22.5H23.4498" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
                <path d="M19.6403 8.17986L15.8203 4.35986" stroke="#3A54DA" strokeWidth="2" strokeMiterlimit="10"/>
              </svg>
            </button>
          )}
          <button
            className={styles.card_favorite_button}
            onClick={onFavoriteClick}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={onFavoriteClick}
            disabled={isLikeLoading}
            title={isFavorite ? t('removeFavorite') : t('addFavorite')}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M16.77 2.45C15.7961 2.47092 14.8444 2.74461 14.0081 3.24424C13.1719 3.74388 12.4799 4.45229 12 5.3C11.5201 4.45229 10.8281 3.74388 9.99186 3.24424C9.15563 2.74461 8.2039 2.47092 7.23 2.45C4.06 2.45 1.5 5.3 1.5 8.82C1.5 15.18 12 21.55 12 21.55C12 21.55 22.5 15.18 22.5 8.82C22.5 5.3 19.94 2.45 16.77 2.45Z"
                fill={isFavorite ? "#3A54DA" : "none"}
                stroke="#3A54DA"
                strokeWidth="2"
                strokeMiterlimit="10"
              />
            </svg>
          </button>
        </div>
      </div>
      <div className={`${styles.card_header} ${displayTicketType ? styles.with_ticket_type : ''}`}>
        <h3>{truncateText(translatedTitle, 27)}</h3>
        <span className={styles.card_price}>{price.toLocaleString('ru-RU')} TJS, {unit}</span>
      </div>

      <p className={styles.card_description}>{truncateText(translatedDescription)}</p>

      <div className={styles.card_details}>
        <span className={styles.card_address}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="#3A54DA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="12" cy="9" r="2.5" stroke="#3A54DA" strokeWidth="2"/>
          </svg>
          {address}
        </span>
        <span className={styles.card_date}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 8h18M21 6v14H3V6h18zM16 2v4M8 2v4" stroke="#3A54DA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {formattedDate}
        </span>
      </div>

      <div className={styles.card_footer}>
        <div className={styles.card_author_section}>
          {authorId ? (
            <Link
              to={ROUTES.PROFILE_BY_ID(authorId)}
              className={styles.card_author}
              onClick={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g clipPath="url(#clip0_auth)">
                  <g clipPath="url(#clip1_auth)">
                    <path d="M11.9995 12.9795C15.1641 12.9795 17.7295 10.4141 17.7295 7.24953C17.7295 4.08494 15.1641 1.51953 11.9995 1.51953C8.83494 1.51953 6.26953 4.08494 6.26953 7.24953C6.26953 10.4141 8.83494 12.9795 11.9995 12.9795Z" stroke="#5D5D5D" strokeWidth="2" strokeMiterlimit="10"/>
                    <path d="M1.5 23.48L1.87 21.43C2.3071 19.0625 3.55974 16.9229 5.41031 15.3828C7.26088 13.8428 9.59246 12.9997 12 13C14.4104 13.0006 16.7443 13.8465 18.5952 15.3905C20.4462 16.9345 21.6971 19.0788 22.13 21.45L22.5 23.5" stroke="#5D5D5D" strokeWidth="2" strokeMiterlimit="10"/>
                  </g>
                </g>
                <defs>
                  <clipPath id="clip0_auth">
                    <rect width="24" height="24" fill="white"/>
                  </clipPath>
                  <clipPath id="clip1_auth">
                    <rect width="24" height="24" fill="white"/>
                  </clipPath>
                </defs>
              </svg>
              {translatedAuthor}
            </Link>
          ) : (
            <span className={styles.card_author}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g clipPath="url(#clip0_auth)">
                  <g clipPath="url(#clip1_auth)">
                    <path d="M11.9995 12.9795C15.1641 12.9795 17.7295 10.4141 17.7295 7.24953C17.7295 4.08494 15.1641 1.51953 11.9995 1.51953C8.83494 1.51953 6.26953 4.08494 6.26953 7.24953C6.26953 10.4141 8.83494 12.9795 11.9995 12.9795Z" stroke="#5D5D5D" strokeWidth="2" strokeMiterlimit="10"/>
                    <path d="M1.5 23.48L1.87 21.43C2.3071 19.0625 3.55974 16.9229 5.41031 15.3828C7.26088 13.8428 9.59246 12.9997 12 13C14.4104 13.0006 16.7443 13.8465 18.5952 15.3905C20.4462 16.9345 21.6971 19.0788 22.13 21.45L22.5 23.5" stroke="#5D5D5D" strokeWidth="2" strokeMiterlimit="10"/>
                  </g>
                </g>
                <defs>
                  <clipPath id="clip0_auth">
                    <rect width="24" height="24" fill="white"/>
                  </clipPath>
                  <clipPath id="clip1_auth">
                    <rect width="24" height="24" fill="white"/>
                  </clipPath>
                </defs>
              </svg>
              {translatedAuthor}
            </span>
          )}
          {(userRating !== undefined) && (
            <div className={styles.card_rating}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#FFD700" stroke="#FFD700" strokeWidth="1"/>
              </svg>
              <span className={styles.rating_value}>{(userRating || 0).toFixed(1)}</span>
            </div>
          )}
          {(userReviewCount !== undefined) && (
            <div className={styles.card_reviews}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 9C7 7.89543 7.89543 7 9 7H15C16.1046 7 17 7.89543 17 9V13C17 14.1046 16.1046 15 15 15H12.4142L9.70711 17.7071C9.31658 18.0976 8.68342 18.0976 8.29289 17.7071C8.10536 17.5196 8 17.2652 8 17V15H9C7.89543 15 7 14.1046 7 13V9Z" stroke="#3A54DA" strokeWidth="2"/>
              </svg>
              <span className={styles.reviews_count}>
                {userReviewCount || 0} {
                  i18n.language === 'ru' 
                    ? getRussianPlural(userReviewCount || 0, [t('time.reviewsOne'), t('time.reviewsFew'), t('time.reviewsMany')])
                    : (userReviewCount || 0) === 1 ? t('time.reviewsOne') : t('time.reviewsMany')
                }
              </span>
            </div>
          )}
        </div>
        <div className={styles.card_footer_right}>
          <div className={styles.card_categories}>
            {category && <span className={styles.card_category}>{truncateText(category, 30)}</span>}
            {subcategory && <span className={styles.card_subcategory}>{truncateText(subcategory, 30)}</span>}
          </div>
          {formattedTimeAgo && <span className={styles.card_timeAgo}>{formattedTimeAgo}</span>}
        </div>
      </div>
    </div>
  );
}

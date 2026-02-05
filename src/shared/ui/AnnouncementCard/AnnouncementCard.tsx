import styles from './AnnouncementCard.module.scss';
import { useTranslation } from 'react-i18next';
import { useLanguageChange } from '../../../hooks/useLanguageChange';
import { useState } from 'react';

interface AnnouncementCardProps {
  title: string;
  description: string;
  price: number;
  unit: string;
  address: string;
  date: string; // Может быть как отформатированная дата, так и ISO строка
  author: string;
  category?: string;
  timeAgo?: string; // Может быть как отформатированное время, так и ISO строка
  ticketType?: string | boolean; // Принимаем либо строку, либо boolean
  userRole?: 'client' | 'master' | null; // Добавляем userRole для условного отображения
  onClick?: () => void;
  // Новые пропсы для избранного
  showFavoriteButton?: boolean;
  isFavorite?: boolean;
  onFavoriteClick?: (e: React.MouseEvent) => void;
  isLikeLoading?: boolean;
  // Новые пропсы для рейтинга и отзывов
  userRating?: number;
  userReviewCount?: number;
}

export const truncateText = (text: string, maxLength: number = 110): string => {
  if (text.length > maxLength) {
    return text.slice(0, maxLength) + '...';
  }
  return text;
};

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

export function AnnouncementCard({
  title,
  description,
  price,
  unit,
  address,
  date,
  author,
  category,
  timeAgo,
  ticketType,
  onClick,
  showFavoriteButton = false,
  isFavorite = false,
  onFavoriteClick,
  isLikeLoading = false,
  userRating,
  userReviewCount
}: AnnouncementCardProps) {
  const { t, i18n } = useTranslation('components');
  const [, forceUpdate] = useState({});
  
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
      // Для строк (как в CategoryTickets и Favorites)
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
      {displayTicketType && (
        <div className={styles.card_ticketType}>
          {displayTicketType}
        </div>
      )}
      <div className={`${styles.card_header} ${displayTicketType ? styles.with_ticket_type : ''}`}>
        <h3>{truncateText(title, 27)}</h3>
        <div className={styles.card_price_container}>
          <span className={styles.card_price}>{price.toLocaleString('ru-RU')} TJS, {unit}</span>
          {showFavoriteButton && (
            <button
              className={styles.card_favorite_button}
              onClick={onFavoriteClick}
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
          )}
        </div>
      </div>

      <p className={styles.card_description}>{truncateText(description)}</p>

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
            {author}
          </span>
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
          {category && <span className={styles.card_category}>{category}</span>}
          {formattedTimeAgo && <span className={styles.card_timeAgo}>{formattedTimeAgo}</span>}
        </div>
      </div>
    </div>
  );
}

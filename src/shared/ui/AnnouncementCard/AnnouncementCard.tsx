import styles from './AnnouncementCard.module.scss';
import { useTranslation } from 'react-i18next';

interface AnnouncementCardProps {
  title: string;
  description: string;
  price: number;
  unit: string;
  address: string;
  date: string;
  author: string;
  category?: string;
  timeAgo?: string;
  ticketType?: string;
  onClick?: () => void;
  // Новые пропсы для избранного
  showFavoriteButton?: boolean;
  isFavorite?: boolean;
  onFavoriteClick?: (e: React.MouseEvent) => void;
  isLikeLoading?: boolean;
}

export const truncateText = (text: string, maxLength: number = 110): string => {
  if (text.length > maxLength) {
    return text.slice(0, maxLength) + '...';
  }
  return text;
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
  isLikeLoading = false
}: AnnouncementCardProps) {
  const { t } = useTranslation('components');

  // Функция для перевода типа тикета
  const getTranslatedTicketType = (ticketType: string): string => {
    if (ticketType === 'Услуга от мастера') {
      return t('ticketTypes.serviceFromMaster');
    } else if (ticketType === 'Заказ от клиента') {
      return t('ticketTypes.orderFromClient');
    }
    return ticketType; // Возвращаем как есть, если не найдено соответствие
  };

  return (
    <div className={styles.card} onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      {ticketType && (
        <div className={styles.card_ticketType}>
          {getTranslatedTicketType(ticketType)}
        </div>
      )}
      <div className={`${styles.card_header} ${ticketType ? styles.with_ticket_type : ''}`}>
        <h3>{truncateText(title, 27)}</h3>
        <div className={styles.card_price_container}>
          <span className={styles.card_price}>{price.toLocaleString('ru-RU')} TJS, {unit}</span>
          {showFavoriteButton && (
            <button
              className={styles.card_favorite_button}
              onClick={onFavoriteClick}
              disabled={isLikeLoading}
              title={isFavorite ? "Удалить из избранного" : "Добавить в избранное"}
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
          {date}
        </span>
      </div>

      <div className={styles.card_footer}>
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
        <div className={styles.card_footer_right}>
          {category && <span className={styles.card_category}>{category}</span>}
          {timeAgo && <span className={styles.card_timeAgo}>{timeAgo}</span>}
        </div>
      </div>
    </div>
  );
}

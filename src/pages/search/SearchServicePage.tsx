import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './SearchServicePage.module.scss';

interface Service {
    id: number;
    title: string;
    description: string;
    budget: number;
    active: boolean;
}

const SearchServicePage = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [services, setServices] = useState<Service[]>([]);
    const [selectedService, setSelectedService] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);

    const fetchServices = async (query: string) => {
        try {
            setLoading(true);
            const response = await fetch(`https://admin.ustoyob.tj/api/tickets/masters`);

            if (!response.ok) {
                throw new Error('Failed to fetch services');
            }

            const data = await response.json();

            // Фильтруем услуги по поисковому запросу
            const filteredServices = data.filter((service: Service) =>
                service.title.toLowerCase().includes(query.toLowerCase())
            );

            setServices(filteredServices);
            setShowResults(true);
        } catch (error) {
            console.error('Error fetching services:', error);
            setServices([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            fetchServices(searchQuery);
        }
    };

    const handleServiceSelect = (serviceId: number) => {
        setSelectedService(serviceId);
    };

    const handleContinue = () => {
        if (selectedService) {
            // Переходим к созданию заказа с выбранной услугой
            navigate('/create-ad', {
                state: {
                    selectedService: services.find(s => s.id === selectedService)
                }
            });
        }
    };

    const handleAddCustomService = () => {
        // Переходим к созданию заказа без выбранной услуги
        navigate('/create-ad');
    };

    const handleClose = () => {
        navigate(-1);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchQuery(value);

        // Сбрасываем результаты если поле очищено
        if (!value.trim()) {
            setShowResults(false);
            setServices([]);
            setSelectedService(null);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Начните поиск заказа</h1>
                <button className={styles.closeButton} onClick={handleClose}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <g clipPath="url(#clip0_117_2375)">
                            <g clipPath="url(#clip1_117_2375)">
                                <path d="M12 22.5C17.799 22.5 22.5 17.799 22.5 12C22.5 6.20101 17.799 1.5 12 1.5C6.20101 1.5 1.5 6.20101 1.5 12C1.5 17.799 6.20101 22.5 12 22.5Z" stroke="#101010" strokeWidth="2" strokeMiterlimit="10"/>
                                <path d="M16.7705 7.23047L7.23047 16.7705" stroke="#101010" strokeWidth="2" strokeMiterlimit="10"/>
                                <path d="M7.23047 7.23047L16.7705 16.7705" stroke="#101010" strokeWidth="2" strokeMiterlimit="10"/>
                            </g>
                        </g>
                        <defs>
                            <clipPath id="clip0_117_2375">
                                <rect width="24" height="24" fill="white"/>
                            </clipPath>
                            <clipPath id="clip1_117_2375">
                                <rect width="24" height="24" fill="white"/>
                            </clipPath>
                        </defs>
                    </svg>
                </button>
            </div>

            <form onSubmit={handleSearch} className={styles.searchForm}>
                <input
                    id="serviceSearch"
                    type="text"
                    value={searchQuery}
                    onChange={handleInputChange}
                    placeholder="Введите название услуги или специалиста"
                    className={styles.searchInput}
                    autoFocus
                />
                <button
                    type="submit"
                    className={styles.searchButton}
                    disabled={!searchQuery.trim()}
                >
                    Найти
                </button>
            </form>

            {/* Результаты поиска */}
            {showResults && (
                <div className={styles.resultsSection}>
                    {loading ? (
                        <div className={styles.loading}>Загрузка...</div>
                    ) : (
                        <>
                            <div className={styles.servicesList}>
                                {services.map((service) => (
                                    <div
                                        key={service.id}
                                        className={`${styles.serviceItem} ${
                                            selectedService === service.id ? styles.selected : ''
                                        }`}
                                        onClick={() => handleServiceSelect(service.id)}
                                    >
                                        <div className={styles.serviceRadio}>
                                            <div className={styles.radioCircle}>
                                                {selectedService === service.id && <div className={styles.radioDot} />}
                                            </div>
                                        </div>
                                        <div className={styles.serviceContent}>
                                            <h3 className={styles.serviceTitle}>{service.title}</h3>
                                            {service.description && (
                                                <p className={styles.serviceDescription}>{service.description}</p>
                                            )}
                                            {service.budget > 0 && (
                                                <p className={styles.serviceBudget}>Бюджет: {service.budget} ₽</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {services.length === 0 && (
                                <div className={styles.noResults}>
                                    <p>По запросу "{searchQuery}" ничего не найдено</p>
                                </div>
                            )}

                            {/* Кнопка добавления своей услуги */}
                            <div className={styles.addCustomService}>
                                <button
                                    className={styles.addCustomButton}
                                    onClick={handleAddCustomService}
                                >
                                    Не нашли услугу? Добавьте свою
                                </button>
                            </div>

                            {/* Нижняя панель с кнопками */}
                            <div className={styles.footer}>
                                <button className={styles.closeBtn} onClick={handleClose}>
                                    Закрыть
                                </button>
                                <button
                                    className={styles.continueBtn}
                                    onClick={handleContinue}
                                    disabled={!selectedService}
                                >
                                    Продолжить
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchServicePage;
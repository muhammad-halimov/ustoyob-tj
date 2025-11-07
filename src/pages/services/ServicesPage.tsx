import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../profile/ProfilePage.module.scss';

interface Service {
    id: string;
    name: string;
    price: string;
}

// Тестовые услуги (в будущем будут с сервера)
const defaultServices = [
    { id: '1', name: 'Консультация', price: '1500' },
    { id: '2', name: 'Диагностика', price: '2000' },
    { id: '3', name: 'Лечение', price: '3500' },
    { id: '4', name: 'Профилактика', price: '1200' },
    { id: '5', name: 'Экстренная помощь', price: '5000' }
];

function ServicesPage() {
    const navigate = useNavigate();
    const [selectedServices, setSelectedServices] = useState<Service[]>([]);
    const [customServices, setCustomServices] = useState<Service[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredServices = defaultServices.filter(service =>
        service.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleServiceToggle = (service: Service) => {
        const isSelected = selectedServices.some(s => s.id === service.id);
        if (isSelected) {
            setSelectedServices(prev => prev.filter(s => s.id !== service.id));
        } else {
            setSelectedServices(prev => [...prev, service]);
        }
    };

    const handleAddCustomService = () => {
        const newService: Service = {
            id: `custom-${Date.now()}`,
            name: '',
            price: ''
        };
        setCustomServices(prev => [...prev, newService]);
    };

    const handleCustomServiceChange = (id: string, field: keyof Service, value: string) => {
        if (field === 'price') {
            const numericValue = value.replace(/[^\d]/g, '');
            setCustomServices(prev =>
                prev.map(service =>
                    service.id === id ? { ...service, [field]: numericValue } : service
                )
            );
        } else {
            setCustomServices(prev =>
                prev.map(service =>
                    service.id === id ? { ...service, [field]: value } : service
                )
            );
        }
    };

    const handleSave = () => {
        const incompleteCustomServices = customServices.filter(
            service => !service.name.trim() || !service.price.trim()
        );

        if (incompleteCustomServices.length > 0) {
            alert('Пожалуйста, заполните все добавленные услуги');
            return;
        }

        const allServices = [
            ...selectedServices,
            ...customServices.filter(s => s.name.trim() && s.price.trim())
        ];

        console.log('Сохраненные услуги:', allServices);
        navigate('/profile');
    };

    const handleCancel = () => {
        if (selectedServices.length > 0 || customServices.some(s => s.name || s.price)) {
            const confirmCancel = window.confirm(
                'У вас есть несохраненные изменения. Вы уверены, что хотите выйти?'
            );
            if (confirmCancel) {
                navigate('/profile');
            }
        } else {
            navigate('/profile');
        }
    };

    return (
        <div className={styles.profile}>
            <div className={styles.profile_wrap}>
                <div className={styles.page_header}>
                    <button
                        className={styles.back_button}
                        onClick={handleCancel}
                    >
                        ← Назад
                    </button>
                    <h1>Редактируйте Услуги и цены</h1>
                </div>

                <div className={styles.services_edit_section}>
                    <h2 className={styles.services_section_title}>Услуги и цены</h2>

                    <div className={styles.search_container}>
                        <input
                            type="text"
                            placeholder="Поиск услуг..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={styles.search_input}
                        />
                    </div>

                    <div className={styles.services_list_edit}>
                        {filteredServices.map(service => (
                            <div key={service.id} className={styles.service_checkbox_item}>
                                <label className={styles.service_checkbox_label}>
                                    <input
                                        type="checkbox"
                                        checked={selectedServices.some(s => s.id === service.id)}
                                        onChange={() => handleServiceToggle(service)}
                                        className={styles.service_checkbox}
                                    />
                                    <span className={styles.service_checkbox_text}>
                                        {service.name}
                                    </span>
                                    <span className={styles.service_price_badge}>
                                        {service.price} ₽
                                    </span>
                                </label>
                            </div>
                        ))}
                    </div>

                    <div className={styles.custom_services_section}>
                        <h3 className={styles.custom_services_title}>Не нашли услугу? Добавьте свою</h3>
                        <div className={styles.custom_services_list}>
                            {customServices.map(service => (
                                <div key={service.id} className={styles.custom_service_item}>
                                    <input
                                        type="text"
                                        placeholder="Введите услугу"
                                        value={service.name}
                                        onChange={(e) => handleCustomServiceChange(service.id, 'name', e.target.value)}
                                        className={styles.custom_service_input}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Цена, ₽"
                                        value={service.price}
                                        onChange={(e) => handleCustomServiceChange(service.id, 'price', e.target.value)}
                                        className={styles.custom_price_input}
                                    />
                                </div>
                            ))}
                        </div>
                        <button
                            className={styles.add_custom_service_button}
                            onClick={handleAddCustomService}
                        >
                            + Добавить свою услугу
                        </button>
                    </div>

                    <div className={styles.services_actions}>
                        <button
                            className={styles.save_services_button}
                            onClick={handleSave}
                        >
                            Сохранить
                        </button>
                        <button
                            className={styles.cancel_services_button}
                            onClick={handleCancel}
                        >
                            Отмена
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ServicesPage;
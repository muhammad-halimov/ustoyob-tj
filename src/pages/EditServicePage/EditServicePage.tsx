import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getAuthToken } from '../../utils/auth';
import styles from './EditServicePage.module.scss';

interface ServiceData {
    id?: number;
    title: string;
    description: string;
    notice: string;
    budget: string;
    category?: { id: number; title: string };
    unit?: { id: number; title: string };
    addresses?: Array<{
        id: number;
        province?: { id: number; title: string };
        city?: { id: number; title: string };
        suburb?: { id: number; title: string };
        district?: { id: number; title: string };
        settlement?: { id: number; title: string };
        community?: { id: number; title: string };
        village?: { id: number; title: string };
    }>;
    images?: Array<{ id: number; image: string }>;
}

interface ImageData {
    id: number;
    image: string;
}

interface AddressData {
    province?: string;
    city?: string;
    suburb?: string;
    district?: string;
    settlement?: string;
    community?: string;
    village?: string;
}

interface Category {
    id: number;
    title: string;
    image?: string;
}

interface Unit {
    id: number;
    title: string;
}

interface Province {
    id: number;
    title: string;
}

interface City {
    id: number;
    title: string;
    image?: string;
    province: Province;
    suburbs: Suburb[];
}

interface District {
    id: number;
    title: string;
    image?: string;
    province: Province;
    settlements: Settlement[];
    communities: Community[];
}

interface Suburb {
    id: number;
    title: string;
}

interface Settlement {
    id: number;
    title: string;
    village: Village[];
}

interface Community {
    id: number;
    title: string;
}

interface Village {
    id: number;
    title: string;
}

const EditServicePage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [serviceData, setServiceData] = useState<ServiceData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [existingImages, setExistingImages] = useState<Array<{ id: number; image: string }>>([]);
    const [newImages, setNewImages] = useState<File[]>([]);

    // Данные для формы
    const [categories, setCategories] = useState<Category[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [provinces, setProvinces] = useState<Province[]>([]);
    const [cities, setCities] = useState<City[]>([]);
    const [districts, setDistricts] = useState<District[]>([]);

    // Выбранные значения
    const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
    const [selectedUnit, setSelectedUnit] = useState<number | null>(null);
    const [selectedProvinceId, setSelectedProvinceId] = useState<number | null>(null);
    const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
    const [selectedSuburbIds, setSelectedSuburbIds] = useState<number[]>([]);
    const [selectedDistrictIds, setSelectedDistrictIds] = useState<number[]>([]);
    const [selectedSettlementId, setSelectedSettlementId] = useState<number | null>(null);
    const [selectedCommunityId, setSelectedCommunityId] = useState<number | null>(null);
    const [selectedVillageId, setSelectedVillageId] = useState<number | null>(null);

    const [manualAddress, setManualAddress] = useState<string>('');

    const API_BASE_URL = 'https://admin.ustoyob.tj';

    useEffect(() => {
        // Загружаем данные для формы
        fetchCategories();
        fetchUnits();
        fetchProvinces();
        fetchCities();
        fetchDistricts();

        if (location.state?.serviceData) {
            const data = location.state.serviceData;
            setServiceData(data);
            setSelectedCategory(data.category?.id || null);
            setSelectedUnit(data.unit?.id || null);
            setExistingImages(data.images || []);

            // Инициализируем адресные данные
            if (data.addresses && data.addresses.length > 0) {
                const address = data.addresses[0];
                if (address.province) {
                    setSelectedProvinceId(address.province.id);
                }
                if (address.city) {
                    setSelectedCityId(address.city.id);
                }
                if (address.suburb) {
                    setSelectedSuburbIds([address.suburb.id]);
                }
                if (address.district) {
                    setSelectedDistrictIds([address.district.id]);
                }
                // Другие поля адреса можно аналогично инициализировать
            }

            setIsLoading(false);
        } else {
            alert('Данные услуги не найдены');
            navigate(-1);
        }
    }, [location, navigate]);

    // Фильтрованные данные
    const citiesInSelectedProvince = selectedProvinceId
        ? cities.filter(city => city.province.id === selectedProvinceId)
        : [];

    const selectedCity = selectedCityId
        ? cities.find(city => city.id === selectedCityId)
        : null;

    const suburbsInSelectedCity = selectedCity
        ? selectedCity.suburbs || []
        : [];

    const districtsInSelectedProvince = selectedProvinceId
        ? districts.filter(district => district.province.id === selectedProvinceId)
        : [];

    const selectedDistrict = selectedDistrictIds.length > 0
        ? districts.find(d => d.id === selectedDistrictIds[0])
        : null;

    const settlementsInSelectedDistrict = selectedDistrict
        ? selectedDistrict.settlements || []
        : [];

    const communitiesInSelectedDistrict = selectedDistrict
        ? selectedDistrict.communities || []
        : [];

    const selectedSettlement = selectedSettlementId
        ? settlementsInSelectedDistrict.find(s => s.id === selectedSettlementId)
        : null;

    const villagesInSelectedSettlement = selectedSettlement
        ? selectedSettlement.village || []
        : [];

    // Функции загрузки данных
    const fetchCategories = async () => {
        try {
            const token = getAuthToken();
            const response = await fetch(`${API_BASE_URL}/api/categories`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                }
            });
            if (response.ok) {
                const data = await response.json();
                setCategories(data);
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const fetchUnits = async () => {
        try {
            const token = getAuthToken();
            const response = await fetch(`${API_BASE_URL}/api/units`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                }
            });
            if (response.ok) {
                const data = await response.json();
                setUnits(data);
            }
        } catch (error) {
            console.error('Error fetching units:', error);
        }
    };

    const fetchProvinces = async () => {
        try {
            const token = getAuthToken();
            const response = await fetch(`${API_BASE_URL}/api/provinces`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                }
            });
            if (response.ok) {
                const data = await response.json();
                setProvinces(data);
            }
        } catch (error) {
            console.error('Error fetching provinces:', error);
        }
    };

    const fetchCities = async () => {
        try {
            const token = getAuthToken();
            const response = await fetch(`${API_BASE_URL}/api/cities`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                }
            });
            if (response.ok) {
                const data = await response.json();
                setCities(data);
            }
        } catch (error) {
            console.error('Error fetching cities:', error);
        }
    };

    const fetchDistricts = async () => {
        try {
            const token = getAuthToken();
            const response = await fetch(`${API_BASE_URL}/api/districts`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                }
            });
            if (response.ok) {
                const data = await response.json();
                setDistricts(data);
            }
        } catch (error) {
            console.error('Error fetching districts:', error);
        }
    };

    // Обработчики выбора
    const handleProvinceSelect = (provinceId: number) => {
        setSelectedProvinceId(provinceId);
        setSelectedCityId(null);
        setSelectedSuburbIds([]);
        setSelectedDistrictIds([]);
        setSelectedSettlementId(null);
        setSelectedCommunityId(null);
        setSelectedVillageId(null);
    };

    const handleCitySelect = (cityId: number) => {
        setSelectedCityId(cityId);
        setSelectedSuburbIds([]);
    };

    const handleSuburbSelect = (suburbId: number) => {
        setSelectedSuburbIds(prev =>
            prev.includes(suburbId)
                ? prev.filter(id => id !== suburbId)
                : [suburbId]
        );
    };

    const handleDistrictSelect = (districtId: number) => {
        setSelectedDistrictIds(prev =>
            prev.includes(districtId)
                ? prev.filter(id => id !== districtId)
                : [districtId]
        );
        setSelectedSettlementId(null);
        setSelectedCommunityId(null);
        setSelectedVillageId(null);
    };

    const handleSettlementSelect = (settlementId: number) => {
        setSelectedSettlementId(settlementId);
        setSelectedVillageId(null);
    };

    const handleCommunitySelect = (communityId: number) => {
        setSelectedCommunityId(communityId);
    };

    const handleVillageSelect = (villageId: number) => {
        setSelectedVillageId(villageId);
    };

    // Обработчики изображений
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setNewImages(prev => [...prev, ...newFiles]);
        }
    };

    const removeNewImage = (index: number) => {
        setNewImages(prev => prev.filter((_, i) => i !== index));
    };

    const removeExistingImage = async (imageId: number) => {
        if (!serviceData?.id) return;

        if (!confirm('Вы уверены, что хотите удалить это фото?')) return;

        try {
            const token = getAuthToken();
            if (!token) {
                alert('Необходима авторизация');
                return;
            }

            // Получаем текущий тикет
            const response = await fetch(`${API_BASE_URL}/api/tickets/${serviceData.id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                }
            });

            if (!response.ok) {
                throw new Error('Не удалось получить данные услуги');
            }

            const ticketData = await response.json();

            // Фильтруем изображения
            const updatedImages = ticketData.images.filter((img: ImageData) => img.id !== imageId);

            // Обновляем тикет
            const updateResponse = await fetch(`${API_BASE_URL}/api/tickets/${serviceData.id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/merge-patch+json',
                },
                body: JSON.stringify({
                    images: updatedImages
                }),
            });

            if (updateResponse.ok) {
                setExistingImages(prev => prev.filter(img => img.id !== imageId));
                alert('Фото успешно удалено');
            } else {
                throw new Error('Не удалось удалить фото');
            }
        } catch (error) {
            console.error('Error removing image:', error);
            alert('Ошибка при удалении фото');
        }
    };

    // Функция для создания данных адреса
    const buildAddressData = (): AddressData | null => {
        if (!selectedProvinceId) return null;

        const addressData: AddressData = {
            province: `/api/provinces/${selectedProvinceId}`,
        };

        if (selectedCityId) {
            addressData.city = `/api/cities/${selectedCityId}`;
        }

        if (selectedSuburbIds.length > 0) {
            addressData.suburb = `/api/districts/${selectedSuburbIds[0]}`;
        }

        if (selectedDistrictIds.length > 0) {
            addressData.district = `/api/districts/${selectedDistrictIds[0]}`;
        }

        if (selectedSettlementId) {
            addressData.settlement = `/api/settlements/${selectedSettlementId}`;
        }

        if (selectedCommunityId) {
            addressData.community = `/api/communities/${selectedCommunityId}`;
        }

        if (selectedVillageId) {
            addressData.village = `/api/villages/${selectedVillageId}`;
        }

        return addressData;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!serviceData?.id) return;

        // Валидация
        if (!serviceData.title.trim() || !serviceData.description.trim() || !serviceData.budget) {
            alert('Пожалуйста, заполните все обязательные поля');
            return;
        }

        if (!selectedCategory) {
            alert('Пожалуйста, выберите категорию');
            return;
        }

        if (!selectedProvinceId) {
            alert('Пожалуйста, выберите область');
            return;
        }

        if (!selectedCityId && selectedSuburbIds.length === 0 && selectedDistrictIds.length === 0) {
            alert('Пожалуйста, выберите город или район');
            return;
        }

        try {
            setIsSubmitting(true);
            const token = getAuthToken();

            if (!token) {
                alert('Необходима авторизация');
                return;
            }

            // Создаем данные адреса
            const addressData = buildAddressData();
            if (!addressData) {
                alert('Ошибка в данных адреса');
                return;
            }

            // Подготавливаем данные для обновления с правильными типами
            const updateData = {
                title: serviceData.title,
                description: serviceData.description,
                notice: serviceData.notice || "",
                budget: Number(serviceData.budget),
                service: true,
                active: true,
                category: `/api/categories/${selectedCategory}`,
                unit: selectedUnit ? `/api/units/${selectedUnit}` : null,
                addresses: [addressData]
            };

            console.log('Updating service with data:', updateData);

            const response = await fetch(`${API_BASE_URL}/api/tickets/${serviceData.id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/merge-patch+json',
                },
                body: JSON.stringify(updateData),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Update failed:', errorText);
                throw new Error('Ошибка при обновлении услуги');
            }

            const updatedService = await response.json();
            console.log('Service updated successfully:', updatedService);

            // Загружаем новые фото, если есть
            if (newImages.length > 0) {
                console.log('Uploading new images...');
                for (const image of newImages) {
                    const formData = new FormData();
                    formData.append('imageFile', image);

                    const uploadResponse = await fetch(`${API_BASE_URL}/api/tickets/${serviceData.id}/upload-photo`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                        },
                        body: formData,
                    });

                    if (!uploadResponse.ok) {
                        console.warn('Failed to upload image:', image.name);
                    } else {
                        console.log('Image uploaded successfully:', image.name);
                    }
                }
            }

            alert('Услуга успешно обновлена!');
            navigate('/profile');

        } catch (error) {
            console.error('Error updating service:', error);
            alert('Ошибка при обновлении услуги');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getImageUrl = (imagePath: string): string => {
        if (!imagePath) return '';
        if (imagePath.startsWith('http')) return imagePath;
        return `${API_BASE_URL}${imagePath}`;
    };

    if (isLoading) {
        return <div className={styles.loading}>Загрузка...</div>;
    }

    if (!serviceData) {
        return <div className={styles.error}>Услуга не найдена</div>;
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Редактирование услуги</h1>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
                {/* Название услуги */}
                <div className={styles.section}>
                    <h2>Название услуги</h2>
                    <div className={styles.serviceSection}>
                        <input
                            type="text"
                            name="title"
                            value={serviceData.title}
                            onChange={(e) => setServiceData({...serviceData, title: e.target.value})}
                            placeholder="Введите название услуги"
                            className={styles.titleInput}
                            required
                        />
                    </div>
                </div>

                {/* Категория */}
                <div className={styles.section}>
                    <h2>Категория</h2>
                    <div className={styles.categorySection}>
                        <select
                            value={selectedCategory || ''}
                            onChange={(e) => setSelectedCategory(Number(e.target.value))}
                            className={styles.categorySelect}
                            required
                        >
                            <option value="">Выберите категорию</option>
                            {categories.map(category => (
                                <option key={category.id} value={category.id}>
                                    {category.title}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Адрес */}
                <div className={styles.section}>
                    <h2>Адрес</h2>

                    {/* Область */}
                    <div className={styles.province_section}>
                        <h3>Выберите область</h3>
                        <div className={styles.province_grid}>
                            {provinces.map(province => (
                                <button
                                    type="button"
                                    key={province.id}
                                    className={`${styles.province_card} ${
                                        selectedProvinceId === province.id ? styles.province_card_selected : ''
                                    }`}
                                    onClick={() => handleProvinceSelect(province.id)}
                                >
                                    {province.title}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Город */}
                    {selectedProvinceId && (
                        <div className={styles.city_section}>
                            <h3>Выберите город</h3>
                            <div className={styles.city_grid}>
                                {citiesInSelectedProvince.map(city => (
                                    <button
                                        type="button"
                                        key={city.id}
                                        className={`${styles.city_card} ${
                                            selectedCityId === city.id ? styles.city_card_selected : ''
                                        }`}
                                        onClick={() => handleCitySelect(city.id)}
                                    >
                                        <div className={styles.city_name}>{city.title}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Районы города */}
                    {selectedCityId && suburbsInSelectedCity.length > 0 && (
                        <div className={styles.district_section}>
                            <h3>Выберите районы города {selectedCity?.title}</h3>
                            <div className={styles.district_grid}>
                                {suburbsInSelectedCity.map(suburb => (
                                    <button
                                        type="button"
                                        key={suburb.id}
                                        className={`${styles.district_card} ${
                                            selectedSuburbIds.includes(suburb.id) ? styles.district_card_selected : ''
                                        }`}
                                        onClick={() => handleSuburbSelect(suburb.id)}
                                    >
                                        <div className={styles.district_name}>{suburb.title}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Районы области */}
                    {selectedProvinceId && districtsInSelectedProvince.length > 0 && (
                        <div className={styles.district_section}>
                            <h3>Выберите районы области</h3>
                            <div className={styles.district_grid}>
                                {districtsInSelectedProvince.map(district => (
                                    <button
                                        type="button"
                                        key={district.id}
                                        className={`${styles.district_card} ${
                                            selectedDistrictIds.includes(district.id) ? styles.district_card_selected : ''
                                        }`}
                                        onClick={() => handleDistrictSelect(district.id)}
                                    >
                                        <div className={styles.district_name}>{district.title}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Поселения (если выбран район области) */}
                    {selectedDistrictIds.length > 0 && settlementsInSelectedDistrict.length > 0 && (
                        <div className={styles.settlement_section}>
                            <h3>Выберите поселение</h3>
                            <div className={styles.settlement_grid}>
                                {settlementsInSelectedDistrict.map(settlement => (
                                    <button
                                        type="button"
                                        key={settlement.id}
                                        className={`${styles.settlement_card} ${
                                            selectedSettlementId === settlement.id ? styles.settlement_card_selected : ''
                                        }`}
                                        onClick={() => handleSettlementSelect(settlement.id)}
                                    >
                                        <div className={styles.settlement_name}>{settlement.title}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Джамоаты */}
                    {selectedDistrictIds.length > 0 && communitiesInSelectedDistrict.length > 0 && (
                        <div className={styles.community_section}>
                            <h3>Выберите джамоат</h3>
                            <div className={styles.community_grid}>
                                {communitiesInSelectedDistrict.map(community => (
                                    <button
                                        type="button"
                                        key={community.id}
                                        className={`${styles.community_card} ${
                                            selectedCommunityId === community.id ? styles.community_card_selected : ''
                                        }`}
                                        onClick={() => handleCommunitySelect(community.id)}
                                    >
                                        <div className={styles.community_name}>{community.title}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Кишлаки */}
                    {selectedSettlementId && villagesInSelectedSettlement.length > 0 && (
                        <div className={styles.village_section}>
                            <h3>Выберите кишлак</h3>
                            <div className={styles.village_grid}>
                                {villagesInSelectedSettlement.map(village => (
                                    <button
                                        type="button"
                                        key={village.id}
                                        className={`${styles.village_card} ${
                                            selectedVillageId === village.id ? styles.village_card_selected : ''
                                        }`}
                                        onClick={() => handleVillageSelect(village.id)}
                                    >
                                        <div className={styles.village_name}>{village.title}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Ручной ввод адреса */}
                    <div className={styles.manual_address}>
                        <input
                            type="text"
                            value={manualAddress}
                            onChange={(e) => setManualAddress(e.target.value)}
                            placeholder="Дополнительная информация об адресе"
                            className={styles.address_input}
                        />
                    </div>
                </div>

                {/* Бюджет */}
                <div className={styles.section}>
                    <h2>Бюджет</h2>
                    <div className={styles.budgetSection}>
                        <div className={styles.budgetRow}>
                            <div className={styles.budgetField}>
                                <input
                                    type="number"
                                    name="budget"
                                    value={serviceData.budget}
                                    onChange={(e) => setServiceData({...serviceData, budget: e.target.value})}
                                    placeholder="0"
                                    className={styles.budgetInput}
                                    min="1"
                                    required
                                />
                            </div>
                            <div className={styles.budgetField}>
                                <select
                                    className={styles.unitSelect}
                                    value={selectedUnit || ''}
                                    onChange={(e) => setSelectedUnit(Number(e.target.value))}
                                >
                                    <option value="">ед.изм.</option>
                                    {units.map(unit => (
                                        <option key={unit.id} value={unit.id}>
                                            {unit.title}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Фотографии */}
                <div className={styles.section}>
                    <h2>Фотографии</h2>
                    <div className={styles.photoSection}>
                        {/* Существующие фото */}
                        {existingImages.length > 0 && (
                            <div className={styles.existingPhotos}>
                                <h4>Существующие фото</h4>
                                <div className={styles.existingPhotoGrid}>
                                    {existingImages.map((img, index) => (
                                        <div key={img.id} className={styles.existingPhotoItem}>
                                            <img
                                                src={getImageUrl(img.image)}
                                                alt={`Фото ${index + 1}`}
                                                className={styles.existingPhoto}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeExistingImage(img.id)}
                                                className={styles.removePhotoButton}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Загрузка новых фото */}
                        <div className={styles.newPhotoSection}>
                            <h4>Добавить новые фото</h4>
                            <div className={styles.photoUpload}>
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className={styles.fileInput}
                                    id="photo-upload"
                                />
                                <label htmlFor="photo-upload" className={styles.uploadLabel}>
                                    <span className={styles.plusIcon}>+</span>
                                    {/*<span>Выберите файлы</span>*/}
                                </label>

                                {newImages.length > 0 && (
                                    <div className={styles.newPhotoPreview}>
                                        {newImages.map((image, index) => (
                                            <div key={index} className={styles.newPhotoItem}>
                                                <img
                                                    src={URL.createObjectURL(image)}
                                                    alt={`Новое фото ${index + 1}`}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeNewImage(index)}
                                                    className={styles.removeNewPhotoButton}
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Описание услуги */}
                <div className={styles.section}>
                    <h2>Описание услуги</h2>
                    <div className={styles.descriptionSection}>
                        <textarea
                            name="description"
                            value={serviceData.description}
                            onChange={(e) => setServiceData({...serviceData, description: e.target.value})}
                            placeholder="Подробно опишите вашу услугу, условия работы, опыт и квалификацию."
                            rows={6}
                            className={styles.descriptionTextarea}
                            required
                        />
                    </div>
                </div>

                {/* Дополнительные заметки */}
                <div className={styles.section}>
                    <h2>Дополнительные заметки</h2>
                    <div className={styles.descriptionSection}>
                        <textarea
                            name="notice"
                            value={serviceData.notice}
                            onChange={(e) => setServiceData({...serviceData, notice: e.target.value})}
                            placeholder="Любая дополнительная информация (опционально)"
                            rows={3}
                            className={styles.descriptionTextarea}
                        />
                    </div>
                </div>

                {/* Кнопки */}
                <div className={styles.submitSection}>
                    <button
                        type="button"
                        className={styles.cancelButton}
                        onClick={() => navigate('/profile')}
                        disabled={isSubmitting}
                    >
                        Отмена
                    </button>
                    <button
                        type="submit"
                        className={styles.submitButton}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Сохранение...' : 'Сохранить изменения'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default EditServicePage;
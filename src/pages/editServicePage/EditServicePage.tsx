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
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    // Данные для формы
    const [categories, setCategories] = useState<Category[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [provinces, setProvinces] = useState<Province[]>([]);
    const [cities, setCities] = useState<City[]>([]);
    const [districts, setDistricts] = useState<District[]>([]);
    const [isLocationLoading, setIsLocationLoading] = useState(true);

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

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

    useEffect(() => {
        // Загружаем данные для формы
        fetchCategories();
        fetchUnits();

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

    // Fetch location data (provinces / cities / districts) in parallel
    useEffect(() => {
        const fetchLocationData = async () => {
            try {
                setIsLocationLoading(true);
                const token = getAuthToken();
                if (!token) return;

                const [provincesRes, citiesRes, districtsRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/api/provinces`, { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch(`${API_BASE_URL}/api/cities`, { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch(`${API_BASE_URL}/api/districts`, { headers: { 'Authorization': `Bearer ${token}` } })
                ]);

                if (provincesRes.ok) setProvinces(await provincesRes.json());
                if (citiesRes.ok) setCities(await citiesRes.json());
                if (districtsRes.ok) setDistricts(await districtsRes.json());
            } catch (err) {
                console.error('Error fetching location data:', err);
            } finally {
                setIsLocationLoading(false);
            }
        };

        fetchLocationData();
    }, []);

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

    // Keep a human-readable manual address in sync with selections
    const selectedProvince = selectedProvinceId
        ? provinces.find(p => p.id === selectedProvinceId)
        : null;

    const updateManualAddress = () => {
        const addressParts: string[] = [];
        if (selectedProvince) addressParts.push(selectedProvince.title);
        if (selectedCity) addressParts.push(selectedCity.title);

        if (selectedSuburbIds.length > 0) {
            const suburbTitles = suburbsInSelectedCity
                .filter((s: any) => selectedSuburbIds.includes(s.id))
                .map((s: any) => s.title);
            if (suburbTitles.length > 0) addressParts.push(...suburbTitles);
        }

        if (selectedDistrictIds.length > 0) {
            const selDistrict = districts.find(d => d.id === selectedDistrictIds[0]);
            if (selDistrict) addressParts.push(selDistrict.title);
            if (selectedCommunityId) {
                const community = communitiesInSelectedDistrict.find((c: any) => c.id === selectedCommunityId);
                if (community) addressParts.push(community.title);
            } else if (selectedSettlementId) {
                const settlement = settlementsInSelectedDistrict.find((s: any) => s.id === selectedSettlementId);
                if (settlement) {
                    addressParts.push(settlement.title);
                    if (selectedVillageId) {
                        const village = villagesInSelectedSettlement.find((v: any) => v.id === selectedVillageId);
                        if (village) addressParts.push(village.title);
                    }
                }
            }
        }
    };

    useEffect(() => {
        updateManualAddress();
    }, [selectedProvinceId, selectedCityId, selectedDistrictIds, selectedSuburbIds, selectedSettlementId, selectedCommunityId, selectedVillageId]);

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
        // Selecting a city should clear district-related selections
        setSelectedCityId(cityId);
        setSelectedSuburbIds([]);
        setSelectedDistrictIds([]);
        setSelectedSettlementId(null);
        setSelectedCommunityId(null);
        setSelectedVillageId(null);
    };

    const handleSuburbSelect = (suburbId: number) => {
        // allow multiple suburb selections (toggle)
        setSelectedSuburbIds(prev =>
            prev.includes(suburbId)
                ? prev.filter(id => id !== suburbId)
                : [...prev, suburbId]
        );
    };

    const handleDistrictSelect = (districtId: number) => {
        // Selecting a district should clear city-related selections
        setSelectedDistrictIds(prev =>
            prev.includes(districtId)
                ? prev.filter(id => id !== districtId)
                : [districtId]
        );
        setSelectedCityId(null);
        setSelectedSuburbIds([]);
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
            settlement: undefined,
            community: undefined,
            village: undefined,
            suburb: undefined,
        };

        // If a city is selected
        if (selectedCityId) {
            if (selectedSuburbIds && selectedSuburbIds.length > 0) {
                addressData.city = `/api/cities/${selectedCityId}`;
                addressData.suburb = `/api/suburbs/${selectedSuburbIds[0]}`;
            } else {
                addressData.city = `/api/cities/${selectedCityId}`;
            }
        }
        // If a district is selected (region-level)
        else if (selectedDistrictIds.length > 0) {
            const districtId = selectedDistrictIds[0];
            if (selectedCommunityId) {
                addressData.community = `/api/communities/${selectedCommunityId}`;
                addressData.district = `/api/districts/${districtId}`;
            } else if (selectedSettlementId) {
                addressData.settlement = `/api/settlements/${selectedSettlementId}`;
                addressData.district = `/api/districts/${districtId}`;
                if (selectedVillageId) {
                    addressData.village = `/api/villages/${selectedVillageId}`;
                }
            } else {
                addressData.district = `/api/districts/${districtId}`;
            }
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
                category: `/api/categories/${selectedCategory}`,
                unit: selectedUnit ? `/api/units/${selectedUnit}` : null,
                // use singular `address` to match CreateAdPage POST payload
                address: addressData
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

            setShowSuccessModal(true);
            setTimeout(() => {
                setShowSuccessModal(false);
                navigate('/orders');
            }, 2000);

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

                    <div className={styles.province_section}>
                        <h3>Выберите область</h3>
                        <div className={styles.province_list}>
                            {isLocationLoading ? (
                                <div className={styles.loading}>Загрузка областей...</div>
                            ) : provinces.length > 0 ? (
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
                            ) : (
                                <div className={styles.no_data}>Области не найдены</div>
                            )}
                        </div>
                    </div>

                    {selectedProvinceId && (
                        <div className={styles.combined_section}>
                            <h3>Населенные пункты в {selectedProvince?.title}</h3>

                            <div className={styles.combined_container}>
                                {/* Города */}
                                {citiesInSelectedProvince.length > 0 && (
                                    <div className={styles.cities_container}>
                                        <h4>Города</h4>
                                        <div className={styles.city_grid}>
                                            {citiesInSelectedProvince.map((city: any) => (
                                                <button
                                                    type="button"
                                                    key={city.id}
                                                    className={`${styles.city_card} ${
                                                        selectedCityId === city.id ? styles.city_card_selected : ''
                                                    }`}
                                                    onClick={() => handleCitySelect(city.id)}
                                                >
                                                    <div className={styles.city_name}>{city.title}</div>
                                                    {city.suburbs && city.suburbs.length > 0 && (
                                                        <div className={styles.city_districts_count}>
                                                            {city.suburbs.length} кварталов
                                                        </div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Районы (districts) */}
                                {districtsInSelectedProvince.length > 0 && (
                                    <div className={styles.districts_container}>
                                        <h4>Районы</h4>
                                        <div className={styles.district_grid}>
                                            {districtsInSelectedProvince.map((district: any) => (
                                                <button
                                                    type="button"
                                                    key={district.id}
                                                    className={`${styles.district_card} ${
                                                        selectedDistrictIds.includes(district.id) ? styles.district_card_selected : ''
                                                    }`}
                                                    onClick={() => handleDistrictSelect(district.id)}
                                                >
                                                    <div className={styles.district_name}>{district.title}</div>
                                                    <div className={styles.district_info}>
                                                        {district.settlements && district.settlements.length > 0 && (
                                                            <span>Поселков: {district.settlements.length}</span>
                                                        )}
                                                        {district.communities && district.communities.length > 0 && (
                                                            <span>ПГТ: {district.communities.length}</span>
                                                        )}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {selectedCity && suburbsInSelectedCity.length > 0 && (
                        <div className={styles.suburbs_section}>
                            <div className={styles.section_header}>
                                <h3>Кварталы города {selectedCity.title} (можно выбрать несколько)</h3>
                                <p className={styles.subtitle}>Выберите кварталы, в которых вы работаете</p>
                            </div>
                            <div className={styles.district_grid}>
                                {suburbsInSelectedCity.map((suburb: any) => (
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

                    {selectedDistrict && (
                        <div className={styles.nested_selection_section}>
                            <h3>Населенные пункты в районе {selectedDistrict.title}</h3>
                            <p className={styles.subtitle}>Выберите ПГТ или поселок</p>

                            <div className={styles.nested_type_selector}>
                                {/* ПГТ (communities) */}
                                {communitiesInSelectedDistrict.length > 0 && (
                                    <div className={styles.communities_container}>
                                        <h4>ПГТ (Поселки городского типа)</h4>
                                        <div className={styles.district_grid}>
                                            {communitiesInSelectedDistrict.map((community: any) => (
                                                <button
                                                    type="button"
                                                    key={community.id}
                                                    className={`${styles.district_card} ${
                                                        selectedCommunityId === community.id ? styles.district_card_selected : ''
                                                    }`}
                                                    onClick={() => handleCommunitySelect(community.id)}
                                                >
                                                    <div className={styles.district_name}>{community.title}</div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Поселения (settlements) */}
                                {settlementsInSelectedDistrict.length > 0 && (
                                    <div className={styles.settlements_container}>
                                        <h4>Поселки</h4>
                                        <div className={styles.district_grid}>
                                            {settlementsInSelectedDistrict.map((settlement: any) => (
                                                <button
                                                    type="button"
                                                    key={settlement.id}
                                                    className={`${styles.district_card} ${
                                                        selectedSettlementId === settlement.id ? styles.district_card_selected : ''
                                                    }`}
                                                    onClick={() => handleSettlementSelect(settlement.id)}
                                                >
                                                    <div className={styles.district_name}>{settlement.title}</div>
                                                    {settlement.village && settlement.village.length > 0 && (
                                                        <div className={styles.settlement_info}>
                                                            {settlement.village.length} сёл
                                                        </div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Шаг 4: Села (villages) выбранного поселения */}
                            {selectedSettlement && villagesInSelectedSettlement.length > 0 && (
                                <div className={styles.villages_section}>
                                    <h4>Села в поселке {selectedSettlement.title}</h4>
                                    <div className={styles.district_grid}>
                                        {villagesInSelectedSettlement.map((village: any) => (
                                            <button
                                                key={village.id}
                                                className={`${styles.district_card} ${
                                                    selectedVillageId === village.id ? styles.district_card_selected : ''
                                                }`}
                                                onClick={() => handleVillageSelect(village.id)}
                                            >
                                                <div className={styles.district_name}>{village.title}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
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

            {/* Модалка успеха */}
            {showSuccessModal && (
                <div className={styles.modalOverlay} onClick={() => setShowSuccessModal(false)}>
                    <div className={`${styles.modalContent} ${styles.successModal}`} onClick={(e) => e.stopPropagation()}>
                        <h2 className={styles.successTitle}>Успешно!</h2>
                        <div className={styles.successIcon}>
                            <img src="/uspeh.png" alt="Успех"/>
                        </div>
                        <p className={styles.successMessage}>Услуга успешно обновлена!</p>
                        <button
                            className={styles.successButton}
                            onClick={() => {
                                setShowSuccessModal(false);
                                navigate('/orders');
                            }}
                        >
                            Понятно
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EditServicePage;
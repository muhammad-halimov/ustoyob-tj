import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './CreateAdPage.module.scss';
import { getAuthToken, getUserRole } from '../../utils/auth';
// Location selector UI moved inline (province/combined/nested sections)

interface Category {
    id: number;
    title: string;
}

interface Unit {
    id: number;
    title: string;
}

interface ApiViolation {
    propertyPath: string;
    message: string;
    code?: string;
}

interface ApiError {
    detail?: string;
    message?: string;
    title?: string;
    violations?: ApiViolation[];
    [key: string]: unknown;
}

interface AddressSubmissionData {
    province: string;
    city?: string;
    district?: string;
    settlement?: string | null;
    community?: string | null;
    village?: string | null;
    suburb?: string | null;
}

const CreateAdPage = () => {
    const navigate = useNavigate();
    const [categories, setCategories] = useState<Category[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
    const [selectedUnit, setSelectedUnit] = useState<number | null>(null);
    const [images, setImages] = useState<File[]>([]);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Состояния для локации (copied from AddressPage)
    const [provinces, setProvinces] = useState<any[]>([]);
    const [cities, setCities] = useState<any[]>([]);
    const [districts, setDistricts] = useState<any[]>([]);
    const [isLocationLoading, setIsLocationLoading] = useState(true);

    const [locationData, setLocationData] = useState({
        selectedProvinceId: null as number | null,
        selectedCityId: null as number | null,
        selectedDistrictIds: [] as number[],
        selectedSuburbIds: [] as number[],
        manualAddress: ''
    });

    const [selectedProvinceId, setSelectedProvinceId] = useState<number | null>(null);
    const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
    const [selectedDistrictId, setSelectedDistrictId] = useState<number | null>(null);
    const [selectedSuburbIds, setSelectedSuburbIds] = useState<number[]>([]);
    const [selectedSettlementId, setSelectedSettlementId] = useState<number | null>(null);
    const [selectedCommunityId, setSelectedCommunityId] = useState<number | null>(null);
    const [selectedVillageId, setSelectedVillageId] = useState<number | null>(null);
    const [manualAddress, setManualAddress] = useState<string>('');

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        notice: '',
        budget: '',
        active: true,
    });

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
    const token = getAuthToken();

    useEffect(() => {
        if (!token) {
            navigate('/');
            return;
        }

        const role = getUserRole();
        console.log('User role:', role);
        fetchCategories();
        fetchUnits();
    }, [navigate, token]);

    const fetchCategories = async () => {
        try {
            if (!token) return;

            const response = await fetch(`${API_BASE_URL}/api/categories`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setCategories(data);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const fetchUnits = async () => {
        try {
            if (!token) return;

            const response = await fetch(`${API_BASE_URL}/api/units`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setUnits(data);
        } catch (error) {
            console.error('Error fetching units:', error);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newImages = Array.from(e.target.files);
            setImages(prev => [...prev, ...newImages]);
        }
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleLocationChange = (data: typeof locationData) => {
        setLocationData(data);
    };

    // Derived helpers and fetchers for inline location UI
    const selectedProvince = selectedProvinceId
        ? provinces.find((p: any) => p.id === selectedProvinceId)
        : null;

    const citiesInSelectedProvince = selectedProvince
        ? cities.filter((city: any) => city.province && city.province.id === selectedProvinceId)
        : [];

    const selectedCity = selectedCityId
        ? cities.find((c: any) => c.id === selectedCityId)
        : null;

    const suburbsInSelectedCity = selectedCity ? selectedCity.suburbs || [] : [];

    const districtsInSelectedProvince = selectedProvince
        ? districts.filter((d: any) => d.province && d.province.id === selectedProvinceId)
        : [];

    const selectedDistrict = selectedDistrictId
        ? districtsInSelectedProvince.find((d: any) => d.id === selectedDistrictId)
        : null;

    const settlementsInSelectedDistrict = selectedDistrict ? selectedDistrict.settlements || [] : [];
    const communitiesInSelectedDistrict = selectedDistrict ? selectedDistrict.communities || [] : [];

    const selectedSettlement = selectedSettlementId
        ? settlementsInSelectedDistrict.find((s: any) => s.id === selectedSettlementId)
        : null;

    const villagesInSelectedSettlement = selectedSettlement ? selectedSettlement.villages || [] : [];

    useEffect(() => {
        const fetchLocationData = async () => {
            try {
                setIsLocationLoading(true);
                const tokenLocal = token;
                if (!tokenLocal) return;

                const [provincesRes, citiesRes, districtsRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/api/provinces`, { headers: { 'Authorization': `Bearer ${tokenLocal}` } }),
                    fetch(`${API_BASE_URL}/api/cities`, { headers: { 'Authorization': `Bearer ${tokenLocal}` } }),
                    fetch(`${API_BASE_URL}/api/districts`, { headers: { 'Authorization': `Bearer ${tokenLocal}` } })
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

        if (selectedDistrictId) {
            addressParts.push(selectedDistrict?.title || '');
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

        const newAddress = addressParts.length > 0 ? addressParts.join(', ') : '';
        setManualAddress(newAddress);
        setLocationData({
            selectedProvinceId,
            selectedCityId,
            selectedDistrictIds: selectedDistrictId ? [selectedDistrictId] : [],
            selectedSuburbIds,
            manualAddress: newAddress
        });
    };

    useEffect(() => {
        updateManualAddress();
    }, [selectedProvinceId, selectedCityId, selectedDistrictId, selectedSuburbIds, selectedSettlementId, selectedCommunityId, selectedVillageId]);

    const handleProvinceSelect = (provinceId: number) => {
        setSelectedProvinceId(provinceId);
        setSelectedCityId(null);
        setSelectedSuburbIds([]);
        setSelectedDistrictId(null);
        setSelectedSettlementId(null);
        setSelectedCommunityId(null);
        setSelectedVillageId(null);
    };

    const handleCitySelect = (cityId: number) => {
        const city = cities.find(c => c.id === cityId);
        if (!city) return;
        if (selectedProvinceId && city.province.id !== selectedProvinceId) {
            alert(`Город "${city.title}" не принадлежит выбранной провинции.`);
            return;
        }
        // Selecting a city should clear district-related selections
        setSelectedCityId(cityId);
        setSelectedSuburbIds([]);
        setSelectedDistrictId(null);
        setSelectedSettlementId(null);
        setSelectedCommunityId(null);
        setSelectedVillageId(null);
    };

    const handleSuburbSelect = (suburbId: number) => {
        if (!selectedCityId) return;
        const suburb = selectedCity?.suburbs?.find((s: any) => s.id === suburbId);
        if (!suburb) {
            alert('Выбранный район не принадлежит выбранному городу.');
            return;
        }
        setSelectedSuburbIds(prev => prev.includes(suburbId) ? prev.filter(id => id !== suburbId) : [...prev, suburbId]);
    };

    const handleDistrictSelect = (districtId: number) => {
        const district = districts.find(d => d.id === districtId);
        if (!district) return;
        if (selectedProvinceId && district.province.id !== selectedProvinceId) {
            alert(`Район "${district.title}" не принадлежит выбранной провинции.`);
            return;
        }
        // Selecting a district should clear city-related selections
        setSelectedDistrictId(prev => prev === districtId ? null : districtId);
        setSelectedCityId(null);
        setSelectedSuburbIds([]);
        setSelectedSettlementId(null);
        setSelectedCommunityId(null);
        setSelectedVillageId(null);
    };

    const handleSettlementSelect = (settlementId: number) => {
        setSelectedSettlementId(settlementId);
        setSelectedCommunityId(null);
    };

    const handleCommunitySelect = (communityId: number) => {
        setSelectedCommunityId(communityId);
        setSelectedSettlementId(null);
    };

    const handleVillageSelect = (villageId: number) => {
        setSelectedVillageId(villageId);
    };

    const buildAddressData = (): AddressSubmissionData | null => {
        // Build address using current selection states (mirrors AddressPage.save logic)
        if (!selectedProvinceId) return null;

        const addressData: AddressSubmissionData = {
            province: `/api/provinces/${selectedProvinceId}`,
            settlement: null,
            community: null,
            village: null,
            suburb: null,
        };

        // If a city is selected
        if (selectedCityId) {
            // If city has selected suburbs (quartals), use first selected suburb for ticket address
            if (selectedSuburbIds && selectedSuburbIds.length > 0) {
                addressData.city = `/api/cities/${selectedCityId}`;
                addressData.suburb = `/api/suburbs/${selectedSuburbIds[0]}`;
            } else {
                // Only city
                addressData.city = `/api/cities/${selectedCityId}`;
            }
        }
        // If a district is selected (region-level)
        else if (selectedDistrictId) {
            // If community (ПГТ) selected
            if (selectedCommunityId) {
                addressData.community = `/api/communities/${selectedCommunityId}`;
                addressData.district = `/api/districts/${selectedDistrictId}`;
            }
            // If settlement selected
            else if (selectedSettlementId) {
                addressData.settlement = `/api/settlements/${selectedSettlementId}`;
                addressData.district = `/api/districts/${selectedDistrictId}`;
                if (selectedVillageId) {
                    addressData.village = `/api/villages/${selectedVillageId}`;
                }
            }
            // Only district
            else {
                addressData.district = `/api/districts/${selectedDistrictId}`;
            }
        }

        return addressData;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Валидация
        if (!selectedCategory || !locationData.selectedProvinceId || !formData.title.trim() || !formData.description.trim() || !formData.budget) {
            alert('Пожалуйста, заполните все обязательные поля');
            return;
        }

        if (!locationData.selectedCityId && locationData.selectedSuburbIds.length === 0 && locationData.selectedDistrictIds.length === 0) {
            alert('Пожалуйста, выберите город или район');
            return;
        }

        const budgetValue = Number(formData.budget);
        if (isNaN(budgetValue) || budgetValue <= 0) {
            alert('Пожалуйста, укажите корректную сумму бюджета');
            return;
        }

        if (!token) {
            alert('Пожалуйста, войдите в систему');
            return;
        }

        const role = getUserRole();
        if (!role) {
            alert('Не удалось определить роль пользователя');
            return;
        }

        setIsSubmitting(true);

        try {
            const userResponse = await fetch(`${API_BASE_URL}/api/users/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                },
            });

            if (!userResponse.ok) {
                throw new Error('Не удалось получить информацию о пользователе');
            }

            const userData = await userResponse.json();

            const addressData = buildAddressData();
            if (!addressData) {
                alert('Не удалось сформировать данные адреса');
                return;
            }

            const ticketData = {
                title: formData.title.trim(),
                description: formData.description.trim(),
                notice: formData.notice?.trim() || "",
                budget: budgetValue,
                active: true,
                category: `/api/categories/${selectedCategory}`,
                unit: selectedUnit ? `/api/units/${selectedUnit}` : null,
                address: addressData,
                author: `/api/users/${userData.id}`,
                service: role === 'master',
                master: role === 'master' ? `/api/users/${userData.id}` : null
            };

            const response = await fetch(`${API_BASE_URL}/api/tickets`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(ticketData),
            });

            if (response.ok) {
                const ticketDataResponse = await response.json();

                // Загрузка изображений
                if (images.length > 0) {
                    for (const image of images) {
                        const imageFormData = new FormData();
                        imageFormData.append('file', image);

                        try {
                            await fetch(`${API_BASE_URL}/api/tickets/${ticketDataResponse.id}/upload-photo`, {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${token}`,
                                },
                                body: imageFormData,
                            });
                        } catch (imageError) {
                            console.error('Error uploading image:', imageError);
                        }
                    }
                }

                setShowSuccessModal(true);
                resetForm();
            } else {
                const errorText = await response.text();
                let errorMessage = 'Неизвестная ошибка';
                try {
                    const errorData: ApiError = JSON.parse(errorText);
                    errorMessage = errorData.detail || errorData.message || errorData.title || JSON.stringify(errorData);

                    if (errorData.violations && Array.isArray(errorData.violations)) {
                        const violationMessages = errorData.violations.map((v: ApiViolation) =>
                            `Поле "${v.propertyPath}": ${v.message}`
                        ).join('\n');
                        errorMessage = `Ошибки валидации:\n${violationMessages}`;
                    }
                } catch {
                    errorMessage = errorText || `HTTP error! status: ${response.status}`;
                }

                alert('Ошибка при создании объявления: ' + errorMessage);
            }
        } catch (error) {
            console.error('Error:', error);
            let errorMessage = 'Неизвестная ошибка';

            if (error instanceof Error) {
                errorMessage = error.message;
            } else if (typeof error === 'string') {
                errorMessage = error;
            }

            alert('Ошибка при создании объявления: ' + errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            description: '',
            notice: '',
            budget: '',
            active: true,
        });
        setImages([]);
        setSelectedCategory(null);
        setSelectedUnit(null);
        setLocationData({
            selectedProvinceId: null,
            selectedCityId: null,
            selectedDistrictIds: [],
            selectedSuburbIds: [],
            manualAddress: ''
        });
    };

    const handleSuccessClose = () => {
        setShowSuccessModal(false);
        navigate(`/search-service?category=${selectedCategory || ''}&source=created`);
    };

    if (!token) {
        return null;
    }

    return (
        <>
            <div className={styles.container}>
                <div className={styles.container_wrap}>
                    <form onSubmit={handleSubmit} className={styles.form}>
                        <h3>Заполните заявку с деталями</h3>

                        {/* Название услуги */}
                        <div className={styles.section}>
                            <h2>Название услуги</h2>
                            <div className={styles.serviceSection}>
                                <input
                                    type="text"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleInputChange}
                                    placeholder="Введите название услуги"
                                    className={styles.titleInput}
                                    required
                                />
                                <div className={styles.categorySection}>
                                    <div className={styles.categoryOption}>
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
                            </div>
                        </div>

                        <div className={styles.divider} />

                        {/* Inline location selector (province / combined / nested) */}
                        <div className={styles.province_section}>
                            <h3>Выберите область (Провинцию)</h3>
                            <div className={styles.province_list}>
                                {isLocationLoading ? (
                                    <div className={styles.loading}>Загрузка областей...</div>
                                ) : provinces.length > 0 ? (
                                    <div className={styles.province_grid}>
                                        {provinces.map(province => (
                                            <button
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
                                                        key={district.id}
                                                        className={`${styles.district_card} ${
                                                            selectedDistrictId === district.id ? styles.district_card_selected : ''
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
                                                        key={settlement.id}
                                                        className={`${styles.district_card} ${
                                                            selectedSettlementId === settlement.id ? styles.district_card_selected : ''
                                                        }`}
                                                        onClick={() => handleSettlementSelect(settlement.id)}
                                                    >
                                                        <div className={styles.district_name}>{settlement.title}</div>
                                                        {settlement.villages && settlement.villages.length > 0 && (
                                                            <div className={styles.settlement_info}>
                                                                {settlement.villages.length} сёл
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

                        <div className={styles.divider} />

                        {/* Бюджет */}
                        <div className={styles.section}>
                            <h2>Укажите бюджет</h2>
                            <div className={styles.budgetSection}>
                                <div className={styles.budgetRow}>
                                    <div className={styles.budgetField}>
                                        <input
                                            type="number"
                                            name="budget"
                                            value={formData.budget}
                                            onChange={handleInputChange}
                                            placeholder="0"
                                            className={styles.budgetInput}
                                            min="0"
                                            required
                                        />
                                    </div>
                                    <div className={styles.budgetField}>
                                        <select
                                            className={styles.unitSelect}
                                            value={selectedUnit || ''}
                                            onChange={(e) => setSelectedUnit(Number(e.target.value))}
                                        >
                                            <option value="">Ед. изм.</option>
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

                        <div className={styles.divider} />

                        {/* Фото */}
                        <div className={styles.section}>
                            <h2>Приложите фото</h2>
                            <div className={styles.photoSection}>
                                <div className={styles.photoLabel}>Из вашего портфолио</div>
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
                                    </label>

                                    {images.length > 0 && (
                                        <div className={styles.imagePreview}>
                                            {images.map((image, index) => (
                                                <div key={index} className={styles.previewItem}>
                                                    <img src={URL.createObjectURL(image)} alt={`Preview ${index}`} />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeImage(index)}
                                                        className={styles.removeImage}
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

                        <div className={styles.divider} />

                        {/* Описание */}
                        <div className={styles.section}>
                            <h2>Есть пожелания?</h2>
                            <div className={styles.descriptionSection}>
                                <div className={styles.descriptionLabel}>
                                    Укажите важные детали, которые нужно знать заказчику.
                                </div>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    placeholder="Опишите детали вашей услуги..."
                                    rows={4}
                                    className={styles.descriptionTextarea}
                                    required
                                />
                            </div>
                        </div>

                        {/* Дополнительные заметки */}
                        <div className={styles.section}>
                            <h2>Дополнительные заметки</h2>
                            <div className={styles.descriptionSection}>
                                <div className={styles.descriptionLabel}>
                                    Любая дополнительная информация (опционально)
                                </div>
                                <textarea
                                    name="notice"
                                    value={formData.notice}
                                    onChange={handleInputChange}
                                    placeholder="Дополнительная информация..."
                                    rows={2}
                                    className={styles.descriptionTextarea}
                                />
                            </div>
                        </div>

                        {/* Кнопка отправки */}
                        <div className={styles.submitSection}>
                            <button
                                type="submit"
                                className={styles.submitButton}
                                disabled={isSubmitting || !locationData.selectedProvinceId}
                            >
                                {isSubmitting ? 'Публикация...' : 'Разместить объявление'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Модальное окно успеха */}
            {showSuccessModal && (
                <div className={styles.modalOverlay} onClick={handleSuccessClose}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <h2 className={styles.successTitle}>Предложение успешно опубликовано!</h2>
                        <div className={styles.successIcon}>
                            <img src="./uspeh.png" alt="uspeh"/>
                        </div>

                        <button
                            className={styles.successButton}
                            onClick={handleSuccessClose}
                        >
                            Понятно
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default CreateAdPage;
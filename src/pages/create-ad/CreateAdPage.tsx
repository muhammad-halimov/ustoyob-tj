import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './CreateAdPage.module.scss';
import { getAuthToken, getUserRole } from '../../utils/auth';

interface Category {
    id: number;
    title: string;
}

interface Province {
    id: number;
    title: string;
    description?: string;
}

interface Suburb {
    id: number;
    title: string;
    description: string;
}

interface City {
    id: number;
    title: string;
    description?: string;
    image?: string;
    province: Province;
    suburbs: Suburb[];
}

interface District {
    id: number;
    title: string;
    description: string;
    image: string;
    province: Province;
    settlements: Array<{
        id: number;
        title: string;
        description: string;
        village: Array<{
            id: number;
            title: string;
            description: string;
        }>;
    }>;
    communities: Array<{
        id: number;
        title: string;
        description: string;
    }>;
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

// Интерфейс для данных адреса при отправке
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
    const [districts, setDistricts] = useState<District[]>([]);
    const [cities, setCities] = useState<City[]>([]);
    const [provinces, setProvinces] = useState<Province[]>([]);

    // Новые состояния для выбора локации как в CityPage
    const [selectedProvinceId, setSelectedProvinceId] = useState<number | null>(null);
    const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
    const [selectedSuburbIds, setSelectedSuburbIds] = useState<number[]>([]);
    const [selectedDistrictIds, setSelectedDistrictIds] = useState<number[]>([]);
    const [manualAddress, setManualAddress] = useState<string>('');

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        notice: '',
        budget: '',
        active: true,
    });

    const API_BASE_URL = 'https://admin.ustoyob.tj';

    useEffect(() => {
        const role = getUserRole();
        console.log('User role:', role);
        fetchCategories();
        fetchProvinces();
        fetchCities();
        fetchDistricts();
        fetchUnits();
    }, []);

    // Получаем города выбранной провинции
    const citiesInSelectedProvince = selectedProvinceId
        ? cities.filter(city => city.province && city.province.id === selectedProvinceId)
        : [];

    // Получаем выбранный город
    const selectedCity = selectedCityId
        ? cities.find(city => city.id === selectedCityId)
        : null;

    // Получаем районы (suburbs) выбранного города
    const suburbsInSelectedCity = selectedCity
        ? selectedCity.suburbs || []
        : [];

    // Получаем районы (districts) выбранной провинции
    const districtsInSelectedProvince = selectedProvinceId
        ? districts.filter(district => district.province && district.province.id === selectedProvinceId)
        : [];

    // Получаем выбранные районы города
    const selectedSuburbs = suburbsInSelectedCity.filter(
        suburb => selectedSuburbIds.includes(suburb.id)
    );

    // Получаем выбранные общие районы
    const selectedDistricts = districtsInSelectedProvince.filter(
        district => selectedDistrictIds.includes(district.id)
    );

    // Обновляем ручной адрес при изменении выбранных элементов
    useEffect(() => {
        let address = '';

        if (selectedProvinceId) {
            const province = provinces.find(p => p.id === selectedProvinceId);
            if (province) {
                address = province.title;
            }
        }

        if (selectedCityId) {
            const city = cities.find(c => c.id === selectedCityId);
            if (city) {
                address = city.title;
            }
        }

        // Добавляем выбранные районы города
        if (selectedSuburbs.length > 0) {
            const suburbTitles = selectedSuburbs.map(s => s.title);
            const cityTitle = selectedCity?.title || '';
            address = `${suburbTitles.join(', ')}${cityTitle ? `, ${cityTitle}` : ''}`;
        }

        // Добавляем выбранные общие районы
        if (selectedDistricts.length > 0) {
            if (address) {
                address += ', ';
            }
            const districtTitles = selectedDistricts.map(d => d.title);
            address += districtTitles.join(', ');
        }

        // Если выбраны и районы города и общие районы
        if (selectedSuburbs.length > 0 && selectedDistricts.length > 0) {
            const suburbTitles = selectedSuburbs.map(s => s.title);
            const districtTitles = selectedDistricts.map(d => d.title);
            const cityTitle = selectedCity?.title || '';
            address = `${suburbTitles.join(', ')}, ${districtTitles.join(', ')}${cityTitle ? `, ${cityTitle}` : ''}`;
        }

        setManualAddress(address);
    }, [selectedSuburbIds, selectedDistrictIds, selectedCityId, selectedProvinceId, provinces, cities, selectedSuburbs, selectedDistricts, selectedCity]);

    // Эффект для обработки изменений выбранных ID
    useEffect(() => {
        if (selectedProvinceId) {
            setSelectedCityId(null);
            setSelectedSuburbIds([]);
            setSelectedDistrictIds([]);
        }
    }, [selectedProvinceId]);

    useEffect(() => {
        if (selectedCityId) {
            setSelectedSuburbIds([]);
            // Не сбрасываем selectedDistrictIds, чтобы можно было выбрать и город, и район области
        }
    }, [selectedCityId]);

    const fetchProvinces = async () => {
        try {
            const token = getAuthToken();
            const response = await fetch(`${API_BASE_URL}/api/provinces`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setProvinces(data);
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
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            const citiesWithNullCheck = Array.isArray(data) ? data : [];
            console.log('Fetched cities:', citiesWithNullCheck);
            setCities(citiesWithNullCheck);
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
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            const districtsWithNullCheck = Array.isArray(data) ? data : [];
            console.log('Fetched districts:', districtsWithNullCheck);
            setDistricts(districtsWithNullCheck);
        } catch (error) {
            console.error('Error fetching districts:', error);
        }
    };

    const fetchCategories = async () => {
        try {
            const token = getAuthToken();
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
            const token = getAuthToken();
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

    // Обработчики выбора как в CityPage
    const handleProvinceSelect = (provinceId: number) => {
        console.log('Province selected:', provinceId);
        setSelectedProvinceId(provinceId);
    };

    const handleCitySelect = (cityId: number) => {
        console.log('City selected:', cityId);
        setSelectedCityId(cityId);
    };

    const handleSuburbSelect = (suburbId: number) => {
        console.log('Suburb toggle:', suburbId);
        setSelectedSuburbIds(prev => {
            if (prev.includes(suburbId)) {
                return prev.filter(id => id !== suburbId);
            } else {
                return [...prev, suburbId];
            }
        });
    };

    const handleDistrictSelect = (districtId: number) => {
        console.log('District toggle:', districtId);
        setSelectedDistrictIds(prev => {
            if (prev.includes(districtId)) {
                return prev.filter(id => id !== districtId);
            } else {
                return [...prev, districtId];
            }
        });
    };

    const handleManualAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setManualAddress(e.target.value);
    };

    // Подготавливаем district для отправки
    const getDistrictForSubmission = (): number | null => {
        // Для упрощения берем первый выбранный район
        if (selectedSuburbIds.length > 0) {
            return selectedSuburbIds[0];
        }
        if (selectedDistrictIds.length > 0) {
            return selectedDistrictIds[0];
        }
        return null;
    };

    // Функция для создания данных адреса для отправки
    const buildAddressData = (): AddressSubmissionData | null => {
        // Всегда должна быть выбрана провинция
        if (!selectedProvinceId) {
            return null;
        }

        const addressData: AddressSubmissionData = {
            province: `/api/provinces/${selectedProvinceId}`,
            // Устанавливаем остальные поля как null
            settlement: null,
            community: null,
            village: null,
        };

        // Сначала проверяем выбор районов города (suburbs)
        if (selectedSuburbIds.length > 0 && selectedCityId) {
            console.log('Using CITY + SUBURB format');

            // Проверяем, что город принадлежит выбранной провинции
            const cityObj = cities.find(c => c.id === selectedCityId);
            if (!cityObj) {
                console.warn('Выбранный город не найден!');
                return null;
            }

            if (cityObj.province.id !== selectedProvinceId) {
                console.warn('Выбранный город не принадлежит выбранной провинции!');
                alert('Выбранный город не принадлежит выбранной провинции. Пожалуйста, выберите город из правильной области.');
                return null;
            }

            addressData.city = `/api/cities/${selectedCityId}`;
            const selectedDistrict = getDistrictForSubmission();
            if (selectedDistrict) {
                addressData.suburb = `/api/districts/${selectedDistrict}`;

                // Проверяем, что район города принадлежит выбранному городу
                const suburbExists = cityObj.suburbs?.some(s => s.id === selectedDistrict);
                if (!suburbExists) {
                    console.warn('Выбранный район не принадлежит выбранному городу!');
                    return null;
                }
            }
        }
        // Затем проверяем выбор районов области (districts)
        else if (selectedDistrictIds.length > 0) {
            // Если выбран район области
            console.log('Using DISTRICT format');
            const selectedDistrict = getDistrictForSubmission();
            if (selectedDistrict) {
                addressData.district = `/api/districts/${selectedDistrict}`;

                // Проверяем, что район принадлежит выбранной провинции
                const districtObj = districts.find(d => d.id === selectedDistrict);
                if (districtObj && districtObj.province.id !== selectedProvinceId) {
                    console.warn('Выбранный район не принадлежит выбранной провинции!');
                    return null;
                }
            }

            // Если при этом выбран город - отправляем и city
            if (selectedCityId) {
                const cityObj = cities.find(c => c.id === selectedCityId);
                if (cityObj && cityObj.province.id === selectedProvinceId) {
                    addressData.city = `/api/cities/${selectedCityId}`;
                }
            }
        }
        // Если выбран только город (без районов)
        else if (selectedCityId) {
            console.log('Using CITY format');

            // Проверяем, что город принадлежит выбранной провинции
            const cityObj = cities.find(c => c.id === selectedCityId);
            if (!cityObj) {
                console.warn('Выбранный город не найден!');
                return null;
            }

            if (cityObj.province.id !== selectedProvinceId) {
                console.warn('Выбранный город не принадлежит выбранной провинции!');
                alert('Выбранный город не принадлежит выбранной провинции. Пожалуйста, выберите город из правильной области.');
                return null;
            }

            addressData.city = `/api/cities/${selectedCityId}`;
        }

        return addressData;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Валидация обязательных полей
        if (!selectedCategory || !selectedProvinceId || !formData.title.trim() || !formData.description.trim() || !formData.budget) {
            alert('Пожалуйста, заполните все обязательные поля: название, описание, категория, область и бюджет');
            return;
        }

        // Нужен хотя бы город ИЛИ район
        if (!selectedCityId && selectedSuburbIds.length === 0 && selectedDistrictIds.length === 0) {
            alert('Пожалуйста, выберите город или район');
            return;
        }

        // Проверяем согласованность выбора
        if (selectedCityId) {
            const selectedCityObj = cities.find(c => c.id === selectedCityId);
            if (selectedCityObj && selectedCityObj.province.id !== selectedProvinceId) {
                alert('Выбранный город не принадлежит выбранной провинции. Пожалуйста, выберите город из правильной области.');
                return;
            }
        }

        // Проверяем районы области
        if (selectedDistrictIds.length > 0) {
            const invalidDistrict = selectedDistrictIds.find(districtId => {
                const district = districts.find(d => d.id === districtId);
                return district && district.province.id !== selectedProvinceId;
            });

            if (invalidDistrict) {
                alert('Выбранные районы не принадлежат выбранной провинции. Пожалуйста, выберите районы из правильной области.');
                return;
            }
        }

        // Проверяем районы города
        if (selectedSuburbIds.length > 0 && selectedCityId) {
            const selectedCityObj = cities.find(c => c.id === selectedCityId);
            if (selectedCityObj) {
                const invalidSuburb = selectedSuburbIds.find(suburbId => {
                    return !selectedCityObj.suburbs?.some(s => s.id === suburbId);
                });

                if (invalidSuburb) {
                    alert('Выбранные районы не принадлежат выбранному городу. Пожалуйста, выберите районы из правильного города.');
                    return;
                }
            }
        }

        // Валидация бюджета
        const budgetValue = Number(formData.budget);
        if (isNaN(budgetValue) || budgetValue <= 0) {
            alert('Пожалуйста, укажите корректную сумму бюджета');
            return;
        }

        const token = getAuthToken();
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

            const endpoint = '/api/tickets';

            console.log('Using endpoint:', endpoint);

            // Создаем данные адреса только с выбранными полями
            const addressData = buildAddressData();
            if (!addressData) {
                alert('Не удалось сформировать данные адреса');
                return;
            }

            console.log('DEBUG - Address data to send:', addressData);

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
                service: role === 'master', // true для мастеров, false для клиентов
                master: role === 'master' ? `/api/users/${userData.id}` : null
            };

            console.log('Sending ticket data:', JSON.stringify(ticketData, null, 2));

            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(ticketData),
            });

            console.log('Response status:', response.status);

            if (response.ok) {
                const ticketDataResponse = await response.json();
                console.log('Ticket created successfully:', ticketDataResponse);

                if (images.length > 0) {
                    console.log('Uploading images...');
                    for (const image of images) {
                        const imageFormData = new FormData();
                        imageFormData.append('file', image);

                        try {
                            const imageResponse = await fetch(`${API_BASE_URL}/api/tickets/${ticketDataResponse.id}/upload-photo`, {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${token}`,
                                },
                                body: imageFormData,
                            });

                            if (imageResponse.ok) {
                                console.log('Image uploaded successfully');
                            } else {
                                const imageErrorText = await imageResponse.text();
                                console.warn('Failed to upload image:', imageErrorText);
                            }
                        } catch (imageError) {
                            console.error('Error uploading image:', imageError);
                        }
                    }
                }

                setShowSuccessModal(true);
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
                // Сбрасываем выбранные локации
                setSelectedProvinceId(null);
                setSelectedCityId(null);
                setSelectedSuburbIds([]);
                setSelectedDistrictIds([]);
                setManualAddress('');
            } else {
                const errorText = await response.text();
                console.error('Error response text:', errorText);

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

    const handleSuccessClose = () => {
        setShowSuccessModal(false);

        if (selectedCategory) {
            navigate(`/search-service?category=${selectedCategory}&source=created`);
        } else {
            navigate('/search-service?source=created');
        }
    };

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

                        {/* Адрес - как в CityPage */}
                        <div className={styles.section}>
                            <h2>Адрес</h2>
                            <div className={styles.addressSection}>
                                {/* Поле для ручного ввода адреса */}
                                <div className={styles.manualAddressInput}>
                                    <input
                                        type="text"
                                        value={manualAddress}
                                        onChange={handleManualAddressChange}
                                        placeholder="Область, город, район"
                                        className={styles.addressInput}
                                        required
                                    />
                                </div>

                                {/* Информация о выбранных элементах */}
                                {(selectedSuburbIds.length > 0 || selectedDistrictIds.length > 0) && (
                                    <div className={styles.selected_summary}>
                                        {selectedSuburbIds.length > 0 && (
                                            <div className={styles.selected_items}>
                                                <strong>Районы города:</strong> {selectedSuburbs.map(s => s.title).join(', ')}
                                                {selectedCity && ` (${selectedCity.title})`}
                                            </div>
                                        )}
                                        {selectedDistrictIds.length > 0 && (
                                            <div className={styles.selected_items}>
                                                <strong>Районы области:</strong> {selectedDistricts.map(d => d.title).join(', ')}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Шаг 1: Выбор области */}
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

                        {/* Шаг 2: Выбор города (только после выбора области) */}
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
                                            {city.suburbs && city.suburbs.length > 0 && (
                                                <div className={styles.city_districts_count}>
                                                    {city.suburbs.length} районов
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Шаг 3A: Выбор районов города */}
                        {selectedCityId && suburbsInSelectedCity.length > 0 && (
                            <div className={styles.district_section}>
                                <h3>Выберите районы города {selectedCity?.title} (можно выбрать несколько)</h3>
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

                        {/* Шаг 3B: Выбор общих районы области */}
                        {selectedProvinceId && districtsInSelectedProvince.length > 0 && (
                            <div className={styles.district_section}>
                                <h3>Выберите районы в области (можно выбрать несколько)</h3>
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
                                disabled={isSubmitting}
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
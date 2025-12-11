import {useState, useEffect, type ChangeEvent} from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthToken } from '../../utils/auth';
import styles from './CityPage.module.scss';

interface City {
    id: number;
    title: string;
    description: string;
    image: string;
    province: {
        id: number;
        title: string;
        description: string;
    };
    suburbs: Array<{
        id: number;
        title: string;
        description: string;
    }>;
}

interface District {
    id: number;
    title: string;
    description: string;
    image: string;
    province: {
        id: number;
        title: string;
        description: string;
    };
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

interface Province {
    id: number;
    title: string;
    description: string;
}

interface AddressApiData {
    id?: number;
    province?: string | { id: number; title: string };
    district?: string | { id: number; title: string };
    city?: string | { id: number; title: string };
    suburb?: string | { id: number; title: string };
}

function CityPage() {
    const navigate = useNavigate();
    const [cities, setCities] = useState<City[]>([]);
    const [provinces, setProvinces] = useState<Province[]>([]);
    const [districts, setDistricts] = useState<District[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [remoteWork, setRemoteWork] = useState(false);
    const [manualAddress, setManualAddress] = useState<string>('');
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

    const [selectedProvinceId, setSelectedProvinceId] = useState<number | null>(null);
    const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
    const [selectedSuburbIds, setSelectedSuburbIds] = useState<number[]>([]);
    const [selectedDistrictIds, setSelectedDistrictIds] = useState<number[]>([]);

    useEffect(() => {
        fetchUserData();
        fetchProvinces();
        fetchCities();
        fetchDistricts();
    }, []);

    // Получаем города выбранной провинции
    const citiesInSelectedProvince = selectedProvinceId
        ? cities.filter(city => city.province.id === selectedProvinceId)
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
        ? districts.filter(district => district.province.id === selectedProvinceId)
        : [];

    // Получаем выбранные районы города
    const selectedSuburbs = suburbsInSelectedCity.filter(
        suburb => selectedSuburbIds.includes(suburb.id)
    );

    // Получаем выбранные общие районы
    const selectedDistricts = districtsInSelectedProvince.filter(
        district => selectedDistrictIds.includes(district.id)
    );

    // Эффект для обновления адреса при выборе районов
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

        // Если ничего не выбрано, но есть ручной адрес
        if (!address && manualAddress) {
            address = manualAddress;
        }

        setManualAddress(address);
    }, [selectedSuburbIds, selectedDistrictIds, selectedCityId, selectedProvinceId, provinces, cities]);

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
            setSelectedDistrictIds([]);
        }
    }, [selectedCityId]);

    const fetchProvinces = async () => {
        try {
            setIsLoading(true);
            const token = getAuthToken();
            if (!token) return;

            const response = await fetch(`${API_BASE_URL}/api/provinces`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const provincesData = await response.json();
                console.log('Provinces loaded:', provincesData);
                setProvinces(provincesData);
            } else {
                console.error('Failed to fetch provinces:', response.status);
            }
        } catch (error) {
            console.error('Error fetching provinces:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchCities = async () => {
        try {
            const token = getAuthToken();
            if (!token) return;

            const response = await fetch(`${API_BASE_URL}/api/cities`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const citiesData = await response.json();
                console.log('Cities loaded:', citiesData);
                setCities(citiesData);
            } else {
                console.error('Failed to fetch cities:', response.status);
            }
        } catch (error) {
            console.error('Error fetching cities:', error);
        }
    };

    const fetchDistricts = async () => {
        try {
            const token = getAuthToken();
            if (!token) return;

            const response = await fetch(`${API_BASE_URL}/api/districts`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const districtsData = await response.json();
                console.log('Districts loaded:', districtsData);
                setDistricts(districtsData);
            } else {
                console.error('Failed to fetch districts:', response.status);
            }
        } catch (error) {
            console.error('Error fetching districts:', error);
        }
    };

    const fetchUserData = async () => {
        try {
            const token = getAuthToken();
            if (!token) {
                navigate('/');
                return;
            }

            const response = await fetch(`${API_BASE_URL}/api/users/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const userData = await response.json();
                console.log('User data loaded:', userData);

                // Восстанавливаем настройку удаленной работы (используем atHome вместо remotely)
                setRemoteWork(userData.atHome || false);

                // Восстанавливаем выбранные районы из addresses
                if (userData.addresses && userData.addresses.length > 0) {
                    console.log('User addresses found:', userData.addresses);

                    const districtIds: number[] = [];
                    const suburbIds: number[] = [];

                    userData.addresses.forEach((address: AddressApiData) => {
                        // Обрабатываем district
                        if (address.district) {
                            if (typeof address.district === 'string') {
                                const parts = address.district.split('/');
                                const id = parseInt(parts[parts.length - 1] || '0');
                                if (id) districtIds.push(id);
                            } else if (address.district && typeof address.district === 'object' && 'id' in address.district) {
                                districtIds.push(address.district.id);
                            }
                        }

                        // Обрабатываем suburb
                        if (address.suburb) {
                            if (typeof address.suburb === 'string') {
                                const parts = address.suburb.split('/');
                                const id = parseInt(parts[parts.length - 1] || '0');
                                if (id) suburbIds.push(id);
                            } else if (address.suburb && typeof address.suburb === 'object' && 'id' in address.suburb) {
                                suburbIds.push(address.suburb.id);
                            }
                        }
                    });

                    console.log('Restoring district IDs:', districtIds);
                    console.log('Restoring suburb IDs:', suburbIds);

                    if (districtIds.length > 0) {
                        setSelectedDistrictIds(districtIds);
                    }

                    if (suburbIds.length > 0) {
                        setSelectedSuburbIds(suburbIds);
                    }

                    // Восстанавливаем город и провинцию из первого адреса
                    if (userData.addresses[0]) {
                        const firstAddress = userData.addresses[0];

                        // Город
                        if (firstAddress.city) {
                            if (typeof firstAddress.city === 'string') {
                                const parts = firstAddress.city.split('/');
                                const cityId = parseInt(parts[parts.length - 1] || '0');
                                if (cityId) setSelectedCityId(cityId);
                            } else if (firstAddress.city && typeof firstAddress.city === 'object' && 'id' in firstAddress.city) {
                                setSelectedCityId(firstAddress.city.id);
                            }
                        }

                        // Провинция
                        if (firstAddress.province) {
                            if (typeof firstAddress.province === 'string') {
                                const parts = firstAddress.province.split('/');
                                const provinceId = parseInt(parts[parts.length - 1] || '0');
                                if (provinceId) setSelectedProvinceId(provinceId);
                            } else if (firstAddress.province && typeof firstAddress.province === 'object' && 'id' in firstAddress.province) {
                                setSelectedProvinceId(firstAddress.province.id);
                            }
                        }
                    }
                } else if (userData.districts && userData.districts.length > 0) {
                    // Для обратной совместимости с полем districts
                    console.log('Old districts field found:', userData.districts);

                    const districtIds: number[] = [];

                    userData.districts.forEach((districtIri: string | { id: number }) => {
                        if (typeof districtIri === 'string') {
                            const parts = districtIri.split('/');
                            const id = parseInt(parts[parts.length - 1] || '0');
                            if (id) districtIds.push(id);
                        } else if (districtIri && typeof districtIri === 'object' && 'id' in districtIri) {
                            districtIds.push(districtIri.id);
                        }
                    });

                    if (districtIds.length > 0) {
                        setSelectedDistrictIds(districtIds);
                        // Загружаем информацию о районах для определения провинции
                        loadDistrictsInfo(districtIds, token);
                    }
                }
            } else {
                console.error('Failed to fetch user data:', response.status);
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
        }
    };

    const loadDistrictsInfo = async (districtIds: number[], token: string) => {
        try {
            // Загружаем информацию о каждом районе
            const districtsPromises = districtIds.map(id =>
                fetch(`${API_BASE_URL}/api/districts/${id}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                }).then(res => res.ok ? res.json() : null)
            );

            const districtsData = await Promise.all(districtsPromises);
            const validDistricts = districtsData.filter(Boolean) as District[];

            if (validDistricts.length > 0) {
                // Определяем провинцию по первому району
                const firstDistrict = validDistricts[0];
                if (firstDistrict.province && firstDistrict.province.id) {
                    setSelectedProvinceId(firstDistrict.province.id);
                }
            }
        } catch (error) {
            console.error('Error loading districts info:', error);
        }
    };

    // Обработчики выбора
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
                // Удаляем из выбранных
                return prev.filter(id => id !== suburbId);
            } else {
                // Добавляем к выбранным
                return [...prev, suburbId];
            }
        });
    };

    const handleDistrictSelect = (districtId: number) => {
        console.log('District toggle:', districtId);
        setSelectedDistrictIds(prev => {
            if (prev.includes(districtId)) {
                // Удаляем из выбранных
                return prev.filter(id => id !== districtId);
            } else {
                // Добавляем к выбранным
                return [...prev, districtId];
            }
        });
    };

    const handleManualAddressChange = (e: ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setManualAddress(value);
    };

    const handleSaveAddress = async () => {
        if (!manualAddress.trim()) {
            alert('Пожалуйста, введите адрес или выберите город/районы');
            return;
        }

        try {
            const token = getAuthToken();
            if (!token) {
                navigate('/');
                return;
            }

            // Сначала получаем данные пользователя
            const userResponse = await fetch(`${API_BASE_URL}/api/users/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!userResponse.ok) {
                throw new Error('Failed to fetch user data');
            }

            const userData = await userResponse.json();
            const userId = userData.id;

            // Подготавливаем данные для обновления
            const updateData: Record<string, unknown> = {
                atHome: remoteWork // Используем atHome вместо remotely
            };

            // Собираем все выбранные районы для поля addresses
            const addresses: Array<Record<string, unknown>> = [];

            // Добавляем районы города
            selectedSuburbIds.forEach(suburbId => {
                addresses.push({
                    suburb: `/api/districts/${suburbId}`,
                    ...(selectedCityId && { city: `/api/cities/${selectedCityId}` }),
                    ...(selectedProvinceId && { province: `/api/provinces/${selectedProvinceId}` })
                });
            });

            // Добавляем общие районы
            selectedDistrictIds.forEach(districtId => {
                addresses.push({
                    district: `/api/districts/${districtId}`,
                    ...(selectedProvinceId && { province: `/api/provinces/${selectedProvinceId}` })
                });
            });

            // Если выбраны только город, но есть районы у города
            if (selectedCityId && addresses.length === 0) {
                const city = cities.find(c => c.id === selectedCityId);
                if (city && city.suburbs && city.suburbs.length > 0) {
                    // Берем все районы города
                    city.suburbs.forEach(suburb => {
                        addresses.push({
                            suburb: `/api/districts/${suburb.id}`,
                            city: `/api/cities/${selectedCityId}`,
                            ...(selectedProvinceId && { province: `/api/provinces/${selectedProvinceId}` })
                        });
                    });
                } else if (selectedProvinceId) {
                    // Если у города нет районов, но есть провинция
                    addresses.push({
                        city: `/api/cities/${selectedCityId}`,
                        province: `/api/provinces/${selectedProvinceId}`
                    });
                }
            }

            // Если есть адреса, добавляем их в поле addresses
            if (addresses.length > 0) {
                updateData.addresses = addresses;
                console.log('Saving addresses:', addresses);
            }

            console.log('Sending update data:', updateData);

            const updateResponse = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/merge-patch+json',
                },
                body: JSON.stringify(updateData),
            });

            if (updateResponse.ok) {
                console.log('Address updated successfully');
                alert('Адрес успешно сохранен!');
                navigate('/profile');
            } else {
                const errorText = await updateResponse.text();
                console.error('Failed to update address:', errorText);

                try {
                    const errorJson = JSON.parse(errorText) as {
                        violations?: Array<{ propertyPath: string; message: string }>;
                        detail?: string;
                        message?: string;
                    };

                    console.error('Error details:', errorJson);

                    // Проверяем, есть ли более подробная информация об ошибке
                    if (errorJson.violations && errorJson.violations.length > 0) {
                        const violations = errorJson.violations.map((v) =>
                            `${v.propertyPath}: ${v.message}`
                        ).join(', ');
                        alert(`Ошибка валидации: ${violations}`);
                    } else if (errorJson.detail) {
                        alert(`Ошибка: ${errorJson.detail}`);
                    } else if (errorJson.message) {
                        alert(`Ошибка: ${errorJson.message}`);
                    } else {
                        alert('Ошибка при сохранении адреса');
                    }
                } catch {
                    alert('Ошибка при сохранении адреса');
                }
            }
        } catch (error) {
            console.error('Error saving address:', error);
            alert('Ошибка при сохранении адреса');
        }
    };

    const handleRemoteWorkToggle = () => {
        const newRemoteWork = !remoteWork;
        setRemoteWork(newRemoteWork);

        // Сохраняем немедленно без ожидания сохранения адреса
        saveRemoteWorkSetting(newRemoteWork);
    };

    const saveRemoteWorkSetting = async (newRemoteWork: boolean) => {
        try {
            const token = getAuthToken();
            if (!token) {
                console.error('No auth token');
                return;
            }

            // Получаем текущего пользователя
            const userResponse = await fetch(`${API_BASE_URL}/api/users/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!userResponse.ok) {
                console.error('Failed to fetch user data');
                return;
            }

            const userData = await userResponse.json();
            const userId = userData.id;

            console.log(`Saving remote work setting: ${newRemoteWork} for user ${userId}`);

            // Обновляем только поле atHome (вместо remotely)
            const updateData = {
                atHome: newRemoteWork
            };

            const updateResponse = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/merge-patch+json',
                },
                body: JSON.stringify(updateData),
            });

            if (updateResponse.ok) {
                console.log('Remote work setting updated successfully');

                // Получаем обновленные данные пользователя для проверки
                const updatedUserResponse = await fetch(`${API_BASE_URL}/api/users/me`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (updatedUserResponse.ok) {
                    const updatedUser = await updatedUserResponse.json();
                    // Убеждаемся, что состояние синхронизировано с сервером
                    setRemoteWork(updatedUser.atHome || false);
                } else {
                    // Если не удалось получить обновленные данные, все равно обновляем локальное состояние
                    setRemoteWork(newRemoteWork);
                }
            } else {
                const errorText = await updateResponse.text();
                console.error('Failed to update remote work setting:', errorText);

                // Возвращаем переключатель в исходное состояние
                setRemoteWork(!newRemoteWork);

                // Показываем пользователю, что сохранение не удалось
                alert('Не удалось сохранить настройку удаленной работы');
            }
        } catch (error) {
            console.error('Error saving remote work setting:', error);

            // Возвращаем переключатель в исходное состояние
            setRemoteWork(!newRemoteWork);
            alert('Ошибка при сохранении настройки удаленной работы');
        }
    };

    return (
        <div className={styles.profile}>
            <div className={styles.profile_wrap}>
                <div className={styles.address_section}>
                    <div className={styles.section_header}>
                        <h2>Адрес работы</h2>
                        <p className={styles.subtitle}>Укажите адрес для определения района заказов. Клиенты его не увидят</p>
                    </div>

                    <div className={styles.address_input}>
                        <div className={styles.address_input_city}>
                            <img src="../fonTest7.png" alt="fonTest7"/>
                            <div className={styles.address_input_adress}>
                                <label>Точный адрес</label>
                                <input
                                    type="text"
                                    placeholder="район, город, область"
                                    className={styles.address_field}
                                    value={manualAddress}
                                    onChange={handleManualAddressChange}
                                />
                            </div>
                        </div>

                        <div className={styles.address_actions}>
                            <button
                                className={styles.save_button}
                                onClick={handleSaveAddress}
                                disabled={!manualAddress.trim()}
                            >
                                Сохранить
                            </button>
                        </div>
                    </div>

                    <div className={styles.remote_work}>
                        <div className={styles.switch_container}>
                            <div className={styles.switch_label}>
                                <span className={styles.label_main}>Могу работать удаленно</span>
                                <span className={styles.label_sub}>Предложи заказы с дистанционной работой</span>
                            </div>
                            <label className={styles.switch}>
                                <input
                                    type="checkbox"
                                    checked={remoteWork}
                                    onChange={handleRemoteWorkToggle}
                                />
                                <span className={styles.slider}></span>
                            </label>
                        </div>
                    </div>

                    {/* Информация о выбранных элементах */}
                    {(selectedSuburbIds.length > 0 || selectedDistrictIds.length > 0) && (
                        <div className={styles.selected_summary}>
                            <h4>Выбрано:</h4>
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

                {/* Шаг 1: Выбор области (Провинции) */}
                <div className={styles.province_section}>
                    <h3>Выберите область (Провинцию)</h3>
                    <div className={styles.province_list}>
                        {isLoading ? (
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

                {/* Шаг 2: Выбор города (только после выбора области) */}
                {selectedProvinceId && (
                    <div className={styles.city_list_section}>
                        <div className={styles.city_section_header}>
                            <h3>Выберите город в {provinces.find(p => p.id === selectedProvinceId)?.title}</h3>
                        </div>
                        <div className={styles.city_list_page}>
                            {citiesInSelectedProvince.length > 0 ? (
                                <div className={styles.city_grid}>
                                    {citiesInSelectedProvince.map(city => (
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
                                                    {city.suburbs.length} районов
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className={styles.no_data}>Города не найдены в выбранной области</div>
                            )}
                        </div>
                    </div>
                )}

                {/* Шаг 3A: Выбор районов города (suburbs) если город выбран и у него есть районы */}
                {selectedCityId && suburbsInSelectedCity.length > 0 && (
                    <div className={styles.district_section}>
                        <div className={styles.district_section_header}>
                            <h3>Выберите районы города {selectedCity?.title} (можно выбрать несколько)</h3>
                        </div>
                        <div className={styles.district_grid}>
                            {suburbsInSelectedCity.map(suburb => (
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

                {/* Шаг 3B: Выбор общих районы (districts) если в провинции есть районы */}
                {selectedProvinceId && districtsInSelectedProvince.length > 0 && (
                    <div className={styles.district_section}>
                        <div className={styles.district_section_header}>
                            <h3>Выберите районы в области {provinces.find(p => p.id === selectedProvinceId)?.title} (можно выбрать несколько)</h3>
                        </div>
                        <div className={styles.district_grid}>
                            {districtsInSelectedProvince.map(district => (
                                <button
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
            </div>
        </div>
    );
}

export default CityPage;
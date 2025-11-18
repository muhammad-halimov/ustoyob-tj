import {useState, useEffect, type ChangeEvent} from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthToken } from '../../utils/auth';
import styles from './CityPage.module.scss';

interface City {
    id: number;
    title: string;
    description: string;
    image: string;
    districts: District[];
}

interface District {
    id: number;
    title: string;
    description: string;
    image: string;
    city: {
        id: number;
        title?: string;
    };
}

interface Province {
    id: number;
    title: string;
    description: string;
    cities: { id: number }[];
}

function CityPage() {
    const navigate = useNavigate();
    const [cities, setCities] = useState<City[]>([]);
    const [provinces, setProvinces] = useState<Province[]>([]);
    const [districts, setDistricts] = useState<District[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [remoteWork, setRemoteWork] = useState(false);
    const [manualAddress, setManualAddress] = useState<string>('');
    const API_BASE_URL = 'https://admin.ustoyob.tj';

    const [selectedProvinceId, setSelectedProvinceId] = useState<number | null>(null);
    const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
    const [selectedDistrictId, setSelectedDistrictId] = useState<number | null>(null);

    useEffect(() => {
        fetchUserData();
        fetchProvinces();
        fetchCities();
        fetchDistricts();
    }, []);

    // Получаем ID городов выбранной области
    const cityIdsInSelectedProvince = selectedProvinceId
        ? provinces.find(p => p.id === selectedProvinceId)?.cities?.map(c => c.id) || []
        : [];

    // Получаем полную информацию о городах выбранной области
    const citiesInSelectedProvince = cities.filter(city =>
        cityIdsInSelectedProvince.includes(city.id)
    );

    // Получаем районы выбранного города
    const districtsInSelectedCity = selectedCityId
        ? districts.filter(district => {
            const districtCityId = typeof district.city === 'object' ? district.city.id : district.city;
            return districtCityId === selectedCityId;
        })
        : [];

    // Эффект для обработки изменений выбранных ID
    useEffect(() => {
        if (selectedProvinceId) {
            const province = provinces.find(p => p.id === selectedProvinceId) || null;
            setSelectedCityId(null);
            setSelectedDistrictId(null);

            if (province) {
                setManualAddress(province.title);
            }
        }
    }, [selectedProvinceId, provinces]);

    useEffect(() => {
        if (selectedCityId) {
            const city = cities.find(c => c.id === selectedCityId) || null;
            setSelectedDistrictId(null);

            if (city) {
                const address = `${city.title}`;
                setManualAddress(address);
            }
        }
    }, [selectedCityId, cities]);

    useEffect(() => {
        if (selectedDistrictId) {
            const district = districts.find(d => d.id === selectedDistrictId) || null;

            if (district) {
                // Формируем полный адрес: район + город
                const cityName = typeof district.city === 'object' && district.city.title
                    ? district.city.title
                    : cities.find(c => c.id === (typeof district.city === 'object' ? district.city.id : district.city))?.title || '';

                const fullAddress = cityName ? `${district.title}, ${cityName}` : district.title;
                setManualAddress(fullAddress);
            }
        }
    }, [selectedDistrictId, districts, cities]);

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
                console.log('User data:', userData);
                setRemoteWork(userData.remotely || false);

                // Восстанавливаем выбранные данные из профиля
                if (userData.districts && userData.districts.length > 0) {
                    const district = userData.districts[0];
                    console.log('User district:', district);

                    if (district && typeof district === 'object') {
                        // Устанавливаем адрес
                        if (district.title) {
                            // Формируем полный адрес из данных района
                            const cityName = district.city && typeof district.city === 'object'
                                ? district.city.title
                                : '';

                            const fullAddress = cityName ? `${district.title}, ${cityName}` : district.title;
                            setManualAddress(fullAddress);
                        }

                        // Восстанавливаем ID
                        if (district.id) {
                            setSelectedDistrictId(district.id);
                        }

                        // Восстанавливаем город
                        if (district.city) {
                            const cityId = typeof district.city === 'object' ? district.city.id : district.city;
                            setSelectedCityId(cityId);

                            // Восстанавливаем область через город
                            if (typeof district.city === 'object' && district.city.id) {
                                // Нужно найти к какой области принадлежит город
                                const cityWithProvince = await fetchCityWithProvince(district.city.id, token);
                                if (cityWithProvince && cityWithProvince.province) {
                                    setSelectedProvinceId(cityWithProvince.province.id);
                                }
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
        }
    };

    // Функция для получения города с информацией об области
    const fetchCityWithProvince = async (cityId: number, token: string) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/cities/${cityId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('Error fetching city:', error);
        }
        return null;
    };

    // Обработчики выбора
    const handleProvinceSelect = (provinceId: number) => {
        console.log('Province selected:', provinceId);
        setSelectedProvinceId(provinceId);
    };

    const handleCitySelect = (cityId: number) => {
        console.log('City selected:', cityId);
        setSelectedCityId(cityId);

        const city = cities.find(c => c.id === cityId);
        if (city) {
            const address = `${city.title}`;
            setManualAddress(address);
        }
    };

    const handleDistrictSelect = (districtId: number) => {
        console.log('District selected:', districtId);
        setSelectedDistrictId(districtId);
    };

    const handleManualAddressChange = (e: ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setManualAddress(value);

        if (value === '') {
            setSelectedProvinceId(null);
            setSelectedCityId(null);
            setSelectedDistrictId(null);
        }
    };

    const handleSaveAddress = async () => {
        if (!manualAddress.trim()) {
            alert('Пожалуйста, введите адрес или выберите город');
            return;
        }

        try {
            const token = getAuthToken();
            if (!token) {
                navigate('/');
                return;
            }

            const userResponse = await fetch(`${API_BASE_URL}/api/users/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (userResponse.ok) {
                const userData = await userResponse.json();
                const userId = userData.id;

                const updateData: any = {
                    remotely: remoteWork
                };

                // СОХРАНЯЕМ РАЙОН В ФОРМАТЕ IRI
                if (selectedDistrictId) {
                    updateData.districts = [`/api/districts/${selectedDistrictId}`];
                    console.log('Saving district IRI:', `/api/districts/${selectedDistrictId}`);
                } else if (selectedCityId) {
                    // Если выбран город, берем первый район этого города
                    const cityDistricts = districts.filter(d => {
                        const districtCityId = typeof d.city === 'object' ? d.city.id : d.city;
                        return districtCityId === selectedCityId;
                    });
                    if (cityDistricts.length > 0) {
                        updateData.districts = [`/api/districts/${cityDistricts[0].id}`];
                        console.log('Saving first district of city:', `/api/districts/${cityDistricts[0].id}`);
                    }
                }
                // Если только ручной ввод - не сохраняем districts

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
        saveRemoteWorkSetting(newRemoteWork);
    };

    const saveRemoteWorkSetting = async (newRemoteWork: boolean) => {
        try {
            const token = getAuthToken();
            if (!token) return;

            const userResponse = await fetch(`${API_BASE_URL}/api/users/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (userResponse.ok) {
                const userData = await userResponse.json();
                const userId = userData.id;

                const updateResponse = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/merge-patch+json',
                    },
                    body: JSON.stringify({
                        remotely: newRemoteWork
                    }),
                });

                if (!updateResponse.ok) {
                    console.error('Failed to update remote work setting');
                }
            }
        } catch (error) {
            console.error('Error saving remote work setting:', error);
        }
    };

    console.log('Selected province ID:', selectedProvinceId);
    console.log('Selected city ID:', selectedCityId);
    console.log('Selected district ID:', selectedDistrictId);
    console.log('Cities in province:', citiesInSelectedProvince);
    console.log('Districts in city:', districtsInSelectedCity);

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

                        <button
                            className={styles.save_button}
                            onClick={handleSaveAddress}
                            disabled={!manualAddress.trim()}
                        >
                            Сохранить
                        </button>
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
                </div>

                {/* Шаг 1: Выбор области */}
                <div className={styles.province_section}>
                    <h3>Выберите область</h3>
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
                        <h3>Выберите город в {provinces.find(p => p.id === selectedProvinceId)?.title}</h3>
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
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className={styles.no_data}>Города не найдены в выбранной области</div>
                            )}
                        </div>
                    </div>
                )}

                {/* Шаг 3: Выбор района (только после выбора города) */}
                {selectedCityId && (
                    <div className={styles.district_section}>
                        <h3>Выберите район в {cities.find(c => c.id === selectedCityId)?.title}</h3>
                        <div className={styles.district_grid}>
                            {districtsInSelectedCity.length > 0 ? (
                                districtsInSelectedCity.map(district => (
                                    <button
                                        key={district.id}
                                        className={`${styles.district_card} ${
                                            selectedDistrictId === district.id ? styles.district_card_selected : ''
                                        }`}
                                        onClick={() => handleDistrictSelect(district.id)}
                                    >
                                        <div className={styles.district_name}>{district.title}</div>
                                    </button>
                                ))
                            ) : (
                                <div className={styles.no_data}>Районы не найдены в выбранном городе</div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default CityPage;
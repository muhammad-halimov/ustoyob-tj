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
    province: Province;
}

interface District {
    id: number;
    title: string;
    image: string;
}

interface Province {
    id: number;
    title: string;
}

function CityPage() {
    const navigate = useNavigate();
    const [cities, setCities] = useState<City[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [remoteWork, setRemoteWork] = useState(false);
    const [selectedCity, setSelectedCity] = useState<string>('');
    const [selectedDistrict, setSelectedDistrict] = useState<District | null>(null);
    const [manualAddress, setManualAddress] = useState<string>('');
    const API_BASE_URL = 'http://usto.tj.auto-schule.ru';

    useEffect(() => {
        fetchUserData();
        fetchCities();
    }, []);

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
                // значение удаленной работы из профиля
                setRemoteWork(userData.remotely || false);

                // Если есть сохраненные районы, заполняем поле адреса
                if (userData.districts && userData.districts.length > 0) {
                    const district = userData.districts[0];
                    if (district.title) {
                        setManualAddress(district.title);
                        setSelectedCity(district.city?.title || '');
                        setSelectedDistrict(district);
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
        }
    };

    const fetchCities = async () => {
        try {
            setIsLoading(true);
            const token = getAuthToken();

            if (!token) {
                navigate('/');
                return;
            }

            const response = await fetch(`${API_BASE_URL}/api/cities`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch cities');
            }

            const citiesData = await response.json();
            setCities(citiesData);
        } catch (error) {
            console.error('Error fetching cities:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCitySelect = async (city: City) => {
        setSelectedCity(city.title);
        setSelectedDistrict(null);

        setManualAddress(city.title);

        // Если у города есть районы, выбираем первый район по умолчанию
        if (city.districts && city.districts.length > 0) {
            setSelectedDistrict(city.districts[0]);
            setManualAddress(`${city.districts[0].title}, ${city.title}`);
        }
    };

    const handleDistrictSelect = (district: District) => {
        setSelectedDistrict(district);
        setManualAddress(`${district.title}, ${selectedCity}`);
    };

    const handleManualAddressChange = (e: ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setManualAddress(value);

        // Сбрасываем выбранный город и район при ручном вводе
        if (value === '') {
            setSelectedCity('');
            setSelectedDistrict(null);
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

                // Подготавливаем данные для отправки
                const updateData: any = {
                    remotely: remoteWork
                };

                // Если выбран район, отправляем его IRI
                if (selectedDistrict) {
                    updateData.districts = [`/api/districts/${selectedDistrict.id}`];
                    console.log('Saving district:', selectedDistrict.title);
                } else if (selectedCity) {
                    // Если выбран только город, ищем его в базе и берем первый район
                    const city = cities.find(c => c.title === selectedCity);
                    if (city && city.districts && city.districts.length > 0) {
                        updateData.districts = [`/api/districts/${city.districts[0].id}`];
                        console.log('Saving first district of city:', city.districts[0].title);
                    } else {
                        // Если районов нет, не сохраняем в districts
                        console.log('No districts found for city, skipping district assignment');
                    }
                } else {
                    // Если ручной ввод, не сохраняем в districts
                    console.log('Manual address input, skipping district assignment');
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
                    console.log('Address updated successfully in districts');
                    navigate('/profile');
                } else {
                    const errorText = await updateResponse.text();
                    console.error('Failed to update address in districts:', errorText);

                    // Пробуем альтернативный способ с правильным форматом IRI
                    await saveAddressWithFullIRI();
                }
            }
        } catch (error) {
            console.error('Error saving address:', error);
            // Альтернативный способ
            await saveAddressWithFullIRI();
        }
    };

    // Альтернативный способ сохранения с полным
    const saveAddressWithFullIRI = async () => {
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

                const updateData: any = {
                    remotely: remoteWork
                };

                // Используем полный IRI для districts
                if (selectedDistrict) {
                    updateData.districts = [`${API_BASE_URL}/api/districts/${selectedDistrict.id}`];
                } else if (selectedCity) {
                    const city = cities.find(c => c.title === selectedCity);
                    if (city && city.districts && city.districts.length > 0) {
                        updateData.districts = [`${API_BASE_URL}/api/districts/${city.districts[0].id}`];
                    }
                }

                console.log('Trying alternative save with full IRI:', updateData);

                const updateResponse = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/merge-patch+json',
                    },
                    body: JSON.stringify(updateData),
                });

                if (updateResponse.ok) {
                    console.log('Address saved successfully with full IRI');
                    navigate('/profile');
                } else {
                    const errorText = await updateResponse.text();
                    console.error('Alternative save failed:', errorText);
                    alert('Ошибка при сохранении адреса');
                }
            }
        } catch (error) {
            console.error('Error in alternative save:', error);
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
            if (!token) {
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

                if (updateResponse.ok) {
                    console.log('Remote work setting updated successfully');
                } else {
                    console.error('Failed to update remote work setting');
                }
            }
        } catch (error) {
            console.error('Error saving remote work setting:', error);
        }
    };

    // Получаем выбранный город для отображения районов
    const selectedCityData = cities.find(city => city.title === selectedCity);

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
                                    placeholder="район, город"
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

                <div className={styles.city_list_section}>
                    <h3>Выберите город</h3>
                    <div className={styles.city_list_page}>
                        {isLoading ? (
                            <div className={styles.loading}>Загрузка городов...</div>
                        ) : cities.length > 0 ? (
                            <div className={styles.city_grid}>
                                {cities.map(city => (
                                    <button
                                        key={city.id}
                                        className={`${styles.city_card} ${
                                            selectedCity === city.title ? styles.city_card_selected : ''
                                        }`}
                                        onClick={() => handleCitySelect(city)}
                                    >
                                        {city.title}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className={styles.no_cities}>Города не найдены</div>
                        )}
                    </div>

                    {/* Секция выбора района */}
                    {selectedCityData && selectedCityData.districts && selectedCityData.districts.length > 0 && (
                        <div className={styles.district_section}>
                            <h3>Выберите район в {selectedCity}</h3>
                            <div className={styles.district_grid}>
                                {selectedCityData.districts.map(district => (
                                    <button
                                        key={district.id}
                                        className={`${styles.district_card} ${
                                            selectedDistrict?.id === district.id ? styles.district_card_selected : ''
                                        }`}
                                        onClick={() => handleDistrictSelect(district)}
                                    >
                                        {district.title}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default CityPage;
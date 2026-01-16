import { useState, useEffect, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthToken } from '../../utils/auth';
import styles from './CityPage.module.scss';

interface City {
    id: number;
    title: string;
    description: string;
    image: string;
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
    settlements: Array<{
        id: number;
        title: string;
        description: string;
        villages: Array<{
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
    cities: City[];
    districts: District[];
}

interface AddressApiData {
    id?: number;
    province?: string | { id: number; title: string };
    district?: string | { id: number; title: string };
    city?: string | { id: number; title: string };
    suburb?: string | { id: number; title: string };
    settlement?: string | { id: number; title: string };
    community?: string | { id: number; title: string };
    village?: string | { id: number; title: string };
}

interface UserApiData {
    id: number;
    email?: string;
    name?: string;
    surname?: string;
    patronymic?: string;
    rating?: number;
    image?: string;
    atHome?: boolean;
    addresses?: AddressApiData[];
    [key: string]: unknown;
}

function CityPage() {
    const navigate = useNavigate();
    const [provinces, setProvinces] = useState<Province[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [remoteWork, setRemoteWork] = useState(false);
    const [manualAddress, setManualAddress] = useState<string>('');
    const [userDataLoaded, setUserDataLoaded] = useState(false);

    // Состояния выбора
    const [selectedProvinceId, setSelectedProvinceId] = useState<number | null>(null);
    const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
    const [selectedDistrictId, setSelectedDistrictId] = useState<number | null>(null);
    const [selectedSuburbIds, setSelectedSuburbIds] = useState<number[]>([]);
    const [selectedSettlementId, setSelectedSettlementId] = useState<number | null>(null);
    const [selectedCommunityId, setSelectedCommunityId] = useState<number | null>(null);
    const [selectedVillageId, setSelectedVillageId] = useState<number | null>(null);

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://admin.ustoyob.tj';

    // Получаем выбранную провинцию
    const selectedProvince = selectedProvinceId
        ? provinces.find(p => p.id === selectedProvinceId)
        : null;

    // Получаем города выбранной провинции
    const citiesInSelectedProvince = selectedProvince
        ? selectedProvince.cities || []
        : [];

    // Получаем районы (districts) выбранной провинции
    const districtsInSelectedProvince = selectedProvince
        ? selectedProvince.districts || []
        : [];

    // Получаем выбранный город
    const selectedCity = selectedCityId
        ? citiesInSelectedProvince.find(city => city.id === selectedCityId)
        : null;

    // Получаем районы (suburbs) выбранного города
    const suburbsInSelectedCity = selectedCity
        ? selectedCity.suburbs || []
        : [];

    // Получаем выбранный район (district)
    const selectedDistrict = selectedDistrictId
        ? districtsInSelectedProvince.find(district => district.id === selectedDistrictId)
        : null;

    // Получаем поселения (settlements) выбранного района
    const settlementsInSelectedDistrict = selectedDistrict
        ? selectedDistrict.settlements || []
        : [];

    // Получаем ПГТ (communities) выбранного района
    const communitiesInSelectedDistrict = selectedDistrict
        ? selectedDistrict.communities || []
        : [];

    // Получаем выбранное поселение
    const selectedSettlement = selectedSettlementId
        ? settlementsInSelectedDistrict.find(s => s.id === selectedSettlementId)
        : null;

    // Получаем деревни (villages) выбранного поселения
    const villagesInSelectedSettlement = selectedSettlement
        ? selectedSettlement.villages || []
        : [];

    useEffect(() => {
        fetchProvinces().then(() => {
            fetchUserData();
        });
    }, []);

    // Эффект для восстановления адреса после загрузки провинций
    useEffect(() => {
        if (provinces.length > 0 && userDataLoaded) {
            updateAddressFromSelections();
        }
    }, [provinces, userDataLoaded, selectedProvinceId, selectedCityId, selectedDistrictId]);

    const updateAddressFromSelections = () => {
        const addressParts: string[] = [];

        // Добавляем провинцию
        if (selectedProvince) {
            addressParts.push(selectedProvince.title);
        }

        // Добавляем город и его кварталы
        if (selectedCity) {
            addressParts.push(selectedCity.title);

            // Добавляем выбранные районы города (suburbs) - кварталы
            if (selectedSuburbIds.length > 0) {
                const suburbTitles = suburbsInSelectedCity
                    .filter(s => selectedSuburbIds.includes(s.id))
                    .map(s => s.title);

                // Если выбраны несколько кварталов, добавляем их через запятую
                if (suburbTitles.length > 0) {
                    addressParts.push(...suburbTitles);
                }
            }
        }
        // Добавляем район (district) и его вложенные элементы
        else if (selectedDistrict) {
            addressParts.push(selectedDistrict.title);

            // Добавляем выбранное ПГТ или поселение
            if (selectedCommunityId) {
                const community = communitiesInSelectedDistrict.find(c => c.id === selectedCommunityId);
                if (community) {
                    addressParts.push(community.title); // ПГТ
                }
            } else if (selectedSettlementId) {
                const settlement = settlementsInSelectedDistrict.find(s => s.id === selectedSettlementId);
                if (settlement) {
                    addressParts.push(settlement.title); // Поселок

                    // Добавляем выбранную деревню
                    if (selectedVillageId) {
                        const village = villagesInSelectedSettlement.find(v => v.id === selectedVillageId);
                        if (village) {
                            addressParts.push(village.title); // Село
                        }
                    }
                }
            }
        }

        // Обновляем ручной адрес
        if (addressParts.length > 0) {
            const newAddress = addressParts.join(', ');
            setManualAddress(newAddress);
        }
    };

    // Эффекты для сброса зависимых выборов
    useEffect(() => {
        if (selectedProvinceId) {
            setSelectedCityId(null);
            setSelectedDistrictId(null);
            setSelectedSuburbIds([]);
            setSelectedSettlementId(null);
            setSelectedCommunityId(null);
            setSelectedVillageId(null);
        }
    }, [selectedProvinceId]);

    useEffect(() => {
        if (selectedCityId) {
            setSelectedDistrictId(null);
            setSelectedSettlementId(null);
            setSelectedCommunityId(null);
            setSelectedVillageId(null);
            setSelectedSuburbIds([]);
        }
    }, [selectedCityId]);

    useEffect(() => {
        if (selectedDistrictId) {
            setSelectedCityId(null);
            setSelectedSuburbIds([]);
            setSelectedSettlementId(null);
            setSelectedCommunityId(null);
            setSelectedVillageId(null);
        }
    }, [selectedDistrictId]);

    useEffect(() => {
        if (selectedSettlementId) {
            setSelectedCommunityId(null);
            setSelectedVillageId(null);
        }
    }, [selectedSettlementId]);

    const fetchProvinces = async (): Promise<void> => {
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
                const userData: UserApiData = await response.json();
                console.log('User data loaded for address restoration:', userData);

                // Восстанавливаем настройку удаленной работы
                setRemoteWork(userData.atHome || false);

                // Восстанавливаем выбранные адреса с безопасной проверкой
                const userAddresses = userData.addresses as AddressApiData[] | undefined;

                if (userAddresses && Array.isArray(userAddresses) && userAddresses.length > 0) {
                    console.log('User addresses found:', userAddresses);

                    // Ждем немного, чтобы провинции точно загрузились
                    setTimeout(() => {
                        // Берем первый адрес для восстановления
                        const firstAddress = userAddresses[0];
                        restoreAddressFromData(firstAddress);
                        setUserDataLoaded(true);
                    }, 100);
                } else {
                    setUserDataLoaded(true);
                }
            } else {
                console.error('Failed to fetch user data:', response.status);
                setUserDataLoaded(true);
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
            setUserDataLoaded(true);
        }
    };

    const getResourceId = (resource: string | { id: number; title: string }): number | null => {
        if (typeof resource === 'string') {
            const parts = resource.split('/');
            const id = parseInt(parts[parts.length - 1] || '0');
            return id || null;
        } else if (resource && typeof resource === 'object' && 'id' in resource) {
            return resource.id;
        }
        return null;
    };

    const restoreAddressFromData = (address: AddressApiData) => {
        console.log('Restoring address from data:', address);

        // Восстанавливаем провинцию
        if (address.province) {
            const provinceId = getResourceId(address.province);
            console.log('Restoring province ID:', provinceId);
            if (provinceId) {
                setSelectedProvinceId(provinceId);

                // Даем время на обновление состояния, затем восстанавливаем вложенные элементы
                setTimeout(() => {
                    const province = provinces.find(p => p.id === provinceId);
                    if (!province) {
                        console.log('Province not found:', provinceId);
                        return;
                    }

                    console.log('Province found:', province.title);
                    console.log('Available cities:', province.cities);
                    console.log('Available districts:', province.districts);

                    // Проверяем, есть ли город
                    if (address.city) {
                        const cityId = getResourceId(address.city);
                        console.log('Restoring city ID:', cityId);
                        if (cityId) {
                            const cityExists = province.cities?.some(city => city.id === cityId);
                            if (cityExists) {
                                setSelectedCityId(cityId);
                                console.log('City restored:', cityId);

                                // Даем время на обновление, затем восстанавливаем кварталы
                                setTimeout(() => {
                                    if (address.suburb) {
                                        const suburbId = getResourceId(address.suburb);
                                        console.log('Restoring suburb ID:', suburbId);
                                        if (suburbId) {
                                            setSelectedSuburbIds([suburbId]);
                                        }
                                    }
                                }, 50);
                            }
                        }
                    }
                    // Проверяем, есть ли район (district)
                    else if (address.district) {
                        const districtId = getResourceId(address.district);
                        console.log('Restoring district ID:', districtId);
                        if (districtId) {
                            const districtExists = province.districts?.some(district => district.id === districtId);
                            if (districtExists) {
                                setSelectedDistrictId(districtId);
                                console.log('District restored:', districtId);

                                // Даем время на обновление, затем восстанавливаем вложенные элементы
                                setTimeout(() => {
                                    // Восстанавливаем ПГТ или поселение
                                    if (address.community) {
                                        const communityId = getResourceId(address.community);
                                        console.log('Restoring community ID:', communityId);
                                        if (communityId) {
                                            setSelectedCommunityId(communityId);
                                        }
                                    } else if (address.settlement) {
                                        const settlementId = getResourceId(address.settlement);
                                        console.log('Restoring settlement ID:', settlementId);
                                        if (settlementId) {
                                            setSelectedSettlementId(settlementId);

                                            // Восстанавливаем деревню (село)
                                            setTimeout(() => {
                                                if (address.village) {
                                                    const villageId = getResourceId(address.village);
                                                    console.log('Restoring village ID:', villageId);
                                                    if (villageId) {
                                                        setSelectedVillageId(villageId);
                                                    }
                                                }
                                            }, 50);
                                        }
                                    }
                                }, 50);
                            }
                        }
                    }
                }, 100);
            }
        }
    };

    // Обработчики выбора
    const handleProvinceSelect = (provinceId: number) => {
        setSelectedProvinceId(provinceId);
    };

    const handleCitySelect = (cityId: number) => {
        setSelectedCityId(cityId);
    };

    const handleDistrictSelect = (districtId: number) => {
        setSelectedDistrictId(districtId);
    };

    const handleSuburbSelect = (suburbId: number) => {
        setSelectedSuburbIds(prev => {
            if (prev.includes(suburbId)) {
                return prev.filter(id => id !== suburbId);
            } else {
                return [...prev, suburbId];
            }
        });
    };

    const handleSettlementSelect = (settlementId: number) => {
        setSelectedSettlementId(settlementId);
        setSelectedCommunityId(null); // Сбрасываем выбор ПГТ
    };

    const handleCommunitySelect = (communityId: number) => {
        setSelectedCommunityId(communityId);
        setSelectedSettlementId(null); // Сбрасываем выбор поселения
    };

    const handleVillageSelect = (villageId: number) => {
        setSelectedVillageId(villageId);
    };

    const handleManualAddressChange = (e: ChangeEvent<HTMLInputElement>) => {
        setManualAddress(e.target.value);
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
                atHome: remoteWork
            };

            // Собираем адреса
            const addresses: Array<Record<string, unknown>> = [];

            if (selectedCityId) {
                // Если выбран город
                if (selectedSuburbIds.length > 0) {
                    // Добавляем каждый выбранный район города (квартал) как отдельный адрес
                    selectedSuburbIds.forEach(suburbId => {
                        addresses.push({
                            suburb: `/api/suburbs/${suburbId}`,
                            city: `/api/cities/${selectedCityId}`,
                            ...(selectedProvinceId && { province: `/api/provinces/${selectedProvinceId}` })
                        });
                    });
                } else {
                    // Добавляем сам город
                    addresses.push({
                        city: `/api/cities/${selectedCityId}`,
                        ...(selectedProvinceId && { province: `/api/provinces/${selectedProvinceId}` })
                    });
                }
            } else if (selectedDistrictId) {
                // Если выбран район (district)
                if (selectedCommunityId) {
                    // Добавляем ПГТ
                    addresses.push({
                        community: `/api/communities/${selectedCommunityId}`,
                        district: `/api/districts/${selectedDistrictId}`,
                        ...(selectedProvinceId && { province: `/api/provinces/${selectedProvinceId}` })
                    });
                } else if (selectedSettlementId) {
                    // Добавляем поселение (поселок)
                    const addressEntry: Record<string, unknown> = {
                        settlement: `/api/settlements/${selectedSettlementId}`,
                        district: `/api/districts/${selectedDistrictId}`,
                        ...(selectedProvinceId && { province: `/api/provinces/${selectedProvinceId}` })
                    };

                    // Добавляем деревню (село), если выбрана
                    if (selectedVillageId) {
                        addressEntry.village = `/api/villages/${selectedVillageId}`;
                    }

                    addresses.push(addressEntry);
                } else {
                    // Добавляем сам район
                    addresses.push({
                        district: `/api/districts/${selectedDistrictId}`,
                        ...(selectedProvinceId && { province: `/api/provinces/${selectedProvinceId}` })
                    });
                }
            }

            // Если есть адреса, добавляем их
            if (addresses.length > 0) {
                updateData.addresses = addresses;
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
                alert('Адрес успешно сохранен!');
                navigate('/profile');
            } else {
                const errorText = await updateResponse.text();
                console.error('Failed to update address:', errorText);
                alert('Ошибка при сохранении адреса');
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

            if (!userResponse.ok) return;

            const userData = await userResponse.json();
            const userId = userData.id;

            const updateResponse = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/merge-patch+json',
                },
                body: JSON.stringify({ atHome: newRemoteWork }),
            });

            if (!updateResponse.ok) {
                setRemoteWork(!newRemoteWork);
                alert('Не удалось сохранить настройку удаленной работы');
            }
        } catch (error) {
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
                            {/*<img src="../fonTest7.png" alt="fonTest7"/>*/}
                            <div className={styles.address_input_adress}>
                                <label>Точный адрес</label>
                                <input
                                    type="text"
                                    placeholder="Область, Город/Район, Квартал/ПГТ/Поселок, Село"
                                    className={styles.address_field}
                                    value={manualAddress}
                                    onChange={handleManualAddressChange}
                                    readOnly
                                />
                                <p className={styles.address_hint}>Адрес автоматически формируется из выбранных элементов</p>
                            </div>
                        </div>

                        <div className={styles.address_actions}>
                            <button
                                className={styles.save_button}
                                onClick={handleSaveAddress}
                                disabled={!manualAddress.trim() || !selectedProvinceId}
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
                </div>

                {/* Шаг 1: Выбор области */}
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

                {/* Шаг 2: Выбор города или района (в одной строке) */}
                {selectedProvince && (
                    <div className={styles.combined_section}>
                        <h3>Населенные пункты в {selectedProvince.title}</h3>

                        <div className={styles.combined_container}>
                            {/* Города */}
                            {citiesInSelectedProvince.length > 0 && (
                                <div className={styles.cities_container}>
                                    <h4>Города</h4>
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
                                        {districtsInSelectedProvince.map(district => (
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

                {/* Шаг 3A: Кварталы (suburbs) выбранного города */}
                {selectedCity && suburbsInSelectedCity.length > 0 && (
                    <div className={styles.suburbs_section}>
                        <div className={styles.section_header}>
                            <h3>Кварталы города {selectedCity.title} (можно выбрать несколько)</h3>
                            <p className={styles.subtitle}>Выберите кварталы, в которых вы работаете</p>
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

                {/* Шаг 3B: ПГТ и поселения выбранного района */}
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
                                        {communitiesInSelectedDistrict.map(community => (
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
                                        {settlementsInSelectedDistrict.map(settlement => (
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
                                    {villagesInSelectedSettlement.map(village => (
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
        </div>
    );
}

export default CityPage;
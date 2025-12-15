import { useState, useEffect } from 'react';
import styles from './LocationSelector.module.scss';

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

interface LocationSelectorProps {
    API_BASE_URL: string;
    token: string;
    onLocationChange: (locationData: {
        selectedProvinceId: number | null;
        selectedCityId: number | null;
        selectedDistrictIds: number[];
        selectedSuburbIds: number[];
        manualAddress: string;
    }) => void;
    initialLocation?: {
        selectedProvinceId?: number | null;
        selectedCityId?: number | null;
        selectedDistrictIds?: number[];
        selectedSuburbIds?: number[];
    };
}

const LocationSelector = ({
                              API_BASE_URL,
                              token,
                              onLocationChange,
                              initialLocation
                          }: LocationSelectorProps) => {
    const [provinces, setProvinces] = useState<Province[]>([]);
    const [cities, setCities] = useState<City[]>([]);
    const [districts, setDistricts] = useState<District[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Состояния выбора
    const [selectedProvinceId, setSelectedProvinceId] = useState<number | null>(
        initialLocation?.selectedProvinceId || null
    );
    const [selectedCityId, setSelectedCityId] = useState<number | null>(
        initialLocation?.selectedCityId || null
    );
    const [selectedDistrictIds, setSelectedDistrictIds] = useState<number[]>(
        initialLocation?.selectedDistrictIds || []
    );
    const [selectedSuburbIds, setSelectedSuburbIds] = useState<number[]>(
        initialLocation?.selectedSuburbIds || []
    );
    const [manualAddress, setManualAddress] = useState<string>('');

    // Получаем выбранную провинцию
    const selectedProvince = selectedProvinceId
        ? provinces.find(p => p.id === selectedProvinceId)
        : null;

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

    useEffect(() => {
        fetchLocationData();
    }, []);

    useEffect(() => {
        if (provinces.length > 0 && initialLocation?.selectedProvinceId) {
            // Восстанавливаем выбор из initialLocation
            if (initialLocation.selectedCityId) {
                // Проверяем, что город принадлежит провинции
                const city = cities.find(c => c.id === initialLocation.selectedCityId);
                if (city && city.province.id === initialLocation.selectedProvinceId) {
                    setSelectedCityId(initialLocation.selectedCityId);
                }
            }

            if (initialLocation.selectedSuburbIds && initialLocation.selectedSuburbIds.length > 0) {
                setSelectedSuburbIds(initialLocation.selectedSuburbIds);
            }

            if (initialLocation.selectedDistrictIds && initialLocation.selectedDistrictIds.length > 0) {
                setSelectedDistrictIds(initialLocation.selectedDistrictIds);
            }
        }
    }, [provinces, cities, districts]);

    useEffect(() => {
        updateManualAddress();
        notifyParent();
    }, [selectedProvinceId, selectedCityId, selectedDistrictIds, selectedSuburbIds]);

    const fetchLocationData = async () => {
        try {
            setIsLoading(true);

            // Загружаем все данные параллельно
            const [provincesRes, citiesRes, districtsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/provinces`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${API_BASE_URL}/api/cities`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${API_BASE_URL}/api/districts`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            if (provincesRes.ok) {
                const provincesData = await provincesRes.json();
                setProvinces(provincesData);
            }

            if (citiesRes.ok) {
                const citiesData = await citiesRes.json();
                setCities(citiesData);
            }

            if (districtsRes.ok) {
                const districtsData = await districtsRes.json();
                setDistricts(districtsData);
            }
        } catch (error) {
            console.error('Error fetching location data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const updateManualAddress = () => {
        const addressParts: string[] = [];

        // Добавляем провинцию
        if (selectedProvince) {
            addressParts.push(selectedProvince.title);
        }

        // Добавляем город
        if (selectedCity) {
            addressParts.push(selectedCity.title);
        }

        // Добавляем районы города (suburbs)
        if (selectedSuburbIds.length > 0) {
            const suburbTitles = suburbsInSelectedCity
                .filter(s => selectedSuburbIds.includes(s.id))
                .map(s => s.title);

            if (suburbTitles.length > 0) {
                // Добавляем каждый квартал отдельно
                suburbTitles.forEach(suburbTitle => {
                    addressParts.push(suburbTitle);
                });
            }
        }

        // Добавляем районы области (districts)
        if (selectedDistrictIds.length > 0) {
            const districtTitles = districtsInSelectedProvince
                .filter(d => selectedDistrictIds.includes(d.id))
                .map(d => d.title);

            if (districtTitles.length > 0) {
                districtTitles.forEach(districtTitle => {
                    addressParts.push(districtTitle);
                });
            }
        }

        // Обновляем адрес
        if (addressParts.length > 0) {
            const newAddress = addressParts.join(', ');
            setManualAddress(newAddress);
        } else {
            setManualAddress('');
        }
    };

    const notifyParent = () => {
        onLocationChange({
            selectedProvinceId,
            selectedCityId,
            selectedDistrictIds,
            selectedSuburbIds,
            manualAddress
        });
    };

    const handleProvinceSelect = (provinceId: number) => {
        setSelectedProvinceId(provinceId);
        setSelectedCityId(null);
        setSelectedSuburbIds([]);
        setSelectedDistrictIds([]);
    };

    const handleCitySelect = (cityId: number) => {
        const city = cities.find(c => c.id === cityId);
        if (!city) return;

        // Проверяем, что город принадлежит выбранной провинции
        if (selectedProvinceId && city.province.id !== selectedProvinceId) {
            alert(`Город "${city.title}" не принадлежит выбранной провинции.`);
            return;
        }

        setSelectedCityId(cityId);
        setSelectedSuburbIds([]); // Сбрасываем выбор кварталов при смене города
    };

    const handleSuburbSelect = (suburbId: number) => {
        if (!selectedCityId) return;

        // Проверяем, что район принадлежит выбранному городу
        const suburb = selectedCity?.suburbs?.find(s => s.id === suburbId);
        if (!suburb) {
            alert('Выбранный район не принадлежит выбранному городу.');
            return;
        }

        setSelectedSuburbIds(prev => {
            if (prev.includes(suburbId)) {
                return prev.filter(id => id !== suburbId);
            } else {
                return [...prev, suburbId];
            }
        });
    };

    const handleDistrictSelect = (districtId: number) => {
        const district = districts.find(d => d.id === districtId);
        if (!district) return;

        // Проверяем, что район принадлежит выбранной провинции
        if (selectedProvinceId && district.province.id !== selectedProvinceId) {
            alert(`Район "${district.title}" не принадлежит выбранной провинции.`);
            return;
        }

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

    if (isLoading) {
        return <div className={styles.loading}>Загрузка локаций...</div>;
    }

    return (
        <div className={styles.locationSelector}>
            {/* Поле для адреса */}
            <div className={styles.addressSection}>
                <div className={styles.addressInput}>
                    <input
                        type="text"
                        value={manualAddress}
                        onChange={handleManualAddressChange}
                        placeholder="Область, Город, Квартал/Район"
                        className={styles.addressField}
                        readOnly
                    />
                    <p className={styles.addressHint}>Адрес формируется автоматически из выбранных элементов</p>
                </div>
            </div>

            {/* Шаг 1: Выбор области */}
            <div className={styles.provinceSection}>
                <h3 className={styles.sectionTitle}>Выберите область</h3>
                <div className={styles.provinceGrid}>
                    {provinces.map(province => (
                        <button
                            type="button"
                            key={province.id}
                            className={`${styles.provinceCard} ${
                                selectedProvinceId === province.id ? styles.selected : ''
                            }`}
                            onClick={() => handleProvinceSelect(province.id)}
                        >
                            {province.title}
                        </button>
                    ))}
                </div>
            </div>

            {/* Шаг 2: Выбор города */}
            {selectedProvinceId && (
                <div className={styles.citySection}>
                    <h3 className={styles.sectionTitle}>Выберите город</h3>
                    <div className={styles.cityGrid}>
                        {citiesInSelectedProvince.map(city => (
                            <button
                                type="button"
                                key={city.id}
                                className={`${styles.cityCard} ${
                                    selectedCityId === city.id ? styles.selected : ''
                                }`}
                                onClick={() => handleCitySelect(city.id)}
                            >
                                <div className={styles.cityName}>{city.title}</div>
                                {city.suburbs && city.suburbs.length > 0 && (
                                    <div className={styles.cityInfo}>
                                        {city.suburbs.length} кварталов
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Шаг 3A: Выбор районов города (кварталов) */}
            {selectedCityId && suburbsInSelectedCity.length > 0 && (
                <div className={styles.suburbSection}>
                    <h3 className={styles.sectionTitle}>
                        Кварталы города {selectedCity?.title} (можно выбрать несколько)
                    </h3>
                    <div className={styles.districtGrid}>
                        {suburbsInSelectedCity.map(suburb => (
                            <button
                                type="button"
                                key={suburb.id}
                                className={`${styles.districtCard} ${
                                    selectedSuburbIds.includes(suburb.id) ? styles.selected : ''
                                }`}
                                onClick={() => handleSuburbSelect(suburb.id)}
                            >
                                <div className={styles.districtName}>{suburb.title}</div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Шаг 3B: Выбор районов области */}
            {selectedProvinceId && districtsInSelectedProvince.length > 0 && (
                <div className={styles.districtSection}>
                    <h3 className={styles.sectionTitle}>
                        Районы области (можно выбрать несколько)
                    </h3>
                    <div className={styles.districtGrid}>
                        {districtsInSelectedProvince.map(district => (
                            <button
                                type="button"
                                key={district.id}
                                className={`${styles.districtCard} ${
                                    selectedDistrictIds.includes(district.id) ? styles.selected : ''
                                }`}
                                onClick={() => handleDistrictSelect(district.id)}
                            >
                                <div className={styles.districtName}>{district.title}</div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default LocationSelector;
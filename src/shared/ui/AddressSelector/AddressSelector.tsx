import { useState, useEffect } from 'react';
import { getAuthToken } from '../../../utils/auth';
import { AddressValue, AddressData } from '../../../entities';
import styles from './AddressSelector.module.scss';

// Локальные интерфейсы для AddressSelector (расширенные версии)
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

interface AddressSelectorProps {
    value?: AddressValue;
    onChange: (value: AddressValue) => void;
    required?: boolean;
    multipleSuburbs?: boolean;
}

const AddressSelector = ({ value, onChange, multipleSuburbs = true }: AddressSelectorProps) => {
    const [provinces, setProvinces] = useState<Province[]>([]);
    const [cities, setCities] = useState<City[]>([]);
    const [districts, setDistricts] = useState<District[]>([]);
    const [isLocationLoading, setIsLocationLoading] = useState(true);

    const selectedProvinceId = value?.provinceId ?? null;
    const selectedCityId = value?.cityId ?? null;
    const selectedSuburbIds = value?.suburbIds ?? [];
    const selectedDistrictIds = value?.districtIds ?? [];
    const selectedSettlementId = value?.settlementId ?? null;
    const selectedCommunityId = value?.communityId ?? null;
    const selectedVillageId = value?.villageId ?? null;

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

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
    }, [API_BASE_URL]);

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

    // Обработчики выбора
    const handleProvinceSelect = (provinceId: number) => {
        onChange({
            provinceId: selectedProvinceId === provinceId ? null : provinceId,
            cityId: null,
            suburbIds: [],
            districtIds: [],
            settlementId: null,
            communityId: null,
            villageId: null
        });
    };

    const handleCitySelect = (cityId: number) => {
        onChange({
            ...value!,
            cityId: selectedCityId === cityId ? null : cityId,
            suburbIds: [],
            districtIds: [],
            settlementId: null,
            communityId: null,
            villageId: null
        });
    };

    const handleSuburbSelect = (suburbId: number) => {
        if (multipleSuburbs) {
            const newSuburbIds = selectedSuburbIds.includes(suburbId)
                ? selectedSuburbIds.filter(id => id !== suburbId)
                : [...selectedSuburbIds, suburbId];
            
            onChange({
                ...value!,
                suburbIds: newSuburbIds
            });
        } else {
            const newSuburbIds = selectedSuburbIds.includes(suburbId) ? [] : [suburbId];
            onChange({
                ...value!,
                suburbIds: newSuburbIds
            });
        }
    };

    const handleDistrictSelect = (districtId: number) => {
        const newDistrictIds = selectedDistrictIds.includes(districtId) ? [] : [districtId];
        onChange({
            ...value!,
            districtIds: newDistrictIds,
            cityId: null,
            suburbIds: [],
            settlementId: null,
            communityId: null,
            villageId: null
        });
    };

    const handleSettlementSelect = (settlementId: number) => {
        onChange({
            ...value!,
            settlementId: selectedSettlementId === settlementId ? null : settlementId,
            communityId: null,
            villageId: null
        });
    };

    const handleCommunitySelect = (communityId: number) => {
        onChange({
            ...value!,
            communityId: selectedCommunityId === communityId ? null : communityId,
            settlementId: null,
            villageId: null
        });
    };

    const handleVillageSelect = (villageId: number) => {
        onChange({
            ...value!,
            villageId: selectedVillageId === villageId ? null : villageId
        });
    };

    return (
        <div className={styles.addressSelector}>
            <h2 className={styles.addressTitle}>Адрес</h2>
            {/* Области */}
            <div className={styles.province_section}>
                <div className={styles.province_list}>
                    <h4>Области</h4>
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

            {/* Города и районы */}
            {selectedProvinceId && (
                <div className={styles.combined_section}>

                    <div className={styles.combined_container}>
                        {/* Города */}
                        {citiesInSelectedProvince.length > 0 && (
                            <div className={styles.cities_container}>
                                <h4>Города</h4>
                                <div className={styles.city_grid}>
                                    {citiesInSelectedProvince.map((city) => (
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
                                    {districtsInSelectedProvince.map((district) => (
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

            {/* Кварталы города */}
            {selectedCity && suburbsInSelectedCity.length > 0 && (
                <div className={styles.suburbs_section}>
                    <div className={styles.section_header}>
                        <h4>Кварталы</h4>
                        <p className={styles.subtitle}>Выберите кварталы, в которых вы работаете</p>
                    </div>
                    <div className={styles.district_grid}>
                        {suburbsInSelectedCity.map((suburb) => (
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

            {/* ПГТ и поселения */}
            {selectedDistrict && (
                <div className={styles.nested_selection_section}>
                    <h4>Поселки/ПГТ</h4>
                    <p className={styles.subtitle}>Выберите ПГТ или поселок</p>

                    <div className={styles.nested_type_selector}>
                        {/* ПГТ (communities) */}
                        {communitiesInSelectedDistrict.length > 0 && (
                            <div className={styles.communities_container}>
                                <h4>ПГТ (Поселки городского типа)</h4>
                                <div className={styles.district_grid}>
                                    {communitiesInSelectedDistrict.map((community) => (
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
                                    {settlementsInSelectedDistrict.map((settlement) => (
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

                    {/* Села */}
                    {selectedSettlement && villagesInSelectedSettlement.length > 0 && (
                        <div className={styles.villages_section}>
                            <h4>Села в поселке {selectedSettlement.title}</h4>
                            <div className={styles.district_grid}>
                                {villagesInSelectedSettlement.map((village) => (
                                    <button
                                        type="button"
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
    );
};

// Утилита для формирования данных адреса для API
export const buildAddressData = (value: AddressValue): AddressData | null => {
    if (!value.provinceId) return null;

    const addressData: any = {
        province: `/api/provinces/${value.provinceId}`,
    };

    // If a city is selected
    if (value.cityId) {
        addressData.city = `/api/cities/${value.cityId}`;
        if (value.suburbIds && value.suburbIds.length > 0) {
            addressData.suburb = `/api/suburbs/${value.suburbIds[0]}`;
        }
    }
    // If a district is selected (region-level)
    else if (value.districtIds.length > 0) {
        const districtId = value.districtIds[0];
        addressData.district = `/api/districts/${districtId}`;
        
        if (value.settlementId) {
            addressData.settlement = `/api/settlements/${value.settlementId}`;
            if (value.villageId) {
                addressData.village = `/api/villages/${value.villageId}`;
            }
        } else if (value.communityId) {
            addressData.community = `/api/communities/${value.communityId}`;
        }
    }

    return addressData;
};

export default AddressSelector;

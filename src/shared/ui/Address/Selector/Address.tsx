import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getStorageItem } from '../../../../utils/storageUtils';
import { AddressValueView, AddressDataView } from '../../../../entities';
import type { Province, City, District } from '../../../../entities';
import { getProvinces, getCities, getDistricts } from '../../../../utils/dataCacheUtils';
import { PageLoader } from '../../../../widgets/PageLoader';
import { SelectSearch } from '../../SelectSearch';
import styles from './Address.module.scss';

interface AddressSelectorProps {
    value?: AddressValueView;
    onChange: (value: AddressValueView) => void;
    required?: boolean;
}

const Address = ({ value, onChange }: AddressSelectorProps) => {
    const { t } = useTranslation(['address', 'common']);
    const [provinces, setProvinces] = useState<Province[]>([]);
    const [cities, setCities] = useState<City[]>([]);
    const [districts, setDistricts] = useState<District[]>([]);
    const [isLocationLoading, setIsLocationLoading] = useState(true);
    const [cityQuery, setCityQuery] = useState('');
    const [districtQuery, setDistrictQuery] = useState('');
    const [suburbQuery, setSuburbQuery] = useState('');
    const [communityQuery, setCommunityQuery] = useState('');
    const [settlementQuery, setSettlementQuery] = useState('');
    const [villageQuery, setVillageQuery] = useState('');

    const selectedProvinceId = value?.provinceId ?? null;
    const selectedCityId = value?.cityId ?? null;
    const selectedSuburbIds = value?.suburbIds ?? [];
    const selectedDistrictIds = value?.districtIds ?? [];
    const selectedSettlementId = value?.settlementId ?? null;
    const selectedCommunityId = value?.communityId ?? null;
    const selectedVillageId = value?.villageId ?? null;

    const locale = getStorageItem('i18nextLng') || 'ru';

    const fetchLocationData = async () => {
        try {
            setIsLocationLoading(true);
            const [provincesData, citiesData, districtsData] = await Promise.all([
                getProvinces(),
                getCities(),
                getDistricts(),
            ]);
            setProvinces(provincesData);
            setCities(citiesData);
            setDistricts(districtsData);
        } catch (err) {
            console.error('Error fetching location data:', err);
        } finally {
            setIsLocationLoading(false);
        }
    };

    useEffect(() => {
        fetchLocationData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [locale]);

    // Фильтрованные данные
    const citiesInSelectedProvince = selectedProvinceId
        ? cities.filter(city => city.province?.id === selectedProvinceId)
        : [];

    const selectedCity = selectedCityId
        ? cities.find(city => city.id === selectedCityId)
        : null;

    const suburbsInSelectedCity = selectedCity
        ? selectedCity.suburbs || []
        : [];

    const districtsInSelectedProvince = selectedProvinceId
        ? districts.filter(district => district.province?.id === selectedProvinceId)
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

    const filteredCities = cityQuery
        ? citiesInSelectedProvince.filter(c => c.title.toLowerCase().includes(cityQuery.toLowerCase()))
        : citiesInSelectedProvince;

    const filteredDistricts = districtQuery
        ? districtsInSelectedProvince.filter(d => d.title?.toLowerCase().includes(districtQuery.toLowerCase()))
        : districtsInSelectedProvince;

    const filteredSuburbs = suburbQuery
        ? suburbsInSelectedCity.filter(s => s.title.toLowerCase().includes(suburbQuery.toLowerCase()))
        : suburbsInSelectedCity;

    const filteredCommunities = communityQuery
        ? communitiesInSelectedDistrict.filter(c => c.title.toLowerCase().includes(communityQuery.toLowerCase()))
        : communitiesInSelectedDistrict;

    const filteredSettlements = settlementQuery
        ? settlementsInSelectedDistrict.filter(s => s.title.toLowerCase().includes(settlementQuery.toLowerCase()))
        : settlementsInSelectedDistrict;

    const filteredVillages = villageQuery
        ? villagesInSelectedSettlement.filter(v => v.title.toLowerCase().includes(villageQuery.toLowerCase()))
        : villagesInSelectedSettlement;

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
        setCityQuery('');
        setDistrictQuery('');
        setSuburbQuery('');
        setCommunityQuery('');
        setSettlementQuery('');
        setVillageQuery('');
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
        const newSuburbIds = selectedSuburbIds.includes(suburbId) ? [] : [suburbId];
        onChange({
            ...value!,
            suburbIds: newSuburbIds
        });
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
        setSuburbQuery('');
        setCommunityQuery('');
        setSettlementQuery('');
        setVillageQuery('');
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
            <h2 className={styles.addressTitle}>{t('address:title')}</h2>
            {/* Области */}
            <div className={styles.province_section}>
                <div className={styles.province_list}>
                    <h4>{t('address:provinces')}</h4>
                    {isLocationLoading ? (
                        <PageLoader fullPage={false} />
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
                        <div className={styles.no_data}>{t('address:noProvinces')}</div>
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
                                <h4>{t('address:cities')}</h4>
                                <SelectSearch
                                    altMode
                                    options={[]}
                                    value={cityQuery}
                                    onChange={(val) => setCityQuery(val)}
                                    placeholder={t('common:search')}
                                    className={styles.searchInput}
                                />
                                <div className={styles.city_grid}>
                                    {filteredCities.map((city) => (
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
                                                    {t('address:quartersCount', { count: city.suburbs.length })}
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
                                <h4>{t('address:districts')}</h4>
                                <SelectSearch
                                    altMode
                                    options={[]}
                                    value={districtQuery}
                                    onChange={(val) => setDistrictQuery(val)}
                                    placeholder={t('common:search')}
                                    className={styles.searchInput}
                                />
                                <div className={styles.district_grid}>
                                    {filteredDistricts.map((district) => (
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
                                                    <span>{t('address:settlementsCount', { count: district.settlements.length })}</span>
                                                )}
                                                {district.communities && district.communities.length > 0 && (
                                                    <span>{t('address:communitiesCount', { count: district.communities.length })}</span>
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
                        <h4>{t('address:suburbs')}</h4>
                        <p className={styles.subtitle}>{t('address:suburbsSubtitle')}</p>
                    </div>
                    <SelectSearch
                        altMode
                        options={[]}
                        value={suburbQuery}
                        onChange={(val) => setSuburbQuery(val)}
                        placeholder={t('common:search')}
                        className={styles.searchInput}
                    />
                    <div className={styles.district_grid}>
                        {filteredSuburbs.map((suburb) => (
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
                    <h4>{t('address:settlementAreas')}</h4>
                    <p className={styles.subtitle}>{t('address:settlementSubtitle')}</p>

                    <div className={styles.nested_type_selector}>
                        {/* ПГТ (communities) */}
                        {communitiesInSelectedDistrict.length > 0 && (
                            <div className={styles.communities_container}>
                                <h4>{t('address:communities')}</h4>
                                <SelectSearch
                                    altMode
                                    options={[]}
                                    value={communityQuery}
                                    onChange={(val) => setCommunityQuery(val)}
                                    placeholder={t('common:search')}
                                    className={styles.searchInput}
                                />
                                <div className={styles.district_grid}>
                                    {filteredCommunities.map((community) => (
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
                                <h4>{t('address:settlements')}</h4>
                                <SelectSearch
                                    altMode
                                    options={[]}
                                    value={settlementQuery}
                                    onChange={(val) => setSettlementQuery(val)}
                                    placeholder={t('common:search')}
                                    className={styles.searchInput}
                                />
                                <div className={styles.district_grid}>
                                    {filteredSettlements.map((settlement) => (
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
                                                    {t('address:villagesCount', { count: settlement.village.length })}
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
                            <h4>{t('address:villagesIn')} {selectedSettlement.title}</h4>
                            <SelectSearch
                                altMode
                                options={[]}
                                value={villageQuery}
                                onChange={(val) => setVillageQuery(val)}
                                placeholder={t('common:search')}
                                className={styles.searchInput}
                            />
                            <div className={styles.district_grid}>
                                {filteredVillages.map((village) => (
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
export const buildAddressData = (value: AddressValueView): AddressDataView | null => {
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

export default Address;

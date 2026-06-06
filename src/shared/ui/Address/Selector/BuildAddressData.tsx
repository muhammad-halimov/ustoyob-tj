// Утилита для формирования данных адреса для API
import {AddressDataView, AddressValueView} from "../../../../entities";

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
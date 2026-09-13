// Утилита для формирования данных адреса для API
import {AddressDataView, AddressValueView} from "../../../../entities";
import {API_ROUTES} from "../../../../app/routers/routes";

export const buildAddressData = (value: AddressValueView): AddressDataView | null => {
    if (!value.provinceId) return null;

    const addressData: any = {
        province: API_ROUTES.PROVINCE_BY_ID(value.provinceId),
    };

    // If a city is selected
    if (value.cityId) {
        addressData.city = API_ROUTES.CITY_BY_ID(value.cityId);
        if (value.suburbIds && value.suburbIds.length > 0) {
            addressData.suburb = API_ROUTES.SUBURB_BY_ID(value.suburbIds[0]);
        }
    }
    // If a district is selected (region-level)
    else if (value.districtIds.length > 0) {
        const districtId = value.districtIds[0];
        addressData.district = API_ROUTES.DISTRICT_BY_ID(districtId);

        if (value.settlementId) {
            addressData.settlement = API_ROUTES.SETTLEMENT_BY_ID(value.settlementId);
            if (value.villageId) {
                addressData.village = API_ROUTES.VILLAGE_BY_ID(value.villageId);
            }
        } else if (value.communityId) {
            addressData.community = API_ROUTES.COMMUNITY_BY_ID(value.communityId);
        }
    }

    return addressData;
};
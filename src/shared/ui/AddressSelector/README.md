# AddressSelector Component

Переиспользуемый компонент для выбора адреса с многоуровневой иерархией: область → город/район → квартал/поселение → село.

## Использование

```tsx
import AddressSelector, { AddressValue, buildAddressData } from '../../../shared/ui/AddressSelector';

function MyComponent() {
    const [addressValue, setAddressValue] = useState<AddressValue>({
        provinceId: null,
        cityId: null,
        suburbIds: [],
        districtIds: [],
        settlementId: null,
        communityId: null,
        villageId: null
    });

    return (
        <AddressSelector 
            value={addressValue}
            onChange={setAddressValue}
            required={true}
            multipleSuburbs={true}
        />
    );
}
```

## Props

- **value** (`AddressValue`, optional): Текущее значение адреса
- **onChange** (`(value: AddressValue) => void`, required): Callback вызываемый при изменении выбора
- **required** (`boolean`, default: `false`): Показывать ли звёздочку у заголовка "Выберите область"
- **multipleSuburbs** (`boolean`, default: `true`): Разрешить выбор нескольких кварталов

## AddressValue Interface

```tsx
interface AddressValue {
    provinceId: number | null;        // ID области
    cityId: number | null;             // ID города
    suburbIds: number[];               // Массив ID кварталов
    districtIds: number[];             // Массив ID районов
    settlementId: number | null;       // ID поселения
    communityId: number | null;        // ID ПГТ
    villageId: number | null;          // ID села
}
```

## Преобразование в API формат

Используйте функцию `buildAddressData` для преобразования `AddressValue` в формат, ожидаемый API:

```tsx
import { buildAddressData } from '../../../shared/ui/AddressSelector';

const addressData = buildAddressData(addressValue);
// Вернёт объект типа AddressData с IRI ссылками:
// {
//   province: "/api/provinces/1",
//   city: "/api/cities/2",
//   suburb: "/api/suburbs/3",
//   ...
// }
```

## Инициализация из API данных

При редактировании существующего адреса:

```tsx
// Предположим, у вас есть данные с сервера
const serviceData = {
    addresses: [{
        id: 123,
        province: { id: 1, title: "Душанбе" },
        city: { id: 2, title: "Душанбе" },
        suburb: { id: 3, title: "Рудаки" },
        // ...
    }]
};

// Инициализируйте состояние
const [addressValue, setAddressValue] = useState<AddressValue>({
    provinceId: serviceData.addresses[0].province?.id || null,
    cityId: serviceData.addresses[0].city?.id || null,
    suburbIds: serviceData.addresses[0].suburb ? [serviceData.addresses[0].suburb.id] : [],
    districtIds: serviceData.addresses[0].district ? [serviceData.addresses[0].district.id] : [],
    settlementId: serviceData.addresses[0].settlement?.id || null,
    communityId: serviceData.addresses[0].community?.id || null,
    villageId: serviceData.addresses[0].village?.id || null
});
```

## Логика работы

1. **Область** - первый обязательный выбор
2. После выбора области показываются **города** и **районы** этой области
3. При выборе **города** можно выбрать **кварталы** (один или несколько, в зависимости от `multipleSuburbs`)
4. При выборе **района** можно выбрать **ПГТ** или **поселение**
5. При выборе **поселения** показываются **сёла** этого поселения

## Особенности

- При выборе города автоматически сбрасываются районы и наоборот (взаимоисключающие)
- Все зависимые выборы автоматически сбрасываются при изменении родительского уровня
- Данные областей, городов и районов загружаются параллельно при монтировании компонента
- Компонент полностью контролируемый (controlled component)

## Стилизация

Компонент использует CSS модули. Все стили находятся в `AddressSelector.module.scss`.

Основные классы:
- `.addressSelector` - корневой контейнер
- `.province_card` / `.province_card_selected` - карточки областей
- `.city_card` / `.city_card_selected` - карточки городов
- `.district_card` / `.district_card_selected` - карточки районов/кварталов/поселений

Поддерживает темизацию через CSS переменные:
- `--color-background-primary`
- `--color-border-light`
- `--color-primary`
- `--color-text-primary`
- `--color-text-secondary`
- и др.

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ROUTES } from '../../../app/routers/routes.ts';
import styles from './CreateEdit.module.scss';
import { getAuthToken, getUserRole, getUserData } from '../../../utils/auth.ts';
import Address, { AddressValue, buildAddressData } from '../../../shared/ui/Address/Selector';
import CookieConsentBanner from "../../../widgets/Banners/CookieConsentBanner/CookieConsentBanner.tsx";
import Status from '../../../shared/ui/Modal/Status';
import { Preview, usePreview } from '../../../shared/ui/Photo/Preview';
import { useTranslation } from 'react-i18next';
import { useLanguageChange } from '../../../hooks';
import { getStorageItem } from '../../../utils/storageHelper.ts';
import { PageLoader } from '../../../widgets/PageLoader';
import { Toggle } from '../../../shared/ui/Button/Toggle/Toggle';
import Grid from '../../../shared/ui/Photo/Grid';
import { uploadPhotos } from '../../../utils/imageHelper';
import { EditActions } from '../../profile/shared/ui/EditActions/EditActions';

interface ServiceData {
    id?: number;
    title: string;
    description: string;
    notice: string;
    budget: string;
    category?: { id: number; title: string };
    subcategory?: { id: number; title: string };
    unit?: { id: number; title: string };
    addresses?: Array<{
        id: number;
        province?: { id: number; title: string };
        city?: { id: number; title: string };
        suburb?: { id: number; title: string };
        district?: { id: number; title: string };
        settlement?: { id: number; title: string };
        community?: { id: number; title: string };
        village?: { id: number; title: string };
    }>;
    images?: Array<{ id: number; image: string }>;
}

interface ImageData {
    id: number;
    image: string;
}

interface Category {
    id: number;
    title: string;
    image?: string;
}

interface Unit {
    id: number;
    title: string;
}

interface Occupation {
    id: number;
    title: string;
    description?: string;
    image?: string;
    priority?: number;
    categories?: Array<{ id: number; title: string; image?: string }>;
}

type PhotoItem =
    | { type: 'existing'; id: number; image: string }
    | { type: 'new'; file: File; previewUrl: string };

const CreateEdit = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEditMode = !!id;
    const { t } = useTranslation(['createEdit', 'components']);
    
    console.log('CreateEdit component mounted/updated', { id, isEditMode });
    
    // Перезагружать данные формы при смене языка
    useLanguageChange(() => {
        fetchCategories();
        fetchOccupations();
        fetchUnits();
    });
    
    const [serviceData, setServiceData] = useState<ServiceData>({
        title: '',
        description: '',
        notice: '',
        budget: '',
    });
    const [isLoading, setIsLoading] = useState(isEditMode);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pendingSubcategoryId, setPendingSubcategoryId] = useState<number | null>(null);
    const [photos, setPhotos] = useState<PhotoItem[]>([]);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorModalMessage, setErrorModalMessage] = useState('');
    const [errorOnClosed, setErrorOnClosed] = useState<(() => void) | null>(null);

    const showError = (message: string, onClose?: () => void) => {
        setErrorModalMessage(message);
        setErrorOnClosed(onClose ? () => onClose : null);
        setShowErrorModal(true);
    };

    // Данные для формы
    const [categories, setCategories] = useState<Category[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [occupations, setOccupations] = useState<Occupation[]>([]);
    const [filteredOccupations, setFilteredOccupations] = useState<Occupation[]>([]);

    // Адрес
    const [addressValue, setAddressValue] = useState<AddressValue>({
        provinceId: null,
        cityId: null,
        suburbIds: [],
        districtIds: [],
        settlementId: null,
        communityId: null,
        villageId: null
    });

    // Выбранные значения
    const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
    const [selectedSubcategory, setSelectedSubcategory] = useState<number | null>(null);
    const [selectedUnit, setSelectedUnit] = useState<number | null>(null);
    const [negotiableBudget, setNegotiableBudget] = useState(false);

    const formRef = useRef<HTMLFormElement>(null);
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
    const token = getAuthToken();

    // Функция для форматирования URL изображений
    const getImageUrl = (imagePath: string): string => {
        if (!imagePath) return '';
        
        if (imagePath.startsWith('/uploads/') || imagePath.startsWith('/images/')) {
            return `${API_BASE_URL}${imagePath}`;
        } else if (imagePath.startsWith('http')) {
            return imagePath;
        } else {
            return `${API_BASE_URL}/uploads/tickets/${imagePath}`;
        }
    };

    const existingImageUrls = photos
        .filter((p): p is Extract<PhotoItem, { type: 'existing' }> => p.type === 'existing')
        .map(p => getImageUrl(p.image));
    const photoGallery = usePreview({ images: existingImageUrls });

    useEffect(() => {
        console.log('CreateEdit useEffect triggered', { token: !!token, isEditMode, id });
        
        if (!token) {
            navigate(ROUTES.HOME);
            return;
        }

        // Загружаем данные для формы
        fetchCategories();
        fetchUnits();
        fetchOccupations();

        // Если режим редактирования - загружаем данные тикета по ID
        if (isEditMode && id) {
            console.log('Edit mode detected, fetching ticket data for ID:', id);
            fetchTicketData(Number(id));
        } else if (!isEditMode) {
            // Сбрасываем состояние формы при переходе в режим создания
            setNegotiableBudget(false);
            setServiceData({ title: '', description: '', notice: '', budget: '' });
            setSelectedCategory(null);
            setSelectedSubcategory(null);
            setSelectedUnit(null);
            setPhotos([]);
        }
    }, [token, isEditMode, id]); // eslint-disable-line react-hooks/exhaustive-deps

    // Фильтруем occupations при изменении категории
    useEffect(() => {
        if (selectedCategory && occupations.length > 0) {
            const filtered = occupations.filter(occ => 
                occ.categories?.some(cat => cat.id === selectedCategory)
            );
            filtered.sort((a, b) => (a.priority ?? Infinity) - (b.priority ?? Infinity));
            setFilteredOccupations(filtered);

            // Применяем отложенную подкатегорию (при редактировании occupations грузились позже)
            if (pendingSubcategoryId !== null) {
                if (filtered.find(occ => occ.id === pendingSubcategoryId)) {
                    setSelectedSubcategory(pendingSubcategoryId);
                }
                setPendingSubcategoryId(null);
            } else if (selectedSubcategory && !filtered.find(occ => occ.id === selectedSubcategory)) {
                setSelectedSubcategory(null);
            }
        } else {
            setFilteredOccupations([]);
            if (pendingSubcategoryId === null) {
                setSelectedSubcategory(null);
            }
        }
    }, [selectedCategory, occupations]); // eslint-disable-line react-hooks/exhaustive-deps

    // Отладка: логирование изменений serviceData
    useEffect(() => {
        console.log('ServiceData changed:', serviceData);
        console.log('Current form values:', {
            title: serviceData.title,
            description: serviceData.description,
            budget: serviceData.budget,
            notice: serviceData.notice
        });
    }, [serviceData]);

    // Отладка: логирование изменений выбранных значений
    useEffect(() => {
        console.log('Selected values changed:', {
            category: selectedCategory,
            subcategory: selectedSubcategory,
            unit: selectedUnit
        });
    }, [selectedCategory, selectedSubcategory, selectedUnit]);

    // Функции загрузки данных
    const fetchCategories = async () => {
        try {
            if (!token) return;
            const locale = getStorageItem('i18nextLng') || 'ru';
            const response = await fetch(`${API_BASE_URL}/api/categories?locale=${locale}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                }
            });
            if (response.ok) {
                const data = await response.json();
                setCategories(data);
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const fetchUnits = async () => {
        try {
            if (!token) return;
            const response = await fetch(`${API_BASE_URL}/api/units`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                }
            });
            if (response.ok) {
                const data = await response.json();
                setUnits(data);
            }
        } catch (error) {
            console.error('Error fetching units:', error);
        }
    };

    const fetchOccupations = async () => {
        try {
            if (!token) return;
            const locale = getStorageItem('i18nextLng') || 'ru';
            const response = await fetch(`${API_BASE_URL}/api/occupations?locale=${locale}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                }
            });
            if (response.ok) {
                const data = await response.json();
                const sorted = Array.isArray(data) ? data.sort((a: Occupation, b: Occupation) => (a.priority ?? Infinity) - (b.priority ?? Infinity)) : data;
                setOccupations(sorted);
            }
        } catch (error) {
            console.error('Error fetching occupations:', error);
        }
    };

    const fetchTicketData = async (ticketId: number) => {
        try {
            setIsLoading(true);
            console.log('Fetching ticket data for ID:', ticketId);
            
            const response = await fetch(`${API_BASE_URL}/api/tickets/${ticketId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                }
            });

            if (!response.ok) {
                throw new Error('Не удалось загрузить данные тикета');
            }

            const data = await response.json();
            console.log('Loaded ticket data:', data);
            console.log('Raw data.title:', data.title);
            console.log('Raw data.budget:', data.budget, 'type:', typeof data.budget);
            console.log('Raw data.category:', data.category);
            console.log('Raw data.subcategory:', data.subcategory);
            
            // Преобразуем данные API в формат ServiceData
            const formattedData: ServiceData = {
                id: data.id,
                title: data.title || '',
                description: data.description || '',
                notice: data.notice || '',
                budget: data.budget ? String(data.budget) : '',
                category: data.category,
                subcategory: data.subcategory,
                unit: data.unit,
                addresses: data.addresses,
                images: data.images
            };
            
            console.log('Formatted data:', formattedData);
            console.log('Setting service data with:', formattedData);
            
            setServiceData(formattedData);
            setSelectedCategory(data.category?.id || null);
            // Subcategory stored as pending — will be applied once occupations + category filter is ready
            setPendingSubcategoryId(data.subcategory?.id || null);
            setSelectedUnit(data.unit?.id || null);
            // Считаем договорной только если negotiableBudget=true И нет реального бюджета.
            // Если budget > 0 — значит цена есть, галочка была записана ошибочно.
            setNegotiableBudget(!!data.negotiableBudget && !(data.budget > 0));
            setPhotos((data.images || []).map((img: { id: number; image: string }) => ({
                type: 'existing' as const,
                id: img.id,
                image: img.image,
            })));
            
            console.log('State updated - category ID:', data.category?.id);
            console.log('State updated - subcategory ID:', data.subcategory?.id);
            console.log('State updated - images count:', data.images?.length || 0);

            // Инициализируем адресные данные
            if (data.addresses && data.addresses.length > 0) {
                const address = data.addresses[0];
                console.log('Address data from API:', address);
                
                const addressValue = {
                    provinceId: address.province?.id || null,
                    cityId: address.city?.id || null,
                    suburbIds: address.suburb ? [address.suburb.id] : [],
                    districtIds: address.district ? [address.district.id] : [],
                    settlementId: address.settlement?.id || null,
                    communityId: address.community?.id || null,
                    villageId: address.village?.id || null
                };
                
                console.log('Setting address value:', addressValue);
                setAddressValue(addressValue);
            } else {
                console.log('No addresses in data');
            }
        } catch (error) {
            console.error('Error fetching ticket:', error);
            showError(t('createEdit:ticketLoadError'), () => navigate(ROUTES.TICKET_ME));
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.SubmitEvent) => {
        e.preventDefault();

        // Валидация
        if (!serviceData.title.trim() || !serviceData.description.trim() || (!negotiableBudget && !serviceData.budget)) {
            showError(t('createEdit:fillRequired'));
            return;
        }
        
        if (!addressValue.provinceId) {
            showError(t('createEdit:selectRegionRequired'));
            return;
        }

        const budgetValue = negotiableBudget ? 0 : parseInt(serviceData.budget, 10);
        if (!negotiableBudget && (isNaN(budgetValue) || budgetValue <= 0)) {
            showError(t('createEdit:invalidBudget'));
            return;
        }

        try {
            setIsSubmitting(true);

            if (!token) {
                showError(t('createEdit:authRequired'));
                return;
            }

            // Создаем данные адреса
            const addressData = buildAddressData(addressValue);
            if (!addressData) {
                showError(t('createEdit:addressError'));
                return;
            }

            if (!isEditMode) {
                // Режим создания
                const userId = getUserData()?.id;
                if (!userId) {
                    throw new Error(t('createEdit:genericError'));
                }

                const role = getUserRole();

                if (!role) {
                    showError(t('createEdit:genericError'));
                    return;
                }

                const ticketData = {
                    title: serviceData.title.trim(),
                    description: serviceData.description.trim(),
                    notice: serviceData.notice?.trim() || "",
                    budget: budgetValue,
                    negotiableBudget,
                    active: true,
                    category: `/api/categories/${selectedCategory}`,
                    subcategory: selectedSubcategory ? `/api/occupations/${selectedSubcategory}` : null,
                    unit: selectedUnit ? `/api/units/${selectedUnit}` : null,
                    address: addressData,
                    author: `/api/users/${userId}`,
                    service: role === 'master',
                    master: role === 'master' ? `/api/users/${userId}` : null
                };

                const response = await fetch(`${API_BASE_URL}/api/tickets`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify(ticketData),
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(errorText || t('createEdit:genericError'));
                }

                const ticketDataResponse = await response.json();

                // Загрузка изображений
                const filesToUpload = photos
                    .filter((p): p is Extract<PhotoItem, { type: 'new' }> => p.type === 'new')
                    .map(p => p.file);
                if (filesToUpload.length > 0) {
                    for (const image of filesToUpload) {
                        try {
                            await uploadPhotos('tickets', ticketDataResponse.id, [image], token);
                        } catch (imageError) {
                            console.warn('Failed to upload image:', image.name, imageError);
                        }
                    }
                }

                setShowSuccessModal(true);
            } else {
                // Режим редактирования
                if (!serviceData?.id) {
                    showError(t('createEdit:genericError'));
                    return;
                }

                // 1. Запоминаем ID существующих фото до загрузки
                const existingImageIds = new Set(
                    photos
                        .filter((p): p is Extract<PhotoItem, { type: 'existing' }> => p.type === 'existing')
                        .map(p => p.id)
                );

                // 2. Загружаем новые фото в том порядке, в котором они стоят в photos
                const newPhotoEntries = photos
                    .map((p, i) => ({ photo: p, index: i }))
                    .filter((e): e is { photo: Extract<PhotoItem, { type: 'new' }>; index: number } => e.photo.type === 'new');

                for (const { photo } of newPhotoEntries) {
                    try {
                        await uploadPhotos('tickets', serviceData.id!, [photo.file], token);
                    } catch {
                        console.warn('Failed to upload image:', photo.file.name);
                    }
                }

                // 3. Перечитываем тикет, чтобы получить ID только что загруженных фото
                const freshTicketResp = await fetch(`${API_BASE_URL}/api/tickets/${serviceData.id}`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                const freshTicket = freshTicketResp.ok ? await freshTicketResp.json() : null;
                const allCurrentImages: ImageData[] = freshTicket?.images || [];

                // Новые = те, которых не было раньше (в порядке вставки = порядок загрузки)
                const uploadedInOrder = allCurrentImages.filter(img => !existingImageIds.has(img.id));
                let uploadedIdx = 0;

                // 4. Строим финальный упорядоченный список
                const finalImages = photos
                    .map(p => {
                        if (p.type === 'existing') {
                            return allCurrentImages.find(img => img.id === p.id) ?? null;
                        } else {
                            return uploadedInOrder[uploadedIdx++] ?? null;
                        }
                    })
                    .filter((x): x is ImageData => x !== null);

                // 5. PATCH с полным упорядоченным списком
                const updateData = {
                    title: serviceData.title,
                    description: serviceData.description,
                    notice: serviceData.notice || "",
                    budget: budgetValue,
                    negotiableBudget,
                    service: true,
                    category: `/api/categories/${selectedCategory}`,
                    subcategory: selectedSubcategory ? `/api/occupations/${selectedSubcategory}` : null,
                    unit: selectedUnit ? `/api/units/${selectedUnit}` : null,
                    address: addressData,
                    images: finalImages.map(img => ({ id: img.id, image: img.image })),
                };

                const response = await fetch(`${API_BASE_URL}/api/tickets/${serviceData.id}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/merge-patch+json',
                    },
                    body: JSON.stringify(updateData),
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(errorText || t('createEdit:genericError'));
                }

                // 6. Обновляем локальный стейт
                setPhotos(finalImages.map(img => ({ type: 'existing' as const, id: img.id, image: img.image })));

                setShowSuccessModal(true);
            }
        } catch (error) {
            console.error('Error:', error);
            showError(error instanceof Error ? error.message : t('createEdit:genericError'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSuccessClose = () => {
        setShowSuccessModal(false);
        navigate(ROUTES.TICKET_ME);
    };

    if (!token) {
        return null;
    }

    if (isLoading) {
        return <PageLoader text={t('createEdit:loading')} />;
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>{isEditMode ? t('createEdit:editTitle') : t('createEdit:createTitle')}</h1>
            </div>

            <div className={styles.formWrapper}>
            <form ref={formRef} onSubmit={handleSubmit} className={styles.form}>
                {/* Название услуги */}
                <div className={styles.section}>
                    <h2>{t('createEdit:serviceNameLabel')}</h2>
                    <div className={styles.serviceSection}>
                        <input
                            type="text"
                            name="title"
                            value={serviceData.title}
                            onChange={(e) => setServiceData({...serviceData, title: e.target.value})}
                            placeholder={t('createEdit:serviceNamePlaceholder')}
                            className={styles.titleInput}
                            required
                        />
                    </div>
                </div>

                {/* Категория */}
                <div className={styles.section}>
                    <h2>{t('createEdit:categoryLabel')}</h2>
                    <div className={styles.categorySection}>
                        <select
                            value={selectedCategory || ''}
                            onChange={(e) => setSelectedCategory(Number(e.target.value))}
                            className={styles.categorySelect}
                        >
                            <option value="">{t('createEdit:selectCategory')}</option>
                            {categories.map(category => (
                                <option key={category.id} value={category.id}>
                                    {category.title}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Подкатегория (occupation) */}
                {filteredOccupations.length > 0 && (
                    <div className={styles.section}>
                        <h2>{t('createEdit:subcategoryLabel')}</h2>
                        <div className={styles.categorySection}>
                            <select
                                value={selectedSubcategory || ''}
                                onChange={(e) => setSelectedSubcategory(Number(e.target.value))}
                                className={styles.categorySelect}
                            >
                                <option value="">{t('createEdit:selectSubcategory')}</option>
                                {filteredOccupations.map(occupation => (
                                    <option key={occupation.id} value={occupation.id}>
                                        {occupation.title}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                {/* Адрес */}
                <div className={styles.section}>
                    <Address
                        value={addressValue}
                        onChange={setAddressValue}
                        required={true}
                    />
                </div>

                {/* Бюджет */}
                <div className={styles.section}>
                    <h2>{t('createEdit:budgetLabel')}</h2>
                    <div className={styles.budgetSection}>
                        <div className={styles.negotiableCheckbox}>
                            <Toggle
                                checked={negotiableBudget}
                                onChange={(e) => setNegotiableBudget(e.target.checked)}
                                label={t('createEdit:negotiablePrice')}
                            />
                        </div>
                        <div className={styles.budgetRow}>
                            <div className={`${styles.budgetField} ${negotiableBudget ? styles.budgetFieldDisabled : ''}`}>
                                <input
                                    type="number"
                                    name="budget"
                                    value={serviceData.budget}
                                    onChange={(e) => setServiceData({...serviceData, budget: e.target.value})}
                                    placeholder="0"
                                    className={styles.budgetInput}
                                    min="1"
                                    disabled={negotiableBudget}
                                    required={!negotiableBudget}
                                />
                            </div>
                            <div className={`${styles.budgetField} ${negotiableBudget ? styles.budgetFieldDisabled : ''}`}>
                                <select
                                    className={styles.unitSelect}
                                    value={selectedUnit || ''}
                                    onChange={(e) => setSelectedUnit(Number(e.target.value))}
                                    disabled={negotiableBudget}
                                >
                                    <option value="">{t('createEdit:unitPlaceholder')}</option>
                                    {units.map(unit => (
                                        <option key={unit.id} value={unit.id}>
                                            {unit.title}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Фотографии */}
                <div className={styles.section}>
                    <h2>{t('createEdit:attachPhotos')}</h2>
                    <Grid
                        photos={photos}
                        onChange={setPhotos}
                        getImageUrl={getImageUrl}
                        onOpenGallery={photoGallery.openGallery}
                        inputId="photo-upload"
                        photoAlt={t('createEdit:photoAlt')}
                        disabled={isSubmitting}
                    />
                </div>

                {/* Описание услуги */}
                <div className={styles.section}>
                    <h2>{isEditMode ? t('createEdit:descriptionEditLabel') : t('createEdit:descriptionCreateLabel')}</h2>
                    <div className={styles.descriptionSection}>
                        <div className={styles.descriptionLabel}>
                            {isEditMode 
                                ? t('createEdit:descriptionEditHint')
                                : t('createEdit:descriptionCreateHint')
                            }
                        </div>
                        <textarea
                            name="description"
                            value={serviceData.description}
                            onChange={(e) => setServiceData({...serviceData, description: e.target.value})}
                            placeholder={isEditMode ? t('createEdit:descriptionEditPlaceholder') : t('createEdit:descriptionCreatePlaceholder')}
                            rows={isEditMode ? 6 : 4}
                            className={styles.descriptionTextarea}
                            required
                        />
                    </div>
                </div>

                {/* Дополнительные заметки */}
                <div className={styles.section}>
                    <h2>{t('createEdit:notesLabel')}</h2>
                    <div className={styles.descriptionSection}>
                        <div className={styles.descriptionLabel}>
                            {t('createEdit:notesHint')}
                        </div>
                        <textarea
                            name="notice"
                            value={serviceData.notice}
                            onChange={(e) => setServiceData({...serviceData, notice: e.target.value})}
                            placeholder={t('createEdit:notesPlaceholder')}
                            rows={isEditMode ? 3 : 2}
                            className={styles.descriptionTextarea}
                        />
                    </div>
                </div>

                {/* Кнопки */}
                <div className={styles.submitSection} style={{ position: 'relative' }}>
                    {isSubmitting && <PageLoader overlay />}
                    <EditActions
                        onSave={() => formRef.current?.requestSubmit()}
                        onCancel={() => navigate(ROUTES.MY_TICKETS)}
                        saveDisabled={isSubmitting}
                        className={styles.editActionsLarge}
                    />
                </div>
            </form>
            </div>

            <Status
                type="success"
                isOpen={showSuccessModal}
                onClose={handleSuccessClose}
                message={isEditMode ? t('createEdit:successEdit') : t('createEdit:successCreate')}
            />
            <Status
                type="error"
                isOpen={showErrorModal}
                onClose={() => {
                    setShowErrorModal(false);
                    if (errorOnClosed) { errorOnClosed(); setErrorOnClosed(null); }
                }}
                message={errorModalMessage}
            />

            {/* Preview для просмотра существующих фото */}
            {existingImageUrls.length > 0 && (
                <Preview
                    isOpen={photoGallery.isOpen}
                    images={existingImageUrls}
                    currentIndex={photoGallery.currentIndex}
                    onClose={photoGallery.closeGallery}
                    onNext={photoGallery.goToNext}
                    onPrevious={photoGallery.goToPrevious}
                    onSelectImage={photoGallery.selectImage}
                />
            )}

            <CookieConsentBanner/>
        </div>
    );
};

export default CreateEdit;

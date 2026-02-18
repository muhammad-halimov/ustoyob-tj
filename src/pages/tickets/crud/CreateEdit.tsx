import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ROUTES } from '../../../app/routers/routes.ts';
import styles from './CreateEdit.module.scss';
import { getAuthToken, getUserRole } from '../../../utils/auth.ts';
import AddressSelector, { AddressValue, buildAddressData } from '../../../shared/ui/AddressSelector';
import CookieConsentBanner from "../../../widgets/CookieConsentBanner/CookieConsentBanner.tsx";
import StatusModal from '../../../shared/ui/Modal/StatusModal';
import { PhotoGallery, usePhotoGallery } from '../../../shared/ui/PhotoGallery';

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
    categories?: Array<{ id: number; title: string; image?: string }>;
}

const CreateEdit = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEditMode = !!id; // Если есть ID в URL - режим редактирования
    
    console.log('CreateEdit component mounted/updated', { id, isEditMode });
    
    const [serviceData, setServiceData] = useState<ServiceData>({
        title: '',
        description: '',
        notice: '',
        budget: '',
    });
    const [isLoading, setIsLoading] = useState(isEditMode);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [existingImages, setExistingImages] = useState<Array<{ id: number; image: string }>>([]);
    const [newImages, setNewImages] = useState<File[]>([]);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

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

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
    const token = getAuthToken();

    // Функция для форматирования URL изображений
    const getImageUrl = (imagePath: string): string => {
        if (!imagePath) return '';
        
        if (imagePath.startsWith('/images/ticket_photos/')) {
            return `${API_BASE_URL}${imagePath}`;
        } else if (imagePath.startsWith('http')) {
            return imagePath;
        } else {
            return `${API_BASE_URL}/images/ticket_photos/${imagePath}`;
        }
    };

    // PhotoGallery для просмотра существующих фото
    const existingImageUrls = existingImages.map(img => getImageUrl(img.image));
    const photoGallery = usePhotoGallery({ images: existingImageUrls });

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
        }
    }, [token, isEditMode, id]); // eslint-disable-line react-hooks/exhaustive-deps

    // Фильтруем occupations при изменении категории
    useEffect(() => {
        if (selectedCategory && occupations.length > 0) {
            const filtered = occupations.filter(occ => 
                occ.categories?.some(cat => cat.id === selectedCategory)
            );
            setFilteredOccupations(filtered);
            
            // Сбрасываем выбранную подкатегорию если она не подходит к новой категории
            if (selectedSubcategory && !filtered.find(occ => occ.id === selectedSubcategory)) {
                setSelectedSubcategory(null);
            }
        } else {
            setFilteredOccupations([]);
            setSelectedSubcategory(null);
        }
    }, [selectedCategory, occupations, selectedSubcategory]);

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
            const response = await fetch(`${API_BASE_URL}/api/categories`, {
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
            const response = await fetch(`${API_BASE_URL}/api/occupations`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                }
            });
            if (response.ok) {
                const data = await response.json();
                setOccupations(data);
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
                budget: String(data.budget || 0),
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
            setSelectedSubcategory(data.subcategory?.id || null);
            setSelectedUnit(data.unit?.id || null);
            setExistingImages(data.images || []);
            
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
            alert('Ошибка при загрузке данных тикета');
            navigate(ROUTES.TICKET_ME);
        } finally {
            setIsLoading(false);
        }
    };

    // Обработчики изображений
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setNewImages(prev => [...prev, ...newFiles]);
        }
    };

    const removeNewImage = (index: number) => {
        setNewImages(prev => prev.filter((_, i) => i !== index));
    };

    const removeExistingImage = (imageId: number) => {
        if (!confirm('Вы уверены, что хотите удалить это фото?')) return;

        // Просто обновляем локальное состояние
        // Изменения будут отправлены при сохранении формы
        setExistingImages(prev => prev.filter(img => img.id !== imageId));
    };

    const handleSubmit = async (e: React.SubmitEvent) => {
        e.preventDefault();

        // Валидация
        if (!serviceData.title.trim() || !serviceData.description.trim() || !serviceData.budget) {
            alert('Пожалуйста, заполните все обязательные поля');
            return;
        }
        
        if (!selectedCategory) {
            alert('Пожалуйста, выберите категорию');
            return;
        }

        if (filteredOccupations.length > 0 && !selectedSubcategory) {
            alert('Пожалуйста, выберите подкатегорию');
            return;
        }

        if (!addressValue.provinceId) {
            alert('Пожалуйста, выберите область');
            return;
        }

        if (!addressValue.cityId && addressValue.districtIds.length === 0) {
            alert('Пожалуйста, выберите город или район');
            return;
        }

        const budgetValue = Number(serviceData.budget);
        if (isNaN(budgetValue) || budgetValue <= 0) {
            alert('Пожалуйста, укажите корректную сумму бюджета');
            return;
        }

        try {
            setIsSubmitting(true);

            if (!token) {
                alert('Необходима авторизация');
                return;
            }

            // Создаем данные адреса
            const addressData = buildAddressData(addressValue);
            if (!addressData) {
                alert('Ошибка в данных адреса');
                return;
            }

            if (!isEditMode) {
                // Режим создания
                const userResponse = await fetch(`${API_BASE_URL}/api/users/me`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json',
                    },
                });

                if (!userResponse.ok) {
                    throw new Error('Не удалось получить информацию о пользователе');
                }

                const userData = await userResponse.json();
                const role = getUserRole();

                if (!role) {
                    alert('Не удалось определить роль пользователя');
                    return;
                }

                const ticketData = {
                    title: serviceData.title.trim(),
                    description: serviceData.description.trim(),
                    notice: serviceData.notice?.trim() || "",
                    budget: budgetValue,
                    active: true,
                    category: `/api/categories/${selectedCategory}`,
                    subcategory: selectedSubcategory ? `/api/occupations/${selectedSubcategory}` : null,
                    unit: selectedUnit ? `/api/units/${selectedUnit}` : null,
                    address: addressData,
                    author: `/api/users/${userData.id}`,
                    service: role === 'master',
                    master: role === 'master' ? `/api/users/${userData.id}` : null
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
                    throw new Error(errorText || 'Ошибка при создании объявления');
                }

                const ticketDataResponse = await response.json();

                // Загрузка изображений
                if (newImages.length > 0) {
                    for (const image of newImages) {
                        const imageFormData = new FormData();
                        imageFormData.append('imageFile', image);

                        try {
                            const uploadResponse = await fetch(`${API_BASE_URL}/api/tickets/${ticketDataResponse.id}/upload-photo`, {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${token}`,
                                },
                                body: imageFormData,
                            });
                            
                            if (!uploadResponse.ok) {
                                console.warn('Failed to upload image:', image.name);
                            }
                        } catch (imageError) {
                            console.error('Error uploading image:', imageError);
                        }
                    }
                }

                setShowSuccessModal(true);
            } else {
                // Режим редактирования
                if (!serviceData?.id) {
                    alert('ID услуги не найден');
                    return;
                }

                const updateData = {
                    title: serviceData.title,
                    description: serviceData.description,
                    notice: serviceData.notice || "",
                    budget: budgetValue,
                    service: true,
                    category: `/api/categories/${selectedCategory}`,
                    subcategory: selectedSubcategory ? `/api/occupations/${selectedSubcategory}` : null,
                    unit: selectedUnit ? `/api/units/${selectedUnit}` : null,
                    address: addressData,
                    images: existingImages.map(img => ({ image: img.image }))
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
                    throw new Error(errorText || 'Ошибка при обновлении услуги');
                }

                // Загружаем новые фото, если есть
                if (newImages.length > 0) {
                    const uploadedImages: ImageData[] = [];
                    
                    for (const image of newImages) {
                        const formData = new FormData();
                        formData.append('imageFile', image);

                        const uploadResponse = await fetch(`${API_BASE_URL}/api/tickets/${serviceData.id}/upload-photo`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                            },
                            body: formData,
                        });

                        if (uploadResponse.ok) {
                            const uploadedImage = await uploadResponse.json();
                            uploadedImages.push(uploadedImage);
                        } else {
                            console.warn('Failed to upload image:', image.name);
                        }
                    }

                    // Обновляем массив images в тикете
                    if (uploadedImages.length > 0) {
                        const allImages = [...existingImages, ...uploadedImages];
                        
                        await fetch(`${API_BASE_URL}/api/tickets/${serviceData.id}`, {
                            method: 'PATCH',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/merge-patch+json',
                            },
                            body: JSON.stringify({
                                images: allImages.map(img => ({ image: img.image }))
                            }),
                        });

                        // Обновляем локальное состояние
                        setExistingImages(allImages);
                        setNewImages([]);
                    }
                }

                setShowSuccessModal(true);
            }
        } catch (error) {
            console.error('Error:', error);
            alert(error instanceof Error ? error.message : 'Произошла ошибка');
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
        return <div className={styles.loading}>Загрузка...</div>;
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>{isEditMode ? 'Редактирование услуги' : 'Создание объявления'}</h1>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
                {/* Название услуги */}
                <div className={styles.section}>
                    <h2>Название услуги</h2>
                    <div className={styles.serviceSection}>
                        <input
                            type="text"
                            name="title"
                            value={serviceData.title}
                            onChange={(e) => setServiceData({...serviceData, title: e.target.value})}
                            placeholder="Введите название услуги"
                            className={styles.titleInput}
                            required
                        />
                    </div>
                </div>

                {/* Категория */}
                <div className={styles.section}>
                    <h2>Категория</h2>
                    <div className={styles.categorySection}>
                        <select
                            value={selectedCategory || ''}
                            onChange={(e) => setSelectedCategory(Number(e.target.value))}
                            className={styles.categorySelect}
                            required
                        >
                            <option value="">Выберите категорию</option>
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
                        <h2>Подкатегория</h2>
                        <div className={styles.categorySection}>
                            <select
                                value={selectedSubcategory || ''}
                                onChange={(e) => setSelectedSubcategory(Number(e.target.value))}
                                className={styles.categorySelect}
                                required
                            >
                                <option value="">Выберите подкатегорию</option>
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
                    <AddressSelector 
                        value={addressValue}
                        onChange={setAddressValue}
                        required={true}
                        multipleSuburbs={true}
                    />
                </div>

                {/* Бюджет */}
                <div className={styles.section}>
                    <h2>Бюджет</h2>
                    <div className={styles.budgetSection}>
                        <div className={styles.budgetRow}>
                            <div className={styles.budgetField}>
                                <input
                                    type="number"
                                    name="budget"
                                    value={serviceData.budget}
                                    onChange={(e) => setServiceData({...serviceData, budget: e.target.value})}
                                    placeholder="0"
                                    className={styles.budgetInput}
                                    min="1"
                                    required
                                />
                            </div>
                            <div className={styles.budgetField}>
                                <select
                                    className={styles.unitSelect}
                                    value={selectedUnit || ''}
                                    onChange={(e) => setSelectedUnit(Number(e.target.value))}
                                >
                                    <option value="">ед.изм.</option>
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
                    <h2>Фотографии</h2>
                    <div className={styles.photoSection}>
                        {/* Существующие фото - только в режиме редактирования */}
                        {isEditMode && existingImages.length > 0 && (
                            <div className={styles.existingPhotos}>
                                <h4>Существующие фото</h4>
                                <div className={styles.existingPhotoGrid}>
                                    {existingImages.map((img, index) => (
                                        <div key={img.id} className={styles.existingPhotoItem}>
                                            <img
                                                src={getImageUrl(img.image)}
                                                alt={`Фото ${index + 1}`}
                                                className={styles.existingPhoto}
                                                onClick={() => photoGallery.openGallery(index)}
                                                style={{ cursor: 'pointer' }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeExistingImage(img.id)}
                                                className={styles.removePhotoButton}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Загрузка новых фото */}
                        <div className={styles.newPhotoSection}>
                            <h4>{isEditMode ? 'Добавить новые фото' : 'Приложите фото'}</h4>
                            <div className={styles.photoUpload}>
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className={styles.fileInput}
                                    id="photo-upload"
                                />
                                <label htmlFor="photo-upload" className={styles.uploadLabel}>
                                    <span className={styles.plusIcon}>+</span>
                                </label>

                                {newImages.length > 0 && (
                                    <div className={styles.newPhotoPreview}>
                                        {newImages.map((image, index) => (
                                            <div key={index} className={styles.newPhotoItem}>
                                                <img
                                                    src={URL.createObjectURL(image)}
                                                    alt={`Новое фото ${index + 1}`}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeNewImage(index)}
                                                    className={styles.removePhotoButton}
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Описание услуги */}
                <div className={styles.section}>
                    <h2>{isEditMode ? 'Описание услуги' : 'Есть пожелания?'}</h2>
                    <div className={styles.descriptionSection}>
                        <div className={styles.descriptionLabel}>
                            {isEditMode 
                                ? 'Подробно опишите вашу услугу, условия работы, опыт и квалификацию.'
                                : 'Укажите важные детали, которые нужно знать заказчику.'
                            }
                        </div>
                        <textarea
                            name="description"
                            value={serviceData.description}
                            onChange={(e) => setServiceData({...serviceData, description: e.target.value})}
                            placeholder={isEditMode ? 'Подробное описание услуги...' : 'Опишите детали вашей услуги...'}
                            rows={isEditMode ? 6 : 4}
                            className={styles.descriptionTextarea}
                            required
                        />
                    </div>
                </div>

                {/* Дополнительные заметки */}
                <div className={styles.section}>
                    <h2>Дополнительные заметки</h2>
                    <div className={styles.descriptionSection}>
                        <div className={styles.descriptionLabel}>
                            Любая дополнительная информация (опционально)
                        </div>
                        <textarea
                            name="notice"
                            value={serviceData.notice}
                            onChange={(e) => setServiceData({...serviceData, notice: e.target.value})}
                            placeholder="Дополнительная информация..."
                            rows={isEditMode ? 3 : 2}
                            className={styles.descriptionTextarea}
                        />
                    </div>
                </div>

                {/* Кнопки */}
                <div className={styles.submitSection}>
                    {isEditMode && (
                        <button
                            type="button"
                            className={styles.cancelButton}
                            onClick={() => navigate(ROUTES.PROFILE)}
                            disabled={isSubmitting}
                        >
                            Отмена
                        </button>
                    )}
                    <button
                        type="submit"
                        className={styles.submitButton}
                        disabled={isSubmitting}
                    >
                        {isSubmitting 
                            ? (isEditMode ? 'Сохранение...' : 'Публикация...')
                            : (isEditMode ? 'Сохранить изменения' : 'Разместить объявление')
                        }
                    </button>
                </div>
            </form>

            <StatusModal
                type="success"
                isOpen={showSuccessModal}
                onClose={handleSuccessClose}
                message={isEditMode ? 'Услуга успешно обновлена!' : 'Предложение успешно опубликовано!'}
            />

            {/* PhotoGallery для просмотра существующих фото */}
            {isEditMode && existingImages.length > 0 && (
                <PhotoGallery
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

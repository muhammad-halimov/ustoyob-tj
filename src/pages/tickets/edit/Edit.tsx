import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getAuthToken } from '../../../utils/auth.ts';
import AddressSelector, { AddressValue, buildAddressData } from '../../../shared/ui/AddressSelector';
import styles from './Edit.module.scss';
import CookieConsentBanner from "../../../widgets/CookieConsentBanner/CookieConsentBanner.tsx";
import StatusModal from '../../../shared/ui/Modal/StatusModal';

interface ServiceData {
    id?: number;
    title: string;
    description: string;
    notice: string;
    budget: string;
    category?: { id: number; title: string };
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

const Edit = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [serviceData, setServiceData] = useState<ServiceData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [existingImages, setExistingImages] = useState<Array<{ id: number; image: string }>>([]);
    const [newImages, setNewImages] = useState<File[]>([]);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    // Данные для формы
    const [categories, setCategories] = useState<Category[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);

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
    const [selectedUnit, setSelectedUnit] = useState<number | null>(null);

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

    useEffect(() => {
        // Загружаем данные для формы
        fetchCategories();
        fetchUnits();

        if (location.state?.serviceData) {
            const data = location.state.serviceData;
            setServiceData(data);
            setSelectedCategory(data.category?.id || null);
            setSelectedUnit(data.unit?.id || null);
            setExistingImages(data.images || []);

            // Инициализируем адресные данные
            if (data.addresses && data.addresses.length > 0) {
                const address = data.addresses[0];
                setAddressValue({
                    provinceId: address.province?.id || null,
                    cityId: address.city?.id || null,
                    suburbIds: address.suburb ? [address.suburb.id] : [],
                    districtIds: address.district ? [address.district.id] : [],
                    settlementId: address.settlement?.id || null,
                    communityId: address.community?.id || null,
                    villageId: address.village?.id || null
                });
            }

            setIsLoading(false);
        } else {
            alert('Данные услуги не найдены');
            navigate(-1);
        }
    }, [location, navigate]);

    // Функции загрузки данных
    const fetchCategories = async () => {
        try {
            const token = getAuthToken();
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
            const token = getAuthToken();
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

    const removeExistingImage = async (imageId: number) => {
        if (!serviceData?.id) return;

        if (!confirm('Вы уверены, что хотите удалить это фото?')) return;

        try {
            const token = getAuthToken();
            if (!token) {
                alert('Необходима авторизация');
                return;
            }

            // Получаем текущий тикет
            const response = await fetch(`${API_BASE_URL}/api/tickets/${serviceData.id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                }
            });

            if (!response.ok) {
                throw new Error('Не удалось получить данные услуги');
            }

            const ticketData = await response.json();

            // Фильтруем изображения
            const updatedImages = ticketData.images.filter((img: ImageData) => img.id !== imageId);

            // Обновляем тикет
            const updateResponse = await fetch(`${API_BASE_URL}/api/tickets/${serviceData.id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/merge-patch+json',
                },
                body: JSON.stringify({
                    images: updatedImages
                }),
            });

            if (updateResponse.ok) {
                setExistingImages(prev => prev.filter(img => img.id !== imageId));
                alert('Фото успешно удалено');
            } else {
                throw new Error('Не удалось удалить фото');
            }
        } catch (error) {
            console.error('Error removing image:', error);
            alert('Ошибка при удалении фото');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!serviceData?.id) return;

        // Валидация
        if (!serviceData.title.trim() || !serviceData.description.trim() || !serviceData.budget) {
            alert('Пожалуйста, заполните все обязательные поля');
            return;
        }

        if (!selectedCategory) {
            alert('Пожалуйста, выберите категорию');
            return;
        }

        if (!addressValue.provinceId) {
            alert('Пожалуйста, выберите область');
            return;
        }

        if (!addressValue.cityId && addressValue.suburbIds.length === 0 && addressValue.districtIds.length === 0) {
            alert('Пожалуйста, выберите город или район');
            return;
        }

        try {
            setIsSubmitting(true);
            const token = getAuthToken();

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

            // Подготавливаем данные для обновления с правильными типами
            const updateData = {
                title: serviceData.title,
                description: serviceData.description,
                notice: serviceData.notice || "",
                budget: Number(serviceData.budget),
                service: true,
                category: `/api/categories/${selectedCategory}`,
                unit: selectedUnit ? `/api/units/${selectedUnit}` : null,
                // use singular `address` to match Create POST payload
                address: addressData
            };

            console.log('Updating service with data:', updateData);

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
                console.error('Update failed:', errorText);
                throw new Error('Ошибка при обновлении услуги');
            }

            const updatedService = await response.json();
            console.log('Service updated successfully:', updatedService);

            // Загружаем новые фото, если есть
            if (newImages.length > 0) {
                console.log('Uploading new images...');
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

                    if (!uploadResponse.ok) {
                        console.warn('Failed to upload image:', image.name);
                    } else {
                        console.log('Image uploaded successfully:', image.name);
                    }
                }
            }

            setShowSuccessModal(true);
            setTimeout(() => {
                setShowSuccessModal(false);
                navigate('/ticket/me');
            }, 2000);

        } catch (error) {
            console.error('Error updating service:', error);
            alert('Ошибка при обновлении услуги');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getImageUrl = (imagePath: string): string => {
        if (!imagePath) return '';
        if (imagePath.startsWith('http')) return imagePath;
        return `${API_BASE_URL}${imagePath}`;
    };

    if (isLoading) {
        return <div className={styles.loading}>Загрузка...</div>;
    }

    if (!serviceData) {
        return <div className={styles.error}>Услуга не найдена</div>;
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Редактирование услуги</h1>
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
                        {/* Существующие фото */}
                        {existingImages.length > 0 && (
                            <div className={styles.existingPhotos}>
                                <h4>Существующие фото</h4>
                                <div className={styles.existingPhotoGrid}>
                                    {existingImages.map((img, index) => (
                                        <div key={img.id} className={styles.existingPhotoItem}>
                                            <img
                                                src={getImageUrl(img.image)}
                                                alt={`Фото ${index + 1}`}
                                                className={styles.existingPhoto}
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
                            <h4>Добавить новые фото</h4>
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
                                    {/*<span>Выберите файлы</span>*/}
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
                                                    className={styles.removeNewPhotoButton}
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
                    <h2>Описание услуги</h2>
                    <div className={styles.descriptionSection}>
                        <textarea
                            name="description"
                            value={serviceData.description}
                            onChange={(e) => setServiceData({...serviceData, description: e.target.value})}
                            placeholder="Подробно опишите вашу услугу, условия работы, опыт и квалификацию."
                            rows={6}
                            className={styles.descriptionTextarea}
                            required
                        />
                    </div>
                </div>

                {/* Дополнительные заметки */}
                <div className={styles.section}>
                    <h2>Дополнительные заметки</h2>
                    <div className={styles.descriptionSection}>
                        <textarea
                            name="notice"
                            value={serviceData.notice}
                            onChange={(e) => setServiceData({...serviceData, notice: e.target.value})}
                            placeholder="Любая дополнительная информация (опционально)"
                            rows={3}
                            className={styles.descriptionTextarea}
                        />
                    </div>
                </div>

                {/* Кнопки */}
                <div className={styles.submitSection}>
                    <button
                        type="button"
                        className={styles.cancelButton}
                        onClick={() => navigate('/profile')}
                        disabled={isSubmitting}
                    >
                        Отмена
                    </button>
                    <button
                        type="submit"
                        className={styles.submitButton}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Сохранение...' : 'Сохранить изменения'}
                    </button>
                </div>
            </form>

            <StatusModal
                type="success"
                isOpen={showSuccessModal}
                onClose={() => {
                    setShowSuccessModal(false);
                    navigate('/ticket/me');
                }}
                message="Услуга успешно обновлена!"
            />
            <CookieConsentBanner/>
        </div>
    );
};

export default Edit;
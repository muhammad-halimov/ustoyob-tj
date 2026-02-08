import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Create.module.scss';
import { getAuthToken, getUserRole } from '../../../utils/auth.ts';
import AddressSelector, { AddressValue, buildAddressData } from '../../../shared/ui/AddressSelector';

interface Category {
    id: number;
    title: string;
}

interface Unit {
    id: number;
    title: string;
}

interface ApiViolation {
    propertyPath: string;
    message: string;
    code?: string;
}

interface ApiError {
    detail?: string;
    message?: string;
    title?: string;
    violations?: ApiViolation[];
    [key: string]: unknown;
}

const Create = () => {
    const navigate = useNavigate();
    const [categories, setCategories] = useState<Category[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
    const [selectedUnit, setSelectedUnit] = useState<number | null>(null);
    const [images, setImages] = useState<File[]>([]);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [addressValue, setAddressValue] = useState<AddressValue>({
        provinceId: null,
        cityId: null,
        suburbIds: [],
        districtIds: [],
        settlementId: null,
        communityId: null,
        villageId: null
    });

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        notice: '',
        budget: '',
        active: true,
    });

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
    const token = getAuthToken();

    useEffect(() => {
        if (!token) {
            navigate('/');
            return;
        }

        const role = getUserRole();
        console.log('User role:', role);
        fetchCategories();
        fetchUnits();
    }, [navigate, token]);

    const fetchCategories = async () => {
        try {
            if (!token) return;

            const response = await fetch(`${API_BASE_URL}/api/categories`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setCategories(data);
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
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setUnits(data);
        } catch (error) {
            console.error('Error fetching units:', error);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newImages = Array.from(e.target.files);
            setImages(prev => [...prev, ...newImages]);
        }
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Валидация
        if (!selectedCategory || !addressValue.provinceId || !formData.title.trim() || !formData.description.trim() || !formData.budget) {
            alert('Пожалуйста, заполните все обязательные поля');
            return;
        }

        if (!addressValue.cityId && addressValue.districtIds.length === 0) {
            alert('Пожалуйста, выберите город или район');
            return;
        }

        const budgetValue = Number(formData.budget);
        if (isNaN(budgetValue) || budgetValue <= 0) {
            alert('Пожалуйста, укажите корректную сумму бюджета');
            return;
        }

        if (!token) {
            alert('Пожалуйста, войдите в систему');
            return;
        }

        const role = getUserRole();
        if (!role) {
            alert('Не удалось определить роль пользователя');
            return;
        }

        setIsSubmitting(true);

        try {
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

            const addressData = buildAddressData(addressValue);
            if (!addressData) {
                alert('Не удалось сформировать данные адреса');
                return;
            }

            const ticketData = {
                title: formData.title.trim(),
                description: formData.description.trim(),
                notice: formData.notice?.trim() || "",
                budget: budgetValue,
                active: true,
                category: `/api/categories/${selectedCategory}`,
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

            if (response.ok) {
                const ticketDataResponse = await response.json();

                // Загрузка изображений
                if (images.length > 0) {
                    for (const image of images) {
                        const imageFormData = new FormData();
                        imageFormData.append('file', image);

                        try {
                            await fetch(`${API_BASE_URL}/api/tickets/${ticketDataResponse.id}/upload-photo`, {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${token}`,
                                },
                                body: imageFormData,
                            });
                        } catch (imageError) {
                            console.error('Error uploading image:', imageError);
                        }
                    }
                }

                setShowSuccessModal(true);
                resetForm();
            } else {
                const errorText = await response.text();
                let errorMessage = 'Неизвестная ошибка';
                try {
                    const errorData: ApiError = JSON.parse(errorText);
                    errorMessage = errorData.detail || errorData.message || errorData.title || JSON.stringify(errorData);

                    if (errorData.violations && Array.isArray(errorData.violations)) {
                        const violationMessages = errorData.violations.map((v: ApiViolation) =>
                            `Поле "${v.propertyPath}": ${v.message}`
                        ).join('\n');
                        errorMessage = `Ошибки валидации:\n${violationMessages}`;
                    }
                } catch {
                    errorMessage = errorText || `HTTP error! status: ${response.status}`;
                }

                alert('Ошибка при создании объявления: ' + errorMessage);
            }
        } catch (error) {
            console.error('Error:', error);
            let errorMessage = 'Неизвестная ошибка';

            if (error instanceof Error) {
                errorMessage = error.message;
            } else if (typeof error === 'string') {
                errorMessage = error;
            }

            alert('Ошибка при создании объявления: ' + errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            description: '',
            notice: '',
            budget: '',
            active: true,
        });
        setImages([]);
        setSelectedCategory(null);
        setSelectedUnit(null);
        setAddressValue({
            provinceId: null,
            cityId: null,
            suburbIds: [],
            districtIds: [],
            settlementId: null,
            communityId: null,
            villageId: null
        });
    };

    const handleSuccessClose = () => {
        setShowSuccessModal(false);
        navigate(`/my-tickets`);
    };

    if (!token) {
        return null;
    }

    return (
        <>
            <div className={styles.container}>
                <div className={styles.container_wrap}>
                    <form onSubmit={handleSubmit} className={styles.form}>
                        <h3>Заполните заявку с деталями</h3>

                        {/* Название услуги */}
                        <div className={styles.section}>
                            <h2>Название услуги</h2>
                            <div className={styles.serviceSection}>
                                <input
                                    type="text"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleInputChange}
                                    placeholder="Введите название услуги"
                                    className={styles.titleInput}
                                    required
                                />
                                <div className={styles.categorySection}>
                                    <div className={styles.categoryOption}>
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
                            </div>
                        </div>

                        <div className={styles.divider} />

                        {/* Address Selector */}
                        <AddressSelector
                            value={addressValue}
                            onChange={setAddressValue}
                            required={true}
                            multipleSuburbs={true}
                        />

                        <div className={styles.divider} />

                        {/* Бюджет */}
                        <div className={styles.section}>
                            <h2>Укажите бюджет</h2>
                            <div className={styles.budgetSection}>
                                <div className={styles.budgetRow}>
                                    <div className={styles.budgetField}>
                                        <input
                                            type="number"
                                            name="budget"
                                            value={formData.budget}
                                            onChange={handleInputChange}
                                            placeholder="0"
                                            className={styles.budgetInput}
                                            min="0"
                                            required
                                        />
                                    </div>
                                    <div className={styles.budgetField}>
                                        <select
                                            className={styles.unitSelect}
                                            value={selectedUnit || ''}
                                            onChange={(e) => setSelectedUnit(Number(e.target.value))}
                                        >
                                            <option value="">Ед. изм.</option>
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

                        <div className={styles.divider} />

                        {/* Фото */}
                        <div className={styles.section}>
                            <h2>Приложите фото</h2>
                            <div className={styles.photoSection}>
                                <div className={styles.photoLabel}>Из вашего портфолио</div>
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

                                    {images.length > 0 && (
                                        <div className={styles.imagePreview}>
                                            {images.map((image, index) => (
                                                <div key={index} className={styles.previewItem}>
                                                    <img src={URL.createObjectURL(image)} alt={`Preview ${index}`} />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeImage(index)}
                                                        className={styles.removeImage}
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

                        <div className={styles.divider} />

                        {/* Описание */}
                        <div className={styles.section}>
                            <h2>Есть пожелания?</h2>
                            <div className={styles.descriptionSection}>
                                <div className={styles.descriptionLabel}>
                                    Укажите важные детали, которые нужно знать заказчику.
                                </div>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    placeholder="Опишите детали вашей услуги..."
                                    rows={4}
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
                                    value={formData.notice}
                                    onChange={handleInputChange}
                                    placeholder="Дополнительная информация..."
                                    rows={2}
                                    className={styles.descriptionTextarea}
                                />
                            </div>
                        </div>

                        {/* Кнопка отправки */}
                        <div className={styles.submitSection}>
                            <button
                                type="submit"
                                className={styles.submitButton}
                                disabled={isSubmitting || !addressValue.provinceId}
                            >
                                {isSubmitting ? 'Публикация...' : 'Разместить объявление'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Модальное окно успеха */}
            {showSuccessModal && (
                <div className={styles.modalOverlay} onClick={handleSuccessClose}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <h2 className={styles.successTitle}>Предложение успешно опубликовано!</h2>
                        <div className={styles.successIcon}>
                            <img src="./uspeh.png" alt="uspeh"/>
                        </div>

                        <button
                            className={styles.successButton}
                            onClick={handleSuccessClose}
                        >
                            Понятно
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default Create;
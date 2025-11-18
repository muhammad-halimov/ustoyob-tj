import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './CreateAdPage.module.scss';
import { getAuthToken, getUserRole } from '../../utils/auth';
import uspeh from '../../../public/uspeh.png';

interface Category {
    id: number;
    title: string;
}

interface Province {
    id: number;
    title: string;
}

interface City {
    id: number;
    title: string;
    province: Province;
}

interface District {
    id: number;
    title: string;
    description: string;
    image: string;
    city: City;
}

interface Unit {
    id: number;
    title: string;
}

const CreateAdPage = () => {
    const navigate = useNavigate();
    const [categories, setCategories] = useState<Category[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [selectedDistrict, setSelectedDistrict] = useState<number | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
    const [selectedUnit, setSelectedUnit] = useState<number | null>(null);
    const [images, setImages] = useState<File[]>([]);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [districts, setDistricts] = useState<District[]>([]);
    // const [userRole, setUserRole] = useState<'client' | 'master' | null>(null);
    const [selectedProvince, setSelectedProvince] = useState<number | null>(null);
    const [selectedCity, setSelectedCity] = useState<number | null>(null);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        notice: '',
        budget: '',
        active: true,
    });

    const API_BASE_URL = 'https://admin.ustoyob.tj';

    useEffect(() => {
        const role = getUserRole();
        // setUserRole(role);
        console.log('User role:', role);
        fetchCategories();
        fetchDistricts();
        fetchUnits();
    }, []);

    const fetchDistricts = async () => {
        try {
            const token = getAuthToken();
            const response = await fetch(`${API_BASE_URL}/api/districts`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                }
            });
            const data = await response.json();
            setDistricts(data);
        } catch (error) {
            console.error('Error fetching districts:', error);
        }
    };

    const fetchCategories = async () => {
        try {
            const token = getAuthToken();
            const response = await fetch(`${API_BASE_URL}/api/categories`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                }
            });
            const data = await response.json();
            setCategories(data);
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

        // Валидация обязательных полей
        if (!selectedCategory || !selectedDistrict || !formData.title.trim() || !formData.description.trim() || !formData.budget) {
            alert('Пожалуйста, заполните все обязательные поля: название, описание, категория, район и бюджет');
            return;
        }

        const token = getAuthToken();
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
            // Получаем информацию о текущем пользователе
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

            const endpoint = role === 'master' ? '/api/tickets/masters' : '/api/tickets/clients';

            console.log('Using endpoint:', endpoint);

            // СОЗДАЕМ ПРАВИЛЬНЫЕ IRI В ФОРМАТЕ КАК В ДОКУМЕНТАЦИИ
            const ticketData = {
                title: formData.title.trim(),
                description: formData.description.trim(),
                notice: formData.notice?.trim() || "",
                budget: Number(formData.budget),
                active: true,
                category: `/api/categories/${selectedCategory}`,
                district: `/api/districts/${selectedDistrict}`,
                author: `/api/users/${userData.id}`,
                service: role === 'master', // true для мастеров, false для клиентов
                unit: selectedUnit ? `/api/units/${selectedUnit}` : null,
                master: role === 'master' ? `/api/users/${userData.id}` : null
            };

            console.log('Sending correct IRI format:', ticketData);

            // Отправляем запрос
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(ticketData),
            });

            console.log('Response status:', response.status);

            if (response.ok) {
                const ticketDataResponse = await response.json();
                console.log('Ticket created successfully:', ticketDataResponse);

                // Если есть изображения, загружаем их через отдельный endpoint
                if (images.length > 0) {
                    console.log('Uploading images...');
                    for (const image of images) {
                        const imageFormData = new FormData();
                        imageFormData.append('file', image);

                        try {
                            const imageResponse = await fetch(`${API_BASE_URL}/api/tickets/${ticketDataResponse.id}/upload-photo`, {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${token}`,
                                },
                                body: imageFormData,
                            });

                            if (imageResponse.ok) {
                                console.log('Image uploaded successfully');
                            } else {
                                const imageErrorText = await imageResponse.text();
                                console.warn('Failed to upload image:', imageErrorText);
                            }
                        } catch (imageError) {
                            console.error('Error uploading image:', imageError);
                        }
                    }
                }

                setShowSuccessModal(true);
                // Очищаем форму после успешной отправки
                setFormData({
                    title: '',
                    description: '',
                    notice: '',
                    budget: '',
                    active: true,
                });
                setImages([]);
                setSelectedCategory(null);
                setSelectedDistrict(null);
                setSelectedUnit(null);
                setSelectedProvince(null);
                setSelectedCity(null);
            } else {
                // Детальный анализ ошибки
                const errorText = await response.text();
                console.error('Error response text:', errorText);

                let errorMessage = 'Неизвестная ошибка';
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.detail || errorData.message || errorData.title || JSON.stringify(errorData);

                    // Обработка ошибок валидации
                    if (errorData.violations) {
                        const violationMessages = errorData.violations.map((v: any) =>
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

    const handleSuccessClose = () => {
        setShowSuccessModal(false);
        navigate('/');
    };
    const selectedDistrictInfo = districts.find(d => d.id === selectedDistrict);

    return (
        <>
            <div className={styles.container}>
                <div className={styles.header}>
                    <h1>Заполните заявку с деталями</h1>
                    {/*{userRole && (*/}
                    {/*    <div className={styles.roleInfo}>*/}
                    {/*        Создание объявления как: <strong>{userRole === 'master' ? 'Мастер' : 'Клиент'}</strong>*/}
                    {/*    </div>*/}
                    {/*)}*/}
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
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

                    {/* Адрес */}
                    <div className={styles.section}>
                        <h2>Адрес</h2>
                        <div className={styles.addressSection}>
                            <div className={styles.addressRow}>
                                {/* Район - ПЕРВЫЙ */}
                                <div className={styles.addressField}>
                                    <select
                                        value={selectedDistrict || ''}
                                        onChange={(e) => {
                                            const districtId = Number(e.target.value);
                                            setSelectedDistrict(districtId);
                                            // Автоматически устанавливаем область и город из выбранного района
                                            if (districtId) {
                                                const district = districts.find(d => d.id === districtId);
                                                if (district) {
                                                    setSelectedProvince(district.city.province.id);
                                                    setSelectedCity(district.city.id);
                                                }
                                            } else {
                                                setSelectedProvince(null);
                                                setSelectedCity(null);
                                            }
                                        }}
                                        className={styles.addressSelect}
                                        required
                                    >
                                        <option value="">Выберите район *</option>
                                        {districts.map(district => (
                                            <option key={district.id} value={district.id}>
                                                {district.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Область - автоматически заполняется */}
                                <div className={styles.addressField}>
                                    <select
                                        value={selectedProvince || ''}
                                        className={styles.addressSelect}
                                        disabled
                                    >
                                        <option value="">Область</option>
                                        {selectedProvince && (
                                            <option value={selectedProvince}>
                                                {selectedDistrictInfo?.city.province.title}
                                            </option>
                                        )}
                                    </select>
                                </div>

                                {/* Город - автоматически заполняется */}
                                <div className={styles.addressField}>
                                    <select
                                        value={selectedCity || ''}
                                        className={styles.addressSelect}
                                        disabled
                                    >
                                        <option value="">Город</option>
                                        {selectedCity && (
                                            <option value={selectedCity}>
                                                {selectedDistrictInfo?.city.title}
                                            </option>
                                        )}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

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
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Публикация...' : 'Разместить объявление'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Модальное окно успеха */}
            {showSuccessModal && (
                <div className={styles.modalOverlay} onClick={handleSuccessClose}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <h2 className={styles.successTitle}>Предложение успешно опубликовано!</h2>
                        <div className={styles.successIcon}>
                            <img src={uspeh} alt="uspeh"/>
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

export default CreateAdPage;
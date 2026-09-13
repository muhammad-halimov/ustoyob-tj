// Тест для смешанных форматов имен
import { nameTranslator, normalizeNameFormat } from './textHelper';

// Примеры таджикских имен в смешанном формате
const testNames = [
    'Abuabdulloҳ Rӯdakӣ',    // Абуабдуллоҳ Рӯдакӣ (Рудаки)
    'Abulқosim Firdavsi',     // Абулқосим Фирдавсӣ (Фирдоуси)
    'Sadriddin Aynӣ',         // Садриддин Айнӣ
    'Boқӣ Raҳӣmov',           // Боқӣ Раҳимов
];

console.log('=== Тест нормализации смешанных форматов ===\n');

testNames.forEach(name => {
    console.log(`Оригинал: ${name}`);
    
    // Нормализация в кириллицу
    const normalized = normalizeNameFormat(name);
    console.log(`Нормализовано: ${normalized}`);
    
    // Транслитерация в английский
    const toEnglish = nameTranslator(name, { from: 'tj', to: 'eng' });
    console.log(`→ Английский: ${toEnglish}`);
    
    // Транслитерация в русский
    const toRussian = nameTranslator(name, { from: 'tj', to: 'ru' });
    console.log(`→ Русский: ${toRussian}`);
    
    console.log('---\n');
});

console.log('\n=== Тест обратной транслитерации ===\n');

// Обратная транслитерация
const latinNames = ['Rudaki', 'Firdavsi', 'Ayni'];

latinNames.forEach(name => {
    console.log(`Английский: ${name}`);
    
    const toTajik = nameTranslator(name, { from: 'eng', to: 'tj' });
    console.log(`→ Таджикский: ${toTajik}`);
    
    const toRussian = nameTranslator(name, { from: 'eng', to: 'ru' });
    console.log(`→ Русский: ${toRussian}`);
    
    console.log('---\n');
});

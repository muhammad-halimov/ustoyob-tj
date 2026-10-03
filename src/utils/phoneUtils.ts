/**
 * Номер телефона для входа — в том же виде, что хранит бэкенд (E.164, +992901234567;
 * правила — копия Service/Extra/PhoneNumberUtil на бэкенде). Нужен, чтобы по одному полю
 * «Email или телефон» понять, что ввели, и показывать номер, на который ушёл код.
 *
 * Без кода страны 9 цифр — таджикский номер; пробелы, скобки, дефисы, 00 вместо + — можно.
 */

const DEFAULT_COUNTRY_CODE = '992';

/** Сколько цифр после кода страны — там, где это известно точно. */
const NATIONAL_LENGTH: Record<string, number> = { '992': 9, '998': 9, '996': 9, '7': 10 };

/** E.164 или null, если это не номер телефона. */
export function normalizePhone(raw: string | null | undefined): string | null {
    const value = (raw ?? '').trim();
    if (!value || value.includes('@') || !/^\+?[\d\s()\-.]+$/.test(value)) return null;

    let plus = value.startsWith('+');
    let digits = value.replace(/\D/g, '');

    if (!plus && digits.startsWith('00')) {
        digits = digits.slice(2);
        plus = true;
    }

    if (!plus) {
        if (digits.length === 9) digits = DEFAULT_COUNTRY_CODE + digits;
        else if (!(digits.length === 12 && digits.startsWith(DEFAULT_COUNTRY_CODE))) return null;
    }

    if (!/^[1-9]\d{7,14}$/.test(digits)) return null;

    for (const [code, length] of Object.entries(NATIONAL_LENGTH)) {
        if (digits.startsWith(code) && digits.length !== code.length + length) return null;
    }

    return `+${digits}`;
}

/** +992901234567 → +992 90 123 45 67 (для показа; остальные страны — как есть). */
export function formatPhone(phone: string): string {
    const m = /^\+992(\d{2})(\d{3})(\d{2})(\d{2})$/.exec(phone);
    return m ? `+992 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : phone;
}

/** Что ввели в поле «Email или телефон». */
export function parseLogin(raw: string): { email: string } | { phone: string } | null {
    const value = raw.trim();
    if (value.includes('@')) return { email: value };
    const phone = normalizePhone(value);
    return phone ? { phone } : null;
}

import i18next from 'i18next';

type Rule<T> = {
  field: keyof T;
  label: string;
  required?: boolean;
  minLength?: number;
  pattern?: { regex: RegExp; message: string };
};

export function validateForm<T>(
  data: Partial<T>,
  rules: Rule<T>[],
  addToast: (msg: string, type: 'warning') => void
): boolean {
  const errors: string[] = [];

  for (const rule of rules) {
    const value = data[rule.field];
    const str = value != null ? String(value).trim() : '';

    if (rule.required && str === '') {
      errors.push(i18next.t('validate.required', { label: rule.label }));
      continue;
    }
    if (rule.minLength && str.length > 0 && str.length < rule.minLength) {
      errors.push(i18next.t('validate.minLength', { label: rule.label, min: rule.minLength }));
    }
    if (rule.pattern && str.length > 0 && !rule.pattern.regex.test(str)) {
      errors.push(rule.pattern.message);
    }
  }

  if (errors.length > 0) {
    errors.forEach(e => addToast(e, 'warning'));
    return false;
  }
  return true;
}

export const toDisplayString = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

export const toMetaValue = (value: string | number | null | undefined): string =>
  toDisplayString(value);

export const toLanguageDisplayValue = (value: string | null | undefined): string => {
  const display = toDisplayString(value);
  const normalized = display.toLowerCase();

  if (normalized === 'englisch') return 'English';
  if (normalized === 'deutsch') return 'Deutsch';

  return display;
};

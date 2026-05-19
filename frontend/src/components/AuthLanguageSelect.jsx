import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const AuthLanguageSelect = () => {
  const { t, i18n } = useTranslation();

  return (
    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/25 bg-black/20 px-3 py-2 text-sm text-white backdrop-blur">
      <Languages className="h-4 w-4" />
      <span className="sr-only">{t('app.language')}</span>
      <select
        value={i18n.language}
        onChange={(event) => i18n.changeLanguage(event.target.value)}
        className="bg-transparent font-medium outline-none"
      >
        <option value="en" className="text-slate-900">{t('app.english')}</option>
        <option value="kn" className="text-slate-900">{t('app.kannada')}</option>
      </select>
    </label>
  );
};

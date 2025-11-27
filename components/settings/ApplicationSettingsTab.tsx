
import React from 'react';
import { useI18n } from '../../contexts/I18nContext';

interface Props {
  contentWidthClass: string;
}

const ApplicationSettingsTab: React.FC<Props> = ({ contentWidthClass }) => {
  const { t, language, setLanguage } = useI18n();
  
  return (
    <div className={`space-y-4 ${contentWidthClass}`}>
      <h3 className="text-xl font-bold text-gray-800 mb-2">{t('applicationLanguage')}</h3>
      <p className="text-sm text-gray-500 mb-4">{t('applicationLanguageDescription')}</p>
      <div className="flex gap-2">
        <button onClick={() => setLanguage('en')} className={`flex-1 p-3 rounded-lg border-2 transition-all ${language === 'en' ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200' : 'border-gray-300 bg-white hover:border-indigo-400'}`}>
            <span role="img" aria-label="UK Flag">🇬🇧</span> English
        </button>
        <button onClick={() => setLanguage('id')} className={`flex-1 p-3 rounded-lg border-2 transition-all ${language === 'id' ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200' : 'border-gray-300 bg-white hover:border-indigo-400'}`}>
            <span role="img" aria-label="Indonesian Flag">🇮🇩</span> Bahasa Indonesia
        </button>
      </div>
    </div>
  );
};

export default ApplicationSettingsTab;

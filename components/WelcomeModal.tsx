import React from 'react';
import Modal from './Modal';
import { useI18n } from '../contexts/I18nContext';
import type { Language } from '../utils/translations';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose }) => {
  const { t, setLanguage, language } = useI18n();

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
  };

  const footer = (
    <div className="flex flex-col sm:flex-row justify-end gap-3 w-full">
      <button
        onClick={() => { /* Implement guide logic if needed */ onClose(); }}
        className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors w-full sm:w-auto"
      >
        {t('viewGuide')}
      </button>
      <button
        onClick={onClose}
        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-md w-full sm:w-auto"
      >
        {t('getStarted')}
      </button>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={() => {}} title={t('welcomeToGaweInvoice')} footer={footer}>
      <div className="space-y-6">
        <p className="text-gray-600">{t('welcomeDescription')}</p>
        <div>
          <label htmlFor="language-select" className="block text-sm font-medium text-gray-700 mb-2">{t('selectLanguage')}</label>
          <div className="flex gap-2">
            <button 
                onClick={() => handleLanguageChange('en')} 
                className={`flex-1 p-3 rounded-lg border-2 transition-all ${language === 'en' ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200' : 'border-gray-300 bg-white hover:border-indigo-400'}`}
            >
                <span role="img" aria-label="UK Flag">🇬🇧</span> English
            </button>
            <button 
                onClick={() => handleLanguageChange('id')} 
                className={`flex-1 p-3 rounded-lg border-2 transition-all ${language === 'id' ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200' : 'border-gray-300 bg-white hover:border-indigo-400'}`}
            >
                <span role="img" aria-label="Indonesian Flag">🇮🇩</span> Bahasa Indonesia
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default WelcomeModal;

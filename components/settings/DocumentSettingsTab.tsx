
import React from 'react';
import type { Settings, InvoiceTemplate } from '../../types';
import { locales, currencies } from '../../utils/localization';
import { useI18n } from '../../contexts/I18nContext';

interface Props {
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
  contentWidthClass: string;
}

const DocumentSettingsTab: React.FC<Props> = ({ settings, onSettingsChange, contentWidthClass }) => {
  const { t } = useI18n();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    onSettingsChange({ ...settings, [name]: value });
  };

  return (
    <div className={`space-y-4 ${contentWidthClass}`}>
      <div>
        <label htmlFor="invoiceNumberFormat" className="block text-sm font-medium text-gray-700">{t('invoiceNumberFormat')}</label>
        <input id="invoiceNumberFormat" name="invoiceNumberFormat" value={settings.invoiceNumberFormat || ''} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md shadow-sm" />
        <p className="mt-2 text-xs text-gray-500">{t('invoiceNumberFormatDescription')}</p>
        <p className="mt-1 text-xs text-gray-500">{t('invoiceNumberFormatExample')}</p>
      </div>

      <div className="pt-4 border-t">
        <label htmlFor="quoteNumberFormat" className="block text-sm font-medium text-gray-700">{t('quoteNumberFormat')}</label>
        <input id="quoteNumberFormat" name="quoteNumberFormat" value={settings.quoteNumberFormat || ''} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md shadow-sm" />
        <p className="mt-2 text-xs text-gray-500">{t('quoteNumberFormatDescription')}</p>
      </div>
      
      <div className="pt-4 border-t">
          <label htmlFor="defaultTemplate" className="block text-sm font-medium text-gray-700">{t('defaultInvoiceTemplate')}</label>
          <select id="defaultTemplate" name="defaultTemplate" value={settings.defaultTemplate || 'classic'} onChange={(e) => onSettingsChange({...settings, defaultTemplate: e.target.value as InvoiceTemplate})} className="mt-1 w-full p-2 border rounded-md shadow-sm bg-white">
              <option value="classic">{t('classic')}</option>
              <option value="modern">{t('modern')}</option>
              <option value="elegant">{t('elegant')}</option>
          </select>
          <p className="mt-2 text-xs text-gray-500">{t('defaultInvoiceTemplateDescription')}</p>
      </div>

      <div className="pt-4 border-t">
        <h4 className="text-md font-semibold text-gray-700 mb-2">{t('localization')}</h4>
        <p className="text-sm text-gray-500 mb-4">{t('localizationDescription')}</p>
        <div>
            <label htmlFor="locale" className="block text-sm font-medium text-gray-700">{t('languageAndRegion')}</label>
            <select id="locale" name="locale" value={settings.locale || ''} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md shadow-sm bg-white">
              {locales.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
        </div>
        <div className="mt-4">
            <label htmlFor="currency" className="block text-sm font-medium text-gray-700">{t('currency')}</label>
            <select id="currency" name="currency" value={settings.currency || ''} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md shadow-sm bg-white">
              {currencies.map(c => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
            </select>
        </div>
      </div>
    </div>
  );
};

export default DocumentSettingsTab;

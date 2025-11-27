import React from 'react';
import type { Settings } from '../../types';
import { useI18n } from '../../contexts/I18nContext';
import { useToast } from '../../contexts/ToastContext';

interface Props {
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
  contentWidthClass: string;
}

const ProfileSettingsTab: React.FC<Props> = ({ settings, onSettingsChange, contentWidthClass }) => {
  const { t } = useI18n();
  const { addToast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onSettingsChange({ ...settings, [e.target.name]: e.target.value });
  };
  
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) { // ~2MB limit
      addToast(t('fileTooLargeMessage'), 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      onSettingsChange({ ...settings, companyLogo: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    onSettingsChange({ ...settings, companyLogo: '' });
  };
  
  return (
    <div className={`space-y-4 ${contentWidthClass}`}>
      <p className="text-sm text-gray-500">{t('companyInfoDescription')}</p>
      <div>
        <label htmlFor="fromName" className="block text-sm font-medium text-gray-700">{t('yourNameOrCompany')}</label>
        <input id="fromName" name="fromName" value={settings.fromName} onChange={handleChange} required className="mt-1 w-full p-2 border rounded-md shadow-sm" />
      </div>
      <div>
        <label htmlFor="fromEmail" className="block text-sm font-medium text-gray-700">{t('email')}</label>
        <input id="fromEmail" type="email" name="fromEmail" value={settings.fromEmail} onChange={handleChange} required className="mt-1 w-full p-2 border rounded-md shadow-sm" />
      </div>
      <div>
        <label htmlFor="fromAddress" className="block text-sm font-medium text-gray-700">{t('address')}</label>
        <textarea id="fromAddress" name="fromAddress" value={settings.fromAddress} onChange={handleChange} rows={3} className="mt-1 w-full p-2 border rounded-md shadow-sm" />
      </div>
      <div>
        <label htmlFor="fromPhone" className="block text-sm font-medium text-gray-700">{t('phone')}</label>
        <input id="fromPhone" name="fromPhone" value={settings.fromPhone} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md shadow-sm" />
      </div>

      <div className="pt-4 border-t">
          <label className="block text-sm font-medium text-gray-700">{t('companyLogo')}</label>
          <div className="mt-1 flex items-center gap-4">
              <span className="inline-block h-20 w-20 rounded-md overflow-hidden bg-gray-100 border">
                  {settings.companyLogo ? (
                      <img src={settings.companyLogo} alt={t('companyLogoPreview')} className="h-full w-full object-contain" />
                  ) : (
                      <div className="h-full w-full flex items-center justify-center text-gray-400">
                          <i className="bi bi-image text-3xl"></i>
                      </div>
                  )}
              </span>
              <div className="flex flex-col gap-2">
                  <input type="file" id="logo-upload" className="hidden" accept="image/png, image/jpeg, image/svg+xml" onChange={handleLogoChange} />
                  <label htmlFor="logo-upload" className="cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                      {t('changeLogo')}
                  </label>
                  {settings.companyLogo && (
                      <button type="button" onClick={handleRemoveLogo} className="cursor-pointer bg-red-100 text-red-700 py-2 px-3 border border-transparent rounded-md shadow-sm text-sm leading-4 font-medium hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                          {t('removeLogo')}
                      </button>
                  )}
              </div>
          </div>
          <p className="mt-2 text-xs text-gray-500">{t('logoUploadHint')}</p>
      </div>
    </div>
  );
};

export default ProfileSettingsTab;


import { useState, useEffect, useCallback } from 'react';
import type { Settings } from '../types';
import { getSettings, updateSettings as dbUpdateSettings } from '../services/db';
import { useI18n } from '../contexts/I18nContext';
import { useToast } from '../contexts/ToastContext';

export const useSettings = () => {
  const { t } = useI18n();
  const { addToast } = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);

  const fetchSettings = useCallback(async () => {
    const data = await getSettings();
    setSettings(data);
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = async (newSettings: Settings) => {
    await dbUpdateSettings(newSettings);
    await fetchSettings();
    addToast(t('settingsSavedMessage'), 'success');
  };

  return { settings, updateSettings, refetchSettings: fetchSettings };
};
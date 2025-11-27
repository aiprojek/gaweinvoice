

import React, { useState, useEffect, useRef } from 'react';
import type { Settings } from '../types';
import { useI18n } from '../contexts/I18nContext';

import ProfileSettingsTab from './settings/ProfileSettingsTab';
import DocumentSettingsTab from './settings/DocumentSettingsTab';
import TemplateCustomizationTab from './settings/TemplateCustomizationTab';
import ApplicationSettingsTab from './settings/ApplicationSettingsTab';
import DataManagementTab from './settings/DataManagementTab';

interface SettingsProps {
  settings: Settings | null;
  onSave: (settings: Settings) => void;
  onRestore: () => void;
}

const SettingsView: React.FC<SettingsProps> = ({ settings, onSave, onRestore }) => {
  const { t } = useI18n();
  const [formData, setFormData] = useState<Settings | null>(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const tabs = [
    { id: 'profile', label: t('companyProfile') },
    { id: 'invoice', label: t('documentSettings') },
    { id: 'template', label: t('templateCustomization') },
    { id: 'application', label: t('applicationSettings') },
    { id: 'data', label: t('dataManagement') },
  ];

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const handleFormDataChange = (newFormData: Settings) => {
      setFormData(newFormData);
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(formData) onSave(formData);
  };

  const handleTabSelect = (tabId: string) => {
    setActiveTab(tabId);
    setIsDropdownOpen(false);
  };
  
  const activeTabLabel = tabs.find(tab => tab.id === activeTab)?.label;
  const contentWidthClass = "max-w-xl mx-auto"; 

  if (!formData) {
    return <div>{t('loadingData')}</div>;
  }

  return (
    <div className="bg-white shadow-lg rounded-xl p-4 sm:p-6 lg:p-8 mx-auto max-w-6xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">{t('settings')}</h2>
      
      <div className="mb-6">
          <div className="sm:hidden relative" ref={dropdownRef}>
              <button type="button" onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-left font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex justify-between items-center" aria-haspopup="true" aria-expanded={isDropdownOpen}>
                  {activeTabLabel}
                  <i className={`bi bi-chevron-down transition-transform duration-200 ${isDropdownOpen ? 'transform rotate-180' : ''}`}></i>
              </button>
              {isDropdownOpen && (
                  <div className="absolute left-0 mt-2 w-full rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                      <div className="py-1" role="menu" aria-orientation="vertical">
                          {tabs.map(tab => (
                              <a key={tab.id} href="#" onClick={(e) => { e.preventDefault(); handleTabSelect(tab.id); }} className={`block px-4 py-2 text-sm ${activeTab === tab.id ? 'bg-indigo-100 text-indigo-700' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`} role="menuitem">
                                  {tab.label}
                              </a>
                          ))}
                      </div>
                  </div>
              )}
          </div>
          <nav className="hidden sm:flex sm:flex-row gap-2" aria-label="Tabs">
              {tabs.map(tab => (
                  <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`whitespace-nowrap text-left w-full sm:w-auto px-4 py-2 rounded-md font-medium text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-150 ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {tab.label}
                  </button>
              ))}
          </nav>
      </div>
      
      <div>
        <form onSubmit={handleSubmit}>
            <div className={activeTab === 'profile' ? 'block' : 'hidden'}>
                <ProfileSettingsTab
                    settings={formData}
                    onSettingsChange={handleFormDataChange}
                    contentWidthClass={contentWidthClass}
                />
            </div>
            <div className={activeTab === 'invoice' ? 'block' : 'hidden'}>
                <DocumentSettingsTab
                    settings={formData}
                    onSettingsChange={handleFormDataChange}
                    contentWidthClass={contentWidthClass}
                />
            </div>
            <div className={activeTab === 'template' ? 'block' : 'hidden'}>
                <TemplateCustomizationTab
                    settings={formData}
                    onSettingsChange={handleFormDataChange}
                />
            </div>
            
            {['profile', 'invoice', 'template'].includes(activeTab) && (
              <div className={`flex justify-end pt-6 mt-6 border-t ${activeTab !== 'template' ? contentWidthClass : ''}`}>
                <button type="submit" className="w-full sm:w-auto flex items-center justify-center px-6 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none">
                  <i className="bi bi-check-circle-fill mr-2"></i> {t('save')} {t('settings')}
                </button>
              </div>
            )}
        </form>

        <div className={activeTab === 'application' ? 'block' : 'hidden'}>
            <ApplicationSettingsTab contentWidthClass={contentWidthClass} />
        </div>
        
        <div className={activeTab === 'data' ? 'block' : 'hidden'}>
            <DataManagementTab 
                onRestore={onRestore}
                contentWidthClass={contentWidthClass}
            />
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
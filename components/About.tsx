

import React, { useState, useRef, useEffect } from 'react';
import { useI18n } from '../contexts/I18nContext';

const About: React.FC = () => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState('about');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const tabs = [
    { id: 'about', label: t('aboutApp') },
    { id: 'guide', label: t('userGuide') },
    { id: 'contact', label: t('contactUs') },
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const handleTabSelect = (tabId: string) => {
    setActiveTab(tabId);
    setIsDropdownOpen(false);
  };
  
  const activeTabLabel = tabs.find(tab => tab.id === activeTab)?.label;

  const FeatureCard: React.FC<{ icon: string; title: string; description: string }> = ({ icon, title, description }) => (
    <div className="flex items-start p-4 bg-gray-50 rounded-lg border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex-shrink-0">
        <i className={`bi ${icon} text-2xl text-indigo-500 mr-4 mt-1`}></i>
      </div>
      <div>
        <h4 className="font-semibold text-gray-800">{title}</h4>
        <p className="text-sm text-gray-600 mt-1">{description}</p>
      </div>
    </div>
  );
  
  const GuideStep: React.FC<{ number: number; icon: string; title: string; description: string }> = ({ number, icon, title, description }) => (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 flex items-start gap-5">
      <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 text-indigo-600 font-bold text-xl">
        <i className={`bi ${icon}`}></i>
      </div>
      <div>
        <h4 className="text-lg font-bold text-gray-800 mb-1">{t('step', { number })}: {title}</h4>
        <p className="text-gray-600" dangerouslySetInnerHTML={{ __html: description.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}></p>
      </div>
    </div>
  );


  return (
    <div className="bg-white shadow-lg rounded-xl p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">{t('about')}</h2>
      
      {/* Tabs */}
      <div className="mb-6">
        <div className="sm:hidden relative" ref={dropdownRef}>
            <button 
                type="button" 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)} 
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-left font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex justify-between items-center"
            >
                {activeTabLabel}
                <i className={`bi bi-chevron-down transition-transform duration-200 ${isDropdownOpen ? 'transform rotate-180' : ''}`}></i>
            </button>
            {isDropdownOpen && (
                <div className="absolute left-0 mt-2 w-full rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                    <div className="py-1">
                        {tabs.map(tab => (
                            <a 
                                key={tab.id}
                                href="#" 
                                onClick={(e) => { e.preventDefault(); handleTabSelect(tab.id); }} 
                                className={`block px-4 py-2 text-sm ${activeTab === tab.id ? 'bg-indigo-100 text-indigo-700' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}
                            >
                                {tab.label}
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </div>
        <nav className="hidden sm:flex sm:flex-row gap-2" aria-label="Tabs">
            {tabs.map(tab => (
                <button 
                    key={tab.id}
                    type="button" 
                    onClick={() => setActiveTab(tab.id)} 
                    className={`whitespace-nowrap text-left w-full sm:w-auto px-4 py-2 rounded-md font-medium text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-150 ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                    {tab.label}
                </button>
            ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'about' && (
          <section aria-labelledby="about-app-heading" className="space-y-8">
            <h2 id="about-app-heading" className="sr-only">{t('aboutApp')}</h2>
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">{t('aboutTitle')}</h3>
              <p className="text-gray-600 leading-relaxed">{t('aboutDescription')}</p>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-4">{t('keyFeatures')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FeatureCard icon="bi-database-lock" title={t('featureLocalDataTitle')} description={t('featureLocalDataDesc')} />
                <FeatureCard icon="bi-file-earmark-diff-fill" title={t('featureManagementTitle')} description={t('featureManagementDesc')} />
                <FeatureCard icon="bi-bar-chart-line-fill" title={t('featureDashboardTitle')} description={t('featureDashboardDesc')} />
                <FeatureCard icon="bi-arrow-repeat" title={t('featureRecurringTitle')} description={t('featureRecurringDesc')} />
                <FeatureCard icon="bi-palette-fill" title={t('featureCustomizationTitle')} description={t('featureCustomizationDesc')} />
                <FeatureCard icon="bi-cloud-arrow-down-fill" title={t('featureDataControlTitle')} description={t('featureDataControlDesc')} />
                <FeatureCard icon="bi-file-earmark-pdf-fill" title={t('featureExportTitle')} description={t('featureExportDesc')} />
                <FeatureCard icon="bi-phone-fill" title={t('featurePwaTitle')} description={t('featurePwaDesc')} />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">{t('techStack')}</h3>
              <p className="text-gray-600">{t('techStackDesc')}</p>
            </div>
          </section>
        )}

        {activeTab === 'guide' && (
          <section aria-labelledby="user-guide-heading" className="space-y-6">
            <h2 id="user-guide-heading" className="sr-only">{t('userGuide')}</h2>
            <h3 className="text-xl font-bold text-gray-800 mb-2">{t('guideTitle')}</h3>
            <div className="space-y-4">
               <GuideStep number={1} icon="bi-gear-fill" title={t('guideStep1Title')} description={t('guideStep1Desc')} />
               <GuideStep number={2} icon="bi-people-fill" title={t('guideStep2Title')} description={t('guideStep2Desc')} />
               <GuideStep number={3} icon="bi-file-earmark-plus-fill" title={t('guideStep3Title')} description={t('guideStep3Desc')} />
               <GuideStep number={4} icon="bi-arrow-repeat" title={t('guideStep4Title')} description={t('guideStep4Desc')} />
               <GuideStep number={5} icon="bi-cash-coin" title={t('guideStep5Title')} description={t('guideStep5Desc')} />
               <GuideStep number={6} icon="bi-shield-lock-fill" title={t('guideStep6Title')} description={t('guideStep6Desc')} />
            </div>
          </section>
        )}
        
        {activeTab === 'contact' && (
          <section aria-labelledby="contact-heading" className="space-y-6 text-center max-w-lg mx-auto py-8">
            <h2 id="contact-heading" className="sr-only">{t('contactUs')}</h2>
            <i className="bi bi-envelope-paper-heart text-6xl text-indigo-400"></i>
            <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">{t('contactUs')}</h3>
                <p className="text-gray-600 leading-relaxed">{t('contactIntro')}</p>
            </div>
            <div className="pt-4">
                <a 
                    href="mailto:aiprojek01@gmail.com"
                    className="inline-flex items-center justify-center px-6 py-3 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition duration-150 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    <i className="bi bi-envelope-fill mr-2"></i> {t('sendEmail')}
                </a>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default About;
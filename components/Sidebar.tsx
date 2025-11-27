import React from 'react';
import type { ViewNames } from '../App';
import { useI18n } from '../contexts/I18nContext';
import AppLogo from './AppLogo';

interface SidebarProps {
  currentView: ViewNames;
  onNavigate: (view: ViewNames) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const NavLink: React.FC<{
  viewName: ViewNames;
  currentView: ViewNames;
  icon: string;
  label: string;
  onClick: () => void;
}> = ({ viewName, currentView, icon, label, onClick }) => (
    <a
        href="#"
        onClick={(e) => { e.preventDefault(); onClick(); }}
        className={`flex items-center px-4 py-3 text-lg rounded-lg transition-colors duration-200 ${
            currentView === viewName
                ? 'bg-indigo-600 text-white font-semibold shadow-lg'
                : 'text-gray-600 hover:bg-indigo-100 hover:text-indigo-700'
        }`}
    >
        <i className={`bi ${icon} mr-4 text-xl`}></i>
        <span>{label}</span>
    </a>
);


const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, isOpen, setIsOpen }) => {
  const { t } = useI18n();
  const handleNavigate = (view: ViewNames) => {
    onNavigate(view);
  };
  
  const navItems = [
    { view: 'list', icon: 'bi-files', label: t('invoices') },
    { view: 'recurring', icon: 'bi-arrow-repeat', label: t('recurringInvoices') },
    { view: 'quotes', icon: 'bi-file-earmark-text-fill', label: t('quotes') },
    { view: 'clients', icon: 'bi-people-fill', label: t('clients') },
    { view: 'products', icon: 'bi-box-seam-fill', label: t('products') },
    { view: 'dashboard', icon: 'bi-bar-chart-line-fill', label: t('dashboard') },
    { view: 'reports', icon: 'bi-file-earmark-bar-graph-fill', label: t('reports') },
    { view: 'settings', icon: 'bi-gear-fill', label: t('settings') },
    { view: 'about', icon: 'bi-info-circle-fill', label: t('about') },
  ] as const;

  return (
    <>
      {/* Overlay for mobile */}
      <div 
        className={`fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsOpen(false)}
      ></div>

      <aside className={`fixed lg:relative inset-y-0 left-0 bg-white w-64 lg:w-72 shadow-xl z-40 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 flex flex-col h-full`}>
        <div className="p-6 flex-1 overflow-y-auto">
            <div className="flex items-center mb-10 text-indigo-600">
                 <div className="h-10 w-10">
                    <AppLogo />
                 </div>
                 <h1 className="ml-3 text-2xl font-bold text-gray-800">GaweInvoice</h1>
            </div>
            <nav className="space-y-3 pb-4">
              {navItems.map(item => (
                <NavLink 
                  key={item.view}
                  viewName={item.view}
                  currentView={currentView.startsWith('quote') ? 'quotes' : currentView.startsWith('recurring') ? 'recurring' : currentView}
                  icon={item.icon}
                  label={item.label}
                  onClick={() => handleNavigate(item.view)}
                />
              ))}
            </nav>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
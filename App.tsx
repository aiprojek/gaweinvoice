


import React, { useState, useEffect, useRef } from 'react';
import type { InvoiceStatus, QuoteStatus } from './types';
import InvoiceList from './components/InvoiceList';
import InvoiceForm from './components/InvoiceForm';
import InvoiceDetail from './components/InvoiceDetail';
import QuoteList from './components/QuoteList';
import QuoteForm from './components/QuoteForm';
import QuoteDetail from './components/QuoteDetail';
import RecurringInvoiceList from './components/RecurringInvoiceList';
import RecurringInvoiceForm from './components/RecurringInvoiceForm';
import ClientList from './components/ClientList';
import ProductList from './components/ProductList';
import SettingsView from './components/Settings';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Reports from './components/Reports';
import WelcomeModal from './components/WelcomeModal';
import { useI18n } from './contexts/I18nContext';
import About from './components/About';
import { useSettings } from './hooks/useSettings';
import { useClients } from './hooks/useClients';
import { useProducts } from './hooks/useProducts';
import { useInvoices } from './hooks/useInvoices';
import { useQuotes } from './hooks/useQuotes';
import { useRecurringInvoices } from './hooks/useRecurringInvoices';
import ToastContainer from './components/ToastContainer';

export type ViewNames = 'list' | 'form' | 'detail' | 'quotes' | 'quote-form' | 'quote-detail' | 'recurring' | 'recurring-form' | 'clients' | 'products' | 'settings' | 'dashboard' | 'about' | 'reports';

type View =
  | { name: 'list' }
  | { name: 'form'; id?: number }
  | { name: 'detail'; id: number }
  | { name: 'quotes' }
  | { name: 'quote-form'; id?: number }
  | { name: 'quote-detail'; id: number }
  | { name: 'recurring' }
  | { name: 'recurring-form'; id?: number }
  | { name: 'clients' }
  | { name: 'products' }
  | { name: 'settings' }
  | { name: 'dashboard' }
  | { name: 'about' }
  | { name: 'reports' };

const App: React.FC = () => {
  const { t } = useI18n();
  const [view, setView] = useState<View>({ name: 'list' });
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  
  const [isWelcomeModalOpen, setWelcomeModalOpen] = useState(false);
  const initialCheckPerformed = useRef(false);
  
  // --- Data Hooks ---
  const { settings, updateSettings, refetchSettings } = useSettings();
  const { clients, saveClient, removeClient, refetchClients } = useClients();
  const { products, saveProduct, removeProduct, refetchProducts } = useProducts();
  const { saveInvoice, removeInvoice, updateInvoiceStatus, bulkDeleteInvoices, bulkUpdateInvoiceStatus, duplicateInvoice, refetchInvoices } = useInvoices(settings);
  const { saveQuote, removeQuote, updateQuoteStatus, bulkDeleteQuotes, bulkUpdateQuoteStatus, convertToInvoice, refetchQuotes } = useQuotes(settings, () => { refetchInvoices(); refetchQuotes(); });
  const { recurringInvoices, saveRecurring, removeRecurring, updateRecurringStatus, checkAndGenerateRecurringInvoices, refetchRecurringInvoices } = useRecurringInvoices(settings, () => { refetchInvoices(); refetchRecurringInvoices(); });
  
  const refetchAll = () => {
    refetchSettings();
    refetchClients();
    refetchProducts();
    refetchInvoices();
    refetchQuotes();
    refetchRecurringInvoices();
  };

  const [loading, setLoading] = useState(true);
  const [error] = useState<string | null>(null);

  useEffect(() => {
    const checkAllDataLoaded = [
      settings,
      clients,
      products,
      recurringInvoices // Invoices and Quotes are fetched in their components now
    ].every(data => data !== null);

    if (checkAllDataLoaded) {
      setLoading(false);
    }
  }, [settings, clients, products, recurringInvoices]);
  
  // --- Initial Setup ---
  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcomeModal');
    if (!hasSeenWelcome) {
      setWelcomeModalOpen(true);
    }
  }, []);

  const handleCloseWelcomeModal = () => {
    localStorage.setItem('hasSeenWelcomeModal', 'true');
    setWelcomeModalOpen(false);
  };
  
  // Check recurring invoices only once after settings are loaded
  useEffect(() => {
      if (settings && !initialCheckPerformed.current) {
          initialCheckPerformed.current = true;
          checkAndGenerateRecurringInvoices();
      }
  }, [settings, checkAndGenerateRecurringInvoices]);
  
  const handleNavigate = (viewName: ViewNames, id?: number) => {
    if (viewName === 'form') setView({ name: 'form', id });
    else if (viewName === 'detail' && id) setView({ name: 'detail', id });
    else if (viewName === 'quote-form') setView({ name: 'quote-form', id });
    else if (viewName === 'quote-detail' && id) setView({ name: 'quote-detail', id });
    else if (viewName === 'recurring-form') setView({ name: 'recurring-form', id });
    else setView({ name: viewName as any });
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };
  
  const handleSaveInvoice = async (invoiceData: any, id?: number) => {
    await saveInvoice(invoiceData, id);
    setView({ name: 'list' });
  };
  
  const handleConvertToInvoice = async (quoteId: number) => {
      const newInvoiceId = await convertToInvoice(quoteId);
      if(newInvoiceId) {
        handleNavigate('form', newInvoiceId);
      }
  };

  const handleSaveQuote = async (quoteData: any, id?: number) => {
    await saveQuote(quoteData, id);
    setView({ name: 'quotes' });
  };
  
  const handleSaveRecurring = async (recData: any, id?: number) => {
      await saveRecurring(recData, id);
      setView({ name: 'recurring' });
  };

  // Invoices are now fetched inside the list component
  const renderContent = () => {
    if (loading) return <div className="text-center p-8">{t('loadingData')}</div>;
    if (error) return <div className="text-center p-8 text-red-500">{error}</div>;

    switch (view.name) {
      case 'form': return <InvoiceForm id={view.id} onSave={handleSaveInvoice} onSaveProduct={saveProduct} onCancel={() => setView({ name: 'list' })} clients={clients!} products={products!} settings={settings} />;
      case 'detail': return <InvoiceDetail id={view.id} onEdit={(id) => handleNavigate('form', id)} onDelete={async (id) => { await removeInvoice(id); setView({ name: 'list' }); }} onUpdateStatus={updateInvoiceStatus} onDuplicate={duplicateInvoice} onBack={() => setView({ name: 'list' })} onNavigate={handleNavigate} settings={settings} />;
      case 'quotes': return <QuoteList onView={(id) => handleNavigate('quote-detail', id)} onEdit={(id) => handleNavigate('quote-form', id)} onDelete={removeQuote} onCreate={() => handleNavigate('quote-form')} onConvertToInvoice={handleConvertToInvoice} onBulkDelete={bulkDeleteQuotes} onBulkUpdateStatus={bulkUpdateQuoteStatus} settings={settings} />;
      case 'quote-form': return <QuoteForm id={view.id} onSave={handleSaveQuote} onSaveProduct={saveProduct} onCancel={() => setView({ name: 'quotes' })} clients={clients!} products={products!} settings={settings} />;
      case 'quote-detail': return <QuoteDetail id={view.id} onEdit={(id) => handleNavigate('quote-form', id)} onDelete={async (id) => { await removeQuote(id); setView({ name: 'quotes' }); }} onUpdateStatus={updateQuoteStatus} onConvertToInvoice={handleConvertToInvoice} onBack={() => setView({ name: 'quotes' })} onNavigate={handleNavigate} settings={settings} />;
      case 'recurring': return <RecurringInvoiceList recurringInvoices={recurringInvoices!} onCreate={() => handleNavigate('recurring-form')} onEdit={(id) => handleNavigate('recurring-form', id)} onDelete={removeRecurring} onUpdateStatus={updateRecurringStatus} settings={settings} />;
      case 'recurring-form': return <RecurringInvoiceForm id={view.id} onSave={handleSaveRecurring} onCancel={() => setView({ name: 'recurring' })} clients={clients!} products={products!} settings={settings} />;
      case 'clients': return <ClientList onSave={saveClient} onDelete={removeClient} />;
      case 'products': return <ProductList onSave={saveProduct} onDelete={removeProduct} settings={settings} />;
      case 'settings': return <SettingsView settings={settings} onSave={updateSettings} onRestore={refetchAll} />;
      case 'dashboard': return <Dashboard clients={clients!} settings={settings} />;
      case 'reports': return <Reports clients={clients!} products={products!} settings={settings} />;
      case 'about': return <About />;
      case 'list': default: return <InvoiceList onView={(id) => handleNavigate('detail', id)} onEdit={(id) => handleNavigate('form', id)} onDelete={removeInvoice} onCreate={() => handleNavigate('form')} onUpdateStatus={updateInvoiceStatus} onDuplicate={duplicateInvoice} onBulkDelete={bulkDeleteInvoices} onBulkUpdateStatus={bulkUpdateInvoiceStatus} settings={settings} />;
    }
  };

  return (
    <>
      <div className="h-screen w-screen overflow-hidden bg-gray-100 text-gray-800 flex">
        <Sidebar currentView={view.name} onNavigate={handleNavigate} isOpen={isSidebarOpen} setIsOpen={setSidebarOpen} />
        <div className="flex-1 flex flex-col h-full min-w-0 transition-all duration-300">
          <Header onGoHome={() => handleNavigate('list')} onMenuClick={() => setSidebarOpen(!isSidebarOpen)} />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            {renderContent()}
          </main>
        </div>
      </div>
      <ToastContainer />
      <WelcomeModal isOpen={isWelcomeModalOpen} onClose={handleCloseWelcomeModal} />
    </>
  );
};

export default App;
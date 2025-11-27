
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Settings } from '../../types';
import { useI18n } from '../../contexts/I18nContext';
import { formatCurrency } from '../../utils/formatting';

interface TemplatePreviewProps {
  settings: Settings;
}

const TemplatePreview: React.FC<TemplatePreviewProps> = ({ settings }) => {
    const { t } = useI18n();
    const { fromName, companyLogo, defaultTemplate, templateAccentColor, templateShowCost, templateShowDescription, templateCustomFooter } = settings;

    const dummyInvoice = {
        invoiceNumber: 'INV-2024-0123', toName: t('clientInc'),
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0],
        items: [
            { id: '1', name: t('itemSample1'), description: t('itemSample1Desc'), quantity: 10, price: 150, cost: 90 },
            { id: '2', name: t('itemSample2'), description: '', quantity: 1, price: 100, cost: 20 },
        ],
        subtotal: 1600, taxRate: 10, taxAmount: 160, total: 1760, notes: t('previewFooterText'),
    };

    const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString(settings.locale, { month: 'short', day: 'numeric' });

    return (
        <div className={`template-${defaultTemplate || 'classic'} p-6 text-xs`} style={{ '--template-accent-color': templateAccentColor } as React.CSSProperties}>
            <header className="invoice-header flex justify-between items-start pb-4 mb-4">
                <div>
                    <h1 className="text-xl font-bold uppercase">{t('invoice')}</h1>
                    <p className="text-gray-500 text-xs">#{dummyInvoice.invoiceNumber}</p>
                </div>
                <div className="text-right">
                    {companyLogo ? <img src={companyLogo} alt="Logo" className="max-h-12 ml-auto mb-1 object-contain" /> : <h2 className="company-name text-lg font-semibold">{fromName || t('yourCompany')}</h2>}
                </div>
            </header>
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                    <h3 className="font-semibold text-gray-500 uppercase tracking-wide text-[10px] mb-1">{t('billedTo')}</h3>
                    <p className="font-bold text-gray-800">{dummyInvoice.toName}</p>
                </div>
                <div className="text-right">
                    <div className="mb-2"><p className="font-semibold text-gray-500 uppercase text-[10px]">{t('invoiceDate')}</p><p className="font-medium text-gray-800">{formatDate(dummyInvoice.invoiceDate)}</p></div>
                    <div><p className="font-semibold text-gray-500 uppercase text-[10px]">{t('dueDate')}</p><p className="font-medium text-gray-800">{formatDate(dummyInvoice.dueDate)}</p></div>
                </div>
            </div>
            <table className="min-w-full mb-6 text-xs">
                <thead>
                    <tr className="invoice-header-row">
                        <th className="py-1 px-2 text-left font-semibold uppercase">{t('item')}</th>
                        {templateShowDescription && <th className="py-1 px-2 text-left font-semibold uppercase">{t('description')}</th>}
                        <th className="py-1 px-2 text-center font-semibold uppercase">{t('qty')}</th>
                        <th className="py-1 px-2 text-right font-semibold uppercase">{t('price')}</th>
                        {templateShowCost && <th className="py-1 px-2 text-right font-semibold uppercase">{t('cost')}</th>}
                        <th className="py-1 px-2 text-right font-semibold uppercase">{t('total')}</th>
                    </tr>
                </thead>
                <tbody>
                    {dummyInvoice.items.map(item => (
                        <tr key={item.id} className="border-b">
                            <td className="py-1 px-2 font-medium">{item.name}</td>
                            {templateShowDescription && <td className="py-1 px-2 text-gray-500">{item.description}</td>}
                            <td className="py-1 px-2 text-center">{item.quantity}</td>
                            <td className="py-1 px-2 text-right">{formatCurrency(item.price, settings)}</td>
                            {templateShowCost && <td className="py-1 px-2 text-right">{formatCurrency(item.cost, settings)}</td>}
                            <td className="py-1 px-2 text-right font-medium">{formatCurrency(item.quantity * item.price, settings)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="flex justify-end mb-6">
                <div className="totals-summary w-full max-w-[200px] space-y-1">
                    <div className="flex justify-between"><span className="text-gray-600">{t('subtotal')}:</span><span>{formatCurrency(dummyInvoice.subtotal, settings)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">{t('tax', { rate: dummyInvoice.taxRate })}:</span><span>{formatCurrency(dummyInvoice.taxAmount, settings)}</span></div>
                    <div className="total-due-section flex justify-between font-bold pt-1 mt-1 text-sm">
                        <span className="total-due-label">{t('totalDue')}:</span>
                        <span className="total-due-amount">{formatCurrency(dummyInvoice.total, settings)}</span>
                    </div>
                </div>
            </div>
            <footer>
                <h3 className="font-semibold text-gray-600 mb-1">{t('notes')}</h3>
                <p className="text-gray-500 text-xs">{dummyInvoice.notes}</p>
                {templateCustomFooter && <div className="pt-4 mt-4 border-t text-center text-gray-500 text-xs"><p>{templateCustomFooter}</p></div>}
            </footer>
        </div>
    );
};


interface Props {
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
}

const TemplateCustomizationTab: React.FC<Props> = ({ settings, onSettingsChange }) => {
  const { t } = useI18n();
  const [previewZoom, setPreviewZoom] = useState(0.5);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const previewSectionRef = useRef<HTMLDivElement>(null);

  const calculateAndSetSmartZoom = useCallback(() => {
    if (previewContainerRef.current) {
      const containerWidth = previewContainerRef.current.offsetWidth;
      const smartScale = (containerWidth - 20) / 800;
      setPreviewZoom(smartScale > 0 ? smartScale : 0.1);
    }
  }, []);

  useEffect(() => {
    calculateAndSetSmartZoom();
    previewSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.addEventListener('resize', calculateAndSetSmartZoom);
    return () => window.removeEventListener('resize', calculateAndSetSmartZoom);
  }, [calculateAndSetSmartZoom]);

  useEffect(() => {
    const container = previewContainerRef.current;
    if (container) {
      container.scrollLeft = (container.scrollWidth - container.offsetWidth) / 2;
    }
  }, [previewZoom]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
        const { checked } = e.target as HTMLInputElement;
        onSettingsChange({ ...settings, [name]: checked });
    } else {
        onSettingsChange({ ...settings, [name]: value });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        <div className="space-y-6">
            <div>
                <label htmlFor="templateAccentColor" className="block text-sm font-medium text-gray-700">{t('accentColor')}</label>
                <div className="mt-1 flex items-center gap-3">
                    <input type="color" id="templateAccentColor" name="templateAccentColor" value={settings.templateAccentColor || '#4f46e5'} onChange={handleChange} className="p-1 h-10 w-10 block bg-white border border-gray-300 rounded-md cursor-pointer" />
                    <input type="text" value={settings.templateAccentColor || '#4f46e5'} onChange={handleChange} name="templateAccentColor" className="w-full p-2 border rounded-md shadow-sm" />
                </div>
                <p className="mt-2 text-xs text-gray-500">{t('accentColorDesc')}</p>
            </div>
            <div className="pt-4 border-t">
                <h4 className="text-sm font-medium text-gray-700">{t('columnVisibility')}</h4>
                <p className="mt-1 text-xs text-gray-500 mb-2">{t('columnVisibilityDesc')}</p>
                <div className="space-y-2">
                    <div className="flex items-center">
                        <input id="templateShowDescription" name="templateShowDescription" type="checkbox" checked={settings.templateShowDescription} onChange={handleChange} className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                        <label htmlFor="templateShowDescription" className="ml-2 block text-sm text-gray-900">{t('showDescriptionColumn')}</label>
                    </div>
                    <div className="flex items-center">
                        <input id="templateShowCost" name="templateShowCost" type="checkbox" checked={settings.templateShowCost} onChange={handleChange} className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                        <label htmlFor="templateShowCost" className="ml-2 block text-sm text-gray-900">{t('showCostColumn')}</label>
                    </div>
                </div>
            </div>
            <div className="pt-4 border-t">
                <label htmlFor="templateCustomFooter" className="block text-sm font-medium text-gray-700">{t('customFooter')}</label>
                 <textarea id="templateCustomFooter" name="templateCustomFooter" value={settings.templateCustomFooter} onChange={handleChange} rows={3} className="mt-1 w-full p-2 border rounded-md shadow-sm" />
                <p className="mt-2 text-xs text-gray-500">{t('customFooterDesc')}</p>
            </div>
        </div>
         <div ref={previewSectionRef}>
            <h3 className="text-md font-semibold text-gray-800 mb-2">{t('livePreview')}</h3>
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 p-2 bg-gray-100 rounded-md border">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600">{t('zoom')}:</span>
                    <button type="button" title={t('zoomOut')} onClick={() => setPreviewZoom(z => Math.max(0.1, z - 0.1))} className="w-7 h-7 rounded-full bg-white border shadow-sm flex items-center justify-center hover:bg-gray-50 text-lg font-bold flex-shrink-0">-</button>
                    <span className="text-sm font-semibold text-gray-700 w-12 text-center">{(previewZoom * 100).toFixed(0)}%</span>
                    <button type="button" title={t('zoomIn')} onClick={() => setPreviewZoom(z => Math.min(1.5, z + 0.1))} className="w-7 h-7 rounded-full bg-white border shadow-sm flex items-center justify-center hover:bg-gray-50 text-lg font-bold flex-shrink-0">+</button>
                </div>
                <button type="button" onClick={calculateAndSetSmartZoom} className="w-full sm:w-auto px-3 py-1 bg-white border shadow-sm rounded-md text-sm hover:bg-gray-50 flex items-center justify-center gap-2"><i className="bi bi-arrows-fullscreen"></i> {t('fitToScreen')}</button>
            </div>
            <div ref={previewContainerRef} className="border rounded-lg shadow-inner p-2 bg-gray-200 overflow-auto h-[600px] grid items-start justify-items-center">
                <div className="transition-transform duration-150 flex-shrink-0" style={{ transform: `scale(${previewZoom})`, transformOrigin: 'top' }}>
                    <div className="w-[800px] bg-white shadow-lg">
                        <TemplatePreview settings={settings} />
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default TemplateCustomizationTab;

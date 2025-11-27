import React, { useEffect, useRef, useState } from 'react';
import type { Invoice, Settings } from '../types';
import { formatCurrency } from '../utils/formatting';
import { useI18n } from '../contexts/I18nContext';

interface ReceiptProps {
  invoice: Invoice;
  settings: Settings | null;
}

const Receipt: React.FC<ReceiptProps> = ({ invoice, settings }) => {
  const { t, language } = useI18n();
  const formatDate = (dateString: string | Date) => new Date(dateString).toLocaleDateString(language, { year: 'numeric', month: 'long', day: 'numeric' });

  // Smart Zoom State
  const [zoomScale, setZoomScale] = useState(1);
  const [containerHeight, setContainerHeight] = useState<number | 'auto'>('auto');
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const calculateZoom = () => {
        if (containerRef.current && contentRef.current) {
            const containerWidth = containerRef.current.offsetWidth;
            const contentWidth = 794; // Consistent with other docs
            
            if (containerWidth === 0) return;

            const scale = containerWidth / contentWidth;
            setZoomScale(scale);
            setContainerHeight(contentRef.current.scrollHeight * scale);
        }
    };

    calculateZoom();
    
    const containerObserver = new ResizeObserver(calculateZoom);
    if (containerRef.current) containerObserver.observe(containerRef.current);

    const contentObserver = new ResizeObserver(calculateZoom);
    if (contentRef.current) contentObserver.observe(contentRef.current);

    window.addEventListener('resize', calculateZoom);

    return () => {
        window.removeEventListener('resize', calculateZoom);
        containerObserver.disconnect();
        contentObserver.disconnect();
    };
  }, []);

  return (
    <div className="w-full overflow-hidden relative" ref={containerRef} style={{ height: containerHeight === 'auto' ? 'auto' : `${containerHeight}px` }}>
        <div 
            ref={contentRef}
            className="bg-white p-8 md:p-12 font-sans overflow-hidden"
            style={{ 
                minWidth: '794px', 
                width: '794px',
                position: 'absolute',
                top: 0,
                left: 0,
                transform: `scale(${zoomScale})`,
                transformOrigin: 'top left',
                marginBottom: '0'
            } as React.CSSProperties}
        >
        {/* Watermark */}
        <div className="absolute inset-0 flex items-center justify-center z-0">
            <span className="text-6xl sm:text-8xl font-bold text-green-100 transform -rotate-45 opacity-70 select-none uppercase">
                {t('paid')}
            </span>
        </div>

        <div className="relative z-10">
            {/* Header */}
            <header className="flex flex-row justify-between items-start pb-8 mb-8 border-b border-gray-200">
                <div className="mb-0 w-auto">
                    <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">{t('receipt')}</h1>
                    <p className="text-gray-500 mt-2">{t('receiptForInvoice', { invoiceNumber: invoice.invoiceNumber })}</p>
                </div>
                <div className="text-right w-auto">
                    {settings?.companyLogo ? (
                        <>
                            <img src={settings.companyLogo} alt={`${invoice.fromName} logo`} className="max-h-16 max-w-[160px] ml-auto mb-2 object-contain" />
                            <h2 className="text-lg font-semibold text-gray-700">{invoice.fromName}</h2>
                        </>
                    ) : (
                        <h2 className="text-xl font-semibold text-gray-700">{invoice.fromName}</h2>
                    )}
                    <div className="break-words">
                        <p className="text-sm text-gray-500">{invoice.fromAddress}</p>
                    </div>
                </div>
            </header>

            {/* Details */}
            <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                    <h3 className="font-semibold text-gray-500 uppercase tracking-wide text-sm mb-2">{t('receivedFrom')}</h3>
                    <p className="font-bold text-gray-800">{invoice.toName}</p>
                    <div className="break-words">
                        <p className="text-gray-600">{invoice.toAddress}</p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="mb-4">
                        <p className="font-semibold text-gray-500 uppercase tracking-wide text-sm">{t('paymentDate')}</p>
                        <p className="font-medium text-gray-800">{formatDate(invoice.updatedAt)}</p>
                    </div>
                    <div>
                        <p className="font-semibold text-gray-500 uppercase tracking-wide text-sm">{t('amountPaid')}</p>
                        <p className="font-bold text-2xl text-green-600">{formatCurrency(invoice.total, settings, invoice.currency)}</p>
                    </div>
                </div>
            </div>

            {/* Summary */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center mb-8">
            <p className="text-gray-700">
                {t('receiptThankYou', { total: formatCurrency(invoice.total, settings, invoice.currency), invoiceNumber: invoice.invoiceNumber })}
            </p>
            </div>

            {/* Items */}
            <h3 className="font-semibold text-gray-600 mb-2">{t('paymentFor')}</h3>
            <div className="overflow-visible border rounded-lg w-full">
            <table className="min-w-full">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="py-2 px-4 text-left text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">{t('itemDetails')}</th>
                        <th className="py-2 px-4 text-right text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">{t('total')}</th>
                    </tr>
                </thead>
                <tbody>
                    {invoice.items.map(item => (
                        <tr key={item.id} className="border-t border-gray-200">
                            <td className="py-2 px-4 text-sm">
                                <div>
                                    <span className="font-semibold">{item.name}</span>
                                    <span className="text-gray-600"> ({item.quantity} @ {formatCurrency(item.price, settings, invoice.currency)})</span>
                                </div>
                                {item.description && <div className="text-xs text-gray-500 pl-2">{item.description}</div>}
                            </td>
                            <td className="py-2 px-4 text-right text-sm font-medium whitespace-nowrap">{formatCurrency(item.quantity * item.price, settings, invoice.currency)}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot className="bg-gray-50 font-semibold">
                    <tr className="border-t-2 border-gray-300">
                        <td className="py-2 px-4 text-right">{t('subtotal')}</td>
                        <td className="py-2 px-4 text-right whitespace-nowrap">{formatCurrency(invoice.subtotal, settings, invoice.currency)}</td>
                    </tr>
                    <tr>
                        <td className="py-2 px-4 text-right">{t('tax')} ({invoice.taxRate}%)</td>
                        <td className="py-2 px-4 text-right whitespace-nowrap">{formatCurrency(invoice.taxAmount, settings, invoice.currency)}</td>
                    </tr>
                    <tr className="border-t border-gray-300 text-base">
                        <td className="py-3 px-4 text-right">{t('totalPaid')}</td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">{formatCurrency(invoice.total, settings, invoice.currency)}</td>
                    </tr>
                </tfoot>
            </table>
            </div>

            {/* Footer */}
            <footer className="text-center text-xs text-gray-400 pt-8 mt-8 border-t">
                <p>{t('receiptFooter')}</p>
                <p className="mt-2">dicetak oleh GaweInvoice by AI Projek | aiprojek01.my.id</p>
            </footer>
        </div>
        </div>
    </div>
  );
};

export default Receipt;
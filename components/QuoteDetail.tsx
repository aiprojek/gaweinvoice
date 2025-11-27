import React, { useState, useEffect, useRef } from 'react';
import type { Quote, QuoteStatus, Settings } from '../types';
import { getQuoteById } from '../services/db';
import QuoteStatusBadge from './QuoteStatusBadge';
import { QuoteStatus as StatusEnum } from '../types';
import ConfirmDialog from './ConfirmDialog';
import { formatCurrency } from '../utils/formatting';
import { useI18n } from '../contexts/I18nContext';
import type { ViewNames } from '../App';
import { generatePDFfromHTML } from '../utils/pdfGenerator';
import { useToast } from '../contexts/ToastContext';

declare const htmlToImage: any;

interface QuoteDetailProps {
  id: number;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onUpdateStatus: (id: number, status: QuoteStatus) => void;
  onConvertToInvoice: (id: number) => void;
  onBack: () => void;
  onNavigate: (viewName: ViewNames, id?: number) => void;
  settings: Settings | null;
}

const QuoteDetail: React.FC<QuoteDetailProps> = ({ id, onEdit, onDelete, onUpdateStatus, onConvertToInvoice, onBack, onNavigate, settings }) => {
  const { t, language } = useI18n();
  const { addToast } = useToast();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
  // Smart Zoom Refs
  const quoteRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [containerHeight, setContainerHeight] = useState<number | 'auto'>('auto');

  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isConfirmingConversion, setIsConfirmingConversion] = useState(false);
  
  // Mobile Menu State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchQuote = async () => {
      setIsLoading(true);
      const data = await getQuoteById(id);
      setQuote(data || null);
      setIsLoading(false);
    };
    fetchQuote();
  }, [id]);

  // Smart Zoom Logic
  useEffect(() => {
    const calculateZoom = () => {
        if (containerRef.current && quoteRef.current) {
            const containerWidth = containerRef.current.offsetWidth;
            const contentWidth = 794; // A4 Width

            if (containerWidth === 0) return;

            const scale = containerWidth / contentWidth;
            setZoomScale(scale);
            // Recalculate height based on the scaled content
            setContainerHeight(quoteRef.current.scrollHeight * scale);
        }
    };

    calculateZoom();
    
    const containerObserver = new ResizeObserver(calculateZoom);
    if (containerRef.current) containerObserver.observe(containerRef.current);

    const contentObserver = new ResizeObserver(calculateZoom);
    if (quoteRef.current) contentObserver.observe(quoteRef.current);
    
    window.addEventListener('resize', calculateZoom);
    return () => {
        window.removeEventListener('resize', calculateZoom);
        containerObserver.disconnect();
        contentObserver.disconnect();
    };
  }, [quote, isLoading]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
            setIsMobileMenuOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString(language, { year: 'numeric', month: 'long', day: 'numeric' });

  const handleExport = async () => {
    if (!quoteRef.current || !quote) return;
    setIsExporting(true);
    setIsMobileMenuOpen(false);
    try {
      const dataUrl = await htmlToImage.toPng(quoteRef.current, { 
          quality: 0.95, 
          backgroundColor: '#ffffff',
          width: 794,
          height: quoteRef.current.scrollHeight,
          style: {
              transform: 'scale(1)',
              transformOrigin: 'top left',
              width: '794px',
              height: 'auto',
              margin: '0',
              position: 'static',
              boxShadow: 'none',
              borderRadius: '0'
          }
      });
      const link = document.createElement('a');
      link.download = `quote-${quote.quoteNumber}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('oops, something went wrong!', error);
      addToast(t('exportErrorMessage'), 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = async () => {
    if (!quoteRef.current || !quote) return;
    setIsSharing(true);
    setIsMobileMenuOpen(false);
    try {
        const blob = await htmlToImage.toBlob(quoteRef.current, { 
            quality: 0.95, 
            backgroundColor: '#ffffff',
            width: 794,
            height: quoteRef.current.scrollHeight,
            style: {
                transform: 'scale(1)',
                transformOrigin: 'top left',
                width: '794px',
                height: 'auto',
                margin: '0',
                position: 'static',
                boxShadow: 'none',
                borderRadius: '0'
            }
        });
        if (blob) {
            const file = new File([blob], `quote-${quote.quoteNumber}.png`, { type: 'image/png' });
            
            // Check if Web Share API is supported and can share files
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: `Quote ${quote.quoteNumber}`,
                    text: `Quote #${quote.quoteNumber} from ${quote.fromName}`,
                    files: [file]
                });
            } else {
                // Fallback to Clipboard API
                try {
                    await navigator.clipboard.write([
                        new ClipboardItem({
                            [blob.type]: blob
                        })
                    ]);
                    addToast(t('clipboardSuccess'), 'success');
                } catch (clipboardError) {
                    console.error('Clipboard API failed', clipboardError);
                    addToast(t('shareErrorMessage'), 'error');
                }
            }
        }
    } catch (error) {
        console.error('Sharing failed', error);
        addToast(t('shareErrorMessage'), 'error');
    } finally {
        setIsSharing(false);
    }
  };

  const handleExportPDF = async () => {
    if (!quoteRef.current || !quote) return;
    setIsGeneratingPDF(true);
    setIsMobileMenuOpen(false);
    try {
      await generatePDFfromHTML(
        quoteRef.current,
        `quote-${quote.quoteNumber}.pdf`
      );
    } catch (e) {
      console.error('PDF Generation Error', e);
      addToast('Failed to generate PDF', 'error');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleConfirmDelete = () => {
    if (quote) {
      onDelete(quote.id);
    }
  };

  const handleConfirmConversion = () => {
    if (quote) {
        onConvertToInvoice(quote.id);
    }
  };

  if (isLoading) return <div className="text-center p-8">{t('loadingData')}</div>;
  if (!quote) return <div className="text-center p-8 text-red-500">{t('quoteNotFound')}</div>;
  
  const ActionButtons = () => (
    <>
      {quote.status !== StatusEnum.Accepted && (
        <button 
            onClick={() => { setIsConfirmingConversion(true); setIsMobileMenuOpen(false); }} 
            className="w-full text-left sm:w-auto flex items-center px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm"
        >
          <i className="bi bi-file-earmark-arrow-up-fill mr-2"></i>{t('convertToInvoice')}
        </button>
      )}
      <button onClick={handleExportPDF} disabled={isGeneratingPDF} className="w-full text-left sm:w-auto flex items-center px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-400 shadow-sm">
          <i className="bi bi-file-earmark-pdf-fill mr-2"></i>{isGeneratingPDF ? t('generatingPDF') : t('exportPDF')}
      </button>
      <button onClick={handleShare} disabled={isSharing} className="w-full text-left sm:w-auto flex items-center px-3 py-2 text-sm bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:bg-indigo-300 shadow-sm">
          <i className="bi bi-share-fill mr-2"></i>{isSharing ? t('sharing') : t('share')}
      </button>
      <button onClick={handleExport} disabled={isExporting} className="w-full text-left sm:w-auto flex items-center px-3 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 shadow-sm">
          <i className="bi bi-download mr-2"></i>{isExporting ? t('exporting') : t('exportPNG')}
      </button>
      <button onClick={() => { window.print(); setIsMobileMenuOpen(false); }} className="w-full text-left sm:w-auto flex items-center px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 border border-gray-200 shadow-sm" title={t('print')}>
          <i className="bi bi-printer-fill mr-2"></i>{t('print')}
      </button>
      <button onClick={() => { onEdit(quote.id); setIsMobileMenuOpen(false); }} className="w-full text-left sm:w-auto flex items-center px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 border border-blue-200 shadow-sm" title={t('edit')}>
          <i className="bi bi-pencil-fill mr-2"></i>{t('edit')}
      </button>
      <button onClick={() => { setIsConfirmingDelete(true); setIsMobileMenuOpen(false); }} className="w-full text-left sm:w-auto flex items-center px-3 py-2 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100 border border-red-200 shadow-sm" title={t('delete')}>
          <i className="bi bi-trash-fill mr-2"></i>{t('delete')}
      </button>
    </>
  );

  return (
    <>
      <div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <button onClick={onBack} className="flex items-center text-indigo-600 hover:text-indigo-800 font-medium">
                  <i className="bi bi-arrow-left-circle-fill mr-2"></i>{t('backToQuotes')}
              </button>
              <div className="flex w-full sm:w-auto items-center gap-2 relative">
                   <select value={quote.status} onChange={(e) => onUpdateStatus(quote.id, e.target.value as QuoteStatus)} className="flex-grow sm:flex-grow-0 p-2 border rounded bg-white text-sm shadow-sm h-10">
                      {Object.values(StatusEnum).map(s => <option key={s} value={s}>{t(s.toLowerCase())}</option>)}
                  </select>
                  
                  {/* Desktop Actions */}
                  <div className="hidden lg:flex items-center gap-2">
                       <ActionButtons />
                  </div>

                  {/* Mobile Actions Menu */}
                  <div className="lg:hidden relative" ref={mobileMenuRef}>
                       <button 
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="p-2 border rounded bg-white text-gray-700 shadow-sm hover:bg-gray-50 h-10 w-10 flex items-center justify-center"
                            aria-label={t('actions')}
                       >
                           <i className="bi bi-three-dots-vertical"></i>
                       </button>

                       {isMobileMenuOpen && (
                           <div className="absolute right-0 top-12 w-56 bg-white border rounded-lg shadow-xl z-50 p-2 flex flex-col gap-2">
                                <ActionButtons />
                           </div>
                       )}
                  </div>
              </div>
          </div>
           {quote.linkedInvoiceId && (
            <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-3 text-sm mb-4 text-center">
              {t('convertedToInvoice')}{' '}
              <button onClick={() => onNavigate('detail', quote.linkedInvoiceId)} className="font-semibold underline hover:text-green-600">
                {t('viewInvoice')}
              </button>
            </div>
          )}
          
          {/* Smart Zoom Container */}
          <div className="w-full overflow-hidden relative" ref={containerRef} style={{ height: containerHeight === 'auto' ? 'auto' : `${containerHeight}px` }}>
            <article 
                ref={quoteRef} 
                id="quote-content" 
                className={`bg-white shadow-lg rounded-xl p-8 md:p-12 printable-area template-${quote.template}`}
                style={{ 
                    '--template-accent-color': settings?.templateAccentColor || '#4f46e5',
                    minWidth: '794px', 
                    width: '794px',
                    position: 'absolute', // Out of flow
                    top: 0,
                    left: 0,
                    transform: `scale(${zoomScale})`,
                    transformOrigin: 'top left',
                    marginBottom: '0',
                } as React.CSSProperties}
                aria-labelledby="quote-heading"
            >
                <header className="invoice-header flex flex-row justify-between items-start pb-8 mb-8">
                    <div className="mb-0 w-auto">
                        <h1 id="quote-heading" className="text-3xl sm:text-4xl font-bold uppercase">{t('quote')}</h1>
                        <div className="flex items-center mt-2">
                            <p className="text-gray-500 mr-4">#{quote.quoteNumber}</p>
                            <QuoteStatusBadge status={quote.status} />
                        </div>
                    </div>
                    <div className="text-right w-auto">
                        {settings?.companyLogo ? (
                            <>
                                <img src={settings.companyLogo} alt={`${quote.fromName} logo`} className="max-h-20 max-w-[192px] ml-auto mb-2 object-contain" />
                                <h2 className="company-name text-xl font-semibold">{quote.fromName}</h2>
                            </>
                        ) : (
                            <h2 className="company-name text-2xl font-semibold">{quote.fromName}</h2>
                        )}
                        <div className="break-words text-sm sm:text-base">
                            <p className="company-details">{quote.fromAddress}</p>
                            <p className="company-details">{quote.fromEmail}</p>
                            <p className="company-details">{quote.fromPhone}</p>
                        </div>
                    </div>
                </header>
                <div className="grid grid-cols-2 gap-8 mb-12">
                    <div>
                        <h3 className="font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('to')}</h3>
                        <p className="font-bold text-gray-800">{quote.toName}</p>
                        <div className="break-words">
                            <p className="text-gray-600">{quote.toAddress}</p>
                            <p className="text-gray-600">{quote.toEmail}</p>
                            <p className="text-gray-600">{quote.toPhone}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="mb-4"><p className="font-semibold text-gray-500 uppercase tracking-wide">{t('quoteDate')}</p><p className="font-medium text-gray-800">{formatDate(quote.quoteDate)}</p></div>
                        <div><p className="font-semibold text-gray-500 uppercase tracking-wide">{t('expiryDate')}</p><p className="font-medium text-gray-800">{formatDate(quote.expiryDate)}</p></div>
                    </div>
                </div>
                <div className="overflow-visible w-full">
                    <table className="min-w-full mb-12">
                        <thead><tr className="invoice-header-row">
                            <th className="py-3 px-4 text-left font-semibold uppercase whitespace-nowrap">{t('item')}</th>
                            {settings?.templateShowDescription && <th className="py-3 px-4 text-left font-semibold uppercase">{t('description')}</th>}
                            <th className="py-3 px-4 text-center font-semibold uppercase whitespace-nowrap">{t('qty')}</th>
                            <th className="py-3 px-4 text-right font-semibold uppercase whitespace-nowrap">{t('unitPrice')}</th>
                            {settings?.templateShowCost && <th className="py-3 px-4 text-right font-semibold uppercase hidden sm:table-cell">{t('cost')}</th>}
                            <th className="py-3 px-4 text-right font-semibold uppercase whitespace-nowrap">{t('total')}</th>
                        </tr></thead>
                        <tbody>{quote.items.map(item => (<tr key={item.id} className="border-b border-gray-200">
                            <td className="py-3 px-4 font-medium text-gray-800">
                                <div>{item.name}</div>
                            </td>
                            {settings?.templateShowDescription && <td className="py-3 px-4 text-sm text-gray-500">{item.description}</td>}
                            <td className="py-3 px-4 text-center">{item.quantity}</td>
                            <td className="py-3 px-4 text-right">{formatCurrency(item.price, settings, quote.currency)}</td>
                            {settings?.templateShowCost && <td className="py-3 px-4 text-right hidden sm:table-cell">{formatCurrency(item.cost || 0, settings, quote.currency)}</td>}
                            <td className="py-3 px-4 text-right font-medium">{formatCurrency(item.quantity * item.price, settings, quote.currency)}</td>
                        </tr>))}</tbody>
                    </table>
                </div>
                <div className="flex justify-end mb-12"><div className="totals-summary w-full max-w-sm space-y-3">
                    <div className="flex justify-between"><span className="text-gray-600">{t('subtotal')}:</span><span className="font-medium">{formatCurrency(quote.subtotal, settings, quote.currency)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">{t('tax', { rate: quote.taxRate })}:</span><span className="font-medium">{formatCurrency(quote.taxAmount, settings, quote.currency)}</span></div>
                    <div className="total-due-section flex justify-between text-2xl font-bold pt-3 mt-3">
                        <span className="total-due-label">{t('total')}:</span>
                        <span className="total-due-amount">{formatCurrency(quote.total, settings, quote.currency)}</span>
                    </div>
                </div></div>
                <footer>
                    <h3 className="font-semibold text-gray-600 mb-2">{t('notes')}</h3>
                    <p className="text-gray-500 text-sm">{quote.notes}</p>
                    {settings?.templateCustomFooter && (
                        <div className="pt-8 mt-8 border-t text-center text-gray-500 text-sm">
                            <p>{settings.templateCustomFooter}</p>
                        </div>
                    )}
                    <div className="pt-4 mt-4 border-t text-center text-gray-400 text-xs">
                        <p>dicetak oleh GaweInvoice by AI Projek | aiprojek01.my.id</p>
                    </div>
                </footer>
            </article>
          </div>
          <style>{`@media print { body * { visibility: hidden; } .printable-area, .printable-area * { visibility: visible; } .printable-area { position: absolute; left: 0; top: 0; width: 100%; min-width: 0 !important; transform: none !important; }}`}</style>
      </div>
      <ConfirmDialog
        isOpen={isConfirmingDelete}
        onClose={() => setIsConfirmingDelete(false)}
        onConfirm={handleConfirmDelete}
        title={t('confirmDeleteQuoteTitle')}
        message={t('confirmDeleteQuoteMessage')}
      />
      <ConfirmDialog
        isOpen={isConfirmingConversion}
        onClose={() => setIsConfirmingConversion(false)}
        onConfirm={handleConfirmConversion}
        title={t('confirmConversionTitle')}
        message={t('confirmConversionMessage')}
        confirmText={t('convertToInvoice')}
        confirmClass="bg-green-600 hover:bg-green-700"
      />
    </>
  );
};

export default QuoteDetail;

import React, { useState, useEffect, useRef } from 'react';
import type { Invoice, InvoiceStatus, Settings, Payment, PaymentMethod } from '../types';
import { getInvoiceById, updateInvoice } from '../services/db';
import StatusBadge from './StatusBadge';
import { InvoiceStatus as StatusEnum } from '../types';
import ConfirmDialog from './ConfirmDialog';
import Modal from './Modal';
import Receipt from './Receipt';
import { formatCurrency } from '../utils/formatting';
import { useI18n } from '../contexts/I18nContext';
import type { ViewNames } from '../App';
import { generatePDFfromHTML } from '../utils/pdfGenerator';
import { useToast } from '../contexts/ToastContext';

declare const htmlToImage: any;

interface InvoiceDetailProps {
  id: number;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onUpdateStatus: (id: number, status: InvoiceStatus) => void;
  onDuplicate: (id: number) => void;
  onBack: () => void;
  onNavigate: (viewName: ViewNames, id?: number) => void;
  settings: Settings | null;
}

const InvoiceDetail: React.FC<InvoiceDetailProps> = ({ id, onEdit, onDelete, onUpdateStatus, onDuplicate, onBack, onNavigate, settings }) => {
  const { t, language } = useI18n();
  const { addToast } = useToast();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
  // Refs for Smart Zoom and Export
  const invoiceRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [containerHeight, setContainerHeight] = useState<number | 'auto'>('auto');

  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);
  
  // Menu State for Desktop Grouping and Mobile
  const [activeMenu, setActiveMenu] = useState<'mobile' | 'documents' | 'manage' | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Bank Transfer');
  const [paymentNotes, setPaymentNotes] = useState<string>('');


  const fetchInvoice = async () => {
    setIsLoading(true);
    const data = await getInvoiceById(id);
    setInvoice(data || null);
    if (data) setPaymentAmount(data.balanceDue);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  // Smart Zoom Logic
  useEffect(() => {
    const calculateZoom = () => {
        if (containerRef.current && invoiceRef.current) {
            const containerWidth = containerRef.current.offsetWidth;
            const contentWidth = 794; // A4 Width in pixels (approx)
            
            if (containerWidth === 0) return; // Avoid division by zero on first render

            // Calculate scale to fit container width, allowing scale-up on desktop
            const scale = containerWidth / contentWidth;
            setZoomScale(scale);
            
            // Update container height to match scaled content
            setContainerHeight(invoiceRef.current.scrollHeight * scale);
        }
    };

    // Initial calculation
    calculateZoom();

    // Observer for container width changes (e.g. window resize)
    const containerObserver = new ResizeObserver(calculateZoom);
    if (containerRef.current) containerObserver.observe(containerRef.current);

    // Observer for content height changes (e.g. data loading, expanding sections)
    const contentObserver = new ResizeObserver(calculateZoom);
    if (invoiceRef.current) contentObserver.observe(invoiceRef.current);
    
    window.addEventListener('resize', calculateZoom);
    return () => {
        window.removeEventListener('resize', calculateZoom);
        containerObserver.disconnect();
        contentObserver.disconnect();
    };
  }, [invoice, isLoading]); // Re-run when invoice loads

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
              setActiveMenu(null);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleMenu = (menu: 'mobile' | 'documents' | 'manage') => {
      setActiveMenu(activeMenu === menu ? null : menu);
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString(language, { year: 'numeric', month: 'long', day: 'numeric' });

  const handleSendReminder = () => {
    if (!invoice || !invoice.toEmail) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today's date
    const dueDate = new Date(invoice.dueDate);
    dueDate.setHours(0,0,0,0); // Normalize due date
    
    const isOverdue = dueDate < today && invoice.status !== StatusEnum.Paid;

    const subject = isOverdue 
        ? t('reminderSubjectOverdue', { invoiceNumber: invoice.invoiceNumber, companyName: invoice.fromName })
        : t('reminderSubjectUpcoming', { invoiceNumber: invoice.invoiceNumber, companyName: invoice.fromName });

    const bodyTemplate = isOverdue ? t('reminderBodyOverdue') : t('reminderBodyUpcoming');

    const body = bodyTemplate
      .replace('{clientName}', invoice.toName)
      .replace('{invoiceNumber}', invoice.invoiceNumber)
      .replace('{dueDate}', formatDate(invoice.dueDate))
      .replace('{total}', formatCurrency(invoice.total, settings, invoice.currency))
      .replace('{companyName}', invoice.fromName);

    const mailtoLink = `mailto:${invoice.toEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    window.location.href = mailtoLink;
    setActiveMenu(null);
  };

  const handleExport = async () => {
    if (!invoiceRef.current || !invoice) return;
    setIsExporting(true);
    setActiveMenu(null);
    try {
      // We need to capture at full scale, so we pass style overrides
      const dataUrl = await htmlToImage.toPng(invoiceRef.current, { 
          quality: 0.95, 
          backgroundColor: '#ffffff',
          width: 794, // Force capture width
          height: invoiceRef.current.scrollHeight, // Force capture height
          style: {
              transform: 'scale(1)', // Reset scale for capture
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
      link.download = `invoice-${invoice.invoiceNumber}.png`;
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
    if (!invoiceRef.current || !invoice) return;
    setIsSharing(true);
    setActiveMenu(null);
    try {
        const blob = await htmlToImage.toBlob(invoiceRef.current, { 
            quality: 0.95, 
            backgroundColor: '#ffffff',
            width: 794,
            height: invoiceRef.current.scrollHeight,
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
            const file = new File([blob], `invoice-${invoice.invoiceNumber}.png`, { type: 'image/png' });
            
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: `Invoice ${invoice.invoiceNumber}`,
                    text: `Invoice #${invoice.invoiceNumber} from ${invoice.fromName}`,
                    files: [file]
                });
            } else {
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
    if (!invoiceRef.current || !invoice) return;
    setIsGeneratingPDF(true);
    setActiveMenu(null);
    try {
      await generatePDFfromHTML(
        invoiceRef.current,
        `invoice-${invoice.invoiceNumber}.pdf`
      );
    } catch (e) {
      console.error('PDF Generation Error', e);
      addToast('Failed to generate PDF', 'error');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleExportReceipt = async () => {
    if (!receiptRef.current || !invoice) return;
    try {
        const dataUrl = await htmlToImage.toPng(receiptRef.current, { quality: 0.95, backgroundColor: '#ffffff' });
        const link = document.createElement('a');
        link.download = `receipt-for-invoice-${invoice.invoiceNumber}.png`;
        link.href = dataUrl;
        link.click();
    } catch (error) {
        console.error('Failed to export receipt image:', error);
        addToast(t('exportErrorMessage'), 'error');
    }
  };

  const handlePrintReceipt = () => {
      if (!receiptRef.current) return;
      
      const printContent = receiptRef.current.innerHTML;
      const printWindow = window.open('', '_blank');

      if (printWindow) {
          printWindow.document.write(`
              <html>
                  <head>
                      <title>${t('receipt')}</title>
                      <script src="https://cdn.tailwindcss.com"></script>
                  </head>
                  <body class="p-4">
                      ${printContent}
                  </body>
              </html>
          `);
          printWindow.document.close();
          printWindow.onload = () => {
              printWindow.focus();
              printWindow.print();
              printWindow.close();
          };
      }
  };

  const handleConfirmDelete = () => {
    if (invoice) {
      onDelete(invoice.id);
    }
  };

  const handleSavePayment = async () => {
      if (!invoice) return;

      const amount = Number(paymentAmount);
      if (amount <= 0) return;
      
      if (amount > invoice.balanceDue + 0.01) { // Allowing small floating point margin
           addToast(t('amountExceedsBalance'), 'error');
           return;
      }

      const newPayment: Payment = {
          id: crypto.randomUUID(),
          date: paymentDate,
          amount: amount,
          method: paymentMethod,
          notes: paymentNotes
      };

      const updatedPayments = [...(invoice.payments || []), newPayment];
      const totalPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
      const newBalanceDue = invoice.total - totalPaid;
      
      let newStatus = invoice.status;
      if (newBalanceDue <= 0.01) {
          newStatus = StatusEnum.Paid;
      } else if (totalPaid > 0) {
          newStatus = StatusEnum.Partial;
      }

      await updateInvoice(invoice.id, {
          payments: updatedPayments,
          amountPaid: totalPaid,
          balanceDue: Math.max(0, newBalanceDue), // Prevent negative due
          status: newStatus
      });

      addToast(t('paymentRecorded'), 'success');
      setIsPaymentModalOpen(false);
      // Reset form
      setPaymentAmount(0);
      setPaymentNotes('');
      fetchInvoice(); // Reload
  };

  if (isLoading) return <div className="text-center p-8">{t('loadingData')}</div>;
  if (!invoice) return <div className="text-center p-8 text-red-500">{t('invoiceNotFound')}</div>;

  const receiptModalFooter = (
      <div className="flex flex-col sm:flex-row justify-end gap-3">
          <button onClick={handlePrintReceipt} className="flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
              <i className="bi bi-printer-fill mr-2"></i> {t('print')}
          </button>
          <button onClick={handleExportReceipt} className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <i className="bi bi-image-fill mr-2"></i> {t('exportPNG')}
          </button>
      </div>
  );
  
  const paymentModalFooter = (
    <div className="flex justify-end gap-3">
        <button onClick={() => setIsPaymentModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">{t('cancel')}</button>
        <button onClick={handleSavePayment} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">{t('save')}</button>
    </div>
  );

  // Helper for Menu Items
  const ActionItem = ({ onClick, icon, label, colorClass = "text-gray-700 hover:bg-gray-100", disabled = false }: any) => (
      <button 
          onClick={() => { onClick(); }}
          disabled={disabled}
          className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${colorClass} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
          <i className={`bi ${icon}`}></i> {label}
      </button>
  );

  // Buttons for Desktop view (Primary actions)
  const ActionButton = ({ onClick, icon, label, className, disabled = false }: any) => (
      <button 
          onClick={onClick}
          disabled={disabled}
          className={`flex items-center px-3 py-2 text-sm rounded-lg shadow-sm transition-colors ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
          <i className={`bi ${icon} mr-2`}></i> {label}
      </button>
  );

  return (
    <>
      <div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <button onClick={onBack} className="flex items-center text-indigo-600 hover:text-indigo-800 font-medium">
                  <i className="bi bi-arrow-left-circle-fill mr-2"></i>{t('backToInvoices')}
              </button>
              
              <div className="flex w-full sm:w-auto items-center gap-2 relative" ref={menuRef}>
                   <select value={invoice.status} onChange={(e) => onUpdateStatus(invoice.id, e.target.value as InvoiceStatus)} className="flex-grow sm:flex-grow-0 p-2 border rounded bg-white text-sm shadow-sm h-10">
                      {Object.values(StatusEnum).map(s => <option key={s} value={s}>{t(s.toLowerCase())}</option>)}
                  </select>

                  {/* --- Desktop Layout: Grouped Buttons --- */}
                  <div className="hidden lg:flex items-center gap-2">
                       {/* Primary / Direct Actions */}
                       {invoice.balanceDue > 0 && (
                            <ActionButton 
                                onClick={() => { setPaymentAmount(invoice.balanceDue); setIsPaymentModalOpen(true); }} 
                                icon="bi-cash-coin" 
                                label={t('recordPayment')} 
                                className="bg-green-600 text-white hover:bg-green-700" 
                            />
                        )}
                        {(invoice.status === StatusEnum.Sent || invoice.status === StatusEnum.Overdue) && invoice.toEmail && (
                            <ActionButton 
                                onClick={handleSendReminder} 
                                icon="bi-envelope-fill" 
                                label={t('sendReminder')} 
                                className="bg-orange-500 text-white hover:bg-orange-600" 
                            />
                        )}

                        {/* Documents Dropdown */}
                        <div className="relative">
                            <button 
                                onClick={() => toggleMenu('documents')}
                                className={`flex items-center px-3 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 shadow-sm ${activeMenu === 'documents' ? 'bg-gray-100 ring-2 ring-indigo-500 ring-opacity-50' : ''}`}
                            >
                                <i className="bi bi-file-earmark-arrow-down mr-2"></i> {t('documents')} <i className="bi bi-chevron-down ml-2 text-xs"></i>
                            </button>
                            {activeMenu === 'documents' && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border z-50 py-1">
                                    {invoice.amountPaid > 0 && (
                                        <ActionItem onClick={() => { setIsReceiptModalOpen(true); setActiveMenu(null); }} icon="bi-receipt" label={t('viewReceipt')} colorClass="text-teal-700 hover:bg-teal-50" />
                                    )}
                                    <ActionItem onClick={handleExportPDF} icon="bi-file-earmark-pdf-fill" label={isGeneratingPDF ? t('generatingPDF') : t('exportPDF')} disabled={isGeneratingPDF} colorClass="text-red-600 hover:bg-red-50" />
                                    <ActionItem onClick={handleShare} icon="bi-share-fill" label={isSharing ? t('sharing') : t('share')} disabled={isSharing} colorClass="text-indigo-600 hover:bg-indigo-50" />
                                    <ActionItem onClick={handleExport} icon="bi-image-fill" label={isExporting ? t('exporting') : t('exportPNG')} disabled={isExporting} />
                                    <ActionItem onClick={() => { window.print(); setActiveMenu(null); }} icon="bi-printer-fill" label={t('print')} />
                                </div>
                            )}
                        </div>

                        {/* Manage Dropdown */}
                        <div className="relative">
                            <button 
                                onClick={() => toggleMenu('manage')}
                                className={`flex items-center px-3 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 shadow-sm ${activeMenu === 'manage' ? 'bg-gray-100 ring-2 ring-indigo-500 ring-opacity-50' : ''}`}
                            >
                                <i className="bi bi-gear-fill mr-2"></i> {t('manage')} <i className="bi bi-chevron-down ml-2 text-xs"></i>
                            </button>
                            {activeMenu === 'manage' && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border z-50 py-1">
                                    <ActionItem onClick={() => { onEdit(invoice.id); setActiveMenu(null); }} icon="bi-pencil-fill" label={t('edit')} colorClass="text-blue-600 hover:bg-blue-50" />
                                    <ActionItem onClick={() => { onDuplicate(invoice.id); setActiveMenu(null); }} icon="bi-copy" label={t('duplicate')} colorClass="text-green-600 hover:bg-green-50" />
                                    <ActionItem onClick={() => { setIsConfirmingDelete(true); setActiveMenu(null); }} icon="bi-trash-fill" label={t('delete')} colorClass="text-red-600 hover:bg-red-50" />
                                </div>
                            )}
                        </div>
                  </div>

                  {/* --- Mobile Layout: Single Dropdown --- */}
                  <div className="lg:hidden relative">
                       <button 
                            onClick={() => toggleMenu('mobile')}
                            className="p-2 border rounded bg-white text-gray-700 shadow-sm hover:bg-gray-50 h-10 w-10 flex items-center justify-center"
                            aria-label={t('actions')}
                       >
                           <i className="bi bi-three-dots-vertical"></i>
                       </button>

                       {activeMenu === 'mobile' && (
                           <div className="absolute right-0 top-12 w-56 bg-white border rounded-lg shadow-xl z-50 py-2 flex flex-col">
                                {invoice.balanceDue > 0 && (
                                    <ActionItem onClick={() => { setPaymentAmount(invoice.balanceDue); setIsPaymentModalOpen(true); setActiveMenu(null); }} icon="bi-cash-coin" label={t('recordPayment')} colorClass="text-green-700 hover:bg-green-50 font-medium" />
                                )}
                                {(invoice.status === StatusEnum.Sent || invoice.status === StatusEnum.Overdue) && invoice.toEmail && (
                                    <ActionItem onClick={handleSendReminder} icon="bi-envelope-fill" label={t('sendReminder')} colorClass="text-orange-600 hover:bg-orange-50" />
                                )}
                                
                                <div className="border-t my-1"></div>
                                
                                {invoice.amountPaid > 0 && (
                                    <ActionItem onClick={() => { setIsReceiptModalOpen(true); setActiveMenu(null); }} icon="bi-receipt" label={t('viewReceipt')} colorClass="text-teal-700 hover:bg-teal-50" />
                                )}
                                <ActionItem onClick={handleExportPDF} icon="bi-file-earmark-pdf-fill" label={t('exportPDF')} disabled={isGeneratingPDF} colorClass="text-red-600 hover:bg-red-50" />
                                <ActionItem onClick={handleShare} icon="bi-share-fill" label={t('share')} disabled={isSharing} colorClass="text-indigo-600 hover:bg-indigo-50" />
                                <ActionItem onClick={handleExport} icon="bi-image-fill" label={t('exportPNG')} disabled={isExporting} />
                                <ActionItem onClick={() => { window.print(); setActiveMenu(null); }} icon="bi-printer-fill" label={t('print')} />
                                
                                <div className="border-t my-1"></div>
                                
                                <ActionItem onClick={() => { onEdit(invoice.id); setActiveMenu(null); }} icon="bi-pencil-fill" label={t('edit')} colorClass="text-blue-600 hover:bg-blue-50" />
                                <ActionItem onClick={() => { onDuplicate(invoice.id); setActiveMenu(null); }} icon="bi-copy" label={t('duplicate')} colorClass="text-green-600 hover:bg-green-50" />
                                <ActionItem onClick={() => { setIsConfirmingDelete(true); setActiveMenu(null); }} icon="bi-trash-fill" label={t('delete')} colorClass="text-red-600 hover:bg-red-50" />
                           </div>
                       )}
                  </div>
              </div>
          </div>

          {invoice.convertedFromQuoteId && (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-3 text-sm mb-4 text-center">
              {t('convertedFromQuote')}{' '}
              <button onClick={() => onNavigate('quote-detail', invoice.convertedFromQuoteId)} className="font-semibold underline hover:text-blue-600">
                {t('viewOriginalQuote')}
              </button>
            </div>
          )}

          {invoice.generatedFromRecurringId && (
            <div className="bg-purple-50 border border-purple-200 text-purple-800 rounded-lg p-3 text-sm mb-4 text-center">
              <i className="bi bi-arrow-repeat mr-2"></i>
              {t('generatedFromRecurring')}{' '}
              <button onClick={() => onNavigate('recurring-form', invoice.generatedFromRecurringId)} className="font-semibold underline hover:text-purple-600">
                {t('viewRecurringProfile')}
              </button>
            </div>
          )}

          {/* Main Preview Container with Smart Zoom */}
          <div className="w-full overflow-hidden relative" ref={containerRef} style={{ height: containerHeight === 'auto' ? 'auto' : `${containerHeight}px` }}>
            <article
                ref={invoiceRef} 
                id="invoice-content" 
                className={`bg-white shadow-lg rounded-xl p-8 md:p-12 printable-area template-${invoice.template}`}
                style={{ 
                    '--template-accent-color': settings?.templateAccentColor || '#4f46e5',
                    minWidth: '794px', // Fixed A4 width logic
                    width: '794px',
                    position: 'absolute', // Taken out of flow
                    top: 0,
                    left: 0,
                    transform: `scale(${zoomScale})`,
                    transformOrigin: 'top left',
                    marginBottom: '0', 
                } as React.CSSProperties}
                aria-labelledby="invoice-heading"
            >
                <header className="invoice-header flex flex-row justify-between items-start pb-8 mb-8">
                    <div className="mb-0 w-auto">
                        <h1 id="invoice-heading" className="text-3xl sm:text-4xl font-bold uppercase">{t('invoice')}</h1>
                        <div className="flex items-center mt-2">
                            <p className="text-gray-500 mr-4">#{invoice.invoiceNumber}</p>
                            <StatusBadge status={invoice.status} />
                        </div>
                    </div>
                    <div className="text-right w-auto">
                        {settings?.companyLogo ? (
                            <>
                                <img src={settings.companyLogo} alt={`${invoice.fromName} logo`} className="max-h-20 max-w-[192px] ml-auto mb-2 object-contain" />
                                <h2 className="company-name text-xl font-semibold">{invoice.fromName}</h2>
                            </>
                        ) : (
                            <h2 className="company-name text-2xl font-semibold">{invoice.fromName}</h2>
                        )}
                        <div className="break-words text-sm sm:text-base">
                            <p className="company-details">{invoice.fromAddress}</p>
                            <p className="company-details">{invoice.fromEmail}</p>
                            <p className="company-details">{invoice.fromPhone}</p>
                        </div>
                    </div>
                </header>
                <div className="grid grid-cols-2 gap-8 mb-12">
                    <div>
                        <h3 className="font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('billedTo')}</h3>
                        <p className="font-bold text-gray-800">{invoice.toName}</p>
                        <div className="break-words">
                            <p className="text-gray-600">{invoice.toAddress}</p>
                            <p className="text-gray-600">{invoice.toEmail}</p>
                            <p className="text-gray-600">{invoice.toPhone}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="mb-4"><p className="font-semibold text-gray-500 uppercase tracking-wide">{t('invoiceDate')}</p><p className="font-medium text-gray-800">{formatDate(invoice.invoiceDate)}</p></div>
                        <div><p className="font-semibold text-gray-500 uppercase tracking-wide">{t('dueDate')}</p><p className="font-medium text-gray-800">{formatDate(invoice.dueDate)}</p></div>
                    </div>
                </div>
                <div className="overflow-visible w-full">
                    <table className="min-w-full mb-12">
                        <thead><tr className="invoice-header-row">
                            <th className="py-3 px-4 text-left font-semibold uppercase whitespace-nowrap">{t('item')}</th>
                            {settings?.templateShowDescription && <th className="py-3 px-4 text-left font-semibold uppercase">{t('description')}</th>}
                            <th className="py-3 px-4 text-center font-semibold uppercase whitespace-nowrap">{t('qty')}</th>
                            <th className="py-3 px-4 text-right font-semibold uppercase whitespace-nowrap">{t('unitPrice')}</th>
                            {settings?.templateShowCost && <th className="py-3 px-4 text-right font-semibold uppercase whitespace-nowrap">{t('cost')}</th>}
                            <th className="py-3 px-4 text-right font-semibold uppercase whitespace-nowrap">{t('total')}</th>
                        </tr></thead>
                        <tbody>{invoice.items.map(item => (<tr key={item.id} className="border-b border-gray-200">
                            <td className="py-3 px-4 font-medium text-gray-800">
                                <div>{item.name}</div>
                            </td>
                            {settings?.templateShowDescription && <td className="py-3 px-4 text-sm text-gray-500">{item.description}</td>}
                            <td className="py-3 px-4 text-center">{item.quantity}</td>
                            <td className="py-3 px-4 text-right">{formatCurrency(item.price, settings, invoice.currency)}</td>
                            {settings?.templateShowCost && <td className="py-3 px-4 text-right">{formatCurrency(item.cost || 0, settings, invoice.currency)}</td>}
                            <td className="py-3 px-4 text-right font-medium">{formatCurrency(item.quantity * item.price, settings, invoice.currency)}</td>
                        </tr>))}</tbody>
                    </table>
                </div>
                <div className="flex justify-end mb-12"><div className="totals-summary w-full max-w-sm space-y-3">
                    <div className="flex justify-between"><span className="text-gray-600">{t('subtotal')}:</span><span className="font-medium">{formatCurrency(invoice.subtotal, settings, invoice.currency)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">{t('tax', { rate: invoice.taxRate })}:</span><span className="font-medium">{formatCurrency(invoice.taxAmount, settings, invoice.currency)}</span></div>
                    <div className="flex justify-between text-green-700 font-semibold"><span className="text-gray-600">{t('netProfit')}:</span><span>{formatCurrency(invoice.netProfit, settings, invoice.currency)}</span></div>
                    <div className="total-due-section flex justify-between text-2xl font-bold pt-3 mt-3">
                        <span className="total-due-label">{t('total')}:</span>
                        <span className="total-due-amount">{formatCurrency(invoice.total, settings, invoice.currency)}</span>
                    </div>
                    
                    {invoice.amountPaid > 0 && (
                        <>
                            <div className="flex justify-between text-green-600 font-medium border-t pt-2 mt-2">
                                <span>{t('amountPaid')}:</span>
                                <span>{formatCurrency(invoice.amountPaid, settings, invoice.currency)}</span>
                            </div>
                            <div className="flex justify-between text-red-600 font-bold border-t pt-2 mt-2">
                                <span>{t('balanceDue')}:</span>
                                <span>{formatCurrency(invoice.balanceDue, settings, invoice.currency)}</span>
                            </div>
                        </>
                    )}
                </div></div>
                <footer>
                    <h3 className="font-semibold text-gray-600 mb-2">{t('notes')}</h3>
                    <p className="text-gray-500 text-sm">{invoice.notes}</p>

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
          
          {invoice.payments && invoice.payments.length > 0 && (
            <section aria-labelledby="payment-history-heading" className="mt-8 bg-white shadow-lg rounded-xl p-6">
                <h3 id="payment-history-heading" className="text-xl font-bold text-gray-800 mb-4">{t('paymentHistory')}</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('date')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('method')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('note')}</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('amount')}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {invoice.payments.map(payment => (
                                <tr key={payment.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(payment.date)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{t(payment.method.replace(' ', '').replace('PayPal', 'paypal').toLowerCase()) || payment.method}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{payment.notes || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-green-600">{formatCurrency(payment.amount, settings, invoice.currency)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
          )}

          <style>{`@media print { body * { visibility: hidden; } .printable-area, .printable-area * { visibility: visible; } .printable-area { position: absolute; left: 0; top: 0; width: 100%; transform: none !important; min-width: 0 !important; }}`}</style>
      </div>
      <ConfirmDialog
        isOpen={isConfirmingDelete}
        onClose={() => setIsConfirmingDelete(false)}
        onConfirm={handleConfirmDelete}
        title={t('confirmDeleteInvoiceTitle')}
        message={t('confirmDeleteInvoiceMessage')}
      />

      {invoice && (
        <Modal 
            isOpen={isReceiptModalOpen} 
            onClose={() => setIsReceiptModalOpen(false)} 
            title={t('receiptForInvoice', { invoiceNumber: invoice.invoiceNumber })}
            footer={receiptModalFooter}
        >
            <div ref={receiptRef}>
                <Receipt invoice={invoice} settings={settings} />
            </div>
        </Modal>
      )}

      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={t('recordPayment')}
        footer={paymentModalFooter}
      >
          <div className="space-y-4">
              <div>
                  <label className="block text-sm font-medium text-gray-700">{t('paymentDate')}</label>
                  <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="mt-1 w-full p-2 border rounded" />
              </div>
              <div>
                  <label className="block text-sm font-medium text-gray-700">{t('paymentAmount')}</label>
                  <input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(parseFloat(e.target.value))} className="mt-1 w-full p-2 border rounded" />
                  <p className="text-xs text-gray-500 mt-1">{t('balanceDue')}: {formatCurrency(invoice ? invoice.balanceDue : 0, settings, invoice.currency)}</p>
              </div>
              <div>
                  <label className="block text-sm font-medium text-gray-700">{t('paymentMethod')}</label>
                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)} className="mt-1 w-full p-2 border rounded bg-white">
                      <option value="Bank Transfer">{t('bankTransfer')}</option>
                      <option value="Cash">{t('cash')}</option>
                      <option value="Credit Card">{t('creditCard')}</option>
                      <option value="PayPal">{t('paypal')}</option>
                      <option value="Other">{t('other')}</option>
                  </select>
              </div>
              <div>
                  <label className="block text-sm font-medium text-gray-700">{t('note')} ({t('optional')})</label>
                  <textarea value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} rows={2} className="mt-1 w-full p-2 border rounded" />
              </div>
          </div>
      </Modal>
    </>
  );
};

export default InvoiceDetail;
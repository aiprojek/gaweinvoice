import React, { useState, useEffect, useRef } from 'react';
import type { Invoice, InvoiceStatus, Settings } from '../types';
import { InvoiceStatus as StatusEnum } from '../types';
import StatusBadge from './StatusBadge';
import ConfirmDialog from './ConfirmDialog';
import { formatCurrency } from '../utils/formatting';
import { useI18n } from '../contexts/I18nContext';
import { db } from '../services/db';
import useDebounce from '../hooks/useDebounce';

interface InvoiceListProps {
  onView: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onCreate: () => void;
  onUpdateStatus: (id: number, status: InvoiceStatus) => void;
  onDuplicate: (id: number) => void;
  onBulkDelete: (ids: number[]) => void;
  onBulkUpdateStatus: (ids: number[], status: InvoiceStatus) => void;
  settings: Settings | null;
}

const InvoiceList: React.FC<InvoiceListProps> = ({ onView, onEdit, onDelete, onCreate, onDuplicate, onBulkDelete, onBulkUpdateStatus, settings }) => {
  const { t, language } = useI18n();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [filter, setFilter] = useState<InvoiceStatus | 'All'>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [selectedInvoices, setSelectedInvoices] = useState<number[]>([]);
  const [isBulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchInvoices = async () => {
        setIsLoading(true);
        try {
            let query = db.invoices.toCollection();

            if (filter !== 'All') {
                query = query.filter(invoice => invoice.status === filter);
            }

            if (debouncedSearchTerm.trim()) {
                const lowercasedTerm = debouncedSearchTerm.toLowerCase();
                query = query.filter(invoice => 
                    invoice.invoiceNumber.toLowerCase().includes(lowercasedTerm) ||
                    invoice.toName.toLowerCase().includes(lowercasedTerm)
                );
            }
            
            const results = await query.reverse().sortBy('invoiceDate');
            setInvoices(results);

        } catch (error) {
            console.error("Failed to fetch invoices:", error);
        } finally {
            setIsLoading(false);
        }
    };

    fetchInvoices();
  }, [filter, debouncedSearchTerm]);

  useEffect(() => {
    setSelectedInvoices([]);
  }, [filter, searchTerm]);

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
        const isAllSelected = invoices.length > 0 && selectedInvoices.length === invoices.length;
        const isPartiallySelected = selectedInvoices.length > 0 && selectedInvoices.length < invoices.length;
        selectAllCheckboxRef.current.checked = isAllSelected;
        selectAllCheckboxRef.current.indeterminate = isPartiallySelected;
    }
  }, [selectedInvoices, invoices]);

  const handleSelectOne = (id: number) => {
    setSelectedInvoices(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };
  
  const handleSelectAll = () => {
    if (selectedInvoices.length === invoices.length) {
      setSelectedInvoices([]);
    } else {
      setSelectedInvoices(invoices.map(inv => inv.id));
    }
  };

  const handleConfirmDelete = () => {
    if (deleteTarget !== null) {
      onDelete(deleteTarget);
      setDeleteTarget(null);
    }
  };

  const handleConfirmBulkDelete = () => {
      onBulkDelete(selectedInvoices);
      setSelectedInvoices([]);
      setBulkDeleteConfirmOpen(false);
  };

  const handleBulkStatusChange = (status: InvoiceStatus) => {
      onBulkUpdateStatus(selectedInvoices, status);
      setSelectedInvoices([]);
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString(language, { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <>
      <div className="bg-white shadow-lg rounded-xl">
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{t('invoices')}</h2>
                <p className="text-sm text-gray-500">{t('invoicesFound', { count: invoices.length })}</p>
              </div>
              <button onClick={onCreate} className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-150">
                <i className="bi bi-plus-circle-fill mr-2"></i> {t('createNewInvoice')}
              </button>
          </div>
          <form className="flex flex-col sm:flex-row gap-4 mb-6 border-b pb-4">
            <div className="relative flex-grow">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <i className="bi bi-search text-gray-400"></i>
              </span>
              <input
                type="text"
                placeholder={t('searchInvoices')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="relative">
              <label htmlFor="status-filter" className="sr-only">{t('filterByStatus')}</label>
              <select
                  id="status-filter"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as InvoiceStatus | 'All')}
                  className="w-full sm:w-auto h-full px-4 py-2 border rounded-lg shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none pr-8"
              >
                  {(['All', ...Object.values(StatusEnum)] as const).map((status) => (
                    <option key={status} value={status}>
                      {status === 'All' ? t('all') : t(status.toLowerCase())}
                    </option>
                  ))}
              </select>
              <span className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                 <i className="bi bi-chevron-down text-gray-400"></i>
              </span>
            </div>
          </form>
        </div>
        
        {selectedInvoices.length > 0 && (
            <div className="bg-indigo-50 border-y border-indigo-200 px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="font-semibold text-indigo-800">{selectedInvoices.length} {t('selected')}</p>
                <div className="flex items-center gap-2">
                    <label htmlFor="bulk-status" className="sr-only">{t('changeStatusTo')}</label>
                    <select
                        id="bulk-status"
                        onChange={(e) => handleBulkStatusChange(e.target.value as InvoiceStatus)}
                        className="p-2 border rounded-md bg-white text-sm shadow-sm"
                        value=""
                    >
                        <option value="" disabled>{t('changeStatusTo')}</option>
                        {Object.values(StatusEnum).map(s => <option key={s} value={s}>{t(s.toLowerCase())}</option>)}
                    </select>
                    <button onClick={() => setBulkDeleteConfirmOpen(true)} className="px-3 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 shadow-sm"><i className="bi bi-trash-fill mr-1"></i> {t('delete')}</button>
                    <button onClick={() => setSelectedInvoices([])} className="px-3 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 shadow-sm">{t('cancel')}</button>
                </div>
            </div>
        )}

        {isLoading ? (
            <div className="text-center py-16">{t('loadingData')}</div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-16 px-4">
            <i className="bi bi-file-earmark-text text-6xl text-gray-300"></i>
            <p className="mt-4 text-gray-500">{t('noInvoicesToDisplay')}</p>
          </div>
        ) : (
        <div>
          {/* Mobile View - Cards */}
          <div className="sm:hidden space-y-4 p-4">
            {invoices.map(invoice => (
              <div key={invoice.id} className="bg-gray-50 border rounded-lg p-3 shadow flex items-start gap-3">
                <div className="flex-shrink-0 pt-1">
                  <input 
                    type="checkbox"
                    checked={selectedInvoices.includes(invoice.id)}
                    onChange={() => handleSelectOne(invoice.id)}
                    className="h-5 w-5 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                    aria-label={`Select invoice ${invoice.invoiceNumber}`}
                  />
                </div>
                <div className="flex-grow">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-gray-800 break-words">{invoice.toName}</p>
                      <p className="text-sm text-gray-500">{invoice.invoiceNumber}</p>
                    </div>
                    <div className="flex-shrink-0 ml-2">
                      <StatusBadge status={invoice.status} />
                    </div>
                  </div>
                  <div className="flex justify-between items-end mt-3">
                    <div>
                      <p className="text-sm text-gray-500">{t('dueDate')}: {formatDate(invoice.dueDate)}</p>
                      <div className="flex flex-col">
                          <p className="text-lg font-semibold text-gray-900">{formatCurrency(invoice.total, settings, invoice.currency)}</p>
                          {(invoice.status === StatusEnum.Partial || invoice.status === StatusEnum.Overdue || invoice.amountPaid > 0) && invoice.balanceDue > 0 && (
                              <p className="text-sm text-red-600 font-medium">{t('balanceDue')}: {formatCurrency(invoice.balanceDue, settings, invoice.currency)}</p>
                          )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                       <button onClick={() => onDuplicate(invoice.id)} className="text-green-600 hover:text-green-900 text-xl" title={t('duplicate')} aria-label={`${t('duplicate')} ${invoice.invoiceNumber}`}><i className="bi bi-copy"></i></button>
                       <button onClick={() => onView(invoice.id)} className="text-indigo-600 hover:text-indigo-900 text-xl" title={t('view')} aria-label={`${t('view')} ${invoice.invoiceNumber}`}><i className="bi bi-eye-fill"></i></button>
                       <button onClick={() => onEdit(invoice.id)} className="text-blue-600 hover:text-blue-900 text-xl" title={t('edit')} aria-label={`${t('edit')} ${invoice.invoiceNumber}`}><i className="bi bi-pencil-fill"></i></button>
                       <button onClick={() => setDeleteTarget(invoice.id)} className="text-red-600 hover:text-red-900 text-xl" title={t('delete')} aria-label={`${t('delete')} ${invoice.invoiceNumber}`}><i className="bi bi-trash-fill"></i></button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Desktop View - Table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      ref={selectAllCheckboxRef}
                      type="checkbox"
                      onChange={handleSelectAll}
                      className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                      aria-label="Select all invoices"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('status')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('invoiceNumberShort')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('client')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('dueDate')}</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('amount')}</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className={`transition-colors duration-150 ${selectedInvoices.includes(invoice.id) ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}>
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedInvoices.includes(invoice.id)}
                        onChange={() => handleSelectOne(invoice.id)}
                        className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                        aria-label={`Select invoice ${invoice.invoiceNumber}`}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={invoice.status} /></td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{invoice.invoiceNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.toName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(invoice.dueDate)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                        {formatCurrency(invoice.total, settings, invoice.currency)}
                         {(invoice.status === StatusEnum.Partial || invoice.status === StatusEnum.Overdue || invoice.amountPaid > 0) && invoice.balanceDue > 0 && (
                             <div className="text-xs text-red-600 font-normal mt-1">{t('balanceDue')}: {formatCurrency(invoice.balanceDue, settings, invoice.currency)}</div>
                         )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end items-center gap-3">
                         <button onClick={() => onDuplicate(invoice.id)} className="text-green-600 hover:text-green-900" title={t('duplicate')} aria-label={`${t('duplicate')} ${invoice.invoiceNumber}`}><i className="bi bi-copy"></i></button>
                         <button onClick={() => onView(invoice.id)} className="text-indigo-600 hover:text-indigo-900" title={t('view')} aria-label={`${t('view')} ${invoice.invoiceNumber}`}><i className="bi bi-eye-fill"></i></button>
                         <button onClick={() => onEdit(invoice.id)} className="text-blue-600 hover:text-blue-900" title={t('edit')} aria-label={`${t('edit')} ${invoice.invoiceNumber}`}><i className="bi bi-pencil-fill"></i></button>
                         <button onClick={() => setDeleteTarget(invoice.id)} className="text-red-600 hover:text-red-900" title={t('delete')} aria-label={`${t('delete')} ${invoice.invoiceNumber}`}><i className="bi bi-trash-fill"></i></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )}
      </div>
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title={t('confirmDeleteInvoiceTitle')}
        message={t('confirmDeleteInvoiceMessage')}
      />
      <ConfirmDialog
        isOpen={isBulkDeleteConfirmOpen}
        onClose={() => setBulkDeleteConfirmOpen(false)}
        onConfirm={handleConfirmBulkDelete}
        title={t('confirmBulkDeleteTitle', { count: selectedInvoices.length })}
        message={t('confirmBulkDeleteMessage', { count: selectedInvoices.length })}
      />
    </>
  );
};

export default InvoiceList;

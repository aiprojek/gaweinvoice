import React, { useState, useEffect, useRef } from 'react';
import type { Quote, QuoteStatus, Settings } from '../types';
import { QuoteStatus as StatusEnum } from '../types';
import QuoteStatusBadge from './QuoteStatusBadge';
import ConfirmDialog from './ConfirmDialog';
import { formatCurrency } from '../utils/formatting';
import { useI18n } from '../contexts/I18nContext';
import { db } from '../services/db';
import useDebounce from '../hooks/useDebounce';

interface QuoteListProps {
  onView: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onCreate: () => void;
  onConvertToInvoice: (id: number) => void;
  onBulkDelete: (ids: number[]) => void;
  onBulkUpdateStatus: (ids: number[], status: QuoteStatus) => void;
  settings: Settings | null;
}

const QuoteList: React.FC<QuoteListProps> = ({ onView, onEdit, onDelete, onCreate, onConvertToInvoice, onBulkDelete, onBulkUpdateStatus, settings }) => {
  const { t, language } = useI18n();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [filter, setFilter] = useState<QuoteStatus | 'All'>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [selectedQuotes, setSelectedQuotes] = useState<number[]>([]);
  const [isBulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchQuotes = async () => {
        setIsLoading(true);
        try {
            let query = db.quotes.toCollection();

            if (filter !== 'All') {
                query = query.filter(quote => quote.status === filter);
            }

            if (debouncedSearchTerm.trim()) {
                const lowercasedTerm = debouncedSearchTerm.toLowerCase();
                query = query.filter(quote => 
                    quote.quoteNumber.toLowerCase().includes(lowercasedTerm) ||
                    quote.toName.toLowerCase().includes(lowercasedTerm)
                );
            }
            
            const results = await query.reverse().sortBy('quoteDate');
            setQuotes(results);

        } catch (error) {
            console.error("Failed to fetch quotes:", error);
        } finally {
            setIsLoading(false);
        }
    };
    fetchQuotes();
  }, [filter, debouncedSearchTerm]);


  useEffect(() => {
    setSelectedQuotes([]);
  }, [filter, searchTerm]);

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
        const isAllSelected = quotes.length > 0 && selectedQuotes.length === quotes.length;
        const isPartiallySelected = selectedQuotes.length > 0 && selectedQuotes.length < quotes.length;
        selectAllCheckboxRef.current.checked = isAllSelected;
        selectAllCheckboxRef.current.indeterminate = isPartiallySelected;
    }
  }, [selectedQuotes, quotes]);

  const handleSelectOne = (id: number) => {
    setSelectedQuotes(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };
  
  const handleSelectAll = () => {
    if (selectedQuotes.length === quotes.length) {
      setSelectedQuotes([]);
    } else {
      setSelectedQuotes(quotes.map(q => q.id));
    }
  };

  const handleConfirmDelete = () => {
    if (deleteTarget !== null) {
      onDelete(deleteTarget);
      setDeleteTarget(null);
    }
  };

  const handleConfirmBulkDelete = () => {
      onBulkDelete(selectedQuotes);
      setSelectedQuotes([]);
      setBulkDeleteConfirmOpen(false);
  };

  const handleBulkStatusChange = (status: QuoteStatus) => {
      onBulkUpdateStatus(selectedQuotes, status);
      setSelectedQuotes([]);
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString(language, { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <>
      <div className="bg-white shadow-lg rounded-xl">
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{t('quotes')}</h2>
                <p className="text-sm text-gray-500">{t('quotesFound', { count: quotes.length })}</p>
              </div>
              <button onClick={onCreate} className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-150">
                <i className="bi bi-plus-circle-fill mr-2"></i> {t('createNewQuote')}
              </button>
          </div>
          <form className="flex flex-col sm:flex-row gap-4 mb-6 border-b pb-4">
            <div className="relative flex-grow">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <i className="bi bi-search text-gray-400"></i>
              </span>
              <input
                type="text"
                placeholder={t('searchQuotes')}
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
                  onChange={(e) => setFilter(e.target.value as QuoteStatus | 'All')}
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
        
        {selectedQuotes.length > 0 && (
            <div className="bg-indigo-50 border-y border-indigo-200 px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="font-semibold text-indigo-800">{selectedQuotes.length} {t('selected')}</p>
                <div className="flex items-center gap-2">
                    <label htmlFor="bulk-status" className="sr-only">{t('changeStatusTo')}</label>
                    <select
                        id="bulk-status"
                        onChange={(e) => handleBulkStatusChange(e.target.value as QuoteStatus)}
                        className="p-2 border rounded-md bg-white text-sm shadow-sm"
                        value=""
                    >
                        <option value="" disabled>{t('changeStatusTo')}</option>
                        {Object.values(StatusEnum).map(s => <option key={s} value={s}>{t(s.toLowerCase())}</option>)}
                    </select>
                    <button onClick={() => setBulkDeleteConfirmOpen(true)} className="px-3 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 shadow-sm"><i className="bi bi-trash-fill mr-1"></i> {t('delete')}</button>
                    <button onClick={() => setSelectedQuotes([])} className="px-3 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 shadow-sm">{t('cancel')}</button>
                </div>
            </div>
        )}

        {isLoading ? (
            <div className="text-center py-16">{t('loadingData')}</div>
        ) : quotes.length === 0 ? (
          <div className="text-center py-16 px-4">
            <i className="bi bi-file-earmark-text text-6xl text-gray-300"></i>
            <p className="mt-4 text-gray-500">{t('noQuotesToDisplay')}</p>
          </div>
        ) : (
        <div>
          {/* Mobile View - Cards */}
          <div className="sm:hidden space-y-4 p-4">
            {quotes.map(quote => (
              <div key={quote.id} className="bg-gray-50 border rounded-lg p-3 shadow flex items-start gap-3">
                <div className="flex-shrink-0 pt-1">
                  <input 
                    type="checkbox"
                    checked={selectedQuotes.includes(quote.id)}
                    onChange={() => handleSelectOne(quote.id)}
                    className="h-5 w-5 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                    aria-label={`Select quote ${quote.quoteNumber}`}
                  />
                </div>
                <div className="flex-grow">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-gray-800 break-words">{quote.toName}</p>
                      <p className="text-sm text-gray-500">{quote.quoteNumber}</p>
                    </div>
                    <div className="flex-shrink-0 ml-2">
                      <QuoteStatusBadge status={quote.status} />
                    </div>
                  </div>
                  <div className="flex justify-between items-end mt-3">
                    <div>
                      <p className="text-sm text-gray-500">{t('expiryDate')}: {formatDate(quote.expiryDate)}</p>
                      <p className="text-lg font-semibold text-gray-900">{formatCurrency(quote.total, settings, quote.currency)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                       {quote.status !== StatusEnum.Accepted && (
                          <button onClick={() => onConvertToInvoice(quote.id)} className="text-green-600 hover:text-green-900 text-xl" title={t('convertToInvoice')} aria-label={`${t('convertToInvoice')} ${quote.quoteNumber}`}><i className="bi bi-file-earmark-arrow-up-fill"></i></button>
                       )}
                       <button onClick={() => onView(quote.id)} className="text-indigo-600 hover:text-indigo-900 text-xl" title={t('view')} aria-label={`${t('view')} ${quote.quoteNumber}`}><i className="bi bi-eye-fill"></i></button>
                       <button onClick={() => onEdit(quote.id)} className="text-blue-600 hover:text-blue-900 text-xl" title={t('edit')} aria-label={`${t('edit')} ${quote.quoteNumber}`}><i className="bi bi-pencil-fill"></i></button>
                       <button onClick={() => setDeleteTarget(quote.id)} className="text-red-600 hover:text-red-900 text-xl" title={t('delete')} aria-label={`${t('delete')} ${quote.quoteNumber}`}><i className="bi bi-trash-fill"></i></button>
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
                      aria-label="Select all quotes"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('status')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('quoteNumberShort')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('client')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('expiryDate')}</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('amount')}</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {quotes.map((quote) => (
                  <tr key={quote.id} className={`transition-colors duration-150 ${selectedQuotes.includes(quote.id) ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}>
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedQuotes.includes(quote.id)}
                        onChange={() => handleSelectOne(quote.id)}
                        className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                        aria-label={`Select quote ${quote.quoteNumber}`}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap"><QuoteStatusBadge status={quote.status} /></td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{quote.quoteNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{quote.toName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(quote.expiryDate)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">{formatCurrency(quote.total, settings, quote.currency)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end items-center gap-3">
                         {quote.status !== StatusEnum.Accepted && (
                           <button onClick={() => onConvertToInvoice(quote.id)} className="text-green-600 hover:text-green-900" title={t('convertToInvoice')} aria-label={`${t('convertToInvoice')} ${quote.quoteNumber}`}><i className="bi bi-file-earmark-arrow-up-fill"></i></button>
                         )}
                         <button onClick={() => onView(quote.id)} className="text-indigo-600 hover:text-indigo-900" title={t('view')} aria-label={`${t('view')} ${quote.quoteNumber}`}><i className="bi bi-eye-fill"></i></button>
                         <button onClick={() => onEdit(quote.id)} className="text-blue-600 hover:text-blue-900" title={t('edit')} aria-label={`${t('edit')} ${quote.quoteNumber}`}><i className="bi bi-pencil-fill"></i></button>
                         <button onClick={() => setDeleteTarget(quote.id)} className="text-red-600 hover:text-red-900" title={t('delete')} aria-label={`${t('delete')} ${quote.quoteNumber}`}><i className="bi bi-trash-fill"></i></button>
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
        title={t('confirmDeleteQuoteTitle')}
        message={t('confirmDeleteQuoteMessage')}
      />
      <ConfirmDialog
        isOpen={isBulkDeleteConfirmOpen}
        onClose={() => setBulkDeleteConfirmOpen(false)}
        onConfirm={handleConfirmBulkDelete}
        title={t('confirmBulkDeleteQuotesTitle', { count: selectedQuotes.length })}
        message={t('confirmBulkDeleteQuotesMessage', { count: selectedQuotes.length })}
      />
    </>
  );
};

export default QuoteList;

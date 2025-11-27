import React, { useState } from 'react';
import type { RecurringInvoice, RecurringInvoiceStatus, Settings } from '../types';
import { RecurringInvoiceStatus as StatusEnum } from '../types';
import RecurringInvoiceStatusBadge from './RecurringInvoiceStatusBadge';
import ConfirmDialog from './ConfirmDialog';
import { useI18n } from '../contexts/I18nContext';
import { formatCurrency } from '../utils/formatting';

interface Props {
  recurringInvoices: RecurringInvoice[];
  onCreate: () => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onUpdateStatus: (id: number, status: RecurringInvoiceStatus) => void;
  settings: Settings | null;
}

const RecurringInvoiceList: React.FC<Props> = ({ recurringInvoices, onCreate, onEdit, onDelete, onUpdateStatus, settings }) => {
  const { t, language } = useI18n();
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString(language, { month: 'short', day: 'numeric', year: 'numeric' });

  const getFrequencyLabel = (inv: RecurringInvoice) => {
      const freq = t(inv.frequency.toLowerCase());
      if (inv.interval > 1) {
          return `${t('every')} ${inv.interval} ${freq}`;
      }
      return `${t('every')} ${freq}`; // e.g., Every Monthly -> usually "Every Month", but simple concat for now
  };

  return (
    <>
      <div className="bg-white shadow-lg rounded-xl">
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">{t('recurringInvoices')}</h2>
                    <p className="text-sm text-gray-500">{t('recurringInvoicesDesc')}</p>
                </div>
                <button onClick={onCreate} className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition duration-150">
                    <i className="bi bi-plus-circle-fill mr-2"></i> {t('createRecurringProfile')}
                </button>
            </div>

            {recurringInvoices.length === 0 ? (
                 <div className="text-center py-16 px-4">
                    <i className="bi bi-arrow-repeat text-6xl text-gray-300"></i>
                    <p className="mt-4 text-gray-500">{t('noRecurringProfiles')}</p>
                 </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('status')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('profileName')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('client')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('frequency')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('nextRun')}</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('amount')}</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {recurringInvoices.map(inv => (
                                <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <RecurringInvoiceStatusBadge status={inv.status} />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{inv.profileName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">{inv.toName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">{getFrequencyLabel(inv)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">{formatDate(inv.nextRunDate)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-gray-900">{formatCurrency(inv.total, settings, inv.currency)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end items-center gap-2">
                                            {inv.status === StatusEnum.Active ? (
                                                <button onClick={() => onUpdateStatus(inv.id, StatusEnum.Paused)} className="p-2 text-yellow-600 hover:bg-yellow-50 border border-transparent hover:border-yellow-200 rounded transition-colors" title={t('pause')} aria-label={`${t('pause')} ${inv.profileName}`}><i className="bi bi-pause-circle-fill"></i></button>
                                            ) : inv.status === StatusEnum.Paused ? (
                                                <button onClick={() => onUpdateStatus(inv.id, StatusEnum.Active)} className="p-2 text-green-600 hover:bg-green-50 border border-transparent hover:border-green-200 rounded transition-colors" title={t('activate')} aria-label={`${t('activate')} ${inv.profileName}`}><i className="bi bi-play-circle-fill"></i></button>
                                            ) : null}
                                            <button onClick={() => onEdit(inv.id)} className="p-2 text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 rounded transition-colors" title={t('edit')} aria-label={`${t('edit')} ${inv.profileName}`}><i className="bi bi-pencil-fill"></i></button>
                                            <button onClick={() => setDeleteTarget(inv.id)} className="p-2 text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 rounded transition-colors" title={t('delete')} aria-label={`${t('delete')} ${inv.profileName}`}><i className="bi bi-trash-fill"></i></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
      </div>
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget !== null && onDelete(deleteTarget)}
        title={t('confirmDeleteRecurringTitle')}
        message={t('confirmDeleteRecurringMessage')}
      />
    </>
  );
};

export default RecurringInvoiceList;

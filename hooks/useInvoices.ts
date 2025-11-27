

import { useState, useEffect, useCallback } from 'react';
import type { Invoice, InvoiceStatus, Settings } from '../types';
import { InvoiceStatus as StatusEnum } from '../types';
import { 
  getAllInvoices, addInvoice, updateInvoice, deleteInvoice, getInvoiceById
} from '../services/db';
import { useI18n } from '../contexts/I18nContext';
import { useToast } from '../contexts/ToastContext';

export const useInvoices = (
  settings: Settings | null
) => {
  const { t } = useI18n();
  const { addToast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);

  const fetchInvoices = useCallback(async () => {
    const allInvoices = await getAllInvoices();
    setInvoices(allInvoices.sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime()));
  }, []);

  useEffect(() => {
    // This hook will no longer fetch on mount, the list component will do it.
    // It's here for manual refetching.
  }, []);

  const saveInvoice = async (invoice: Omit<Invoice, 'id'>, id?: number) => {
    await (id ? updateInvoice(id, invoice) : addInvoice(invoice));
    addToast(id ? 'Invoice updated successfully' : 'Invoice created successfully', 'success');
  };

  const removeInvoice = async (id: number) => {
    await deleteInvoice(id);
    addToast('Invoice deleted successfully', 'success');
  };
  
  const updateInvoiceStatus = async (id: number, status: InvoiceStatus) => {
    await updateInvoice(id, { status });
    // The list component will refetch, so a toast here might be redundant
    // but can be added if needed: addToast('Status updated', 'success');
  };

  const bulkDeleteInvoices = async (ids: number[]) => {
    await Promise.all(ids.map(id => deleteInvoice(id)));
    addToast(t('invoicesDeleted', { count: ids.length }), 'success');
  };
  
  const bulkUpdateInvoiceStatus = async (ids: number[], status: InvoiceStatus) => {
      await Promise.all(ids.map(id => updateInvoice(id, { status })));
      addToast(t('invoicesUpdated', { count: ids.length, status: t(status.toLowerCase()) }), 'success');
  };
  
  const duplicateInvoice = async (id: number): Promise<number | undefined> => {
    const originalInvoice = await getInvoiceById(id);
    if (!originalInvoice || !settings) {
      addToast(t('error'), 'error');
      return;
    }

    const generateNewInvoiceNumber = async () => {
        const format = settings.invoiceNumberFormat || 'INV-{YYYY}-{NNNN}';
        const allInvoices = await getAllInvoices();
        const count = allInvoices.length + 1;
        const date = new Date();
        const numberPlaceholderMatch = format.match(/{N+}/);
        const numberPlaceholder = numberPlaceholderMatch ? numberPlaceholderMatch[0] : '{NNNN}';
        const padding = numberPlaceholder.length - 2;
        const sequentialNumber = String(count).padStart(padding, '0');

        return format
          .replace('{YYYY}', String(date.getFullYear()))
          .replace('{YY}', String(date.getFullYear()).slice(-2))
          .replace(numberPlaceholder, sequentialNumber);
    };

    const newInvoiceNumber = await generateNewInvoiceNumber();
    const today = new Date();
    const newDueDate = new Date();
    newDueDate.setDate(today.getDate() + 30);

    const { id: originalId, ...invoiceToCopy } = originalInvoice;

    const newInvoiceData: Omit<Invoice, 'id'> = {
        ...invoiceToCopy,
        invoiceNumber: newInvoiceNumber,
        status: StatusEnum.Draft,
        invoiceDate: today.toISOString().split('T')[0],
        dueDate: newDueDate.toISOString().split('T')[0],
        items: originalInvoice.items.map(item => ({...item, id: crypto.randomUUID()})),
        createdAt: today,
        updatedAt: today,
        convertedFromQuoteId: undefined,
        payments: [],
        amountPaid: 0,
        balanceDue: invoiceToCopy.total,
    };

    const newId = await addInvoice(newInvoiceData);
    addToast(t('invoiceDuplicated'), 'success');
    return newId;
  };

  return { invoices, saveInvoice, removeInvoice, updateInvoiceStatus, bulkDeleteInvoices, bulkUpdateInvoiceStatus, duplicateInvoice, refetchInvoices: fetchInvoices };
};
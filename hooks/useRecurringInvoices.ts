

import { useState, useEffect, useCallback } from 'react';
import type { RecurringInvoice, RecurringInvoiceStatus, Settings, Invoice } from '../types';
import { RecurringInvoiceStatus as RecStatusEnum, RecurringFrequency, InvoiceStatus as StatusEnum } from '../types';
import { 
  getAllRecurringInvoices, addRecurringInvoice, updateRecurringInvoice, deleteRecurringInvoice,
  getAllInvoices, addInvoice
} from '../services/db';
import { useI18n } from '../contexts/I18nContext';
import { useToast } from '../contexts/ToastContext';

export const useRecurringInvoices = (
    settings: Settings | null,
    onInvoicesGenerated: () => void
) => {
  const { t } = useI18n();
  const { addToast } = useToast();
  const [recurringInvoices, setRecurringInvoices] = useState<RecurringInvoice[] | null>(null);

  const fetchRecurringInvoices = useCallback(async () => {
    const data = await getAllRecurringInvoices();
    setRecurringInvoices(data);
  }, []);

  useEffect(() => {
    fetchRecurringInvoices();
  }, [fetchRecurringInvoices]);

  const saveRecurring = async (invoice: Omit<RecurringInvoice, 'id'>, id?: number) => {
      await (id ? updateRecurringInvoice(id, invoice) : addRecurringInvoice(invoice));
      await fetchRecurringInvoices();
  };
  
  const removeRecurring = async (id: number) => {
      await deleteRecurringInvoice(id);
      await fetchRecurringInvoices();
  };

  const updateRecurringStatus = async (id: number, status: RecurringInvoiceStatus) => {
      await updateRecurringInvoice(id, { status });
      await fetchRecurringInvoices();
  };
  
  const checkAndGenerateRecurringInvoices = useCallback(async () => {
      if (!settings) return;
      try {
        const allProfiles = await getAllRecurringInvoices();
        const activeProfiles = allProfiles.filter(p => p.status === RecStatusEnum.Active);
        const today = new Date();
        today.setHours(0,0,0,0);
        
        let generatedCount = 0;

        for (const profile of activeProfiles) {
            const nextRun = new Date(profile.nextRunDate);
            nextRun.setHours(0,0,0,0);

            if (nextRun <= today) {
                if (profile.endDate) {
                    const end = new Date(profile.endDate);
                    if (today > end) {
                        await updateRecurringInvoice(profile.id, { status: RecStatusEnum.Ended });
                        continue;
                    }
                }

                const invoiceFormat = settings.invoiceNumberFormat || 'INV-{YYYY}-{NNNN}';
                const count = (await getAllInvoices()).length + 1 + generatedCount;
                const numberPlaceholderMatch = invoiceFormat.match(/{N+}/);
                const numberPlaceholder = numberPlaceholderMatch ? numberPlaceholderMatch[0] : '{NNNN}';
                const padding = numberPlaceholder.length - 2;
                const sequentialNumber = String(count).padStart(padding, '0');
                const invoiceNumber = invoiceFormat
                  .replace('{YYYY}', String(today.getFullYear()))
                  .replace('{YY}', String(today.getFullYear()).slice(-2))
                  .replace(numberPlaceholder, sequentialNumber);

                const dueDate = new Date(today);
                dueDate.setDate(today.getDate() + 30);

                const newInvoiceData: Omit<Invoice, 'id'> = {
                    invoiceNumber,
                    status: StatusEnum.Draft,
                    template: profile.template,
                    currency: profile.currency,
                    fromName: profile.fromName, fromEmail: profile.fromEmail, fromAddress: profile.fromAddress, fromPhone: profile.fromPhone,
                    toName: profile.toName, toEmail: profile.toEmail, toAddress: profile.toAddress, toPhone: profile.toPhone,
                    invoiceDate: today.toISOString().split('T')[0],
                    dueDate: dueDate.toISOString().split('T')[0],
                    items: profile.items.map(item => ({...item, id: crypto.randomUUID()})),
                    notes: profile.notes,
                    subtotal: profile.subtotal, taxRate: profile.taxRate, taxAmount: profile.taxAmount, total: profile.total,
                    costSubtotal: profile.costSubtotal, netProfit: profile.netProfit,
                    payments: [], amountPaid: 0, balanceDue: profile.total,
                    generatedFromRecurringId: profile.id,
                    createdAt: today, updatedAt: today
                };

                await addInvoice(newInvoiceData);
                generatedCount++;

                const newNextRun = new Date(nextRun);
                if (profile.frequency === RecurringFrequency.Daily) newNextRun.setDate(newNextRun.getDate() + profile.interval);
                if (profile.frequency === RecurringFrequency.Weekly) newNextRun.setDate(newNextRun.getDate() + (7 * profile.interval));
                if (profile.frequency === RecurringFrequency.Monthly) newNextRun.setMonth(newNextRun.getMonth() + profile.interval);
                if (profile.frequency === RecurringFrequency.Yearly) newNextRun.setFullYear(newNextRun.getFullYear() + profile.interval);

                await updateRecurringInvoice(profile.id, {
                    lastRunDate: today.toISOString().split('T')[0],
                    nextRunDate: newNextRun.toISOString().split('T')[0]
                });
            }
        }

        if (generatedCount > 0) {
            onInvoicesGenerated();
            addToast(t('recurringGeneratedMessage', { count: generatedCount }), 'success');
        }
      } catch (err) {
        console.error("Error processing recurring invoices:", err);
        addToast(t('recurringFailed'), 'error');
      }
  }, [settings, onInvoicesGenerated, addToast, t]);

  return { recurringInvoices, saveRecurring, removeRecurring, updateRecurringStatus, checkAndGenerateRecurringInvoices, refetchRecurringInvoices: fetchRecurringInvoices };
};


import { useState, useEffect, useCallback } from 'react';
import type { Quote, QuoteStatus, Settings, Invoice } from '../types';
import { QuoteStatus as QuoteStatusEnum, InvoiceStatus as InvoiceStatusEnum } from '../types';
import { 
  getAllQuotes, addQuote, updateQuote, deleteQuote, getQuoteById,
  getAllInvoices, addInvoice
} from '../services/db';
import { useI18n } from '../contexts/I18nContext';
import { useToast } from '../contexts/ToastContext';

export const useQuotes = (
  settings: Settings | null,
  onConverted: () => void
) => {
  const { t } = useI18n();
  const { addToast } = useToast();
  const [quotes, setQuotes] = useState<Quote[] | null>(null);

  const fetchQuotes = useCallback(async () => {
    const allQuotes = await getAllQuotes();
    setQuotes(allQuotes.sort((a, b) => new Date(b.quoteDate).getTime() - new Date(a.quoteDate).getTime()));
  }, []);

  useEffect(() => {
    // List component fetches data now
  }, []);

  const saveQuote = async (quote: Omit<Quote, 'id'>, id?: number) => {
    await (id ? updateQuote(id, quote) : addQuote(quote));
    addToast(id ? 'Quote updated' : 'Quote created', 'success');
  };

  const removeQuote = async (id: number) => {
    await deleteQuote(id);
    addToast('Quote deleted', 'success');
  };

  const updateQuoteStatus = async (id: number, status: QuoteStatus) => {
    await updateQuote(id, { status });
  };

  const bulkDeleteQuotes = async (ids: number[]) => {
    await Promise.all(ids.map(id => deleteQuote(id)));
    addToast(t('quotesDeleted', { count: ids.length }), 'success');
  };

  const bulkUpdateQuoteStatus = async (ids: number[], status: QuoteStatus) => {
      await Promise.all(ids.map(id => updateQuote(id, { status })));
      addToast(t('quotesUpdated', { count: ids.length, status: t(status.toLowerCase()) }), 'success');
  };

  const convertToInvoice = async (quoteId: number): Promise<number | undefined> => {
      const quote = await getQuoteById(quoteId);
      if (!quote || !settings) {
        addToast(t('quoteNotFound'), 'error');
        return;
      }
      
      const generateNewInvoiceNumber = async () => {
        const format = settings.invoiceNumberFormat || 'INV-{YYYY}-{NNNN}';
        const count = (await getAllInvoices()).length + 1;
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

      const today = new Date();
      const dueDate = new Date();
      dueDate.setDate(today.getDate() + 30);

      const { id: _quoteId, ...quoteData } = quote;

      const newInvoiceData: Omit<Invoice, 'id'> = {
          ...quoteData,
          invoiceNumber: await generateNewInvoiceNumber(),
          status: InvoiceStatusEnum.Draft,
          invoiceDate: today.toISOString().split('T')[0],
          dueDate: dueDate.toISOString().split('T')[0],
          convertedFromQuoteId: quote.id,
          createdAt: today,
          updatedAt: today,
          payments: [],
          amountPaid: 0,
          balanceDue: quote.total,
      };

      const newInvoiceId = await addInvoice(newInvoiceData);
      await updateQuote(quote.id, { status: QuoteStatusEnum.Accepted, linkedInvoiceId: newInvoiceId });
      
      onConverted();
      addToast(t('quoteConvertedMessage'), 'success');
      return newInvoiceId;
  };


  return { quotes, saveQuote, removeQuote, updateQuoteStatus, bulkDeleteQuotes, bulkUpdateQuoteStatus, convertToInvoice, refetchQuotes: fetchQuotes };
};
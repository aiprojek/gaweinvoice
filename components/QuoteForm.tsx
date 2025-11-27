import React, { useState, useEffect, useCallback, useMemo, useRef, useReducer } from 'react';
import type { Quote, LineItem, Client, Product, Settings, InvoiceTemplate } from '../types';
import { QuoteStatus } from '../types';
import { db } from '../services/db';
import { formatCurrency } from '../utils/formatting';
import ConfirmDialog from './ConfirmDialog';
import { useI18n } from '../contexts/I18nContext';
import { currencies } from '../utils/localization';

// --- Reducer Logic ---

const calculateAllTotals = (items: LineItem[], taxRate: number) => {
  const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.price), 0);
  const costSubtotal = items.reduce((acc, item) => acc + (item.quantity * (item.cost || 0)), 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;
  const netProfit = subtotal - costSubtotal;
  return { subtotal, taxAmount, total, costSubtotal, netProfit };
};

type FormState = Omit<Quote, 'id'> & { customItemFlags: Record<string, boolean> };

type Action =
  | { type: 'SET_QUOTE'; payload: { quote: Omit<Quote, 'id'>, flags: Record<string, boolean> } }
  | { type: 'CHANGE_FIELD'; payload: { field: keyof Omit<Quote, 'id'>; value: any } }
  | { type: 'ADD_ITEM' }
  | { type: 'REMOVE_ITEM'; payload: { id: string } }
  | { type: 'UPDATE_ITEM'; payload: { id: string; field: keyof LineItem; value: any } }
  | { type: 'SET_CLIENT'; payload: Client }
  | { type: 'SELECT_PRODUCT'; payload: { itemId: string, product: Product | null } };

const quoteReducer = (state: FormState, action: Action): FormState => {
  switch (action.type) {
    case 'SET_QUOTE':
      return { ...action.payload.quote, customItemFlags: action.payload.flags };

    case 'CHANGE_FIELD': {
      const newState = { ...state, [action.payload.field]: action.payload.value };
      if (action.payload.field === 'taxRate') {
        const totals = calculateAllTotals(newState.items, newState.taxRate);
        return { ...newState, ...totals };
      }
      return newState;
    }

    case 'SET_CLIENT': {
        const client = action.payload;
        return { ...state, toName: client.name, toEmail: client.email || '', toAddress: client.address || '', toPhone: client.phone || '' };
    }

    case 'ADD_ITEM': {
      const newItemId = crypto.randomUUID();
      const newItems = [...state.items, { id: newItemId, name: '', description: '', quantity: 1, price: 0, cost: 0 }];
      const newFlags = { ...state.customItemFlags, [newItemId]: true };
      const totals = calculateAllTotals(newItems, state.taxRate);
      return { ...state, items: newItems, customItemFlags: newFlags, ...totals };
    }

    case 'REMOVE_ITEM': {
      const newItems = state.items.filter(item => item.id !== action.payload.id);
      const newFlags = { ...state.customItemFlags };
      delete newFlags[action.payload.id];
      const totals = calculateAllTotals(newItems, state.taxRate);
      return { ...state, items: newItems, customItemFlags: newFlags, ...totals };
    }

    case 'UPDATE_ITEM': {
      const { id, field, value } = action.payload;
      const newItems = state.items.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      );
      const totals = calculateAllTotals(newItems, state.taxRate);
      return { ...state, items: newItems, ...totals };
    }

    case 'SELECT_PRODUCT': {
        const { itemId, product } = action.payload;
        const newItems = [...state.items];
        const itemIndex = newItems.findIndex(item => item.id === itemId);
        if (itemIndex === -1) return state;

        const newFlags = { ...state.customItemFlags };
        
        if (product === null) {
            newFlags[itemId] = true;
            newItems[itemIndex] = { ...newItems[itemIndex], name: '', description: '', price: 0, cost: 0 };
        } else {
            newFlags[itemId] = false;
            newItems[itemIndex] = { ...newItems[itemIndex], name: product.name, description: product.description || '', price: product.price || 0, cost: product.cost || 0 };
        }
        
        const totals = calculateAllTotals(newItems, state.taxRate);
        return { ...state, items: newItems, customItemFlags: newFlags, ...totals };
    }

    default:
      return state;
  }
};

// --- Component ---

interface QuoteFormProps {
  id?: number;
  onSave: (quote: Omit<Quote, 'id'>, id?: number) => void;
  onSaveProduct: (product: Product) => void;
  onCancel: () => void;
  clients: Client[];
  products: Product[];
  settings: Settings | null;
}

const AUTOSAVE_DEBOUNCE_TIME = 1500;
const getAutoSaveKey = (quoteId?: number) => 
  quoteId ? `autosavedQuote_edit_${quoteId}` : 'autosavedQuote_new';
  
const TemplateSelector: React.FC<{
  selected: InvoiceTemplate;
  onSelect: (template: InvoiceTemplate) => void;
}> = ({ selected, onSelect }) => {
    const { t } = useI18n();
    const templates: { id: InvoiceTemplate; name: string }[] = [
        { id: 'classic', name: t('classic') },
        { id: 'modern', name: t('modern') },
        { id: 'elegant', name: t('elegant') },
    ];
    
    return (
        <section aria-labelledby="template-selector-heading">
            <h3 id="template-selector-heading" className="font-semibold text-lg text-gray-600 mb-2 border-b pb-2">{t('invoiceTemplate')}</h3>
            <div className="grid grid-cols-3 gap-4 mt-2">
                {templates.map(template => (
                    <button
                        type="button"
                        key={template.id}
                        onClick={() => onSelect(template.id)}
                        className={`p-2 border-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${selected === template.id ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300 bg-white hover:border-indigo-400'}`}
                    >
                        <div className={`h-24 bg-gray-200 rounded-md template-preview-${template.id}`}></div>
                        <p className="text-center text-sm font-medium mt-2 text-gray-700">{template.name}</p>
                    </button>
                ))}
            </div>
            <style>{`
                .template-preview-classic { background: linear-gradient(to bottom, #e5e7eb 20%, #fff 20%, #fff 25%, #d1d5db 25%, #d1d5db 26%, #fff 26%); }
                .template-preview-modern { background: linear-gradient(to right, #4f46e5 25%, #fff 25%); }
                .template-preview-elegant { background-image: radial-gradient(#d1d5db 1px, transparent 1px); background-size: 10px 10px; border: 1px solid #e5e7eb; }
            `}</style>
        </section>
    );
};

const QuoteForm: React.FC<QuoteFormProps> = ({ id, onSave, onSaveProduct, onCancel, clients, products, settings }) => {
  const { t } = useI18n();
  const getInitialQuoteState = useCallback((settings: Settings | null): FormState => {
    const today = new Date();
    const expiryDate = new Date();
    expiryDate.setDate(today.getDate() + 30);
    const now = new Date();
  
    const initialItem = { id: crypto.randomUUID(), name: '', description: '', quantity: 1, price: 0, cost: 0 };
    return {
      quoteNumber: '', status: QuoteStatus.Draft,
      template: settings?.defaultTemplate || 'classic',
      currency: settings?.currency,
      fromName: settings?.fromName || '', fromEmail: settings?.fromEmail || '',
      fromAddress: settings?.fromAddress || '', fromPhone: settings?.fromPhone || '',
      toName: '', toEmail: '', toAddress: '', toPhone: '',
      quoteDate: today.toISOString().split('T')[0],
      expiryDate: expiryDate.toISOString().split('T')[0],
      items: [initialItem],
      notes: t('thankYouNote'), subtotal: 0, taxRate: 0, taxAmount: 0, total: 0,
      costSubtotal: 0, netProfit: 0,
      createdAt: now,
      updatedAt: now,
      customItemFlags: { [initialItem.id]: true },
    };
  }, [t]);

  const [state, dispatch] = useReducer(quoteReducer, getInitialQuoteState(settings));
  const { customItemFlags, ...quote } = state;

  const [isLoading, setIsLoading] = useState(true);
  
  const [pendingConfirmations, setPendingConfirmations] = useState<LineItem[]>([]);
  const [productToConfirmSave, setProductToConfirmSave] = useState<LineItem | null>(null);

  const [autoSavedData, setAutoSavedData] = useState<FormState | null>(null);
  const autoSaveTimeoutRef = useRef<number | null>(null);

  const clearAutoSavedDraft = useCallback(() => {
    const autoSaveKey = getAutoSaveKey(id);
    localStorage.removeItem(autoSaveKey);
  }, [id]);
  
  const generateQuoteNumber = useCallback(async () => {
    const format = settings?.quoteNumberFormat || 'Q-{YYYY}-{NNNN}';
    const count = id ? await db.quotes.count() : (await db.quotes.count()) + 1;
    const date = new Date();
    
    const numberPlaceholderMatch = format.match(/{N+}/);
    const numberPlaceholder = numberPlaceholderMatch ? numberPlaceholderMatch[0] : '{NNNN}';
    
    const padding = numberPlaceholder.length - 2;
    const sequentialNumber = String(count).padStart(padding, '0');

    return format
      .replace('{YYYY}', String(date.getFullYear()))
      .replace('{YY}', String(date.getFullYear()).slice(-2))
      .replace(numberPlaceholder, sequentialNumber);
  }, [settings?.quoteNumberFormat, id]);

  useEffect(() => {
    const loadQuote = async () => {
      setIsLoading(true);
      const autoSaveKey = getAutoSaveKey(id);
      const savedDraftJSON = localStorage.getItem(autoSaveKey);

      if (savedDraftJSON) {
        try {
          setAutoSavedData(JSON.parse(savedDraftJSON));
        } catch (e) {
          console.error("Failed to parse autosaved data.", e);
          localStorage.removeItem(autoSaveKey);
        }
      }

      if (id) {
        const existingQuote = await db.quotes.get(id);
        if (existingQuote) dispatch({ type: 'SET_QUOTE', payload: { quote: existingQuote, flags: {} } });
      } else {
        const newQuoteState = getInitialQuoteState(settings);
        newQuoteState.quoteNumber = await generateQuoteNumber();
        dispatch({ type: 'SET_QUOTE', payload: { quote: newQuoteState, flags: newQuoteState.customItemFlags } });
      }
      setIsLoading(false);
    };
    loadQuote();
  }, [id, settings, generateQuoteNumber, getInitialQuoteState]);
  
  useEffect(() => {
    if (isLoading || autoSavedData) return;

    if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
    }
    
    autoSaveTimeoutRef.current = window.setTimeout(() => {
        const isPristine = !quote.toName && quote.items.length === 1 && !quote.items[0].name && quote.items[0].price === 0;
        if (!isPristine) {
            const autoSaveKey = getAutoSaveKey(id);
            localStorage.setItem(autoSaveKey, JSON.stringify(state));
        }
    }, AUTOSAVE_DEBOUNCE_TIME);

    return () => {
        if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current);
        }
    };
}, [state, quote, id, isLoading, autoSavedData]);

  useEffect(() => {
    if (pendingConfirmations.length > 0 && !productToConfirmSave) {
      const [nextItem, ...remainingItems] = pendingConfirmations;
      setProductToConfirmSave(nextItem);
      setPendingConfirmations(remainingItems);
    }
  }, [pendingConfirmations, productToConfirmSave]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const parsedValue = name === 'taxRate' ? parseFloat(value) || 0 : value;
    // FIX: Cast name to keyof Quote to resolve type error.
    dispatch({ type: 'CHANGE_FIELD', payload: { field: name as keyof Omit<Quote, 'id'>, value: parsedValue } });
  };
  
  const handleClientChange = (clientId: string) => {
    const client = clients.find(c => c.id === parseInt(clientId));
    if (client) {
      dispatch({ type: 'SET_CLIENT', payload: client });
    }
  };
  
  const handleItemChange = (itemId: string, field: keyof Omit<LineItem, 'id'>, value: string | number) => {
    const updatedValue = (field === 'quantity' || field === 'price' || field === 'cost') ? parseFloat(value as string) || 0 : value;
    dispatch({ type: 'UPDATE_ITEM', payload: { id: itemId, field: field, value: updatedValue } });
  };

  const handleProductSelect = (itemId: string, productId: string) => {
    if (productId === "__custom__") {
        dispatch({ type: 'SELECT_PRODUCT', payload: { itemId, product: null } });
    } else {
        const product = products.find(p => p.id === parseInt(productId));
        if (product) {
            dispatch({ type: 'SELECT_PRODUCT', payload: { itemId, product } });
        }
    }
  };

  const handleSubmit = () => {
    const existingProductNames = new Set(products.map(p => p.name.toLowerCase()));
    const newCustomItems = quote.items.filter(item => 
      item.name.trim() !== '' &&
      !existingProductNames.has(item.name.trim().toLowerCase())
    );
    
    onSave(quote, id);
    clearAutoSavedDraft();

    if (newCustomItems.length > 0) {
      setPendingConfirmations(newCustomItems);
    }
  };

  const handleCancel = () => {
    clearAutoSavedDraft();
    onCancel();
  };

  const handleConfirmSaveProduct = (confirm: boolean) => {
    if (confirm && productToConfirmSave) {
      const newProduct: Product = {
        name: productToConfirmSave.name,
        description: productToConfirmSave.description,
        price: productToConfirmSave.price,
        cost: productToConfirmSave.cost || 0,
      };
      onSaveProduct(newProduct);
    }
    setProductToConfirmSave(null);
  };
  
  const handleRestoreConfirm = () => {
    if (autoSavedData) {
      dispatch({ type: 'SET_QUOTE', payload: { quote: autoSavedData, flags: autoSavedData.customItemFlags } });
      setAutoSavedData(null);
    }
  };

  const handleRestoreDiscard = () => {
    clearAutoSavedDraft();
    setAutoSavedData(null);
  };

  const groupedProducts = useMemo(() => {
    const groups: { [key: string]: Product[] } = {};
    products.forEach(p => {
        const category = p.category || 'Uncategorized';
        if (!groups[category]) {
            groups[category] = [];
        }
        groups[category].push(p);
    });
    return Object.entries(groups).sort(([a], [b]) => {
      if (a === 'Uncategorized') return 1;
      if (b === 'Uncategorized') return -1;
      return a.localeCompare(b);
    });
  }, [products]);


  if (isLoading) return <div>{t('loadingData')}</div>;

  return (
    <>
      <div className="bg-white shadow-lg rounded-xl p-4 sm:p-6 lg:p-8 space-y-8 max-w-6xl mx-auto">
        <div className="flex justify-between items-center">
             <h2 className="text-2xl font-bold text-gray-800">{id ? t('editQuote') : t('createQuote')} #{quote.quoteNumber}</h2>
              <div className="flex items-center gap-2">
                 <label htmlFor="currency" className="text-sm font-medium text-gray-700">{t('documentCurrency')}:</label>
                 <select
                      id="currency"
                      name="currency"
                      value={quote.currency || settings?.currency || 'USD'}
                      onChange={handleChange}
                      className="p-2 border rounded-md shadow-sm bg-white text-sm"
                  >
                      {currencies.map(c => <option key={c.code} value={c.code}>{c.code} - {c.name}</option>)}
                  </select>
            </div>
        </div>
        
        <TemplateSelector 
            selected={quote.template}
            onSelect={(template) => dispatch({ type: 'CHANGE_FIELD', payload: { field: 'template', value: template } })}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section aria-labelledby="from-heading">
            <h3 id="from-heading" className="font-semibold text-lg text-gray-600 mb-2 border-b pb-2">{t('from')}</h3>
            <div className="space-y-2 text-gray-700">
              <p className="font-bold">{quote.fromName || t('notSetInSettings')}</p>
              <p>{quote.fromAddress}</p>
              <p>{quote.fromEmail}</p>
              <p>{quote.fromPhone}</p>
            </div>
          </section>
          <section aria-labelledby="to-heading">
            <h3 id="to-heading" className="font-semibold text-lg text-gray-600 mb-2 border-b pb-2">{t('to')}</h3>
            <div className="space-y-2">
              <label htmlFor="client-select" className="sr-only">{t('selectAClient')}</label>
              <select id="client-select" onChange={(e) => handleClientChange(e.target.value)} className="w-full p-2 border rounded bg-white mb-2" defaultValue="">
                  <option value="" disabled>{t('selectAClient')}</option>
                  {clients.map(c => <option key={c.id} value={c.id!}>{c.name}</option>)}
              </select>
              <label htmlFor="toName" className="sr-only">{t('clientsName')}</label>
              <input id="toName" name="toName" value={quote.toName} onChange={handleChange} placeholder={t('clientsName')} className="w-full p-2 border rounded"/>
              <label htmlFor="toEmail" className="sr-only">{t('clientsEmail')}</label>
              <input id="toEmail" name="toEmail" type="email" value={quote.toEmail} onChange={handleChange} placeholder={t('clientsEmail')} className="w-full p-2 border rounded"/>
            </div>
          </section>
        </div>
        <section aria-labelledby="dates-heading" className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <h2 id="dates-heading" className="sr-only">Dates</h2>
          <div>
              <label htmlFor="quoteDate" className="block text-sm font-medium text-gray-700">{t('quoteDate')}</label>
              <input type="date" id="quoteDate" name="quoteDate" value={quote.quoteDate} onChange={handleChange} className="mt-1 w-full p-2 border rounded"/>
          </div>
          <div>
              <label htmlFor="expiryDate" className="block text-sm font-medium text-gray-700">{t('expiryDate')}</label>
              <input type="date" id="expiryDate" name="expiryDate" value={quote.expiryDate} onChange={handleChange} className="mt-1 w-full p-2 border rounded"/>
          </div>
        </section>
        <section aria-labelledby="items-heading">
          <h2 id="items-heading" className="sr-only">Items</h2>
          <div className="hidden md:grid grid-cols-12 gap-2 text-sm font-medium text-gray-500 mb-2 px-2">
              <span className="col-span-2">{t('productService')}</span>
              <span className="col-span-3">{t('itemName')}</span>
              <span className="col-span-2">{t('description')}</span>
              <span className="col-span-1 text-center">{t('qty')}</span>
              <span className="col-span-1 text-right">{t('price')}</span>
              <span className="col-span-1 text-right">{t('cost')}</span>
              <span className="col-span-1 text-right">{t('total')}</span>
              <span className="col-span-1 sr-only">{t('actions')}</span>
          </div>
          <div className="space-y-4">
            {quote.items.map((item, index) => {
                const isCustom = customItemFlags[item.id];
                return (
                  <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                    <label htmlFor={`product-select-${item.id}`} className="sr-only">{t('productService')}</label>
                    <select 
                      id={`product-select-${item.id}`}
                      onChange={e => handleProductSelect(item.id, e.target.value)} 
                      className="col-span-12 md:col-span-2 p-2 border rounded bg-white text-sm"
                      value={isCustom ? "__custom__" : products.find(p => p.name === item.name)?.id ?? "__custom__"}
                    >
                        <option value="__custom__">-- {t('enterCustomItem')} --</option>
                        {groupedProducts.map(([category, productsInCategory]) => (
                            <optgroup key={category} label={category}>
                                {productsInCategory.map(p => <option key={p.id} value={p.id!}>{p.name}</option>)}
                            </optgroup>
                        ))}
                    </select>
                    <label htmlFor={`item-name-${item.id}`} className="sr-only">{t('itemName')}</label>
                    <input id={`item-name-${item.id}`} value={item.name} onChange={(e) => handleItemChange(item.id, 'name', e.target.value)} placeholder={t('itemName')} readOnly={!isCustom} className={`col-span-12 md:col-span-3 p-2 border rounded text-sm ${!isCustom ? 'bg-gray-100' : ''}`}/>
                    <label htmlFor={`item-desc-${item.id}`} className="sr-only">{t('description')}</label>
                    <input id={`item-desc-${item.id}`} value={item.description} onChange={(e) => handleItemChange(item.id, 'description', e.target.value)} placeholder={t('description')} readOnly={!isCustom} className={`col-span-12 md:col-span-2 p-2 border rounded text-sm ${!isCustom ? 'bg-gray-100' : ''}`}/>
                    <label htmlFor={`item-qty-${item.id}`} className="sr-only">{t('qty')}</label>
                    <input type="number" id={`item-qty-${item.id}`} value={item.quantity} onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)} placeholder={t('qty')} className="col-span-3 sm:col-span-2 md:col-span-1 p-2 border rounded text-center text-sm"/>
                    <label htmlFor={`item-price-${item.id}`} className="sr-only">{t('price')}</label>
                    <input type="number" id={`item-price-${item.id}`} value={item.price} onChange={(e) => handleItemChange(item.id, 'price', e.target.value)} placeholder={t('price')} readOnly={!isCustom} className={`col-span-3 sm:col-span-2 md:col-span-1 p-2 border rounded text-right text-sm ${!isCustom ? 'bg-gray-100' : ''}`}/>
                    <label htmlFor={`item-cost-${item.id}`} className="sr-only">{t('cost')}</label>
                    <input type="number" id={`item-cost-${item.id}`} value={item.cost || ''} onChange={(e) => handleItemChange(item.id, 'cost', e.target.value)} placeholder={t('cost')} className="col-span-3 sm:col-span-2 md:col-span-1 p-2 border rounded text-right text-sm"/>
                    <span className="col-span-2 sm:col-span-2 md:col-span-1 text-right font-medium pr-2" aria-live="polite">{formatCurrency(item.quantity * item.price, settings, quote.currency)}</span>
                    <button onClick={() => dispatch({ type: 'REMOVE_ITEM', payload: { id: item.id } })} aria-label={t('removeItemAriaLabel', { itemName: item.name || `item ${index + 1}`})} className="col-span-1 sm:col-span-1 md:col-span-1 text-red-500 hover:text-red-700 flex items-center justify-center"><i className="bi bi-trash-fill"></i></button>
                  </div>
                )
            })}
          </div>
          <button onClick={() => dispatch({ type: 'ADD_ITEM' })} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"><i className="bi bi-plus-lg mr-2"></i>{t('addItem')}</button>
        </section>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t">
            <section aria-labelledby="notes-heading">
              <h3 id="notes-heading" className="font-semibold text-lg text-gray-600 mb-2 block">{t('notes')}</h3>
              <textarea aria-labelledby="notes-heading" name="notes" value={quote.notes} onChange={handleChange} rows={4} className="w-full p-2 border rounded"></textarea>
            </section>
            <section role="region" aria-live="polite" aria-label={t('invoiceTotals')} className="space-y-2 bg-gray-50 p-4 rounded-lg">
               <div className="flex justify-between items-center"><span className="text-gray-600">{t('subtotal')}</span><span className="font-medium">{formatCurrency(quote.subtotal, settings, quote.currency)}</span></div>
               <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <label htmlFor="taxRate" className="text-gray-600">{t('tax')}</label>
                    <input type="number" id="taxRate" name="taxRate" value={quote.taxRate} onChange={handleChange} className="w-20 p-1 border rounded text-right" />
                  </div>
                  <span className="font-medium">{formatCurrency(quote.taxAmount, settings, quote.currency)}</span>
               </div>
               <div className="flex justify-between items-center text-xl font-bold border-t pt-2 mt-2"><span className="text-gray-800">{t('total')}</span><span className="text-gray-800">{formatCurrency(quote.total, settings, quote.currency)}</span></div>
            </section>
        </div>
        <div className="flex justify-end gap-4 pt-4 border-t">
          <button onClick={handleCancel} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">{t('cancel')}</button>
          <button onClick={handleSubmit} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md">{id ? t('updateQuote') : t('saveQuote')}</button>
        </div>
      </div>
      {autoSavedData && (
        <ConfirmDialog
          isOpen={!!autoSavedData}
          onClose={handleRestoreDiscard}
          onConfirm={handleRestoreConfirm}
          title={t('unsavedChangesTitle')}
          message={t('unsavedChangesMessage')}
          confirmText={t('restore')}
          cancelText={t('discard')}
          confirmClass="bg-indigo-600 hover:bg-indigo-700"
        />
      )}
      {productToConfirmSave && (
        <ConfirmDialog
          isOpen={!!productToConfirmSave}
          onClose={() => handleConfirmSaveProduct(false)}
          onConfirm={() => handleConfirmSaveProduct(true)}
          title={t('saveNewProductTitle')}
          message={t('saveNewProductMessage', { name: productToConfirmSave.name })}
          confirmText={t('yesSave')}
          cancelText={t('noDontSave')}
          confirmClass="bg-indigo-600 hover:bg-indigo-700"
        />
      )}
    </>
  );
};

export default QuoteForm;

import React, { useEffect, useCallback, useMemo, useReducer } from 'react';
import type { RecurringInvoice, LineItem, Client, Product, Settings } from '../types';
import { RecurringInvoiceStatus, RecurringFrequency } from '../types';
import { formatCurrency } from '../utils/formatting';
import { useI18n } from '../contexts/I18nContext';
import { currencies } from '../utils/localization';
import { getRecurringInvoiceById } from '../services/db';

// --- Reducer Logic ---

const calculateAllTotals = (items: LineItem[], taxRate: number) => {
  const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.price), 0);
  const costSubtotal = items.reduce((acc, item) => acc + (item.quantity * (item.cost || 0)), 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;
  const netProfit = subtotal - costSubtotal;
  return { subtotal, taxAmount, total, costSubtotal, netProfit };
};

type FormState = Omit<RecurringInvoice, 'id'> & { customItemFlags: Record<string, boolean> };

type Action =
  | { type: 'SET_INVOICE'; payload: { invoice: Omit<RecurringInvoice, 'id'>, flags: Record<string, boolean> } }
  | { type: 'CHANGE_FIELD'; payload: { field: keyof Omit<RecurringInvoice, 'id'>; value: any } }
  | { type: 'ADD_ITEM' }
  | { type: 'REMOVE_ITEM'; payload: { id: string } }
  | { type: 'UPDATE_ITEM'; payload: { id: string; field: keyof LineItem; value: any } }
  | { type: 'SET_CLIENT'; payload: Client }
  | { type: 'SELECT_PRODUCT'; payload: { itemId: string, product: Product | null } };

const recurringInvoiceReducer = (state: FormState, action: Action): FormState => {
  switch (action.type) {
    case 'SET_INVOICE':
      return { ...action.payload.invoice, customItemFlags: action.payload.flags };

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

interface Props {
  id?: number;
  onSave: (invoice: Omit<RecurringInvoice, 'id'>, id?: number) => void;
  onCancel: () => void;
  clients: Client[];
  products: Product[];
  settings: Settings | null;
}

const RecurringInvoiceForm: React.FC<Props> = ({ id, onSave, onCancel, clients, products, settings }) => {
  const { t } = useI18n();
  
  const getInitialState = useCallback((): FormState => {
    const today = new Date();
    const now = new Date();
    const initialItem = { id: crypto.randomUUID(), name: '', description: '', quantity: 1, price: 0, cost: 0 };
    return {
      profileName: '',
      status: RecurringInvoiceStatus.Active,
      frequency: RecurringFrequency.Monthly,
      interval: 1,
      startDate: today.toISOString().split('T')[0],
      nextRunDate: today.toISOString().split('T')[0],
      
      template: settings?.defaultTemplate || 'classic',
      currency: settings?.currency,
      fromName: settings?.fromName || '', fromEmail: settings?.fromEmail || '',
      fromAddress: settings?.fromAddress || '', fromPhone: settings?.fromPhone || '',
      toName: '', toEmail: '', toAddress: '', toPhone: '',
      items: [initialItem],
      notes: t('thankYouNote'), 
      subtotal: 0, taxRate: 0, taxAmount: 0, total: 0,
      costSubtotal: 0, netProfit: 0,
      createdAt: now, updatedAt: now,
      customItemFlags: { [initialItem.id]: true },
    };
  }, [settings, t]);

  const [state, dispatch] = useReducer(recurringInvoiceReducer, getInitialState());
  const { customItemFlags, ...invoice } = state;

  useEffect(() => {
    const loadData = async () => {
      if (id) {
        const data = await getRecurringInvoiceById(id);
        if (data) dispatch({ type: 'SET_INVOICE', payload: { invoice: data, flags: {} } });
      } else {
        dispatch({ type: 'SET_INVOICE', payload: { invoice: getInitialState(), flags: getInitialState().customItemFlags } });
      }
    };
    loadData();
  }, [id, getInitialState]);

  // Update Next Run Date based on Start Date initially
  useEffect(() => {
      // If creating new, sync nextRun with startDate initially
      if (!id) {
          dispatch({ type: 'CHANGE_FIELD', payload: { field: 'nextRunDate', value: state.startDate } });
      }
  }, [state.startDate, id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const parsedValue = name === 'taxRate' || name === 'interval' ? parseFloat(value) || 0 : value;
    // FIX: Cast name to keyof RecurringInvoice to resolve type error.
    dispatch({ type: 'CHANGE_FIELD', payload: { field: name as keyof Omit<RecurringInvoice, 'id'>, value: parsedValue }});
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
      onSave(invoice, id);
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

  return (
    <div className="bg-white shadow-lg rounded-xl p-4 sm:p-6 lg:p-8 space-y-8 max-w-6xl mx-auto">
        <div className="flex justify-between items-center border-b pb-4">
            <h2 className="text-2xl font-bold text-gray-800">{id ? t('editRecurringProfile') : t('createRecurringProfile')}</h2>
        </div>

        {/* Schedule Settings */}
        <section aria-labelledby="schedule-heading" className="bg-indigo-50 p-6 rounded-xl border border-indigo-100">
            <h3 id="schedule-heading" className="font-semibold text-lg text-indigo-900 mb-4"><i className="bi bi-calendar-range-fill mr-2"></i>{t('scheduleSettings')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('profileName')}</label>
                    <input name="profileName" value={invoice.profileName} onChange={handleChange} placeholder={t('profileNamePlaceholder')} className="w-full p-2 border rounded" />
                </div>
                <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">{t('status')}</label>
                     <select name="status" value={invoice.status} onChange={handleChange} className="w-full p-2 border rounded bg-white">
                         {Object.values(RecurringInvoiceStatus).map(s => <option key={s} value={s}>{t(s.toLowerCase())}</option>)}
                     </select>
                </div>
                <div className="flex gap-4">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('repeatEvery')}</label>
                        <input type="number" name="interval" min="1" value={invoice.interval} onChange={handleChange} className="w-full p-2 border rounded" />
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('frequency')}</label>
                        <select name="frequency" value={invoice.frequency} onChange={handleChange} className="w-full p-2 border rounded bg-white">
                             {Object.values(RecurringFrequency).map(f => <option key={f} value={f}>{t(f.toLowerCase())}</option>)}
                        </select>
                    </div>
                </div>
                <div className="flex gap-4">
                     <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('startDate')}</label>
                        <input type="date" name="startDate" value={invoice.startDate} onChange={handleChange} className="w-full p-2 border rounded" />
                     </div>
                     <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('endDate')} ({t('optional')})</label>
                        <input type="date" name="endDate" value={invoice.endDate || ''} onChange={handleChange} className="w-full p-2 border rounded" />
                     </div>
                </div>
            </div>
            {invoice.nextRunDate && (
                <p className="mt-4 text-sm text-indigo-700 font-medium">{t('nextInvoiceDate')}: {new Date(invoice.nextRunDate).toLocaleDateString()}</p>
            )}
        </section>

        {/* Invoice Template Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section aria-labelledby="from-heading">
            <h3 id="from-heading" className="font-semibold text-lg text-gray-600 mb-2 border-b pb-2">{t('from')}</h3>
            <div className="space-y-2 text-gray-700">
              <p className="font-bold">{invoice.fromName || t('notSetInSettings')}</p>
              <p>{invoice.fromAddress}</p>
              <p>{invoice.fromEmail}</p>
              <p>{invoice.fromPhone}</p>
            </div>
             <div className="mt-4">
                 <label htmlFor="currency" className="text-sm font-medium text-gray-700">{t('documentCurrency')}:</label>
                 <select
                      id="currency"
                      name="currency"
                      value={invoice.currency || settings?.currency || 'USD'}
                      onChange={handleChange}
                      className="mt-1 p-2 border rounded-md shadow-sm bg-white text-sm w-full"
                  >
                      {currencies.map(c => <option key={c.code} value={c.code}>{c.code} - {c.name}</option>)}
                  </select>
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
              <input name="toName" value={invoice.toName} onChange={handleChange} placeholder={t('clientsName')} className="w-full p-2 border rounded"/>
              <input name="toEmail" type="email" value={invoice.toEmail} onChange={handleChange} placeholder={t('clientsEmail')} className="w-full p-2 border rounded"/>
            </div>
          </section>
        </div>

        {/* Items Section */}
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
            {invoice.items.map((item, index) => {
                const isCustom = customItemFlags[item.id];
                return (
                  <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                    <select 
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
                    <input value={item.name} onChange={(e) => handleItemChange(item.id, 'name', e.target.value)} placeholder={t('itemName')} readOnly={!isCustom} className={`col-span-12 md:col-span-3 p-2 border rounded text-sm ${!isCustom ? 'bg-gray-100' : ''}`}/>
                    <input value={item.description} onChange={(e) => handleItemChange(item.id, 'description', e.target.value)} placeholder={t('description')} readOnly={!isCustom} className={`col-span-12 md:col-span-2 p-2 border rounded text-sm ${!isCustom ? 'bg-gray-100' : ''}`}/>
                    <input type="number" value={item.quantity} onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)} placeholder={t('qty')} className="col-span-3 sm:col-span-2 md:col-span-1 p-2 border rounded text-center text-sm"/>
                    <input type="number" value={item.price} onChange={(e) => handleItemChange(item.id, 'price', e.target.value)} placeholder={t('price')} readOnly={!isCustom} className={`col-span-3 sm:col-span-2 md:col-span-1 p-2 border rounded text-right text-sm ${!isCustom ? 'bg-gray-100' : ''}`}/>
                    <input type="number" value={item.cost || ''} onChange={(e) => handleItemChange(item.id, 'cost', e.target.value)} placeholder={t('cost')} className="col-span-3 sm:col-span-2 md:col-span-1 p-2 border rounded text-right text-sm"/>
                    <span className="col-span-2 sm:col-span-2 md:col-span-1 text-right font-medium pr-2" aria-live="polite">{formatCurrency(item.quantity * item.price, settings, invoice.currency)}</span>
                    <button onClick={() => dispatch({ type: 'REMOVE_ITEM', payload: { id: item.id } })} aria-label={t('removeItemAriaLabel', { itemName: item.name || `item ${index + 1}`})} className="col-span-1 sm:col-span-1 md:col-span-1 text-red-500 hover:text-red-700 flex items-center justify-center" title={t('delete')}><i className="bi bi-trash-fill"></i></button>
                  </div>
                )
            })}
          </div>
          <button onClick={() => dispatch({ type: 'ADD_ITEM' })} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"><i className="bi bi-plus-lg mr-2"></i>{t('addItem')}</button>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t">
            <section aria-labelledby="notes-heading">
              <h3 id="notes-heading" className="font-semibold text-lg text-gray-600 mb-2 block">{t('notes')}</h3>
              <textarea name="notes" aria-labelledby="notes-heading" value={invoice.notes} onChange={handleChange} rows={4} className="w-full p-2 border rounded"></textarea>
            </section>
            <section aria-label={t('invoiceTotals')} className="space-y-2 bg-gray-50 p-4 rounded-lg">
               <div className="flex justify-between items-center"><span className="text-gray-600">{t('subtotal')}</span><span className="font-medium">{formatCurrency(invoice.subtotal, settings, invoice.currency)}</span></div>
               <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <label className="text-gray-600">{t('tax')}</label>
                    <input type="number" name="taxRate" value={invoice.taxRate} onChange={handleChange} className="w-20 p-1 border rounded text-right" />
                  </div>
                  <span className="font-medium">{formatCurrency(invoice.taxAmount, settings, invoice.currency)}</span>
               </div>
               <div className="flex justify-between items-center text-xl font-bold border-t pt-2 mt-2"><span className="text-gray-800">{t('total')}</span><span className="text-gray-800">{formatCurrency(invoice.total, settings, invoice.currency)}</span></div>
            </section>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <button onClick={onCancel} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors">{t('cancel')}</button>
          <button onClick={handleSubmit} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md transition-colors">{id ? t('updateRecurringProfile') : t('saveRecurringProfile')}</button>
        </div>
    </div>
  );
};

export default RecurringInvoiceForm;

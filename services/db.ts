
import type { Invoice, Client, Product, Settings, BackupData, LineItem, Quote, RecurringInvoice } from '../types';
import { InvoiceStatus } from '../types';
import Dexie, { type Table } from 'dexie';

// Define the old type for migration
interface OldLineItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
}

// Migration helper to convert old line items to the new format
const migrateInvoiceItems = (invoice: Invoice): Invoice => {
    let migratedInvoice = { ...invoice };
    
    // Add default template if missing
    if (!migratedInvoice.template) {
        migratedInvoice.template = 'classic';
    }

    // Ensure payment fields exist
    if (!migratedInvoice.payments) migratedInvoice.payments = [];
    if (typeof migratedInvoice.amountPaid === 'undefined') migratedInvoice.amountPaid = migratedInvoice.status === InvoiceStatus.Paid ? migratedInvoice.total : 0;
    if (typeof migratedInvoice.balanceDue === 'undefined') migratedInvoice.balanceDue = migratedInvoice.total - migratedInvoice.amountPaid;


    const items = migratedInvoice.items as (LineItem | OldLineItem)[];
    if (!items || items.length === 0 || 'name' in items[0]) {
        return migratedInvoice; // Already in new format or no items
    }

    const migratedItems: LineItem[] = items.map(item => ({
        id: (item as OldLineItem).id || crypto.randomUUID(),
        quantity: (item as OldLineItem).quantity,
        price: (item as OldLineItem).price,
        name: (item as OldLineItem).description, // The old description becomes the new name
        description: '', // Old format didn't have a separate description
    }));

    return { ...migratedInvoice, items: migratedItems };
};


export class InvoiceDB extends Dexie {
  invoices!: Table<Invoice, number>;
  quotes!: Table<Quote, number>;
  recurringInvoices!: Table<RecurringInvoice, number>;
  clients!: Table<Client, number>;
  products!: Table<Product, number>;
  settings!: Table<Settings, number>;

  constructor() {
    super('InvoiceDB');
    
    // Version 8: Add currency support
    (this as Dexie).version(8).stores({
      invoices: '++id, invoiceNumber, status, toName, dueDate, total, template, convertedFromQuoteId, balanceDue, currency',
      quotes: '++id, quoteNumber, status, toName, expiryDate, total, linkedInvoiceId, currency',
      clients: '++id, name',
      products: '++id, name, category',
      settings: 'id',
    });

    // Version 7: Add payments support
    (this as Dexie).version(7).stores({
      invoices: '++id, invoiceNumber, status, toName, dueDate, total, template, convertedFromQuoteId, balanceDue',
      quotes: '++id, quoteNumber, status, toName, expiryDate, total, linkedInvoiceId',
      clients: '++id, name',
      products: '++id, name, category',
      settings: 'id',
    }).upgrade(tx => {
      return tx.table('invoices').toCollection().modify(invoice => {
        if (!invoice.payments) {
          invoice.payments = [];
        }
        if (invoice.status === 'Paid') {
          invoice.amountPaid = invoice.total;
          invoice.balanceDue = 0;
          invoice.payments = [{
            id: crypto.randomUUID(),
            date: invoice.updatedAt || new Date(),
            amount: invoice.total,
            method: 'Other',
            notes: 'Auto-generated from Paid status migration'
          }];
        } else {
          invoice.amountPaid = 0;
          invoice.balanceDue = invoice.total;
        }
      });
    });

    // Version 6: Recurring Invoices
    (this as Dexie).version(6).stores({
       invoices: '++id, invoiceNumber, status, toName, dueDate, total, template, convertedFromQuoteId, generatedFromRecurringId',
       quotes: '++id, quoteNumber, status, toName, expiryDate, total, linkedInvoiceId',
       recurringInvoices: '++id, profileName, status, nextRunDate, toName',
       clients: '++id, name',
       products: '++id, name, category',
       settings: 'id',
    });

    (this as Dexie).version(5).stores({
      invoices: '++id, invoiceNumber, status, toName, dueDate, total, template, convertedFromQuoteId',
      quotes: '++id, quoteNumber, status, toName, expiryDate, total, linkedInvoiceId',
      clients: '++id, name',
      products: '++id, name, category',
      settings: 'id',
    });
    (this as Dexie).version(4).stores({
      invoices: '++id, invoiceNumber, status, toName, dueDate, total, template',
      clients: '++id, name',
      products: '++id, name, category',
      settings: 'id',
    }).upgrade(tx => {
      return tx.table('products').toCollection().modify(product => {
        if (typeof product.cost === 'undefined') {
          product.cost = 0;
        }
      });
    });
    (this as Dexie).version(3).stores({
      invoices: '++id, invoiceNumber, status, toName, dueDate, total, template',
      clients: '++id, name',
      products: '++id, name, category',
      settings: 'id',
    });
    (this as Dexie).version(2).stores({
      invoices: '++id, invoiceNumber, status, toName, dueDate, total',
      clients: '++id, name',
      products: '++id, name',
      settings: 'id',
    });
  }
}

const db = new InvoiceDB();

// --- Invoice Functions ---
export const addInvoice = async (invoice: Omit<Invoice, 'id'>): Promise<number> => {
  const now = new Date();
  const newInvoice = {
      ...invoice,
      payments: invoice.payments || [],
      amountPaid: invoice.amountPaid || 0,
      balanceDue: invoice.balanceDue ?? invoice.total,
      createdAt: now,
      updatedAt: now,
  };
  return db.invoices.add(newInvoice as Invoice);
};
export const getAllInvoices = async (): Promise<Invoice[]> => {
    const invoices = await db.invoices.toArray();
    return invoices.map(migrateInvoiceItems);
};
export const getInvoiceById = async (id: number): Promise<Invoice | undefined> => {
    const invoice = await db.invoices.get(id);
    return invoice ? migrateInvoiceItems(invoice) : undefined;
};
export const updateInvoice = async (id: number, updates: Partial<Omit<Invoice, 'id'>>): Promise<number> => db.invoices.update(id, { ...updates, updatedAt: new Date() });
export const deleteInvoice = (id: number): Promise<void> => db.invoices.delete(id);


// --- Quote Functions ---
export const addQuote = async (quote: Omit<Quote, 'id'>): Promise<number> => {
  const now = new Date();
  return db.quotes.add({
    ...quote,
    createdAt: now,
    updatedAt: now,
  } as Quote);
};
export const getAllQuotes = (): Promise<Quote[]> => db.quotes.toArray();
export const getQuoteById = (id: number): Promise<Quote | undefined> => db.quotes.get(id);
export const updateQuote = (id: number, updates: Partial<Omit<Quote, 'id'>>): Promise<number> => db.quotes.update(id, { ...updates, updatedAt: new Date() });
export const deleteQuote = (id: number): Promise<void> => db.quotes.delete(id);

// --- Recurring Invoice Functions ---
export const addRecurringInvoice = async (invoice: Omit<RecurringInvoice, 'id'>): Promise<number> => {
  const now = new Date();
  return db.recurringInvoices.add({
    ...invoice,
    createdAt: now,
    updatedAt: now,
  } as RecurringInvoice);
};
export const getAllRecurringInvoices = (): Promise<RecurringInvoice[]> => db.recurringInvoices.toArray();
export const getRecurringInvoiceById = (id: number): Promise<RecurringInvoice | undefined> => db.recurringInvoices.get(id);
export const updateRecurringInvoice = (id: number, updates: Partial<Omit<RecurringInvoice, 'id'>>): Promise<number> => db.recurringInvoices.update(id, { ...updates, updatedAt: new Date() });
export const deleteRecurringInvoice = (id: number): Promise<void> => db.recurringInvoices.delete(id);


// --- Client Functions ---
export const addClient = (client: Client): Promise<number> => db.clients.add({ ...client, createdAt: new Date() });
export const bulkAddClients = (clients: Client[]): Promise<number> => {
    const clientsWithDates = clients.map(c => ({ ...c, createdAt: new Date() }));
    return db.clients.bulkAdd(clientsWithDates);
};
export const getAllClients = (): Promise<Client[]> => db.clients.orderBy('name').toArray();
export const updateClient = (id: number, updates: Partial<Client>): Promise<number> => db.clients.update(id, updates);
export const deleteClient = (id: number): Promise<void> => db.clients.delete(id);

// --- Product Functions ---
export const addProduct = (product: Product): Promise<number> => db.products.add({ ...product, createdAt: new Date() });
export const bulkAddProducts = (products: Product[]): Promise<number> => {
    const productsWithDates = products.map(p => ({ ...p, createdAt: new Date() }));
    return db.products.bulkAdd(productsWithDates);
};
export const getAllProducts = (): Promise<Product[]> => db.products.orderBy('name').toArray();
export const updateProduct = (id: number, updates: Partial<Product>): Promise<number> => db.products.update(id, updates);
export const deleteProduct = (id: number): Promise<void> => db.products.delete(id);

// --- Settings Functions ---
export const getSettings = async (): Promise<Settings> => {
    const settings = await db.settings.get(1);
    const defaults: Settings = { 
        id: 1, 
        fromName: '', 
        fromEmail: '', 
        fromAddress: '', 
        fromPhone: '',
        companyLogo: '',
        invoiceNumberFormat: 'INV-{YYYY}-{NNNN}',
        quoteNumberFormat: 'Q-{YYYY}-{NNNN}',
        locale: typeof navigator !== 'undefined' ? navigator.language : 'en-US',
        currency: 'USD',
        defaultTemplate: 'classic',
        templateAccentColor: '#4f46e5',
        templateShowCost: true,
        templateShowDescription: true,
        templateCustomFooter: '',
    };
    return settings ? { ...defaults, ...settings } : defaults;
};
export const updateSettings = (settings: Settings): Promise<number> => db.settings.put({ ...settings, id: 1 });


// --- Backup & Restore Functions ---
export const backupData = async (): Promise<BackupData> => {
    const invoices = await db.invoices.toArray();
    const quotes = await db.quotes.toArray();
    const recurringInvoices = await db.recurringInvoices.toArray();
    const clients = await db.clients.toArray();
    const products = await db.products.toArray();
    const settings = await db.settings.toArray();
    return { invoices, quotes, recurringInvoices, clients, products, settings };
};

export const restoreData = (data: BackupData): Promise<void> => {
    return (db as Dexie).transaction('rw', db.invoices, db.quotes, db.recurringInvoices, db.clients, db.products, db.settings, async () => {
        await db.invoices.clear();
        await db.quotes.clear();
        await db.recurringInvoices.clear();
        await db.clients.clear();
        await db.products.clear();
        await db.settings.clear();

        await db.invoices.bulkPut(data.invoices);
        if (data.quotes) await db.quotes.bulkPut(data.quotes);
        if (data.recurringInvoices) await db.recurringInvoices.bulkPut(data.recurringInvoices);
        await db.clients.bulkPut(data.clients);
        await db.products.bulkPut(data.products);
        await db.settings.bulkPut(data.settings);
    });
};


export { db };

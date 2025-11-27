
export enum InvoiceStatus {
  Draft = 'Draft',
  Sent = 'Sent',
  Paid = 'Paid',
  Partial = 'Partial',
  Overdue = 'Overdue',
}

export enum QuoteStatus {
  Draft = 'Draft',
  Sent = 'Sent',
  Accepted = 'Accepted',
  Declined = 'Declined',
}

export enum RecurringFrequency {
  Daily = 'Daily',
  Weekly = 'Weekly',
  Monthly = 'Monthly',
  Yearly = 'Yearly',
}

export enum RecurringInvoiceStatus {
  Active = 'Active',
  Paused = 'Paused',
  Ended = 'Ended',
}

export type InvoiceTemplate = 'classic' | 'modern' | 'elegant';

export interface LineItem {
  id: string; // for unique key in React
  name: string;
  description: string;
  quantity: number;
  price: number;
  cost?: number;
}

export type PaymentMethod = 'Bank Transfer' | 'Cash' | 'Credit Card' | 'PayPal' | 'Other';

export interface Payment {
  id: string;
  date: string;
  amount: number;
  method: PaymentMethod;
  notes?: string;
}

export interface Quote {
  id: number;
  quoteNumber: string;
  status: QuoteStatus;
  template: InvoiceTemplate;
  currency?: string;
  
  fromName: string;
  fromEmail: string;
  fromAddress: string;
  fromPhone: string;
  
  toName: string;
  toEmail:string;
  toAddress: string;
  toPhone: string;

  quoteDate: string; // ISO string format
  expiryDate: string; // ISO string format

  items: LineItem[];
  notes: string;
  
  subtotal: number;
  taxRate: number; // percentage
  taxAmount: number;
  total: number;

  costSubtotal: number;
  netProfit: number;

  linkedInvoiceId?: number;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface RecurringInvoice {
  id: number;
  profileName: string; // Internal name for the user
  status: RecurringInvoiceStatus;
  frequency: RecurringFrequency;
  interval: number; // e.g. every 2 weeks
  startDate: string;
  endDate?: string;
  lastRunDate?: string;
  nextRunDate: string;

  // Template Data
  template: InvoiceTemplate;
  currency?: string;
  fromName: string;
  fromEmail: string;
  fromAddress: string;
  fromPhone: string;
  toName: string;
  toEmail: string;
  toAddress: string;
  toPhone: string;
  items: LineItem[];
  notes: string;
  taxRate: number;
  
  // Computed for preview
  subtotal: number;
  taxAmount: number;
  total: number;
  costSubtotal: number;
  netProfit: number;

  createdAt: Date;
  updatedAt: Date;
}

export interface Invoice {
  id: number;
  invoiceNumber: string;
  status: InvoiceStatus;
  template: InvoiceTemplate;
  currency?: string;
  
  fromName: string;
  fromEmail: string;
  fromAddress: string;
  fromPhone: string;
  
  toName: string;
  toEmail:string;
  toAddress: string;
  toPhone: string;

  invoiceDate: string; // ISO string format
  dueDate: string; // ISO string format

  items: LineItem[];
  notes: string;
  
  subtotal: number;
  taxRate: number; // percentage
  taxAmount: number;
  total: number;

  costSubtotal: number;
  netProfit: number;
  
  // Payment Tracking
  payments: Payment[];
  amountPaid: number;
  balanceDue: number;

  convertedFromQuoteId?: number;
  generatedFromRecurringId?: number;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface Client {
  id?: number;
  name: string;
  email?: string;
  address?: string;
  phone?: string;
  createdAt?: Date;
}

export interface Product {
  id?: number;
  name: string;
  description?: string;
  price?: number;
  cost?: number;
  category?: string;
  createdAt?: Date;
}

export interface Settings {
  id: number; // Will be a singleton with id 1
  fromName: string;
  fromEmail: string;
  fromAddress: string;
  fromPhone: string;
  companyLogo?: string; // Base64 encoded image string
  invoiceNumberFormat?: string; // e.g., "INV-{YYYY}-{NNNN}"
  quoteNumberFormat?: string; // e.g., "Q-{YYYY}-{NNNN}"
  locale?: string; // e.g., 'en-US', 'de-DE'
  currency?: string; // e.g., 'USD', 'EUR'
  defaultTemplate?: InvoiceTemplate;
  templateAccentColor?: string;
  templateShowCost?: boolean;
  templateShowDescription?: boolean;
  templateCustomFooter?: string;
}

export interface BackupData {
  invoices: Invoice[];
  quotes: Quote[];
  recurringInvoices: RecurringInvoice[];
  clients: Client[];
  products: Product[];
  settings: Settings[];
}

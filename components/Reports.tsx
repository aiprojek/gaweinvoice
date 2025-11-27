import React, { useState, useMemo } from 'react';
import type { Invoice, Client, Product, Settings } from '../types';
import { InvoiceStatus } from '../types';
import { formatCurrency } from '../utils/formatting';
import { useI18n } from '../contexts/I18nContext';

interface ReportsProps {
  invoices: Invoice[];
  clients: Client[];
  products: Product[];
  settings: Settings | null;
}

type ReportType = 'profit_loss' | 'sales_by_client' | 'sales_by_product' | 'tax';

const Reports: React.FC<ReportsProps> = ({ invoices, clients, products, settings }) => {
    const { t, language } = useI18n();
    const [reportType, setReportType] = useState<ReportType>('profit_loss');
    const [dateRange, setDateRange] = useState('this_year');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    const filteredPaidInvoices = useMemo(() => {
        const paidInvoices = invoices.filter(inv => inv.status === InvoiceStatus.Paid);

        if (dateRange === 'all') return paidInvoices;

        let start: Date, end: Date;

        switch (dateRange) {
            case 'this_year':
                start = new Date(currentYear, 0, 1);
                end = new Date(currentYear, 11, 31);
                break;
            case 'last_month':
                start = new Date(currentYear, currentMonth - 1, 1);
                end = new Date(currentYear, currentMonth, 0);
                break;
            case 'last_30_days':
                end = new Date();
                start = new Date();
                start.setDate(end.getDate() - 30);
                break;
            case 'custom':
                if (!startDate || !endDate) return [];
                start = new Date(startDate);
                end = new Date(endDate);
                end.setHours(23, 59, 59, 999); // Include the whole end day
                break;
            default:
                return [];
        }

        return paidInvoices.filter(inv => {
            const invDate = new Date(inv.invoiceDate);
            return invDate >= start && invDate <= end;
        });
    }, [invoices, dateRange, startDate, endDate, currentYear, currentMonth]);
    
    const reportData = useMemo(() => {
        if (filteredPaidInvoices.length === 0) return null;

        if (reportType === 'profit_loss') {
            const totalRevenue = filteredPaidInvoices.reduce((sum, inv) => sum + inv.total, 0);
            const totalCosts = filteredPaidInvoices.reduce((sum, inv) => sum + inv.costSubtotal, 0);
            const netProfit = totalRevenue - totalCosts;
            return {
                summary: { totalRevenue, totalCosts, netProfit },
                details: filteredPaidInvoices.map(inv => ({
                    [t('invoiceNumberShort')]: inv.invoiceNumber,
                    [t('invoiceDate')]: new Date(inv.invoiceDate).toLocaleDateString(language),
                    [t('client')]: inv.toName,
                    [t('totalRevenue')]: formatCurrency(inv.total, settings),
                    [t('totalCosts')]: formatCurrency(inv.costSubtotal, settings),
                    [t('netProfit')]: formatCurrency(inv.netProfit, settings)
                }))
            };
        }
        if (reportType === 'sales_by_client') {
            const clientData: { [key: string]: { invoices: number; sales: number; profit: number } } = {};
            for (const inv of filteredPaidInvoices) {
                if (!clientData[inv.toName]) clientData[inv.toName] = { invoices: 0, sales: 0, profit: 0 };
                clientData[inv.toName].invoices++;
                clientData[inv.toName].sales += inv.subtotal;
                clientData[inv.toName].profit += inv.netProfit;
            }
            // FIX: Sort by raw numeric sales data before mapping to formatted strings to resolve type error and improve sorting accuracy.
            const sortedClientData = Object.entries(clientData).sort(([, aData], [, bData]) => bData.sales - aData.sales);
            return {
                details: sortedClientData.map(([name, data]) => ({
                    [t('client')]: name,
                    [t('invoicesCount')]: data.invoices,
                    [t('totalSales')]: formatCurrency(data.sales, settings),
                    [t('totalNetProfit')]: formatCurrency(data.profit, settings)
                }))
            };
        }
        if (reportType === 'sales_by_product') {
            const productData: { [key: string]: { quantity: number; sales: number; profit: number } } = {};
            for (const inv of filteredPaidInvoices) {
                for (const item of inv.items) {
                    if (!productData[item.name]) productData[item.name] = { quantity: 0, sales: 0, profit: 0 };
                    const itemSales = item.quantity * item.price;
                    const itemCost = item.quantity * (item.cost || 0);
                    productData[item.name].quantity += item.quantity;
                    productData[item.name].sales += itemSales;
                    productData[item.name].profit += itemSales - itemCost;
                }
            }
            // FIX: Sort by raw numeric sales data before mapping to formatted strings to resolve type error and improve sorting accuracy.
            const sortedProductData = Object.entries(productData).sort(([, aData], [, bData]) => bData.sales - aData.sales);
            return {
                details: sortedProductData.map(([name, data]) => ({
                    [t('product')]: name,
                    [t('quantitySold')]: data.quantity,
                    [t('totalSales')]: formatCurrency(data.sales, settings),
                    [t('totalNetProfit')]: formatCurrency(data.profit, settings)
                }))
            };
        }
        if (reportType === 'tax') {
            const totalTax = filteredPaidInvoices.reduce((sum, inv) => sum + inv.taxAmount, 0);
             return {
                summary: { totalTax },
                details: filteredPaidInvoices.map(inv => ({
                    [t('invoiceNumberShort')]: inv.invoiceNumber,
                    [t('invoiceDate')]: new Date(inv.invoiceDate).toLocaleDateString(language),
                    [t('client')]: inv.toName,
                    [t('subtotal')]: formatCurrency(inv.subtotal, settings),
                    [t('tax')]: `${inv.taxRate}%`,
                    [t('taxAmount')]: formatCurrency(inv.taxAmount, settings)
                }))
            };
        }
        return null;
    }, [filteredPaidInvoices, reportType, settings, t, language]);
    
    const handleExport = () => {
        if (!reportData?.details) return;
        const filename = `${reportType}_report_${new Date().toISOString().slice(0, 10)}.csv`;
        const rows = reportData.details;

        const separator = ',';
        const keys = Object.keys(rows[0]);
        const csvContent =
            keys.join(separator) + '\n' +
            rows.map(row => {
                return keys.map(k => {
                    let cell = (row as any)[k] ?? '';
                    cell = cell.toString().replace(/"/g, '""');
                    if (cell.search(/("|,|\n)/g) >= 0) {
                        cell = `"${cell}"`;
                    }
                    return cell;
                }).join(separator);
            }).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };
    
    const StatCard: React.FC<{ title: string; value: string; icon: string; color: string }> = ({ title, value, icon, color }) => (
        <div className="bg-white p-4 rounded-lg shadow-md flex items-center">
            <div className={`p-3 rounded-full mr-4 ${color}`}>
                <i className={`bi ${icon} text-xl`}></i>
            </div>
            <div>
                <p className="text-sm text-gray-500">{title}</p>
                <p className="text-xl font-bold text-gray-800">{value}</p>
            </div>
        </div>
    );
    
    return (
        <div className="bg-white shadow-lg rounded-xl p-4 sm:p-6 lg:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-800">{t('reports')}</h2>
                 <button onClick={handleExport} disabled={!reportData} className="px-4 py-2 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2">
                    <i className="bi bi-file-earmark-spreadsheet-fill"></i> {t('exportCSV')}
                </button>
            </div>

            <form className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg border">
                <div>
                    <label htmlFor="reportType" className="block text-sm font-medium text-gray-700">{t('reportType')}</label>
                    <select id="reportType" value={reportType} onChange={e => setReportType(e.target.value as ReportType)} className="mt-1 w-full p-2 border rounded-md shadow-sm bg-white">
                        <option value="profit_loss">{t('profitAndLoss')}</option>
                        <option value="sales_by_client">{t('salesByClient')}</option>
                        <option value="sales_by_product">{t('salesByProduct')}</option>
                        <option value="tax">{t('taxReport')}</option>
                    </select>
                </div>
                 <div>
                    <label htmlFor="dateRange" className="block text-sm font-medium text-gray-700">{t('dateRange')}</label>
                    <select id="dateRange" value={dateRange} onChange={e => setDateRange(e.target.value)} className="mt-1 w-full p-2 border rounded-md shadow-sm bg-white">
                        <option value="this_year">{t('thisYear')}</option>
                        <option value="last_month">{t('lastMonth')}</option>
                        <option value="last_30_days">{t('last30Days')}</option>
                        <option value="all">{t('allTime')}</option>
                        <option value="custom">{t('customRange')}</option>
                    </select>
                </div>
                 {dateRange === 'custom' && (
                    <div className="grid grid-cols-2 gap-2 md:col-span-2 lg:col-span-1">
                        <div>
                             <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">{t('startDate')}</label>
                            <input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 w-full p-2 border rounded-md shadow-sm" />
                        </div>
                        <div>
                            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">{t('endDate')}</label>
                            <input type="date" id="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 w-full p-2 border rounded-md shadow-sm" />
                        </div>
                    </div>
                )}
            </form>
            
            {!reportData ? (
                <div className="text-center py-16 px-4">
                    <i className="bi bi-bar-chart text-6xl text-gray-300"></i>
                    <p className="mt-4 text-gray-500">{t('noDataForReport')}</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {reportData.summary && (
                        <section aria-labelledby="report-summary-heading">
                            <h3 id="report-summary-heading" className="text-lg font-semibold text-gray-700 mb-2">{t('reportSummary')}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {'totalRevenue' in reportData.summary && <StatCard title={t('totalRevenue')} value={formatCurrency(reportData.summary.totalRevenue, settings)} icon="bi-cash-coin" color="bg-green-100 text-green-600" />}
                                {'totalCosts' in reportData.summary && <StatCard title={t('totalCosts')} value={formatCurrency(reportData.summary.totalCosts, settings)} icon="bi-cart-x" color="bg-red-100 text-red-600" />}
                                {'netProfit' in reportData.summary && <StatCard title={t('netProfit')} value={formatCurrency(reportData.summary.netProfit, settings)} icon="bi-graph-up-arrow" color="bg-blue-100 text-blue-600" />}
                                {'totalTax' in reportData.summary && <StatCard title={t('totalTaxCollected')} value={formatCurrency(reportData.summary.totalTax, settings)} icon="bi-percent" color="bg-yellow-100 text-yellow-600" />}
                            </div>
                        </section>
                    )}
                    <section aria-labelledby="report-details-heading">
                        <h3 id="report-details-heading" className="sr-only">Report Details</h3>
                        <div className="overflow-x-auto border rounded-lg">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>{Object.keys(reportData.details[0]).map(header => <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{header}</th>)}</tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {reportData.details.map((row, i) => (
                                        <tr key={i} className="hover:bg-gray-50">
                                            {Object.values(row).map((cell, j) => <td key={j} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{cell as any}</td>)}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
};

export default Reports;

import React, { useState, useMemo, useEffect } from 'react';
import type { Invoice, Client, Settings } from '../types';
import { InvoiceStatus } from '../types';
import { formatCurrency } from '../utils/formatting';
import { useI18n } from '../contexts/I18nContext';
import { getAllInvoices } from '../services/db';

interface DashboardProps {
  clients: Client[];
  settings: Settings | null;
}

// Chart Components
const RevenueChart: React.FC<{ data: { label: string; value: number }[], settings: Settings | null }> = ({ data, settings }) => {
    const { t } = useI18n();
    if (!data.some(d => d.value > 0)) {
        return <div className="text-center text-gray-500 py-8 flex items-center justify-center h-full">{t('notEnoughData')}</div>;
    }
    const maxValue = Math.max(...data.map(d => d.value), 1);
    const chartHeight = 250;
    
    return (
        <div className="bg-gray-50 p-4 rounded-lg overflow-x-auto h-full">
            <svg width={data.length * 60} height={chartHeight + 40} className="min-w-full">
                <g>
                    {data.map((d, i) => {
                        const barHeight = (d.value / maxValue) * chartHeight;
                        return (
                            <g key={d.label}>
                                <rect x={i * 60} y={chartHeight - barHeight} width={40} height={barHeight} fill="rgba(79, 70, 229, 0.7)" className="hover:fill-indigo-500 transition-colors">
                                  <title>{`${d.label}: ${formatCurrency(d.value, settings)}`}</title>
                                </rect>
                                <text x={i * 60 + 20} y={chartHeight + 20} textAnchor="middle" fontSize="12" fill="#6B7280">{d.label}</text>
                                <text x={i * 60 + 20} y={chartHeight - barHeight - 5} textAnchor="middle" fontSize="11" fill="#1F2937" fontWeight="500">{d.value > 0 ? formatCurrency(d.value, settings).replace(/\.\d+/, '') : ''}</text>
                            </g>
                        );
                    })}
                </g>
                 <line x1="0" y1={chartHeight} x2={data.length * 60} y2={chartHeight} stroke="#D1D5DB" />
            </svg>
        </div>
    );
};

const StatusPieChart: React.FC<{ data: { name: InvoiceStatus, count: number }[] }> = ({ data }) => {
    const { t } = useI18n();
    const total = data.reduce((acc, d) => acc + d.count, 0);
    if (total === 0) {
        return <div className="text-center text-gray-500 py-8 flex items-center justify-center h-full">{t('noInvoicesToDisplayChart')}</div>;
    }

    const colors: { [key in InvoiceStatus]: string } = {
        [InvoiceStatus.Paid]: '#10B981', [InvoiceStatus.Sent]: '#3B82F6',
        [InvoiceStatus.Overdue]: '#EF4444', [InvoiceStatus.Draft]: '#6B7280',
        [InvoiceStatus.Partial]: '#F59E0B',
    };
    
    let cumulativePercent = 0;
    const getCoordinatesForPercent = (percent: number) => {
        const x = Math.cos(2 * Math.PI * percent);
        const y = Math.sin(2 * Math.PI * percent);
        return [x, y];
    };

    return (
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 h-full">
            <svg viewBox="-1 -1 2 2" className="w-48 h-48 transform -rotate-90">
                {data.map(d => {
                    if (d.count === 0) return null;
                    const percent = d.count / total;
                    const [startX, startY] = getCoordinatesForPercent(cumulativePercent);
                    cumulativePercent += percent;
                    const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
                    const largeArcFlag = percent > 0.5 ? 1 : 0;
                    
                    const pathData = `M ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} L 0 0`;
                    
                    return <path key={d.name} d={pathData} fill={colors[d.name]}><title>{`${t(d.name.toLowerCase())}: ${d.count}`}</title></path>;
                })}
            </svg>
            <div className="space-y-2">
                {data.map(d => (
                    <div key={d.name} className="flex items-center text-sm">
                        <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: colors[d.name] }}></span>
                        <span className="text-gray-700">{t(d.name.toLowerCase())}</span>
                        <span className="ml-auto font-semibold text-gray-800">{d.count}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};


const Dashboard: React.FC<DashboardProps> = ({ clients, settings }) => {
  const { t } = useI18n();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState('this_year');
  const [selectedClient, setSelectedClient] = useState('all');

  useEffect(() => {
    const fetchInvoices = async () => {
        setIsLoading(true);
        const data = await getAllInvoices();
        setInvoices(data);
        setIsLoading(false);
    };
    fetchInvoices();
  }, []);

  const filteredInvoices = useMemo(() => {
    let result = invoices;
    
    // Filter by Date Range
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    if (dateRange === 'this_year') {
        result = result.filter(inv => new Date(inv.invoiceDate).getFullYear() === currentYear);
    } else if (dateRange === 'last_month') {
        const start = new Date(currentYear, currentMonth - 1, 1);
        const end = new Date(currentYear, currentMonth, 0);
        result = result.filter(inv => {
            const invDate = new Date(inv.invoiceDate);
            return invDate >= start && invDate <= end;
        });
    } else if (dateRange === 'last_30_days') {
        const thirtyDaysAgo = new Date(new Date().setDate(now.getDate() - 30));
        result = result.filter(inv => new Date(inv.invoiceDate) >= thirtyDaysAgo);
    }
    
    // Filter by Client
    if (selectedClient !== 'all') {
        result = result.filter(inv => inv.toName === selectedClient);
    }
    
    return result;
  }, [invoices, dateRange, selectedClient]);
  
  const stats = useMemo(() => {
    return filteredInvoices.reduce((acc, invoice) => {
      // Revenue is now calculated from amountPaid across ALL invoices, not just "Paid" status ones.
      if (invoice.amountPaid > 0) {
        acc.totalRevenue += invoice.amountPaid;
        // Approximation for net profit: proportional to amount paid vs total
        if (invoice.total > 0) {
            const profitRatio = invoice.netProfit / invoice.total;
            acc.totalNetProfit += invoice.amountPaid * profitRatio;
        }
      }
      
      // Outstanding is balanceDue
      if (invoice.balanceDue > 0 && invoice.status !== InvoiceStatus.Draft) {
          acc.totalOutstanding += invoice.balanceDue;
      }
      return acc;
    }, { totalRevenue: 0, totalOutstanding: 0, totalNetProfit: 0 });
  }, [filteredInvoices]);
  
  const statusCounts = useMemo(() => {
      const counts = { [InvoiceStatus.Draft]: 0, [InvoiceStatus.Sent]: 0, [InvoiceStatus.Paid]: 0, [InvoiceStatus.Partial]: 0, [InvoiceStatus.Overdue]: 0 };
      filteredInvoices.forEach(inv => { counts[inv.status] = (counts[inv.status] || 0) + 1; });
      return Object.entries(counts).map(([name, count]) => ({ name: name as InvoiceStatus, count }));
  }, [filteredInvoices]);

  const netProfitByClient = useMemo(() => {
    const clientsData: { [key: string]: number } = {};
    filteredInvoices
      .forEach(inv => { 
          if (inv.amountPaid > 0 && inv.total > 0) {
              // FIX: Use loop variable 'inv' instead of 'invoice'
              const profitRatio = inv.netProfit / inv.total;
              // FIX: Use loop variable 'inv' instead of 'invoice'
              const realizedProfit = inv.amountPaid * profitRatio;
              clientsData[inv.toName] = (clientsData[inv.toName] || 0) + realizedProfit; 
          }
      });
    return Object.entries(clientsData).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [filteredInvoices]);

  const monthlyNetProfit = useMemo(() => {
    const months = Array(12).fill(0).map(() => 0);
    filteredInvoices.forEach(inv => {
        if (inv.amountPaid > 0 && inv.total > 0) {
            const month = new Date(inv.invoiceDate).getMonth();
            // FIX: Use loop variable 'inv' instead of 'invoice'
            const profitRatio = inv.netProfit / inv.total;
            // FIX: Use loop variable 'inv' instead of 'invoice'
            const realizedProfit = inv.amountPaid * profitRatio;
            months[month] += realizedProfit;
        }
    });
    const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return months.map((total, i) => ({ label: monthLabels[i], value: total }));
  }, [filteredInvoices]);
  
  const StatCard = ({ title, value, icon, colorClass }: { title: string; value: string; icon: string; colorClass: string}) => (
    <div className="bg-white p-6 rounded-xl shadow-lg flex items-center gap-4">
      <div className={`p-3 rounded-full ${colorClass}`}>
        <i className={`bi ${icon} text-2xl`}></i>
      </div>
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  );

  if (isLoading) {
      return <div className="text-center p-8">{t('loadingData')}</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-3xl font-bold text-gray-800">{t('dashboard')}</h2>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <select value={dateRange} onChange={e => setDateRange(e.target.value)} className="p-2 border rounded-lg bg-white shadow-sm w-full sm:w-auto">
                <option value="this_year">{t('thisYear')}</option>
                <option value="last_month">{t('lastMonth')}</option>
                <option value="last_30_days">{t('last30Days')}</option>
                <option value="all">{t('allTime')}</option>
            </select>
            <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)} className="p-2 border rounded-lg bg-white shadow-sm w-full sm:w-auto">
                <option value="all">{t('allClients')}</option>
                {clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
        </div>
      </div>
      
      <section aria-labelledby="stats-heading" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <h2 id="stats-heading" className="sr-only">Statistics</h2>
        <StatCard title={t('totalRevenue')} value={formatCurrency(stats.totalRevenue, settings)} icon="bi-cash-coin" colorClass="bg-green-100 text-green-600" />
        <StatCard title={t('totalNetProfit')} value={formatCurrency(stats.totalNetProfit, settings)} icon="bi-graph-up-arrow" colorClass="bg-teal-100 text-teal-600" />
        <StatCard title={t('totalOutstanding')} value={formatCurrency(stats.totalOutstanding, settings)} icon="bi-clock-history" colorClass="bg-orange-100 text-orange-600" />
        <StatCard title={t('totalInvoices')} value={filteredInvoices.length.toString()} icon="bi-files" colorClass="bg-indigo-100 text-indigo-600" />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section aria-labelledby="monthly-profit-heading" className="lg:col-span-2 bg-white p-6 rounded-xl shadow-lg min-h-[400px]">
          <h3 id="monthly-profit-heading" className="text-xl font-bold text-gray-800 mb-4">{t('monthlyNetProfit')}</h3>
          <RevenueChart data={monthlyNetProfit} settings={settings} />
        </section>
        <section aria-labelledby="status-breakdown-heading" className="bg-white p-6 rounded-xl shadow-lg min-h-[400px]">
          <h3 id="status-breakdown-heading" className="text-xl font-bold text-gray-800 mb-4">{t('status')}</h3>
          <StatusPieChart data={statusCounts} />
        </section>
      </div>
      
      <section aria-labelledby="top-clients-heading" className="bg-white p-6 rounded-xl shadow-lg">
          <h3 id="top-clients-heading" className="text-xl font-bold text-gray-800 mb-4">{t('topClientsByNetProfit')}</h3>
          <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
            {netProfitByClient.length > 0 ? netProfitByClient.map(client => (
              <div key={client.name} className="flex justify-between items-center text-sm p-2 rounded-md hover:bg-gray-50">
                <p className="text-gray-700 font-medium truncate pr-4">{client.name}</p>
                <p className="text-gray-900 font-semibold flex-shrink-0">{formatCurrency(client.total, settings)}</p>
              </div>
            )) : <p className="text-gray-500 text-center pt-10">{t('noPaidInvoicesFound')}</p>}
          </div>
        </section>
    </div>
  );
};

export default Dashboard;
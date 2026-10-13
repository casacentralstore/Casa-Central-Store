import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { formatCurrency, formatDate } from '../../utils/formatters.ts';
import {
  Download,
  User,
  Layers,
  PieChart,
} from 'lucide-react';

export const ReportsDashboard: React.FC = () => {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchReports = async () => {
    setLoading(true);
    try {
      const data = await api.getSalesReport(startDate, endDate);
      setReport(data);
    } catch (err) {
      console.error('Failed to load sales report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [startDate, endDate]);

  const handleExportCsv = () => {
    if (!report || !report.sales_by_day) return;
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Date,Orders Count,Subtotal,Sales Tax,Total Invoiced,Collected,Balance\n';
    for (const r of report.sales_by_day) {
      csvContent += `${r.date},${r.orders_count},${r.subtotal},${r.tax},${r.total},${r.collected},${r.balance}\n`;
    }
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Casa_Central_Sales_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 text-slate-800 p-3 sm:p-5 lg:p-6 overflow-y-auto space-y-4 sm:space-y-6">
      {/* Top Header */}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900">
            Analytics & Operational Reports
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Aggregated sales velocity, rep performance, lead attribution, and asset condition insights
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
            <span className="text-slate-400 font-semibold">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="border-none outline-hidden bg-transparent"
            />
            <span className="text-slate-400 font-semibold">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="border-none outline-hidden bg-transparent"
            />
          </div>
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 bg-slate-900 text-amber-400 hover:bg-slate-800 text-xs font-bold rounded-lg shadow-2xs flex items-center transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 mr-1.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Grid: Sales by Day */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
          Daily Sales Performance Ledger
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px]">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3 text-center">Orders</th>
                <th className="py-2.5 px-3 text-right">Subtotal ($)</th>
                <th className="py-2.5 px-3 text-right">Tax ($)</th>
                <th className="py-2.5 px-3 text-right">Total Invoiced ($)</th>
                <th className="py-2.5 px-3 text-right">Collected ($)</th>
                <th className="py-2.5 px-3 text-right">Balance Due ($)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">Loading daily sales...</td>
                </tr>
              ) : !report?.sales_by_day || report.sales_by_day.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">No sales transactions in this range.</td>
                </tr>
              ) : (
                report.sales_by_day.map((day: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{formatDate(day.date)}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-600">{day.orders_count}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">{formatCurrency(day.subtotal)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">{formatCurrency(day.tax)}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 text-sm">
                      {formatCurrency(day.total)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-700">
                      {formatCurrency(day.collected)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-700">
                      {formatCurrency(day.balance)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row 2: Sales Reps & Lead Source Attribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Sales Reps */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center">
            <User className="w-3.5 h-3.5 mr-1 text-amber-500" />
            Performance by Sales Representative
          </h2>
          <div className="space-y-2 text-xs">
            {report?.sales_by_rep?.map((rep: any, idx: number) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-lg flex justify-between items-center border border-slate-200">
                <div>
                  <p className="font-bold text-slate-800">{rep.rep_name}</p>
                  <p className="text-[11px] text-slate-500">{rep.orders_count} orders closed</p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-bold text-slate-900 text-sm">{formatCurrency(rep.total_sales)}</p>
                  <p className="text-[10px] text-emerald-700 font-mono">Paid: {formatCurrency(rep.collected)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lead Sources */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center">
            <PieChart className="w-3.5 h-3.5 mr-1 text-amber-500" />
            Sales by Lead Source Channel
          </h2>
          <div className="space-y-2 text-xs">
            {report?.sales_by_source?.map((src: any, idx: number) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-lg flex justify-between items-center border border-slate-200">
                <div>
                  <p className="font-bold text-slate-800">{src.lead_source}</p>
                  <p className="text-[11px] text-slate-500">{src.count} orders</p>
                </div>
                <div className="text-right font-mono font-bold text-slate-900 text-sm">
                  {formatCurrency(src.total)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Asset Sales by Condition */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center">
          <Layers className="w-3.5 h-3.5 mr-1 text-amber-500" />
          Sales by Asset Recovery Condition (A, B, C, Refurbished)
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {report?.sales_by_condition?.map((cond: any, idx: number) => (
            <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Condition</span>
              <p className="text-sm font-black text-slate-900">{cond.condition}</p>
              <div className="mt-2 flex justify-between text-[11px] text-slate-600">
                <span>{cond.item_count} items sold</span>
                <span className="font-mono font-bold">{formatCurrency(cond.total_sales)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

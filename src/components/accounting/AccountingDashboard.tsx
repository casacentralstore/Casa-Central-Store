import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { formatCurrency } from '../../utils/formatters.ts';

export const AccountingDashboard: React.FC = () => {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const data = await api.getSalesReport();
        setReport(data);
      } catch (err) {
        console.error('Failed to load accounting data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, []);

  return (
    <div className="flex flex-col h-full bg-slate-100 text-slate-800 p-3 sm:p-5 lg:p-6 overflow-y-auto space-y-4 sm:space-y-6">
      {/* Header */}

      <div>
        <h1 className="text-xl font-black tracking-tight text-slate-900">
          Accounting & Financial Ledger
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Payment reconciliation, tax liability ledger, and payment method summaries
        </p>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Total Sales Tax Collected
          </span>
          <p className="text-2xl font-black text-slate-900 font-mono">
            {loading ? '...' : formatCurrency(report?.tax_summary?.total_tax)}
          </p>
          <p className="text-[11px] text-slate-500">
            Taxable Orders: <strong>{report?.tax_summary?.taxable_orders || 0}</strong> | Exempt: <strong>{report?.tax_summary?.exempt_orders || 0}</strong>
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Credit Card Surcharges (3%)
          </span>
          <p className="text-2xl font-black text-slate-900 font-mono">
            {loading ? '...' : formatCurrency(
              (report?.sales_by_payment_method?.find((m: any) => m.payment_method === 'Credit Card')?.total || 0) * 0.03
            )}
          </p>
          <p className="text-[11px] text-slate-500">
            Automated processing fee offset
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Total Payments Collected
          </span>
          <p className="text-2xl font-black text-emerald-700 font-mono">
            {loading ? '...' : formatCurrency(
              report?.sales_by_payment_method?.reduce((acc: number, cur: any) => acc + (cur.total || 0), 0)
            )}
          </p>
          <p className="text-[11px] text-slate-500">
            Across all payment channels
          </p>
        </div>
      </div>

      {/* Payment Methods Breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
          Collections by Payment Method
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px]">
                <th className="py-2.5 px-3">Method</th>
                <th className="py-2.5 px-3 text-center">Transactions</th>
                <th className="py-2.5 px-3 text-right">Total Collected ($)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report?.sales_by_payment_method?.map((m: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-semibold text-slate-800">{m.payment_method}</td>
                  <td className="py-2.5 px-3 text-center font-bold text-slate-600">{m.count}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 text-sm">
                    {formatCurrency(m.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

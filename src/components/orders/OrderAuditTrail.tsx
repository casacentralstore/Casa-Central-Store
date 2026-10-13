import React, { useState } from 'react';
import { AuditLog } from '../../types/index.ts';
import { formatDateTime } from '../../utils/formatters.ts';
import {
  Clock,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Code,
  Table,
  User,
  Maximize2,
  Minimize2,
} from 'lucide-react';

interface OrderAuditTrailProps {
  logs: AuditLog[];
}

export const OrderAuditTrail: React.FC<OrderAuditTrailProps> = ({ logs }) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (logs.length > 0 && logs[0].id) {
      initial.add(logs[0].id);
    }
    return initial;
  });

  const [activeTabs, setActiveTabs] = useState<Record<string, 'table' | 'json'>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!logs || logs.length === 0) {
    return null;
  }

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    const all = new Set<string>();
    logs.forEach((log) => {
      if (log.id) all.add(log.id);
    });
    setExpandedIds(all);
  };

  const handleCollapseAll = () => {
    setExpandedIds(new Set());
  };

  const setLogTab = (id: string, tab: 'table' | 'json') => {
    setActiveTabs((prev) => ({ ...prev, [id]: tab }));
  };

  const handleCopyJson = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'ORDER_CREATED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'ORDER_UPDATED':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'ORDER_FULFILLED':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'ORDER_CANCELLED':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'PAYMENT_RECORDED':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'STATUS_CHANGED':
        return 'bg-teal-100 text-teal-800 border-teal-300';
      case 'INVOICE_NUMBER_UPDATED':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      default:
        return 'bg-slate-200 text-slate-800 border-slate-300';
    }
  };

  const parseJsonSafe = (val: string | null | undefined): Record<string, any> | null => {
    if (!val) return null;
    try {
      return JSON.parse(val);
    } catch {
      return null;
    }
  };

  const formatKeyName = (key: string): string => {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const renderValueFormatted = (val: any): React.ReactNode => {
    if (val === null || val === undefined) {
      return <span className="text-slate-400 italic">None</span>;
    }
    if (typeof val === 'boolean') {
      return (
        <span
          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
            val ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {val ? 'Yes' : 'No'}
        </span>
      );
    }
    if (typeof val === 'number') {
      return <span className="font-mono text-slate-800 font-medium">{val}</span>;
    }
    if (Array.isArray(val)) {
      if (val.length === 0) {
        return <span className="text-slate-400 italic">Empty list (0)</span>;
      }
      return (
        <div className="space-y-1 mt-1">
          <span className="text-[10px] font-semibold text-slate-500">{val.length} item(s):</span>
          <div className="bg-slate-100/80 rounded-md p-1.5 border border-slate-200 divide-y divide-slate-200">
            {val.map((item, idx) => (
              <div key={idx} className="py-1 text-[11px]">
                {typeof item === 'object' && item !== null ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[10px]">
                    {Object.entries(item).map(([k, v]) => (
                      <div key={k} className="truncate">
                        <span className="text-slate-500 font-medium">{formatKeyName(k)}: </span>
                        <span className="font-semibold text-slate-800">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span>{String(item)}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }
    if (typeof val === 'object') {
      return (
        <pre className="text-[10px] bg-slate-100 p-1.5 rounded border border-slate-200 font-mono text-slate-700 whitespace-pre-wrap">
          {JSON.stringify(val, null, 2)}
        </pre>
      );
    }
    return <span className="text-slate-800">{String(val)}</span>;
  };

  const isAllExpanded = logs.length > 0 && expandedIds.size === logs.length;

  return (
    <div className="border-t border-slate-200 pt-4 space-y-2.5">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center">
          <Clock className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
          Order Audit Trail & Change History
          <span className="ml-2 px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded-full text-[10px] font-bold">
            {logs.length}
          </span>
        </h4>
        <div className="flex items-center space-x-2">
          {isAllExpanded ? (
            <button
              type="button"
              onClick={handleCollapseAll}
              className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 flex items-center space-x-1 cursor-pointer transition-colors px-2 py-0.5 rounded hover:bg-slate-100"
            >
              <Minimize2 className="w-3 h-3 mr-1" />
              Collapse All
            </button>
          ) : (
            <button
              type="button"
              onClick={handleExpandAll}
              className="text-[11px] font-semibold text-amber-700 hover:text-amber-900 flex items-center space-x-1 cursor-pointer transition-colors px-2 py-0.5 rounded hover:bg-amber-50"
            >
              <Maximize2 className="w-3 h-3 mr-1" />
              Expand All
            </button>
          )}
        </div>
      </div>

      <div className="bg-slate-50/70 rounded-xl border border-slate-200 divide-y divide-slate-200 overflow-hidden text-xs shadow-2xs">
        {logs.map((log, idx) => {
          const logKey = log.id || `log-${idx}`;
          const isExpanded = expandedIds.has(logKey);
          const activeTab = activeTabs[logKey] || 'table';
          const newObj = parseJsonSafe(log.new_values);
          const oldObj = parseJsonSafe(log.old_values);

          let changedKeys: string[] = [];
          if (newObj && oldObj) {
            const allKeys = Array.from(new Set([...Object.keys(newObj), ...Object.keys(oldObj)]));
            changedKeys = allKeys.filter(
              (key) => JSON.stringify(newObj[key]) !== JSON.stringify(oldObj[key])
            );
          } else if (newObj) {
            changedKeys = Object.keys(newObj);
          }

          const hasDetails = Boolean(log.new_values || log.old_values);

          return (
            <div key={logKey} className="transition-colors">
              <button
                type="button"
                onClick={() => toggleExpand(logKey)}
                className={`w-full py-2.5 px-3 flex items-center justify-between text-left transition-colors cursor-pointer select-none ${
                  isExpanded ? 'bg-slate-100/80' : 'hover:bg-slate-100/50'
                }`}
                title={isExpanded ? 'Click to collapse entry' : 'Click to expand full changes'}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <span className="text-slate-400 group-hover:text-slate-600 shrink-0">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-amber-600 transition-transform duration-150" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400 transition-transform duration-150" />
                    )}
                  </span>
                  <span
                    className={`font-mono font-bold text-[10px] px-2 py-0.5 rounded-md border tracking-tight shrink-0 ${getActionBadge(
                      log.action
                    )}`}
                  >
                    {log.action}
                  </span>
                  <span className="text-slate-500 text-[11px] font-medium shrink-0">
                    {formatDateTime(log.timestamp)}
                  </span>
                  {(log.user_name || log.user_id) && (
                    <span className="text-slate-400 text-[10px] hidden sm:inline-flex items-center truncate">
                      <User className="w-3 h-3 mr-1 inline shrink-0" />
                      {log.user_name || log.user_id}
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2 shrink-0 ml-3">
                  {!isExpanded ? (
                    <div className="flex items-center space-x-1.5 text-[11px] text-slate-500">
                      {changedKeys.length > 0 && (
                        <span className="text-slate-500 font-mono text-[10px] hidden md:inline truncate max-w-[280px]">
                          {changedKeys.length} field{changedKeys.length === 1 ? '' : 's'} (
                          {changedKeys.slice(0, 3).join(', ')}
                          {changedKeys.length > 3 ? '...' : ''})
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white border border-slate-200 text-amber-700 shadow-2xs hover:bg-amber-50">
                        View details
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-400">
                      Collapse
                    </span>
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="px-3 pb-3 pt-1 border-t border-slate-200 bg-white space-y-2 animate-in fade-in duration-100">
                  <div className="flex items-center justify-between pt-1 border-b border-slate-100 pb-2">
                    <div className="flex items-center space-x-2">
                      <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-[10px]">
                        <button
                          type="button"
                          onClick={() => setLogTab(logKey, 'table')}
                          className={`px-2 py-1 rounded font-bold flex items-center space-x-1 cursor-pointer transition-colors ${
                            activeTab === 'table'
                              ? 'bg-white text-slate-900 shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Table className="w-3 h-3" />
                          <span>Detailed Changes ({changedKeys.length})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setLogTab(logKey, 'json')}
                          className={`px-2 py-1 rounded font-bold flex items-center space-x-1 cursor-pointer transition-colors ${
                            activeTab === 'json'
                              ? 'bg-white text-slate-900 shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Code className="w-3 h-3" />
                          <span>Raw JSON Payload</span>
                        </button>
                      </div>
                    </div>

                    {hasDetails && (
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyJson(
                            logKey,
                            JSON.stringify(
                              {
                                action: log.action,
                                timestamp: log.timestamp,
                                user: log.user_name || log.user_id,
                                old_values: oldObj || log.old_values,
                                new_values: newObj || log.new_values,
                              },
                              null,
                              2
                            )
                          )
                        }
                        className="text-[11px] font-medium text-slate-600 hover:text-slate-900 flex items-center space-x-1 px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
                        title="Copy full JSON payload to clipboard"
                      >
                        {copiedId === logKey ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-600 font-bold">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy JSON</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {activeTab === 'table' && (
                    <div className="space-y-2">
                      {newObj && oldObj ? (
                        <div className="border border-slate-200 rounded-lg overflow-x-auto">
                          <table className="w-full text-left border-collapse text-[11px]">
                            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                              <tr>
                                <th className="py-2 px-3 w-1/4">Field Modified</th>
                                <th className="py-2 px-3 w-3/8 text-slate-600">Previous Value</th>
                                <th className="py-2 px-3 w-3/8 text-emerald-800">New Value</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {changedKeys.map((key) => {
                                const oldVal = oldObj[key];
                                const newVal = newObj[key];
                                return (
                                  <tr key={key} className="hover:bg-slate-50/70">
                                    <td className="py-2 px-3 font-semibold text-slate-800 align-top">
                                      <div className="flex items-center space-x-1">
                                        <span className="font-mono text-[10px] text-slate-600 bg-slate-100 px-1 py-0.5 rounded">
                                          {key}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="py-2 px-3 bg-rose-50/30 text-rose-900 align-top border-r border-slate-100">
                                      {renderValueFormatted(oldVal)}
                                    </td>
                                    <td className="py-2 px-3 bg-emerald-50/30 text-emerald-950 align-top">
                                      {renderValueFormatted(newVal)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : newObj ? (
                        <div className="border border-slate-200 rounded-lg overflow-x-auto">
                          <table className="w-full text-left border-collapse text-[11px]">
                            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                              <tr>
                                <th className="py-2 px-3 w-1/3">Property / Parameter</th>
                                <th className="py-2 px-3 w-2/3">Initial Value Recorded</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {Object.entries(newObj).map(([key, val]) => (
                                <tr key={key} className="hover:bg-slate-50/70">
                                  <td className="py-2 px-3 font-semibold text-slate-800 align-top">
                                    <span className="font-mono text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                      {key}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 align-top">
                                    {renderValueFormatted(val)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="bg-slate-100 p-2.5 rounded-lg border border-slate-200 font-mono text-[11px] text-slate-700 whitespace-pre-wrap">
                          {log.new_values || log.old_values || 'No details recorded for this action.'}
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'json' && (
                    <div className="space-y-2">
                      {oldObj && (
                        <div>
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Previous Values (old_values):
                          </div>
                          <pre className="p-2.5 bg-slate-900 text-emerald-400 rounded-lg overflow-x-auto text-[10px] font-mono leading-relaxed border border-slate-800 max-h-60">
                            {JSON.stringify(oldObj, null, 2)}
                          </pre>
                        </div>
                      )}
                      {newObj ? (
                        <div>
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            {oldObj ? 'New Values (new_values):' : 'Full Recorded Payload (new_values):'}
                          </div>
                          <pre className="p-2.5 bg-slate-900 text-emerald-400 rounded-lg overflow-x-auto text-[10px] font-mono leading-relaxed border border-slate-800 max-h-60">
                            {JSON.stringify(newObj, null, 2)}
                          </pre>
                        </div>
                      ) : (
                        <pre className="p-2.5 bg-slate-900 text-emerald-400 rounded-lg overflow-x-auto text-[10px] font-mono leading-relaxed border border-slate-800">
                          {log.new_values || 'null'}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

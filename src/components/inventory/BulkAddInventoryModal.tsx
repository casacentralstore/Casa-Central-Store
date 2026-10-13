import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  Trash2,
  RefreshCw,
  Search,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  BULK_TEMPLATE_TAGS,
  BULK_TEMPLATE_CONDITIONS,
  BULK_TEMPLATE_LOCATIONS,
  InventoryItem,
} from '../../types/index.ts';
import {
  BulkInventoryRow,
  downloadInventoryTemplate,
  parseInventoryFile,
  validateBulkRow,
} from '../../utils/inventoryTemplate.ts';
import { api } from '../../services/api.ts';

interface BulkAddInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (importedCount: number) => void;
}

export const BulkAddInventoryModal: React.FC<BulkAddInventoryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<BulkInventoryRow[]>([]);
  const [filterMode, setFilterMode] = useState<'all' | 'valid' | 'errors'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [importSummary, setImportSummary] = useState<{
    success: boolean;
    importedCount: number;
    errors: { row: number; sku?: string; error: string }[];
  } | null>(null);
  const [activeInfoTab, setActiveInfoTab] = useState<'template' | 'dropdowns'>('template');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDownloadTemplate = async () => {
    try {
      setIsDownloading(true);
      await downloadInventoryTemplate();
    } catch (err: any) {
      alert('Failed to generate template: ' + (err.message || 'Unknown error'));
    } finally {
      setIsDownloading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsParsing(true);
      setFileName(file.name);
      setImportSummary(null);
      const parsedRows = await parseInventoryFile(file);
      setRows(parsedRows);
    } catch (err: any) {
      alert('Error reading Excel file: ' + (err.message || 'Check file format'));
      setFileName(null);
      setRows([]);
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleLoadDemoData = () => {
    setFileName('sample_inventory_assets.xlsx');
    setImportSummary(null);
    const demoItems: Omit<BulkInventoryRow, 'isValid' | 'errors' | 'warnings'>[] = [
      {
        id: 'demo-1',
        sku: 'RF28R7351SG',
        serial_number: 'SN-' + Math.floor(100000 + Math.random() * 900000),
        description: 'Samsung 28 cu. ft. 3-Door French Door Refrigerator - Stainless Steel',
        brand: 'Samsung',
        item_tag: 'Blue',
        condition: 'Brand New - Sealed Box',
        location: 'MS Appliances | Showroom',
        quantity: 1,
        unit_cost: 1250,
        selling_price: 1899,
      },
      {
        id: 'demo-2',
        sku: 'WM4000HBA',
        serial_number: 'SN-' + Math.floor(100000 + Math.random() * 900000),
        description: 'LG 4.5 Cu. Ft. Smart Front Load Washer - Black Steel',
        brand: 'LG',
        item_tag: 'None',
        condition: 'Brand New - Open Box',
        location: 'MS Appliances | ITC, Bohemia, NY',
        quantity: 1,
        unit_cost: 620,
        selling_price: 899,
      },
      {
        id: 'demo-3',
        sku: 'DVE45T6000V',
        serial_number: 'SN-' + Math.floor(100000 + Math.random() * 900000),
        description: 'Samsung 7.5 cu. ft. Electric Dryer - Sensor Dry',
        brand: 'Samsung',
        item_tag: 'Red',
        condition: 'Refurbished - Original Box',
        location: 'Golden Opportunity Inc. | Warehouse, Paterson, NJ',
        quantity: 1,
        unit_cost: 410,
        selling_price: 649,
      },
      {
        id: 'demo-4',
        sku: 'GFW850SPNRS',
        serial_number: 'SN-' + Math.floor(100000 + Math.random() * 900000),
        description: 'GE Profile 5.0 Cu. Ft. Smart Front Load Steam Washer - Sapphire Blue',
        brand: 'GE Profile',
        item_tag: 'Green',
        condition: 'Brand New - Sealed Box',
        location: 'MS Appliances | Intercounty, Medford, NY',
        quantity: 1,
        unit_cost: 740,
        selling_price: 1099,
      },
      {
        id: 'demo-5',
        sku: 'KDFE104HPS',
        serial_number: 'SN-' + Math.floor(100000 + Math.random() * 900000),
        description: 'KitchenAid 24 in. PrintShield Stainless Steel Dishwasher - 46 dBA',
        brand: 'KitchenAid',
        item_tag: 'None',
        condition: 'Refurbished - Open Box',
        location: 'HomeSquare',
        quantity: 2,
        unit_cost: 480,
        selling_price: 799,
      },
      {
        id: 'demo-6',
        sku: 'WE402NE/A3',
        serial_number: '',
        description: 'Samsung 27 in. Laundry Pedestal with Storage Drawer - Onyx',
        brand: 'Samsung',
        item_tag: 'None',
        condition: 'Brand New - No Box',
        location: 'Golden Opportunity Inc. | Showroom',
        quantity: 3,
        unit_cost: 110,
        selling_price: 249,
      },
    ];

    const validated = demoItems.map((item) => {
      const v = validateBulkRow(item, demoItems);
      return { ...item, ...v };
    });
    setRows(validated);
  };

  const handleUpdateRow = (id: string, field: keyof BulkInventoryRow, value: any) => {
    setRows((prev) => {
      const updated = prev.map((r) => {
        if (r.id !== id) return r;
        const modified = { ...r, [field]: value };
        return modified;
      });
      // Revalidate all rows (for serial number cross-checking)
      return updated.map((r) => {
        const v = validateBulkRow(r, updated);
        return { ...r, ...v };
      });
    });
  };

  const handleDeleteRow = (id: string) => {
    setRows((prev) => {
      const filtered = prev.filter((r) => r.id !== id);
      return filtered.map((r) => {
        const v = validateBulkRow(r, filtered);
        return { ...r, ...v };
      });
    });
  };

  const handleAddManualRow = () => {
    const newRowItem: Omit<BulkInventoryRow, 'isValid' | 'errors' | 'warnings'> = {
      id: `manual-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      sku: '',
      serial_number: '',
      description: '',
      brand: '',
      item_tag: 'None',
      condition: 'Brand New - Sealed Box',
      location: 'MS Appliances | Showroom',
      quantity: 1,
      unit_cost: 0,
      selling_price: 0,
    };

    setRows((prev) => {
      const updated = [newRowItem, ...prev];
      return updated.map((r) => {
        const v = validateBulkRow(r, updated);
        return { ...r, ...v };
      });
    });
  };

  const handleClearAll = () => {
    if (rows.length > 0 && !window.confirm('Clear all loaded rows?')) return;
    setRows([]);
    setFileName(null);
    setImportSummary(null);
  };

  const handleConfirmImport = async () => {
    const validRows = rows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      alert('There are no valid rows to import. Please review and fix required fields (SKU and Description).');
      return;
    }

    const invalidCount = rows.length - validRows.length;
    if (invalidCount > 0) {
      const proceed = window.confirm(
        `${invalidCount} row(s) have errors and will be skipped. Do you want to proceed and import the ${validRows.length} valid row(s)?`
      );
      if (!proceed) return;
    }

    try {
      setIsImporting(true);
      const payload = validRows.map((r) => ({
        sku: r.sku.trim(),
        model_number: r.sku.trim(),
        serial_number: r.serial_number.trim(),
        description: r.description.trim(),
        brand: r.brand.trim(),
        item_tag: r.item_tag || 'None',
        condition: r.condition,
        location: r.location,
        quantity: Math.max(1, Number(r.quantity) || 1),
        unit_cost: Math.max(0, Number(r.unit_cost) || 0),
        selling_price: Math.max(0, Number(r.selling_price) || 0),
        status: 'Available',
        source: 'Bulk Template Import',
      }));

      const res = await api.bulkCreateInventory(payload);
      setImportSummary({
        success: true,
        importedCount: res.importedCount,
        errors: res.errors || [],
      });

      if (res.importedCount > 0) {
        onSuccess(res.importedCount);
      }
    } catch (err: any) {
      alert('Failed to import inventory: ' + (err.message || 'Server error'));
    } finally {
      setIsImporting(false);
    }
  };

  const filteredRows = rows.filter((row) => {
    if (filterMode === 'valid' && !row.isValid) return false;
    if (filterMode === 'errors' && row.isValid) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        row.sku.toLowerCase().includes(q) ||
        row.description.toLowerCase().includes(q) ||
        row.serial_number.toLowerCase().includes(q) ||
        row.brand.toLowerCase().includes(q) ||
        row.location.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const validCount = rows.filter((r) => r.isValid).length;
  const errorCount = rows.filter((r) => !r.isValid).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-hidden">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-7xl h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-bold shadow-sm">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Bulk Add Inventory Assets
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-md">
                  XLSX Template Ready
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Download the standardized XLSX product template, fill in items using native dropdowns, and import assets in one click.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 bg-slate-50 flex flex-col space-y-4">
          
          {/* Step 1 & Step 2 Control Strip */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* Download Template Banner (Left side - 5 cols) */}
            <div className="lg:col-span-5 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center">
                      1
                    </span>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Download Product Template
                    </h3>
                  </div>
                  <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    Native Excel Dropdowns
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mb-3">
                  Download the official <strong className="text-slate-800">.XLSX</strong> product template. It contains the exact required headers and pre-configured dropdowns for <strong className="text-slate-800">Tag</strong>, <strong className="text-slate-800">Condition</strong>, and <strong className="text-slate-800">Location</strong>.
                </p>

                {/* Dropdowns Spec Quick Tabs */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 mb-3 text-[11px]">
                  <div className="flex items-center space-x-3 text-slate-500 font-medium mb-1.5 border-b border-slate-200 pb-1">
                    <button
                      type="button"
                      onClick={() => setActiveInfoTab('template')}
                      className={`cursor-pointer ${activeInfoTab === 'template' ? 'text-amber-600 font-bold' : 'hover:text-slate-700'}`}
                    >
                      Template Headers (10)
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => setActiveInfoTab('dropdowns')}
                      className={`cursor-pointer ${activeInfoTab === 'dropdowns' ? 'text-amber-600 font-bold' : 'hover:text-slate-700'}`}
                    >
                      Dropdown Values
                    </button>
                  </div>
                  {activeInfoTab === 'template' ? (
                    <div className="flex flex-wrap gap-1">
                      {[
                        'SKU/Model Number',
                        'Serial Number',
                        'Description',
                        'Brand',
                        'Tag',
                        'Condition',
                        'Location',
                        'Qty',
                        'Cost',
                        'Selling Price',
                      ].map((header) => (
                        <span
                          key={header}
                          className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-medium text-slate-700"
                        >
                          {header}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-1.5 text-[10px]">
                      <div>
                        <strong className="text-slate-700">Tag:</strong>{' '}
                        <span className="text-slate-600">None, Blue, Red, Green</span>
                      </div>
                      <div>
                        <strong className="text-slate-700">Condition:</strong>{' '}
                        <span className="text-slate-600">
                          Brand New (Sealed, Open, Damage, No Box), Refurbished (Original, White, Open, Damage, No Box)
                        </span>
                      </div>
                      <div>
                        <strong className="text-slate-700">Location:</strong>{' '}
                        <span className="text-slate-600">
                          MS Appliances (Showroom, ITC, Intercounty) | Golden Opportunity (Showroom, Warehouse) | HomeSquare
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  disabled={isDownloading}
                  className="flex-1 py-2 px-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center justify-center space-x-2 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <Download className={`w-4 h-4 ${isDownloading ? 'animate-bounce' : ''}`} />
                  <span>{isDownloading ? 'Generating Template...' : 'Download Product Template (.xlsx)'}</span>
                </button>
              </div>
            </div>

            {/* Upload File Zone (Right side - 7 cols) */}
            <div className="lg:col-span-7 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center">
                      2
                    </span>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Upload Completed File
                    </h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleLoadDemoData}
                      className="text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-md font-semibold flex items-center space-x-1 cursor-pointer transition-colors"
                      title="Load sample inventory records to test immediately"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>Load Sample Data</span>
                    </button>
                  </div>
                </div>

                {/* Upload drag/drop box */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="bulk-inventory-file-input"
                />
                <label
                  htmlFor="bulk-inventory-file-input"
                  className="border-2 border-dashed border-slate-300 hover:border-amber-500 hover:bg-amber-50/40 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all group"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-amber-100 flex items-center justify-center text-slate-500 group-hover:text-amber-700 mb-2 transition-colors">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-800">
                    Click to browse or drag & drop your completed file
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Supports Microsoft Excel (<strong className="text-slate-700">.xlsx</strong>, <strong className="text-slate-700">.xls</strong>) and <strong className="text-slate-700">.csv</strong>
                  </p>
                </label>
              </div>

              {fileName && (
                <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center justify-between text-xs text-emerald-800">
                  <div className="flex items-center space-x-2 truncate">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-semibold truncate">{fileName}</span>
                    <span className="text-emerald-600">({rows.length} rows loaded)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-xs text-rose-600 hover:text-rose-800 font-bold ml-3 cursor-pointer shrink-0"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Import Summary Banner (if finished) */}
          {importSummary && (
            <div className={`p-4 rounded-xl border flex items-start justify-between ${
              importSummary.importedCount > 0
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}>
              <div className="flex items-start space-x-3">
                {importSummary.importedCount > 0 ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
                )}
                <div>
                  <h4 className="text-sm font-bold">
                    {importSummary.importedCount > 0
                      ? `Successfully imported ${importSummary.importedCount} inventory assets!`
                      : 'No items imported'}
                  </h4>
                  <p className="text-xs mt-0.5">
                    The imported assets are now available in your active inventory catalog and ready for POS sales orders.
                  </p>
                  {importSummary.errors.length > 0 && (
                    <div className="mt-2 text-xs text-rose-700 space-y-1">
                      <p className="font-semibold">Some rows encountered errors:</p>
                      <ul className="list-disc list-inside">
                        {importSummary.errors.map((err, i) => (
                          <li key={i}>
                            Row {err.row} ({err.sku}): {err.error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 cursor-pointer"
              >
                Close & View Inventory
              </button>
            </div>
          )}

          {/* Preview & Edit Table Section */}
          <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col overflow-hidden min-h-[350px]">
            
            {/* Toolbar above preview */}
            <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
              <div className="flex items-center space-x-3">
                <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center">
                  3
                </span>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Preview & Verify Assets ({rows.length})
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Review and edit rows inline before saving to inventory.
                  </p>
                </div>
              </div>

              {/* Counters & Filter Tabs */}
              <div className="flex items-center space-x-2 text-xs">
                <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setFilterMode('all')}
                    className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-colors ${
                      filterMode === 'all'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All ({rows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('valid')}
                    className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-colors ${
                      filterMode === 'valid'
                        ? 'bg-emerald-600 text-white'
                        : 'text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    Valid ({validCount})
                  </button>
                  {errorCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setFilterMode('errors')}
                      className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-colors ${
                        filterMode === 'errors'
                          ? 'bg-rose-600 text-white'
                          : 'text-rose-700 hover:bg-rose-50'
                      }`}
                    >
                      Errors ({errorCount})
                    </button>
                  )}
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search rows..."
                    className="pl-8 pr-2.5 py-1 text-xs border border-slate-300 rounded-lg w-36 sm:w-44 focus:ring-2 focus:ring-amber-500 outline-hidden"
                  />
                </div>

                {/* Add Row Button */}
                <button
                  type="button"
                  onClick={handleAddManualRow}
                  className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg font-bold flex items-center space-x-1 cursor-pointer transition-colors"
                  title="Add a new blank asset row"
                >
                  <Plus className="w-3.5 h-3.5 text-slate-600" />
                  <span>Add Row</span>
                </button>
              </div>
            </div>

            {/* Grid Table */}
            <div className="flex-1 overflow-auto">
              {rows.length === 0 ? (
                <div className="h-full min-h-[220px] flex flex-col items-center justify-center p-8 text-center text-slate-400">
                  <FileSpreadsheet className="w-12 h-12 text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No Inventory Rows Loaded Yet</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-md">
                    Download the template above, fill in your asset information, and upload it, or click{' '}
                    <button
                      type="button"
                      onClick={handleLoadDemoData}
                      className="text-amber-600 font-bold underline hover:text-amber-700"
                    >
                      Load Sample Data
                    </button>{' '}
                    to test.
                  </p>
                </div>
              ) : filteredRows.length === 0 ? (
                <div className="h-full min-h-[200px] flex flex-col items-center justify-center p-8 text-center text-slate-400">
                  <Info className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-xs font-semibold text-slate-600">No rows matching your filter or search.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-200 select-none">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-3 w-16 text-center">Status</th>
                      <th className="py-2.5 px-3 min-w-[150px]">
                        SKU/Model Number <span className="text-rose-500">*</span>
                      </th>
                      <th className="py-2.5 px-3 min-w-[130px]">Serial Number</th>
                      <th className="py-2.5 px-3 min-w-[220px]">
                        Description <span className="text-rose-500">*</span>
                      </th>
                      <th className="py-2.5 px-3 min-w-[120px]">Brand</th>
                      <th className="py-2.5 px-3 min-w-[110px]">Tag</th>
                      <th className="py-2.5 px-3 min-w-[190px]">Condition</th>
                      <th className="py-2.5 px-3 min-w-[210px]">Location</th>
                      <th className="py-2.5 px-3 w-16 text-right">Qty</th>
                      <th className="py-2.5 px-3 w-24 text-right">Cost ($)</th>
                      <th className="py-2.5 px-3 w-24 text-right">Price ($)</th>
                      <th className="py-2.5 px-3 w-12 text-center">Del</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredRows.map((row, idx) => {
                      return (
                        <tr
                          key={row.id}
                          className={`hover:bg-slate-50 transition-colors ${
                            !row.isValid ? 'bg-rose-50/40' : idx % 2 === 1 ? 'bg-slate-50/25' : 'bg-white'
                          }`}
                        >
                          {/* Row Number */}
                          <td className="py-2 px-3 text-center text-slate-400 text-[11px] font-mono">
                            {idx + 1}
                          </td>

                          {/* Validity Chip */}
                          <td className="py-2 px-3 text-center">
                            {row.isValid ? (
                              <span
                                title="Ready to import"
                                className="inline-flex items-center text-emerald-600"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </span>
                            ) : (
                              <span
                                title={row.errors.join('; ')}
                                className="inline-flex items-center text-rose-600 cursor-help"
                              >
                                <AlertTriangle className="w-4 h-4" />
                              </span>
                            )}
                          </td>

                          {/* SKU/Model Number */}
                          <td className="py-1.5 px-2">
                            <input
                              type="text"
                              value={row.sku}
                              onChange={(e) => handleUpdateRow(row.id, 'sku', e.target.value)}
                              placeholder="e.g. RF28R7351SG"
                              className={`w-full px-2 py-1 text-xs border rounded-md font-mono font-medium focus:ring-1 focus:ring-amber-500 outline-hidden ${
                                !row.sku.trim()
                                  ? 'border-rose-400 bg-rose-50/50'
                                  : 'border-slate-300 bg-white'
                              }`}
                            />
                          </td>

                          {/* Serial Number */}
                          <td className="py-1.5 px-2">
                            <input
                              type="text"
                              value={row.serial_number}
                              onChange={(e) =>
                                handleUpdateRow(row.id, 'serial_number', e.target.value)
                              }
                              placeholder="Optional unique S/N"
                              className="w-full px-2 py-1 text-xs border border-slate-300 rounded-md font-mono focus:ring-1 focus:ring-amber-500 outline-hidden bg-white"
                            />
                          </td>

                          {/* Description */}
                          <td className="py-1.5 px-2">
                            <input
                              type="text"
                              value={row.description}
                              onChange={(e) =>
                                handleUpdateRow(row.id, 'description', e.target.value)
                              }
                              placeholder="Appliance description"
                              className={`w-full px-2 py-1 text-xs border rounded-md focus:ring-1 focus:ring-amber-500 outline-hidden ${
                                !row.description.trim()
                                  ? 'border-rose-400 bg-rose-50/50'
                                  : 'border-slate-300 bg-white'
                              }`}
                            />
                          </td>

                          {/* Brand */}
                          <td className="py-1.5 px-2">
                            <input
                              type="text"
                              value={row.brand}
                              onChange={(e) => handleUpdateRow(row.id, 'brand', e.target.value)}
                              placeholder="e.g. Samsung"
                              className="w-full px-2 py-1 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-amber-500 outline-hidden bg-white"
                            />
                          </td>

                          {/* Tag Dropdown */}
                          <td className="py-1.5 px-2">
                            <select
                              value={row.item_tag}
                              onChange={(e) => handleUpdateRow(row.id, 'item_tag', e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-amber-500 outline-hidden bg-white cursor-pointer font-medium"
                            >
                              {BULK_TEMPLATE_TAGS.map((tag) => (
                                <option key={tag} value={tag}>
                                  {tag}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Condition Dropdown */}
                          <td className="py-1.5 px-2">
                            <select
                              value={row.condition}
                              onChange={(e) =>
                                handleUpdateRow(row.id, 'condition', e.target.value)
                              }
                              className="w-full px-2 py-1 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-amber-500 outline-hidden bg-white cursor-pointer"
                            >
                              {BULK_TEMPLATE_CONDITIONS.map((cond) => (
                                <option key={cond} value={cond}>
                                  {cond}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Location Dropdown */}
                          <td className="py-1.5 px-2">
                            <select
                              value={row.location}
                              onChange={(e) =>
                                handleUpdateRow(row.id, 'location', e.target.value)
                              }
                              className="w-full px-2 py-1 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-amber-500 outline-hidden bg-white cursor-pointer"
                            >
                              {BULK_TEMPLATE_LOCATIONS.map((loc) => (
                                <option key={loc} value={loc}>
                                  {loc}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Qty */}
                          <td className="py-1.5 px-2">
                            <input
                              type="number"
                              min="1"
                              value={row.quantity}
                              onChange={(e) =>
                                handleUpdateRow(row.id, 'quantity', parseInt(e.target.value) || 1)
                              }
                              className="w-full px-2 py-1 text-xs text-right border border-slate-300 rounded-md focus:ring-1 focus:ring-amber-500 outline-hidden bg-white"
                            />
                          </td>

                          {/* Unit Cost */}
                          <td className="py-1.5 px-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={row.unit_cost}
                              onChange={(e) =>
                                handleUpdateRow(
                                  row.id,
                                  'unit_cost',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-full px-2 py-1 text-xs text-right border border-slate-300 rounded-md focus:ring-1 focus:ring-amber-500 outline-hidden bg-white font-mono"
                            />
                          </td>

                          {/* Selling Price */}
                          <td className="py-1.5 px-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={row.selling_price}
                              onChange={(e) =>
                                handleUpdateRow(
                                  row.id,
                                  'selling_price',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-full px-2 py-1 text-xs text-right border border-slate-300 rounded-md focus:ring-1 focus:ring-amber-500 outline-hidden bg-white font-mono font-semibold text-emerald-800"
                            />
                          </td>

                          {/* Delete */}
                          <td className="py-1.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteRow(row.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors cursor-pointer"
                              title="Delete Row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Bottom summary / status bar */}
            <div className="px-4 py-2 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-[11px] text-slate-500">
              <div className="flex items-center space-x-3">
                <span>
                  Showing {filteredRows.length} of {rows.length} rows
                </span>
                {errorCount > 0 && (
                  <span className="text-rose-600 font-semibold flex items-center space-x-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>{errorCount} row(s) contain missing required fields</span>
                  </span>
                )}
              </div>
              <div className="text-slate-500">
                Total Inventory Value to Import:{' '}
                <strong className="text-slate-800 font-mono">
                  $
                  {rows
                    .reduce((sum, r) => sum + (Number(r.selling_price) || 0) * (Number(r.quantity) || 1), 0)
                    .toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Footer / Action Buttons */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            {rows.length > 0 && (
              <span>
                Ready to import <strong className="text-slate-800">{validCount}</strong> valid asset(s).
              </span>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={validCount === 0 || isImporting}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold flex items-center space-x-2 transition-all shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isImporting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Importing Assets...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Import {validCount} Inventory Asset{validCount === 1 ? '' : 's'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

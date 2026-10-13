import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';
import {
  BULK_TEMPLATE_TAGS,
  BULK_TEMPLATE_CONDITIONS,
  BULK_TEMPLATE_LOCATIONS,
} from '../types/index.ts';

export interface BulkInventoryRow {
  id: string; // client unique key
  sku: string;
  serial_number: string;
  description: string;
  brand: string;
  item_tag: string;
  condition: string;
  location: string;
  quantity: number;
  unit_cost: number;
  selling_price: number;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export const TEMPLATE_HEADERS = [
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
] as const;

/**
 * Generates and triggers download of the official Excel (.xlsx) product template
 * with native Excel dropdown data validations for Tag, Condition, and Location.
 */
export async function downloadInventoryTemplate(): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Appliance POS & Inventory';
  workbook.lastModifiedBy = 'Appliance POS & Inventory';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Sheet 1: Main template
  const sheet = workbook.addWorksheet('Inventory Template', {
    views: [{ showGridLines: true, state: 'frozen', ySplit: 1 }],
  });

  // Sheet 2: Reference lists for dropdown validations
  const listsSheet = workbook.addWorksheet('DropdownLists', {
    views: [{ showGridLines: true }],
  });

  // Setup DropdownLists reference sheet
  listsSheet.columns = [
    { header: 'Tag Options', key: 'tag', width: 16 },
    { header: 'Condition Options', key: 'condition', width: 32 },
    { header: 'Location Options', key: 'location', width: 44 },
  ];

  // Header style for reference lists
  const refHeaderRow = listsSheet.getRow(1);
  refHeaderRow.font = { bold: true, color: { argb: 'FF1E293B' } };
  refHeaderRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF1F5F9' },
  };

  const maxRows = Math.max(
    BULK_TEMPLATE_TAGS.length,
    BULK_TEMPLATE_CONDITIONS.length,
    BULK_TEMPLATE_LOCATIONS.length
  );

  for (let i = 0; i < maxRows; i++) {
    const row = listsSheet.addRow({
      tag: BULK_TEMPLATE_TAGS[i] || '',
      condition: BULK_TEMPLATE_CONDITIONS[i] || '',
      location: BULK_TEMPLATE_LOCATIONS[i] || '',
    });
    row.font = { size: 10 };
  }

  // Setup Inventory Template sheet columns
  sheet.columns = [
    { header: 'SKU/Model Number', key: 'sku', width: 22 },
    { header: 'Serial Number', key: 'serial_number', width: 22 },
    { header: 'Description', key: 'description', width: 46 },
    { header: 'Brand', key: 'brand', width: 18 },
    { header: 'Tag', key: 'tag', width: 16 },
    { header: 'Condition', key: 'condition', width: 34 },
    { header: 'Location', key: 'location', width: 42 },
    { header: 'Qty', key: 'quantity', width: 12 },
    { header: 'Cost', key: 'cost', width: 14 },
    { header: 'Selling Price', key: 'selling_price', width: 16 },
  ];

  // Format header row
  const headerRow = sheet.getRow(1);
  headerRow.height = 28;
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F172A' }, // Dark slate
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  // Sample guidance rows
  const sampleRows = [
    {
      sku: 'RF28R7351SG',
      serial_number: 'SN-98234-A',
      description: 'Samsung 28 cu. ft. 3-Door French Door Refrigerator - Stainless Steel',
      brand: 'Samsung',
      tag: 'Blue',
      condition: 'Brand New - Sealed Box',
      location: 'MS Appliances | Showroom',
      quantity: 1,
      cost: 1250.0,
      selling_price: 1899.0,
    },
    {
      sku: 'WM4000HBA',
      serial_number: 'SN-44312-B',
      description: 'LG 4.5 Cu. Ft. Smart Front Load Washer - Black Steel',
      brand: 'LG',
      tag: 'None',
      condition: 'Brand New - Open Box',
      location: 'MS Appliances | ITC, Bohemia, NY',
      quantity: 1,
      cost: 620.0,
      selling_price: 899.0,
    },
    {
      sku: 'DVE45T6000V',
      serial_number: 'SN-77610-C',
      description: 'Samsung 7.5 cu. ft. Electric Dryer - Sensor Dry',
      brand: 'Samsung',
      tag: 'Red',
      condition: 'Refurbished - Original Box',
      location: 'Golden Opportunity Inc. | Warehouse, Paterson, NJ',
      quantity: 1,
      cost: 410.0,
      selling_price: 649.0,
    },
  ];

  sampleRows.forEach((item) => {
    sheet.addRow(item);
  });

  const tagFormula = `DropdownLists!$A$2:$A$${BULK_TEMPLATE_TAGS.length + 1}`;
  const conditionFormula = `DropdownLists!$B$2:$B$${BULK_TEMPLATE_CONDITIONS.length + 1}`;
  const locationFormula = `DropdownLists!$C$2:$C$${BULK_TEMPLATE_LOCATIONS.length + 1}`;

  for (let r = 2; r <= 500; r++) {
    const row = sheet.getRow(r);

    // Tag cell validation
    const tagCell = row.getCell(5);
    tagCell.dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [tagFormula],
      showErrorMessage: true,
      errorTitle: 'Invalid Tag',
      error: 'Please select a valid Tag from the dropdown (None, Blue, Red, Green).',
    };

    // Condition cell validation
    const conditionCell = row.getCell(6);
    conditionCell.dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [conditionFormula],
      showErrorMessage: true,
      errorTitle: 'Invalid Condition',
      error: 'Please select a valid Condition from the dropdown options.',
    };

    // Location cell validation
    const locationCell = row.getCell(7);
    locationCell.dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [locationFormula],
      showErrorMessage: true,
      errorTitle: 'Invalid Location',
      error: 'Please select an authorized Location from the dropdown.',
    };

    // Number format for Qty, Cost, Selling Price
    row.getCell(8).numFmt = '#,##0';
    row.getCell(9).numFmt = '$#,##0.00';
    row.getCell(10).numFmt = '$#,##0.00';
  }

  // Generate buffer and trigger browser download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'inventory_asset_template.xlsx';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function normalizeHeaderKey(key: string): string {
  return key
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function validateBulkRow(
  row: Omit<BulkInventoryRow, 'isValid' | 'errors' | 'warnings'>,
  allRows: Omit<BulkInventoryRow, 'isValid' | 'errors' | 'warnings'>[] = []
): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required: SKU
  if (!row.sku || !row.sku.trim()) {
    errors.push('SKU / Model Number is required.');
  }

  // Required: Description
  if (!row.description || !row.description.trim()) {
    errors.push('Description is required.');
  }

  // Serial Number duplicate check within uploaded batch
  if (row.serial_number && row.serial_number.trim()) {
    const dupes = allRows.filter(
      (r) =>
        r.id !== row.id &&
        r.serial_number &&
        r.serial_number.trim().toLowerCase() === row.serial_number.trim().toLowerCase()
    );
    if (dupes.length > 0) {
      errors.push(`Duplicate serial number in file: "${row.serial_number.trim()}".`);
    }
  }

  // Validate Tag against allowed dropdown options
  const tagTrimmed = (row.item_tag || '').trim();
  const validTag = BULK_TEMPLATE_TAGS.find(
    (t) => t.toLowerCase() === tagTrimmed.toLowerCase()
  );
  if (tagTrimmed && !validTag) {
    warnings.push(`Tag "${row.item_tag}" is not in standard list. Will default to "None".`);
  }

  // Validate Condition against allowed dropdown options
  const condTrimmed = (row.condition || '').trim();
  const validCondition = BULK_TEMPLATE_CONDITIONS.find(
    (c) => c.toLowerCase() === condTrimmed.toLowerCase()
  );
  if (!validCondition) {
    if (condTrimmed) {
      warnings.push(`Condition "${row.condition}" not recognized. Please select from dropdown.`);
    } else {
      errors.push('Condition is required.');
    }
  }

  // Validate Location against allowed dropdown options
  const locTrimmed = (row.location || '').trim();
  const validLocation = BULK_TEMPLATE_LOCATIONS.find(
    (l) => l.toLowerCase() === locTrimmed.toLowerCase()
  );
  if (!validLocation) {
    if (locTrimmed) {
      warnings.push(`Location "${row.location}" not recognized. Please choose from dropdown.`);
    } else {
      errors.push('Location is required.');
    }
  }

  // Quantity check
  if (isNaN(row.quantity) || row.quantity < 1) {
    warnings.push('Quantity must be at least 1 (defaulting to 1).');
  }

  // Price & Cost checks
  if (isNaN(row.unit_cost) || row.unit_cost < 0) {
    warnings.push('Cost should be a positive number (defaulting to $0).');
  }
  if (isNaN(row.selling_price) || row.selling_price < 0) {
    warnings.push('Selling price should be a positive number.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export async function parseInventoryFile(file: File): Promise<BulkInventoryRow[]> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });

  const sheetName =
    workbook.SheetNames.find((name) => name.toLowerCase().includes('inventory')) ||
    workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error('No sheet found in uploaded Excel file.');
  }

  const worksheet = workbook.Sheets[sheetName];
  const rawJson = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

  if (!rawJson || rawJson.length === 0) {
    throw new Error('Uploaded file contains no rows of data.');
  }

  const unvalidatedRows: Omit<BulkInventoryRow, 'isValid' | 'errors' | 'warnings'>[] = [];

  rawJson.forEach((rawRow, idx) => {
    let sku = '';
    let serial_number = '';
    let description = '';
    let brand = '';
    let item_tag = 'None';
    let condition = 'Brand New - Sealed Box';
    let location = 'MS Appliances | Showroom';
    let quantity = 1;
    let unit_cost = 0;
    let selling_price = 0;

    for (const [key, val] of Object.entries(rawRow)) {
      const norm = normalizeHeaderKey(key);
      const strVal = String(val ?? '').trim();
      if (norm === 'skumodelnumber' || norm === 'sku' || norm === 'modelnumber' || norm === 'model') {
        sku = strVal;
      } else if (norm === 'serialnumber' || norm === 'serial' || norm === 'sn' || norm === 'snnumber') {
        serial_number = strVal;
      } else if (norm === 'description' || norm === 'itemdescription' || norm === 'desc' || norm === 'productname') {
        description = strVal;
      } else if (norm === 'brand' || norm === 'manufacturer' || norm === 'make') {
        brand = strVal;
      } else if (norm === 'tag' || norm === 'itemtag' || norm === 'colortag') {
        if (strVal) item_tag = strVal;
      } else if (norm === 'condition' || norm === 'itemcondition') {
        if (strVal) condition = strVal;
      } else if (norm === 'location' || norm === 'itemlocation' || norm === 'storelocation' || norm === 'warehouse') {
        if (strVal) location = strVal;
      } else if (norm === 'qty' || norm === 'quantity' || norm === 'count') {
        const num = parseFloat(strVal);
        if (!isNaN(num)) quantity = Math.max(1, Math.round(num));
      } else if (norm === 'cost' || norm === 'unitcost' || norm === 'buyprice') {
        const clean = strVal.replace(/[^0-9.-]/g, '');
        const num = parseFloat(clean);
        if (!isNaN(num)) unit_cost = Math.max(0, num);
      } else if (norm === 'sellingprice' || norm === 'price' || norm === 'saleprice' || norm === 'retailprice') {
        const clean = strVal.replace(/[^0-9.-]/g, '');
        const num = parseFloat(clean);
        if (!isNaN(num)) selling_price = Math.max(0, num);
      }
    }

    if (!sku && !description && !serial_number) {
      return;
    }

    const matchedTag = BULK_TEMPLATE_TAGS.find(
      (t) => t.toLowerCase() === item_tag.toLowerCase()
    );
    if (matchedTag) item_tag = matchedTag;

    const matchedCondition = BULK_TEMPLATE_CONDITIONS.find(
      (c) => c.toLowerCase() === condition.toLowerCase()
    );
    if (matchedCondition) condition = matchedCondition;

    const matchedLocation = BULK_TEMPLATE_LOCATIONS.find(
      (l) => l.toLowerCase() === location.toLowerCase()
    );
    if (matchedLocation) location = matchedLocation;

    unvalidatedRows.push({
      id: `row-${idx + 1}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      sku,
      serial_number,
      description,
      brand,
      item_tag,
      condition,
      location,
      quantity,
      unit_cost,
      selling_price,
    });
  });

  return unvalidatedRows.map((row) => {
    const { isValid, errors, warnings } = validateBulkRow(row, unvalidatedRows);
    return {
      ...row,
      isValid,
      errors,
      warnings,
    };
  });
}

import { queryAll, queryOne, run, runTransaction } from '../db.ts';
import { InventoryItem } from '../../src/types/index.ts';

export function listInventory(filters?: {
  search?: string;
  condition?: string;
  status?: string;
  location?: string;
  limit?: number;
  offset?: number;
}): { items: InventoryItem[]; total: number } {
  let whereClauses: string[] = [];
  let params: any[] = [];

  if (filters?.search && filters.search.trim()) {
    const s = `%${filters.search.trim()}%`;
    whereClauses.push('(sku LIKE ? OR description LIKE ? OR serial_number LIKE ? OR item_tag LIKE ? OR brand LIKE ? OR model_number LIKE ?)');
    params.push(s, s, s, s, s, s);
  }
  if (filters?.condition && filters.condition !== 'ALL') {
    whereClauses.push('condition = ?');
    params.push(filters.condition);
  }
  if (filters?.status && filters.status !== 'ALL') {
    whereClauses.push('status = ?');
    params.push(filters.status);
  }
  if (filters?.location && filters.location !== 'ALL') {
    whereClauses.push('location LIKE ?');
    params.push(`%${filters.location}%`);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  const countRow = queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM inventory_items ${whereSql}`, params);
  const total = countRow ? countRow.count : 0;

  const limit = Math.min(100, Math.max(1, filters?.limit || 50));
  const offset = Math.max(0, filters?.offset || 0);

  const items = queryAll<InventoryItem>(
    `SELECT * FROM inventory_items ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return { items, total };
}

export function getInventoryItemById(id: string): InventoryItem | null {
  return queryOne<InventoryItem>('SELECT * FROM inventory_items WHERE id = ?', [id]);
}

export function searchAvailableInventory(query: string): InventoryItem[] {
  if (!query || query.trim() === '') {
    return queryAll<InventoryItem>(
      `SELECT * FROM inventory_items WHERE status = 'Available' ORDER BY created_at DESC LIMIT 20`
    );
  }
  const s = `%${query.trim()}%`;
  return queryAll<InventoryItem>(
    `SELECT * FROM inventory_items 
     WHERE (sku LIKE ? OR description LIKE ? OR serial_number LIKE ? OR item_tag LIKE ? OR brand LIKE ? OR model_number LIKE ?)
     ORDER BY (CASE WHEN status = 'Available' THEN 0 ELSE 1 END), description ASC 
     LIMIT 30`,
    [s, s, s, s, s, s]
  );
}

export interface UpsertInventoryInput {
  sku: string;
  model_number?: string;
  brand?: string;
  serial_number?: string;
  item_tag?: string;
  description: string;
  condition: string;
  quantity?: number;
  unit_cost?: number;
  selling_price?: number;
  location: string;
  status: string;
  source?: string;
  notes?: string;
}

export function createInventoryItem(input: UpsertInventoryInput, userId: string): InventoryItem {
  return runTransaction(() => {
    if (!input.sku || !input.description) {
      throw new Error('SKU and Description are required.');
    }

    // Check unique serial number if provided
    if (input.serial_number && input.serial_number.trim()) {
      const existing = queryOne('SELECT id, sku FROM inventory_items WHERE serial_number = ?', [input.serial_number.trim()]);
      if (existing) {
        throw new Error(`An inventory asset with serial number "${input.serial_number}" already exists (SKU: ${existing.sku}).`);
      }
    }

    // Check unique item tag if provided (excluding standard color tags)
    const standardColorTags = ['None', 'Blue', 'Red', 'Green', 'none', 'blue', 'red', 'green', ''];
    if (input.item_tag && input.item_tag.trim() && !standardColorTags.includes(input.item_tag.trim())) {
      const existingTag = queryOne('SELECT id, sku FROM inventory_items WHERE item_tag = ?', [input.item_tag.trim()]);
      if (existingTag) {
        throw new Error(`An inventory asset with item tag "${input.item_tag}" already exists (SKU: ${existingTag.sku}).`);
      }
    }

    const id = 'inv-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const now = new Date().toISOString();

    run(
      `INSERT INTO inventory_items (
        id, sku, model_number, brand, serial_number, item_tag, description, condition,
        quantity, unit_cost, selling_price, location, status, source, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.sku.trim(),
        input.model_number?.trim() || '',
        input.brand?.trim() || '',
        input.serial_number?.trim() || '',
        input.item_tag?.trim() || '',
        input.description.trim(),
        input.condition || 'A',
        Math.max(1, input.quantity || 1),
        Math.round((Math.max(0, input.unit_cost || 0) + Number.EPSILON) * 100) / 100,
        Math.round((Math.max(0, input.selling_price || 0) + Number.EPSILON) * 100) / 100,
        input.location?.trim() || 'Showroom Floor',
        input.status || ((input.quantity !== undefined && input.quantity === 0) ? 'Sold' : 'Available'),
        input.source?.trim() || '',
        input.notes?.trim() || '',
        now,
        now,
      ]
    );

    run(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, old_values, new_values, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['aud-' + Date.now(), userId, 'INVENTORY_CREATED', 'inventory', id, null, JSON.stringify(input), now]
    );

    return getInventoryItemById(id)!;
  });
}

export function updateInventoryItem(id: string, input: Partial<UpsertInventoryInput>, userId: string): InventoryItem {
  return runTransaction(() => {
    const existing = getInventoryItemById(id);
    if (!existing) {
      throw new Error('Inventory item not found.');
    }

    if (input.serial_number && input.serial_number.trim() && input.serial_number.trim() !== existing.serial_number) {
      const dupe = queryOne('SELECT id FROM inventory_items WHERE serial_number = ? AND id != ?', [input.serial_number.trim(), id]);
      if (dupe) {
        throw new Error(`Serial number "${input.serial_number}" is already used by another inventory asset.`);
      }
    }

    if (input.item_tag && input.item_tag.trim() && input.item_tag.trim() !== existing.item_tag) {
      const dupeTag = queryOne('SELECT id FROM inventory_items WHERE item_tag = ? AND id != ?', [input.item_tag.trim(), id]);
      if (dupeTag) {
        throw new Error(`Item tag "${input.item_tag}" is already used by another inventory asset.`);
      }
    }

    const now = new Date().toISOString();

    let targetStatus = input.status ?? null;
    if (input.quantity !== undefined && input.status === undefined) {
      if (input.quantity > 0 && existing.status === 'Sold') {
        targetStatus = 'Available';
      } else if (input.quantity === 0 && existing.status === 'Available') {
        targetStatus = 'Sold';
      }
    }

    const roundedCost = input.unit_cost !== undefined ? Math.round((Math.max(0, input.unit_cost) + Number.EPSILON) * 100) / 100 : null;
    const roundedPrice = input.selling_price !== undefined ? Math.round((Math.max(0, input.selling_price) + Number.EPSILON) * 100) / 100 : null;

    run(
      `UPDATE inventory_items SET
        sku = COALESCE(?, sku),
        model_number = COALESCE(?, model_number),
        brand = COALESCE(?, brand),
        serial_number = COALESCE(?, serial_number),
        item_tag = COALESCE(?, item_tag),
        description = COALESCE(?, description),
        condition = COALESCE(?, condition),
        quantity = COALESCE(?, quantity),
        unit_cost = COALESCE(?, unit_cost),
        selling_price = COALESCE(?, selling_price),
        location = COALESCE(?, location),
        status = COALESCE(?, status),
        source = COALESCE(?, source),
        notes = COALESCE(?, notes),
        updated_at = ?
       WHERE id = ?`,
      [
        input.sku?.trim() ?? null,
        input.model_number?.trim() ?? null,
        input.brand?.trim() ?? null,
        input.serial_number?.trim() ?? null,
        input.item_tag?.trim() ?? null,
        input.description?.trim() ?? null,
        input.condition ?? null,
        input.quantity !== undefined ? Math.max(0, input.quantity) : null,
        roundedCost,
        roundedPrice,
        input.location?.trim() ?? null,
        targetStatus,
        input.source?.trim() ?? null,
        input.notes?.trim() ?? null,
        now,
        id,
      ]
    );

    return getInventoryItemById(id)!;
  });
}

export function bulkCreateInventoryItems(
  items: UpsertInventoryInput[],
  userId: string
): { importedCount: number; created: InventoryItem[]; errors: { row: number; sku?: string; error: string }[] } {
  const created: InventoryItem[] = [];
  const errors: { row: number; sku?: string; error: string }[] = [];
  const standardColorTags = ['None', 'Blue', 'Red', 'Green', 'none', 'blue', 'red', 'green', ''];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const rowNum = i + 1;
    try {
      if (!item.sku || !item.sku.trim()) {
        throw new Error('SKU / Model Number is required.');
      }
      if (!item.description || !item.description.trim()) {
        throw new Error('Description is required.');
      }

      // Check unique serial number if provided
      if (item.serial_number && item.serial_number.trim()) {
        const existing = queryOne<{ id: string; sku: string }>(
          'SELECT id, sku FROM inventory_items WHERE serial_number = ?',
          [item.serial_number.trim()]
        );
        if (existing) {
          throw new Error(`Serial number "${item.serial_number.trim()}" already exists (SKU: ${existing.sku}).`);
        }
      }

      // Standard tag check (colors 'None', 'Blue', 'Red', 'Green' are not unique constraints)
      if (item.item_tag && item.item_tag.trim() && !standardColorTags.includes(item.item_tag.trim())) {
        const existingTag = queryOne<{ id: string; sku: string }>(
          'SELECT id, sku FROM inventory_items WHERE item_tag = ?',
          [item.item_tag.trim()]
        );
        if (existingTag) {
          throw new Error(`Item tag "${item.item_tag.trim()}" already exists (SKU: ${existingTag.sku}).`);
        }
      }

      const id = 'inv-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
      const now = new Date().toISOString();
      const qty = Math.max(0, Number(item.quantity) || 1);
      const status = item.status?.trim() || (qty === 0 ? 'Sold' : 'Available');

      run(
        `INSERT INTO inventory_items (
          id, sku, model_number, brand, serial_number, item_tag, description, condition,
          quantity, unit_cost, selling_price, location, status, source, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          item.sku.trim(),
          item.model_number?.trim() || item.sku.trim(),
          item.brand?.trim() || '',
          item.serial_number?.trim() || '',
          item.item_tag?.trim() || 'None',
          item.description.trim(),
          item.condition?.trim() || 'Brand New - Sealed Box',
          qty,
          Math.round((Math.max(0, Number(item.unit_cost) || 0) + Number.EPSILON) * 100) / 100,
          Math.round((Math.max(0, Number(item.selling_price) || 0) + Number.EPSILON) * 100) / 100,
          item.location?.trim() || 'MS Appliances | Showroom',
          status,
          item.source?.trim() || 'Bulk Import',
          item.notes?.trim() || '',
          now,
          now,
        ]
      );

      const newItem = getInventoryItemById(id);
      if (newItem) {
        created.push(newItem);
      }
    } catch (err: any) {
      errors.push({
        row: rowNum,
        sku: item.sku || '',
        error: err.message || 'Failed to import row',
      });
    }
  }

  // Audit log for the bulk operation
  if (created.length > 0) {
    const now = new Date().toISOString();
    run(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, old_values, new_values, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'aud-' + Date.now(),
        userId,
        'INVENTORY_BULK_IMPORTED',
        'inventory',
        'bulk',
        null,
        JSON.stringify({ importedCount: created.length, errorCount: errors.length }),
        now,
      ]
    );
  }

  return { importedCount: created.length, created, errors };
}

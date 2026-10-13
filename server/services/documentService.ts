import { queryAll, queryOne, run, runTransaction } from '../db.ts';
import { DocumentRecord } from '../../src/types/index.ts';

export interface UploadDocumentInput {
  document_type: 'Tax Exemption' | 'Invoice' | 'Receipt' | 'Packing Slip' | 'Other';
  file_name: string;
  storage_url: string; // Base64 data URL or file link
  file_size?: number;
  mime_type?: string;
  related_entity_type: string;
  related_entity_id: string;
}

export function saveDocument(input: UploadDocumentInput, userId: string): DocumentRecord {
  return runTransaction(() => {
    const id = 'doc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const now = new Date().toISOString();
    run(
      `INSERT INTO documents (
        id, document_type, file_name, storage_url, file_size, mime_type,
        related_entity_type, related_entity_id, uploaded_by, uploaded_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.document_type,
        input.file_name,
        input.storage_url,
        input.file_size || 0,
        input.mime_type || 'application/octet-stream',
        input.related_entity_type,
        input.related_entity_id,
        userId,
        now,
      ]
    );

    run(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, old_values, new_values, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['aud-' + Date.now(), userId, 'DOCUMENT_UPLOADED', 'document', id, null, JSON.stringify({ file_name: input.file_name, type: input.document_type }), now]
    );

    return queryOne<DocumentRecord>('SELECT * FROM documents WHERE id = ?', [id])!;
  });
}

export function getDocumentsForEntity(entityType: string, entityId: string): DocumentRecord[] {
  return queryAll<DocumentRecord>(
    'SELECT * FROM documents WHERE related_entity_type = ? AND related_entity_id = ? ORDER BY uploaded_at DESC',
    [entityType, entityId]
  );
}

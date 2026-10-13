import React, { useState } from 'react';
import { api } from '../../services/api.ts';
import { DocumentRecord } from '../../types/index.ts';
import { Upload, X, AlertTriangle } from 'lucide-react';

interface TaxExemptionModalProps {
  currentDocumentId?: string | null;
  onDocumentAttached: (document: DocumentRecord) => void;
  onClose: () => void;
}

export const TaxExemptionModal: React.FC<TaxExemptionModalProps> = ({
  onDocumentAttached,
  onClose,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [certificateNumber, setCertificateNumber] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!file) {
      setError('Please select a certificate file (PDF, PNG, JPG).');
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          const fileName = `${certificateNumber ? certificateNumber.replace(/\s+/g, '_') + '_' : ''}${file.name}`;
          const doc = await api.uploadDocument({
            document_type: 'Tax Exemption',
            file_name: fileName,
            storage_url: base64Data,
            file_size: file.size,
            mime_type: file.type,
            related_entity_type: 'order',
            related_entity_id: 'pending_order',
          });
          onDocumentAttached(doc);
          onClose();
        } catch (err: any) {
          setError(err.message || 'Failed to upload document');
        } finally {
          setUploading(false);
        }
      };
      reader.onerror = () => {
        setError('Failed to read file');
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setError(err.message || 'Upload error');
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-amber-50/50">
          <div className="flex items-center space-x-2 text-amber-900">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h2 className="text-base font-bold">Tax Exemption Verification</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleUpload} className="p-6 space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 space-y-1">
            <p className="font-bold">Important NJ State Compliance Notice:</p>
            <p>
              Under NJ tax regulations, sales tax exemption ($0.00) requires a valid ST-3 / ST-4 resale
              or exempt organization certificate attached to this order.
            </p>
          </div>

          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Certificate / Exemption Number
            </label>
            <input
              type="text"
              value={certificateNumber}
              onChange={e => setCertificateNumber(e.target.value)}
              placeholder="e.g. ST3-99882211"
              className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Upload Exemption Document <span className="text-rose-500">*</span>
            </label>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-5 text-center hover:border-amber-500 transition-colors bg-slate-50">
              <input
                type="file"
                id="taxDocFile"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="taxDocFile" className="cursor-pointer flex flex-col items-center">
                <Upload className="w-8 h-8 text-slate-400 mb-2" />
                <span className="text-xs font-semibold text-slate-700">
                  {file ? file.name : 'Choose file or drag & drop'}
                </span>
                <span className="text-[10px] text-slate-400 mt-1">
                  Supported formats: PDF, PNG, JPG (Max 10MB)
                </span>
              </label>
            </div>
          </div>

          <div className="pt-2 flex justify-end space-x-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {uploading ? 'Attaching Certificate...' : 'Attach & Confirm Exemption'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

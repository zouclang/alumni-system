'use client';

import { useState } from 'react';

interface ImportModalProps {
  onClose: () => void;
  onImported: () => void;
}

export default function ImportModal({ onClose, onImported }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus({ type: null, message: '' });
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setStatus({ type: null, message: '正在上传并处理...' });

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setStatus({ type: 'success', message: `成功导入 ${data.count} 位校友！` });
        setTimeout(() => {
          onImported();
        }, 1500);
      } else {
        setStatus({ type: 'error', message: data.error || '导入失败' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: '网络错误，请稍后重试' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <h2 className="modal-title">批量导入校友</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body" style={{ padding: '24px' }}>
          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '14px', color: '#4b5563', marginBottom: '12px' }}>
              请下载模板文件，按照格式填写校友信息后上传。
            </p>
            <a 
              href="/api/template" 
              className="btn btn-outline" 
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}
              download
            >
              📥 下载 Excel 模板
            </a>
          </div>

          <div 
            style={{ 
              border: '2px dashed #e5e7eb', 
              borderRadius: '8px', 
              padding: '32px 20px', 
              textAlign: 'center',
              backgroundColor: '#f9fafb',
              cursor: 'pointer',
              transition: 'border-color 0.2s',
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                setFile(e.dataTransfer.files[0]);
              }
            }}
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📁</div>
            <div style={{ fontSize: '14px', color: '#374151', fontWeight: 500 }}>
              {file ? file.name : '点击或拖拽文件到此处'}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
              支持 .xlsx 格式文件
            </div>
            <input 
              id="file-upload"
              type="file" 
              accept=".xlsx" 
              style={{ display: 'none' }} 
              onChange={handleFileChange}
            />
          </div>

          {status.message && (
            <div 
              style={{ 
                marginTop: '16px', 
                padding: '10px 14px', 
                borderRadius: '6px', 
                fontSize: '13px',
                backgroundColor: status.type === 'success' ? '#f0fdf4' : status.type === 'error' ? '#fef2f2' : '#eff6ff',
                color: status.type === 'success' ? '#166534' : status.type === 'error' ? '#991b1b' : '#1e40af',
                border: `1px solid ${status.type === 'success' ? '#bbf7d0' : status.type === 'error' ? '#fecaca' : '#bfdbfe'}`,
              }}
            >
              {status.message}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose} disabled={uploading}>取消</button>
          <button 
            className="btn btn-primary" 
            onClick={handleUpload} 
            disabled={!file || uploading}
          >
            {uploading ? '上传中...' : '开始导入'}
          </button>
        </div>
      </div>
    </div>
  );
}

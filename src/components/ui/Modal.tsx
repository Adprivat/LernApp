import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  if (!isOpen) return null;

  const sizeMap = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className={`relative bg-slate-800 border border-slate-700 rounded-2xl w-full ${sizeMap[size]} shadow-2xl`}>
        {title && (
          <div className="flex items-center justify-between p-6 border-b border-slate-700">
            <h2 className="text-lg font-bold text-white">{title}</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-700"
            >
              <X size={20} />
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

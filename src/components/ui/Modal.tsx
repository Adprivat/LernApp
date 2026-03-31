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
        className="absolute inset-0 bg-nexus-bg/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className={`relative bg-nexus-surface/70 backdrop-blur-sm border border-nexus-border rounded-lg w-full ${sizeMap[size]} shadow-2xl shadow-nexus-primary/10`}>
        {title && (
          <div className="flex items-center justify-between p-6 border-b border-nexus-border">
            <h2 className="text-lg font-bold text-white">{title}</h2>
            <button
              onClick={onClose}
              className="text-nexus-muted hover:text-white transition-all duration-300 p-1 rounded-lg hover:bg-nexus-bg"
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

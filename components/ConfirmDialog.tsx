import React from 'react';
import Modal from './Modal';
import { useI18n } from '../contexts/I18nContext';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmClass?: string;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText, 
  cancelText, 
  confirmClass = 'bg-red-600 hover:bg-red-700' 
}) => {
  const { t } = useI18n();
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-6">
        <p className="text-gray-600">{message}</p>
        <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            {cancelText || t('cancel')}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`px-6 py-2 text-white rounded-lg transition-colors shadow-md ${confirmClass}`}
          >
            {confirmText || t('delete')}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;

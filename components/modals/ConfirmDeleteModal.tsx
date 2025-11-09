import React from 'react';
import Button from '@/components/ui/Button';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  title = 'Delete project?',
  message = 'This action cannot be undone. This will permanently delete the project and all associated data.',
  confirmText = 'Delete',
  cancelText = 'Cancel',
  loading = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onCancel();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl w-full max-w-sm p-4 border border-border-dark-gray shadow-lg">
        <h2 className="text-lg font-medium text-black mb-1">{title}</h2>
        <p className="text-sm text-text-gray mb-4">{message}</p>
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="md"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={onConfirm}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 focus:ring-blue-600"
          >
            {loading ? 'Deleting...' : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteModal;


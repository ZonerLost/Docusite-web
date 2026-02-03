import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';
import { XIcon } from 'lucide-react';
import ModalPortal from '@/components/shared/modals/ModalPortal';

interface AddNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (note: string) => void;
}

const AddNotesModal: React.FC<AddNotesModalProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  const [note, setNote] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (note.trim()) {
      onAdd(note.trim());
      setNote('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="p-6 w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-black">Add Notes</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <XIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          Add your notes to this annotation.
        </p>

        <form onSubmit={handleSubmit}>
          <Textarea
            label="Notes"
            placeholder="Lorem ipsum ipsum dolor @kevinbacker"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mb-4"
            rows={4}
          />
          
          <div className="flex justify-end">
            <Button type="submit" variant="primary">
              Add
            </Button>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
};

export default AddNotesModal;

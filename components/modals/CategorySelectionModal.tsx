import React, { useState } from 'react';
import { XIcon } from 'lucide-react';
import Button from '@/components/ui/Button';

interface CategorySelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategorySelect: (category: string) => void;
}

const categories = [
  'STRUCTURAL',
  'MEP',
  'Architectural',
  'Interior/ Finishes',
  'Others'
];

const CategorySelectionModal: React.FC<CategorySelectionModalProps> = ({
  isOpen,
  onClose,
  onCategorySelect,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
  };

  const handleConfirm = () => {
    if (selectedCategory) {
      onCategorySelect(selectedCategory);
      setSelectedCategory('');
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedCategory('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-black">Select Category</h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <XIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          Choose a category for your PDF file.
        </p>

        <div className="space-y-2 mb-6">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => handleCategorySelect(category)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                selectedCategory === category
                  ? 'border-action bg-action/10 text-action'
                  : 'border-border-gray hover:bg-gray-50 text-black'
              }`}
            >
              <span className="font-medium text-sm">{category}</span>
            </button>
          ))}
        </div>
        
        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={!selectedCategory}
          >
            Select Category
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CategorySelectionModal;

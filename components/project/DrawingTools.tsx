import React from 'react';
import { PencilIcon, PenIcon, EraserIcon, SquareIcon, CircleIcon, TypeIcon } from 'lucide-react';

type DrawingTool = 'pen' | 'pencil' | 'eraser' | 'rectangle' | 'circle' | 'text';
type PenSize = 'small' | 'medium' | 'large';
type PenColor = 'black' | 'red' | 'blue' | 'green' | 'yellow';

interface DrawingToolsProps {
  selectedTool: DrawingTool | null;
  onToolSelect: (tool: DrawingTool | null) => void;
  penSize: PenSize;
  onPenSizeChange: (size: PenSize) => void;
  penColor: PenColor;
  onPenColorChange: (color: PenColor) => void;
  activeTab: 'draw' | 'pens';
}

const DrawingTools: React.FC<DrawingToolsProps> = ({
  selectedTool,
  onToolSelect,
  penSize,
  onPenSizeChange,
  penColor,
  onPenColorChange,
  activeTab,
}) => {
  const penSizes = {
    small: { size: 2, label: 'Small' },
    medium: { size: 4, label: 'Medium' },
    large: { size: 6, label: 'Large' },
  };

  const penColors = {
    black: '#000000',
    red: '#ff0000',
    blue: '#0000ff',
    green: '#00ff00',
    yellow: '#ffff00',
  };

  const tools = [
    { id: 'pen', icon: PenIcon, label: 'Pen', isDrawing: true },
    { id: 'pencil', icon: PencilIcon, label: 'Pencil', isDrawing: true },
    { id: 'eraser', icon: EraserIcon, label: 'Eraser', isDrawing: false },
    { id: 'rectangle', icon: SquareIcon, label: 'Rectangle', isDrawing: false },
    { id: 'circle', icon: CircleIcon, label: 'Circle', isDrawing: false },
    { id: 'text', icon: TypeIcon, label: 'Text', isDrawing: false },
  ];

  if (activeTab !== 'draw' && activeTab !== 'pens') return null;

  return (
    <div className="flex items-center gap-2 px-4 sm:px-6 py-2 bg-gray-50 border-t border-border-gray">
      {/* Drawing Tools */}
      <div className="flex items-center gap-1">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              onClick={() => onToolSelect(selectedTool === tool.id ? null : tool.id as DrawingTool)}
              className={`p-2 rounded transition-colors ${
                selectedTool === tool.id
                  ? 'bg-action text-white'
                  : 'hover:bg-gray-200 text-gray-600'
              }`}
              title={tool.label}
            >
              <Icon className="w-4 h-4" />
            </button>
          );
        })}
      </div>

      <div className="w-px h-6 bg-border-gray mx-2" />

      {/* Pen Size Selector */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-600 mr-2">Size:</span>
        {Object.entries(penSizes).map(([size, config]) => (
          <button
            key={size}
            onClick={() => onPenSizeChange(size as PenSize)}
            className={`px-2 py-1 rounded text-xs transition-colors ${
              penSize === size
                ? 'bg-action text-white'
                : 'hover:bg-gray-200 text-gray-600'
            }`}
          >
            {config.label}
          </button>
        ))}
      </div>

      <div className="w-px h-6 bg-border-gray mx-2" />

      {/* Pen Color Selector */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-600 mr-2">Color:</span>
        {Object.entries(penColors).map(([color, hex]) => (
          <button
            key={color}
            onClick={() => onPenColorChange(color as PenColor)}
            className={`w-6 h-6 rounded border-2 transition-colors ${
              penColor === color
                ? 'border-gray-800'
                : 'border-gray-300 hover:border-gray-500'
            }`}
            style={{ backgroundColor: hex }}
            title={color.charAt(0).toUpperCase() + color.slice(1)}
          />
        ))}
      </div>

      {/* Current Tool Display */}
      {selectedTool && (
        <div className="ml-4 px-3 py-1 bg-white border border-gray-300 rounded text-sm text-gray-700">
          {tools.find(t => t.id === selectedTool)?.label} • {penSizes[penSize].label} • {penColor}
        </div>
      )}
    </div>
  );
};

export default DrawingTools;

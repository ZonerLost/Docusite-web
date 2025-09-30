import React, { forwardRef, useState, useRef, useCallback } from 'react';
import ProjectNotesSection from './ProjectNotesSection';
import SiteInspectionReportTemplate from './SiteInspectionReportTemplate';
import AddPicturesWithNotesModal from '@/components/modals/AddPicturesWithNotesModal';
import { CameraIcon } from 'lucide-react';

type StoredProject = {
  id: string;
  name: string;
  clientName?: string;
  status: 'in-progress' | 'completed' | 'cancelled';
  location: string;
  projectOwner?: string;
  deadline?: string;
  members?: number;
};

type Annotation = {
  id: string;
  type: 'text' | 'image' | 'note' | 'highlight' | 'shape' | 'draw';
  x: number;
  y: number;
  width?: number;
  height?: number;
  content?: string;
  imageUrl?: string;
  images?: { url: string; note?: string }[];
  currentImageIndex?: number;
  color?: string;
  pathData?: { x: number; y: number }[];
  penSize?: 'small' | 'medium' | 'large';
};

type ReportAnnotation = {
  id: string;
  refId: string;
  page: number;
  location: string;
  description: string;
  status: 'Open' | 'In Progress' | 'Closed';
  assignedTo: string;
  dateLogged: string;
  dueDate: string;
  category: 'Structural' | 'Architectural' | 'MEP';
};

interface DocumentViewerProps {
  project: StoredProject;
  selectedFile?: { id: string; name: string; category?: string } | null;
  notes: string[];
  selectedTool: 'text' | 'shape' | 'image' | 'note' | 'highlight' | 'draw' | 'eraser' | null;
  activeTab: 'view' | 'annotate';
  onAddNote: () => void;
  onAddImageNote: () => void;
  onUndo: () => void;
  onRedo: () => void;
}

const DocumentViewer = forwardRef<{ undo: () => void; redo: () => void; addImageAnnotation: (imageUrl: string, note: string) => void; addMultipleImages: (imageUrls: string[], note: string) => void; domRef: HTMLDivElement | null }, DocumentViewerProps>(
  ({ project, selectedFile, notes, selectedTool, activeTab, onAddNote, onAddImageNote, onUndo, onRedo }, ref) => {
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawingPath, setDrawingPath] = useState<{ x: number; y: number }[]>([]);
    const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null);
    const [resizingAnnotationId, setResizingAnnotationId] = useState<string | null>(null);
    const [resizeStart, setResizeStart] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
    const [draggingAnnotationId, setDraggingAnnotationId] = useState<string | null>(null);
    const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const historyRef = useRef<Annotation[][]>([[]]);
    const historyIndexRef = useRef(0);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const domRef = useRef<HTMLDivElement>(null);

    // Sample report annotations data
    const [reportAnnotations] = useState<ReportAnnotation[]>([
      {
        id: '1',
        refId: 'STR-001',
        page: 2,
        location: 'Slab NW Corner',
        description: 'Reinforcement missing cover',
        status: 'Open',
        assignedTo: 'Structural Co.',
        dateLogged: '15/09/25',
        dueDate: '22/09/25',
        category: 'Structural'
      },
      {
        id: '2',
        refId: 'ARCH-002',
        page: 4,
        location: 'Level 1 Corridor',
        description: 'Incomplete ceiling finishes',
        status: 'In Progress',
        assignedTo: 'Finishing Co.',
        dateLogged: '15/09/25',
        dueDate: '29/09/25',
        category: 'Architectural'
      },
      {
        id: '3',
        refId: 'MEP-003',
        page: 5,
        location: 'MEP Shaft',
        description: 'Improper cable routing',
        status: 'Open',
        assignedTo: 'MEP Team',
        dateLogged: '15/09/25',
        dueDate: '25/09/25',
        category: 'MEP'
      }
    ]);

    // Sample photos data
    const [photos] = useState([
      {
        id: '1',
        refId: 'STR-001',
        description: 'Placeholder for photo of slab corner issue'
      },
      {
        id: '2',
        refId: 'ARCH-002',
        description: 'Placeholder for ceiling finishes photo'
      },
      {
        id: '3',
        refId: 'MEP-003',
        description: 'Placeholder for cable routing photo'
      }
    ]);

    // Save state to history
    const saveToHistory = useCallback((newAnnotations: Annotation[]) => {
      const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
      newHistory.push([...newAnnotations]);
      historyRef.current = newHistory.slice(-50); // Keep only last 50 states
      historyIndexRef.current = Math.min(historyIndexRef.current + 1, 49);
    }, []);

    // Undo function
    const handleUndo = useCallback(() => {
      if (historyIndexRef.current > 0) {
        historyIndexRef.current = historyIndexRef.current - 1;
        setAnnotations([...historyRef.current[historyIndexRef.current]]);
        onUndo();
      }
    }, [onUndo]);

    // Redo function
    const handleRedo = useCallback(() => {
      if (historyIndexRef.current < historyRef.current.length - 1) {
        historyIndexRef.current = historyIndexRef.current + 1;
        setAnnotations([...historyRef.current[historyIndexRef.current]]);
        onRedo();
      }
    }, [onRedo]);

    // Expose undo/redo functions to parent
    const addImageAnnotation = useCallback((imageUrl: string, note: string) => {
      console.log('Adding image annotation:', imageUrl, note);
      // Check if there's an existing image annotation to replace
      const existingImageAnnotation = annotations.find(a => a.type === 'image');
      
      if (existingImageAnnotation) {
        // Replace existing image annotation
        const updatedAnnotation = {
          ...existingImageAnnotation,
          images: [{ url: imageUrl, note }],
          currentImageIndex: 0,
          content: note
        };
        console.log('Replacing existing annotation:', updatedAnnotation);
        const newAnnotations = annotations.map(a => 
          a.id === existingImageAnnotation.id ? updatedAnnotation : a
        );
        setAnnotations(newAnnotations);
        saveToHistory(newAnnotations);
      } else {
        // Create new image annotation
        const newAnnotation: Annotation = {
          id: Date.now().toString(),
          type: 'image',
          x: 200, // Default position
          y: 200,
          width: 300,
          height: 200,
          images: [{ url: imageUrl, note }],
          currentImageIndex: 0,
          content: note
        };
        console.log('Creating new annotation:', newAnnotation);
        const newAnnotations = [...annotations, newAnnotation];
        setAnnotations(newAnnotations);
        saveToHistory(newAnnotations);
      }
    }, [annotations, saveToHistory]);

    const addMultipleImages = useCallback((imageUrls: string[], note: string) => {
      console.log('Adding multiple images:', imageUrls.length, 'images');
      // Create new image annotation with all images
      const newAnnotation: Annotation = {
        id: Date.now().toString(),
        type: 'image',
        x: 200, // Default position
        y: 200,
        width: 300,
        height: 200,
        images: imageUrls.map((url, index) => ({ url, note: `${note} (Image ${index + 1})` })),
        currentImageIndex: 0,
        content: note
      };
      console.log('Creating new multi-image annotation:', newAnnotation);
      const newAnnotations = [...annotations, newAnnotation];
      setAnnotations(newAnnotations);
      saveToHistory(newAnnotations);
    }, [annotations, saveToHistory]);

    React.useImperativeHandle(ref, () => ({
      undo: handleUndo,
      redo: handleRedo,
      addImageAnnotation,
      addMultipleImages,
      domRef: domRef.current
    }));

    // Check if point is near a drawn line for eraser
    const isPointNearLine = useCallback((point: { x: number; y: number }, annotation: Annotation) => {
      if (annotation.type !== 'draw' || !annotation.pathData) return false;
      
      const threshold = 10; // Eraser radius
      for (let i = 0; i < annotation.pathData.length - 1; i++) {
        const p1 = annotation.pathData[i];
        const p2 = annotation.pathData[i + 1];
        
        // Distance from point to line segment
        const A = point.x - p1.x;
        const B = point.y - p1.y;
        const C = p2.x - p1.x;
        const D = p2.y - p1.y;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        
        if (lenSq !== 0) {
          param = dot / lenSq;
        }
        
        let xx, yy;
        if (param < 0) {
          xx = p1.x;
          yy = p1.y;
        } else if (param > 1) {
          xx = p2.x;
          yy = p2.y;
        } else {
          xx = p1.x + param * C;
          yy = p1.y + param * D;
        }
        
        const dx = point.x - xx;
        const dy = point.y - yy;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= threshold) {
          return true;
        }
      }
      return false;
    }, []);

    const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      // Don't handle clicks in view mode
      if (activeTab === 'view') return;
      
      // Don't handle clicks if we're drawing
      if (isDrawing) return;

      if (!selectedTool) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Only handle specific tools that create annotations on click
      if (selectedTool === 'text') {
        // Create text box on single click
        const newAnnotation: Annotation = {
          id: Date.now().toString(),
          type: 'text',
          x,
          y,
          width: 120,
          height: 32,
          content: '',
          color: '#000000'
        };
        const newAnnotations = [...annotations, newAnnotation];
        setAnnotations(newAnnotations);
        saveToHistory(newAnnotations);
        setEditingAnnotationId(newAnnotation.id);
      } else if (selectedTool === 'highlight') {
        const newAnnotation: Annotation = {
          id: Date.now().toString(),
          type: 'highlight',
          x,
          y,
          width: 100,
          height: 20,
          color: '#4D91DB'
        };
        const newAnnotations = [...annotations, newAnnotation];
        setAnnotations(newAnnotations);
        saveToHistory(newAnnotations);
      } else if (selectedTool === 'shape') {
        const newAnnotation: Annotation = {
          id: Date.now().toString(),
          type: 'shape',
          x,
          y,
          width: 50,
          height: 50,
          color: '#ff0000'
        };
        const newAnnotations = [...annotations, newAnnotation];
        setAnnotations(newAnnotations);
        saveToHistory(newAnnotations);
      } else if (selectedTool === 'eraser') {
        // Erase annotations that are near the click point
        const newAnnotations = annotations.filter(annotation => {
          if (annotation.type === 'draw' && annotation.pathData) {
            return !isPointNearLine({ x, y }, annotation);
          }
          return true;
        });
        if (newAnnotations.length !== annotations.length) {
          setAnnotations(newAnnotations);
          saveToHistory(newAnnotations);
        }
      }
    }, [activeTab, selectedTool, isDrawing, annotations, saveToHistory, isPointNearLine]);

    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      // Don't handle drawing in view mode
      if (activeTab === 'view') return;
      
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      console.log('Mouse down at:', x, y, 'selectedTool:', selectedTool);
      
      // Check if we should start drawing
      const shouldDraw = selectedTool === 'draw';
      
      if (shouldDraw) {
        e.preventDefault();
        setIsDrawing(true);
        setDrawingPath([{ x, y }]);
      } else if (selectedTool === 'eraser') {
        // Check if clicking on a text box or image to delete it
        const clickedAnnotation = annotations.find(annotation => 
          (annotation.type === 'text' || annotation.type === 'image') &&
          x >= annotation.x && x <= annotation.x + (annotation.width || (annotation.type === 'text' ? 100 : 200)) &&
          y >= annotation.y && y <= annotation.y + (annotation.height || (annotation.type === 'text' ? 30 : 150))
        );
        
        if (clickedAnnotation) {
          const newAnnotations = annotations.filter(a => a.id !== clickedAnnotation.id);
          setAnnotations(newAnnotations);
          saveToHistory(newAnnotations);
        }
      } else {
        // Check if clicking on resize handle of text box or image (works for any tool or no tool)
        const clickedResizeAnnotation = annotations.find(annotation => 
          (annotation.type === 'text' || annotation.type === 'image') &&
          x >= annotation.x + (annotation.width || (annotation.type === 'text' ? 100 : 300)) - 10 && 
          x <= annotation.x + (annotation.width || (annotation.type === 'text' ? 100 : 300)) + 10 &&
          y >= annotation.y + (annotation.height || (annotation.type === 'text' ? 30 : 200)) - 10 && 
          y <= annotation.y + (annotation.height || (annotation.type === 'text' ? 30 : 200)) + 10
        );
        
        if (clickedResizeAnnotation) {
          e.preventDefault();
          setResizingAnnotationId(clickedResizeAnnotation.id);
          setResizeStart({
            x: clickedResizeAnnotation.x,
            y: clickedResizeAnnotation.y,
            width: clickedResizeAnnotation.width || (clickedResizeAnnotation.type === 'text' ? 100 : 300),
            height: clickedResizeAnnotation.height || (clickedResizeAnnotation.type === 'text' ? 30 : 200)
          });
        } else {
          // Check if clicking on draggable area of text box or image (works for any tool or no tool)
          const clickedDragAnnotation = annotations.find(annotation => 
            (annotation.type === 'text' || annotation.type === 'image') &&
            x >= annotation.x && x <= annotation.x + (annotation.width || (annotation.type === 'text' ? 100 : 300)) &&
            y >= annotation.y && y <= annotation.y + (annotation.height || (annotation.type === 'text' ? 30 : 200))
          );
          
          if (clickedDragAnnotation) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Starting drag for annotation:', clickedDragAnnotation.id, 'at position:', x, y, 'annotation type:', clickedDragAnnotation.type);
            setDraggingAnnotationId(clickedDragAnnotation.id);
            setDragStart({ x, y });
            return; // Exit early to prevent other handlers
          }
        }
      }
    }, [activeTab, selectedTool, annotations, saveToHistory]);


    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      if (draggingAnnotationId) {
        console.log('Mouse move while dragging:', draggingAnnotationId);
      }
      
      if (isDrawing) {
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setDrawingPath(prev => [...prev, { x, y }]);
      } else if (resizingAnnotationId && resizeStart) {
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;
        
        const resizingAnnotation = annotations.find(a => a.id === resizingAnnotationId);
        const minWidth = resizingAnnotation?.type === 'image' ? 100 : 50;
        const minHeight = resizingAnnotation?.type === 'image' ? 100 : 30;
        
        const newWidth = Math.max(currentX - resizeStart.x, minWidth);
        const newHeight = Math.max(currentY - resizeStart.y, minHeight);
        
        const updatedAnnotations = annotations.map(annotation =>
          annotation.id === resizingAnnotationId
            ? { ...annotation, width: newWidth, height: newHeight }
            : annotation
        );
        setAnnotations(updatedAnnotations);
      } else if (draggingAnnotationId && dragStart) {
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;
        
        const deltaX = currentX - dragStart.x;
        const deltaY = currentY - dragStart.y;
        
        console.log('Dragging annotation:', draggingAnnotationId, 'delta:', deltaX, deltaY, 'new pos:', currentX, currentY);
        
        const updatedAnnotations = annotations.map(annotation =>
          annotation.id === draggingAnnotationId
            ? { 
                ...annotation, 
                x: Math.max(0, annotation.x + deltaX),
                y: Math.max(0, annotation.y + deltaY)
              }
            : annotation
        );
        setAnnotations(updatedAnnotations);
        setDragStart({ x: currentX, y: currentY });
      }
    }, [isDrawing, resizingAnnotationId, resizeStart, draggingAnnotationId, dragStart, annotations]);

    const handleMouseUp = useCallback((e?: React.MouseEvent<HTMLDivElement>) => {
      if (isDrawing && drawingPath.length > 1) {
        // Create a path annotation for freehand drawing
        const newAnnotation: Annotation = {
          id: Date.now().toString(),
          type: 'draw',
          x: Math.min(...drawingPath.map(p => p.x)),
          y: Math.min(...drawingPath.map(p => p.y)),
          width: Math.max(...drawingPath.map(p => p.x)) - Math.min(...drawingPath.map(p => p.x)),
          height: Math.max(...drawingPath.map(p => p.y)) - Math.min(...drawingPath.map(p => p.y)),
          color: '#000000', // Default black color
          pathData: drawingPath, // Store the actual path data
          penSize: 'medium' // Default medium size
        };
        const newAnnotations = [...annotations, newAnnotation];
        setAnnotations(newAnnotations);
        saveToHistory(newAnnotations);
        setDrawingPath([]);
        setIsDrawing(false);
      } else if (resizingAnnotationId) {
        // Finish resizing
        setResizingAnnotationId(null);
        setResizeStart(null);
        saveToHistory(annotations);
      } else if (draggingAnnotationId) {
        // Finish dragging
        console.log('Finished dragging annotation:', draggingAnnotationId);
        setDraggingAnnotationId(null);
        setDragStart(null);
        saveToHistory(annotations);
      } else {
        setIsDrawing(false);
      }
    }, [isDrawing, drawingPath, annotations, saveToHistory, resizingAnnotationId, draggingAnnotationId]);

    const renderAnnotations = () => {
      return annotations.map((annotation) => {
        
        if (annotation.type === 'draw' && annotation.pathData) {
          const pathData = annotation.pathData.reduce((path, point, index) => {
            if (index === 0) return `M ${point.x} ${point.y}`;
            return `${path} L ${point.x} ${point.y}`;
          }, '');

          const penSizes = { small: 2, medium: 4, large: 6 };
          const strokeWidth = annotation.penSize ? penSizes[annotation.penSize] : penSizes.medium;

          return (
            <svg
              key={annotation.id}
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
              style={{ zIndex: 5 }}
            >
              <path
                d={pathData}
                stroke={annotation.color || '#000000'}
                strokeWidth={strokeWidth}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          );
        }

        return (
          <div
            key={annotation.id}
            className={`absolute ${annotation.type === 'text' ? 'pointer-events-auto' : 'pointer-events-none'}`}
            style={{
              left: annotation.x,
              top: annotation.y,
              width: annotation.width,
              height: annotation.height,
            }}
          >
            {annotation.type === 'text' && (
              <div className="relative group">
                <div
                  className={`bg-transparent border-2 text-sm cursor-text overflow-hidden transition-all duration-200 flex items-center justify-start ${
                    editingAnnotationId === annotation.id 
                      ? 'border-blue-500 shadow-lg' 
                      : 'border-blue-400 hover:border-blue-500 hover:shadow-md'
                  }`}
                  style={{
                    width: annotation.width || 100,
                    height: annotation.height || 30,
                    minWidth: 50,
                    minHeight: 30,
                    padding: '4px 8px',
                    boxSizing: 'border-box',
                    lineHeight: '1.2',
                    verticalAlign: 'middle'
                  }}
                  contentEditable
                  suppressContentEditableWarning
                  ref={(el) => {
                    // Auto-focus when this annotation is being edited
                    if (editingAnnotationId === annotation.id && el) {
                      setTimeout(() => {
                        el.focus();
                        if (!annotation.content) {
                          el.textContent = '';
                        }
                      }, 0);
                    }
                  }}
                  onFocus={(e) => {
                    setEditingAnnotationId(annotation.id);
                  }}
                  onBlur={(e) => {
                    setEditingAnnotationId(null);
                    const content = e.currentTarget.textContent || '';
                    const updatedAnnotations = annotations.map(a =>
                      a.id === annotation.id ? { ...a, content } : a
                    );
                    setAnnotations(updatedAnnotations);
                    saveToHistory(updatedAnnotations);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      e.currentTarget.blur();
                    }
                  }}
                  onInput={(e) => {
                    // Auto-resize text box based on content
                    const element = e.currentTarget;
                    element.style.height = 'auto';
                    element.style.height = Math.max(element.scrollHeight, 30) + 'px';
                  }}
                >
                  {annotation.content || (editingAnnotationId === annotation.id ? '' : 'Click to edit text')}
                </div>
                
                {/* Resize handle - only show on hover */}
                <div
                  className="absolute w-3 h-3 bg-blue-500 cursor-se-resize opacity-0 group-hover:opacity-70 hover:opacity-100 transition-opacity duration-200"
                  style={{
                    right: -6,
                    bottom: -6,
                    borderRadius: '50%'
                  }}
                  title="Drag to resize"
                />
                
                {/* Delete button - only show on hover */}
                <button
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full hover:bg-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    const newAnnotations = annotations.filter(a => a.id !== annotation.id);
                    setAnnotations(newAnnotations);
                    saveToHistory(newAnnotations);
                  }}
                  title="Delete text box"
                >
                  ×
                </button>
              </div>
            )}
            {annotation.type === 'highlight' && (
              <div
                className="bg-blue-200 opacity-50 rounded"
                style={{
                  width: annotation.width,
                  height: annotation.height,
                }}
              />
            )}
            {annotation.type === 'shape' && (
              <div
                className="border-2 border-red-500 rounded"
                style={{
                  width: annotation.width,
                  height: annotation.height,
                }}
              />
            )}
            {annotation.type === 'image' && (
              // Completely hide image annotations - show nothing after upload
              null
            )}
          </div>
        );
      });
    };

    const renderDrawingPath = () => {
      if (drawingPath.length < 2) return null;
      
      const pathData = drawingPath.reduce((path, point, index) => {
        if (index === 0) return `M ${point.x} ${point.y}`;
        return `${path} L ${point.x} ${point.y}`;
      }, '');

      return (
        <svg
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
          style={{ zIndex: 10 }}
        >
          <path
            d={pathData}
            stroke="#000000"
            strokeWidth={4}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    };

    return (
      <div className="flex justify-center">
        <div className="w-full">
          <div
            ref={domRef}
            className="bg-white shadow-lg mx-auto w-full sm:!p-6 lg:!p-8 sm:!pb-24 lg:!pb-32 relative"
            style={{
              width: '100%',
              minHeight: '1123px',
              padding: '16px',
              paddingBottom: '80px',
              color: '#000000',
              position: 'relative',
              border: '1px solid #e5e7eb',
              boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
              background: 'white',
              fontFamily: "Inter, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
              lineHeight: 1.6,
              cursor: activeTab === 'view' ? 'default' : 
                     selectedTool === 'draw' ? 'crosshair' :
                     selectedTool === 'eraser' ? 'crosshair' :
                     selectedTool === 'text' ? 'crosshair' :
                     draggingAnnotationId ? 'grabbing' :
                     'default'
            }}
            onClick={handleCanvasClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Show different content based on active tab */}
            {activeTab === 'view' ? (
              <>
                <SiteInspectionReportTemplate 
                  project={project} 
                  selectedFile={selectedFile}
                  annotations={reportAnnotations}
                  photos={photos}
                />
                <ProjectNotesSection notes={notes} />
              </>
            ) : (
              /* Show SVG image in annotate mode with camera icons */
              <div className="flex justify-center items-center w-full h-full min-h-[800px] relative">
                <img 
                  src="/annotate-image.svg" 
                  alt="Annotate Image" 
                  className="max-w-full max-h-full object-contain"
                />
                
                {/* Camera icons positioned at corners and center */}
                {/* Clickable camera buttons that open the modal */}
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="absolute top-32 left-32 w-10 h-10 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 cursor-pointer z-10"
                  title="Add Pictures with Notes"
                >
                  <CameraIcon className="w-5 h-5" />
                </button>
                
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="absolute top-32 right-32 w-10 h-10 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 cursor-pointer z-10"
                  title="Add Pictures with Notes"
                >
                  <CameraIcon className="w-5 h-5" />
                </button>
                
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="absolute bottom-32 left-32 w-10 h-10 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 cursor-pointer z-10"
                  title="Add Pictures with Notes"
                >
                  <CameraIcon className="w-5 h-5" />
                </button>
                
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="absolute bottom-32 right-32 w-10 h-10 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 cursor-pointer z-10"
                  title="Add Pictures with Notes"
                >
                  <CameraIcon className="w-5 h-5" />
                </button>
                
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 cursor-pointer z-10"
                  title="Add Pictures with Notes"
                >
                  <CameraIcon className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Render annotations - only show when not in view mode */}
            {activeTab !== 'view' && renderAnnotations()}
            
            {/* Render drawing path - only show when not in view mode */}
            {activeTab !== 'view' && renderDrawingPath()}



            {/* Footer */}
            <div className="absolute bottom-2 sm:bottom-6 left-2 sm:left-6 right-2 sm:right-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 sm:gap-0 text-[10px] sm:text-[11px] text-gray-500 bg-white/80 p-2 sm:p-3 rounded backdrop-blur-sm">
              <span className="font-medium">Generated by DocuSite</span>
              <span className="font-medium">Report Version 1.0</span>
            </div>
          </div>
        </div>
        
        {/* Add Pictures with Notes Modal */}
        <AddPicturesWithNotesModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onAdd={(pictures, note) => {
            // Handle the uploaded pictures and notes
            console.log('Pictures uploaded:', pictures);
            console.log('Note added:', note);
            // Close modal after handling
            setIsModalOpen(false);
          }}
        />
      </div>
    );
  }
);

DocumentViewer.displayName = 'DocumentViewer';

export default DocumentViewer;



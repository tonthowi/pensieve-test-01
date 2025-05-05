import React from 'react';
import { MousePointer2, StickyNote, Type, Square, Circle, ImageIcon, Pencil, Eraser, Hand, Undo2, Redo2, Grid3X3, Download, Plus, Minus, Trash2 } from 'lucide-react';
import useCanvasStore from '../../store/useCanvasStore';
import { Tool } from '../../types';
import ColorPicker from './ColorPicker';

const Toolbar: React.FC = () => {
  const { 
    tool, 
    setTool, 
    zoomLevel, 
    setZoomLevel, 
    toggleGrid,
    gridVisible,
    undo, 
    redo,
    drawingColor,
    setDrawingColor,
    strokeWidth,
    setStrokeWidth,
    elements,
    selectedIds,
    removeElement,
    reset
  } = useCanvasStore();

  const handleToolChange = (newTool: Tool) => {
    setTool(newTool);
  };

  const handleZoomIn = () => {
    setZoomLevel(Math.min(5, zoomLevel * 1.1));
  };

  const handleZoomOut = () => {
    setZoomLevel(Math.max(0.1, zoomLevel / 1.1));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
  };

  const handleExport = () => {
    // Get Konva stage
    const stage = document.querySelector('canvas');
    if (!stage) return;

    // Create a new canvas that includes the stage
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return;

    // Set canvas size to current viewport
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Draw stage to canvas
    context.drawImage(stage, 0, 0);

    // Create a download link
    const link = document.createElement('a');
    link.download = 'whiteboard-' + new Date().toISOString().slice(0, 10) + '.png';
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteSelected = () => {
    for (const id of selectedIds) {
      removeElement(id);
    }
  };

  // Group tools by category
  const toolGroups = [
    {
      title: 'Selection',
      tools: [
        { id: 'select', icon: <MousePointer2 size={20} />, label: 'Select' },
        { id: 'hand', icon: <Hand size={20} />, label: 'Pan' },
      ]
    },
    {
      title: 'Elements',
      tools: [
        { id: 'sticky', icon: <StickyNote size={20} />, label: 'Sticky Note' },
        { id: 'text', icon: <Type size={20} />, label: 'Text' },
        { id: 'rectangle', icon: <Square size={20} />, label: 'Rectangle' },
        { id: 'ellipse', icon: <Circle size={20} />, label: 'Ellipse' },
        { id: 'image', icon: <ImageIcon size={20} />, label: 'Image' },
      ]
    },
    {
      title: 'Drawing',
      tools: [
        { id: 'drawing', icon: <Pencil size={20} />, label: 'Draw' },
        { id: 'eraser', icon: <Eraser size={20} />, label: 'Erase' },
      ]
    }
  ];

  // Stroke width options
  const strokeWidths = [2, 4, 6, 8, 12];

  return (
    <div className="toolbar fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg p-1 z-10 flex flex-col">
      {/* Main tools */}
      <div className="flex space-x-1 p-1">
        {toolGroups.map((group) => (
          <div key={group.title} className="flex space-x-1">
            {group.tools.map((item) => (
              <button
                key={item.id}
                className={`p-2 rounded hover:bg-gray-100 transition-colors ${
                  tool === item.id ? 'bg-gray-200 text-blue-600' : 'text-gray-700'
                }`}
                onClick={() => handleToolChange(item.id as Tool)}
                title={item.label}
              >
                {item.icon}
              </button>
            ))}
            <div className="w-px bg-gray-200 mx-1" />
          </div>
        ))}

        {/* Action buttons */}
        <button
          className={`p-2 rounded hover:bg-gray-100 transition-colors text-gray-700`}
          onClick={undo}
          title="Undo"
        >
          <Undo2 size={20} />
        </button>
        <button
          className={`p-2 rounded hover:bg-gray-100 transition-colors text-gray-700`}
          onClick={redo}
          title="Redo"
        >
          <Redo2 size={20} />
        </button>
        <div className="w-px bg-gray-200 mx-1" />
        
        {/* Delete button - only active when items are selected */}
        <button
          className={`p-2 rounded transition-colors ${
            selectedIds.length > 0 
              ? 'text-red-600 hover:bg-red-50' 
              : 'text-gray-400 cursor-not-allowed'
          }`}
          onClick={handleDeleteSelected}
          disabled={selectedIds.length === 0}
          title="Delete selected"
        >
          <Trash2 size={20} />
        </button>
        
        <div className="w-px bg-gray-200 mx-1" />
        
        <button
          className={`p-2 rounded hover:bg-gray-100 transition-colors ${
            gridVisible ? 'text-blue-600' : 'text-gray-700'
          }`}
          onClick={toggleGrid}
          title="Toggle grid"
        >
          <Grid3X3 size={20} />
        </button>
        
        <button
          className={`p-2 rounded hover:bg-gray-100 transition-colors text-gray-700`}
          onClick={handleExport}
          title="Export as PNG"
        >
          <Download size={20} />
        </button>
      </div>

      {/* Conditional tool options */}
      {tool === 'drawing' && (
        <div className="flex items-center justify-between border-t border-gray-200 pt-2 px-2">
          <div className="flex space-x-2 items-center">
            <span className="text-xs text-gray-600">Color:</span>
            <ColorPicker 
              color={drawingColor} 
              onChange={setDrawingColor} 
            />
          </div>
          <div className="flex space-x-2 items-center">
            <span className="text-xs text-gray-600">Size:</span>
            <div className="flex space-x-1">
              {strokeWidths.map((width) => (
                <button
                  key={width}
                  className={`w-6 h-6 flex items-center justify-center rounded ${
                    strokeWidth === width ? 'bg-gray-200' : 'bg-white'
                  }`}
                  onClick={() => setStrokeWidth(width)}
                  title={`${width}px`}
                >
                  <div 
                    className="rounded-full bg-black" 
                    style={{ 
                      width: Math.min(width * 1.5, 18), 
                      height: Math.min(width * 1.5, 18) 
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Toolbar;
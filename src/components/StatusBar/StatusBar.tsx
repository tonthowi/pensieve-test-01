import React from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Save, 
  Trash
} from 'lucide-react';
import useCanvasStore from '../../store/useCanvasStore';

const StatusBar: React.FC = () => {
  const { 
    zoomLevel, 
    setZoomLevel, 
    saveToLocalStorage, 
    reset, 
    elements
  } = useCanvasStore();

  const handleSave = () => {
    const success = saveToLocalStorage();
    
    if (success) {
      // Show a temporary success message
      const notification = document.createElement('div');
      notification.className = 'fixed bottom-20 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded shadow-md';
      notification.textContent = 'Whiteboard saved successfully!';
      document.body.appendChild(notification);
      
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 2000);
    }
  };

  const handleReset = () => {
    if (elements.length === 0 || window.confirm('Are you sure you want to clear the whiteboard? This cannot be undone.')) {
      reset();
    }
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

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-2 z-10 flex items-center">
      <div className="flex items-center space-x-2 mr-4">
        <button
          className="p-1 rounded hover:bg-gray-100 transition-colors"
          onClick={handleZoomOut}
          title="Zoom out"
        >
          <ZoomOut size={18} />
        </button>
        <button 
          className="px-2 py-0.5 text-sm border border-gray-300 rounded hover:bg-gray-100"
          onClick={handleResetZoom}
        >
          {Math.round(zoomLevel * 100)}%
        </button>
        <button
          className="p-1 rounded hover:bg-gray-100 transition-colors"
          onClick={handleZoomIn}
          title="Zoom in"
        >
          <ZoomIn size={18} />
        </button>
      </div>
      
      <div className="h-6 w-px bg-gray-300 mx-2"></div>
      
      <button
        className="p-1 text-indigo-600 rounded hover:bg-indigo-50 transition-colors"
        onClick={handleSave}
        title="Save to browser storage"
      >
        <Save size={18} />
      </button>
      
      <button
        className="p-1 text-red-600 rounded hover:bg-red-50 transition-colors"
        onClick={handleReset}
        title="Clear whiteboard"
      >
        <Trash size={18} />
      </button>
    </div>
  );
};

export default StatusBar;
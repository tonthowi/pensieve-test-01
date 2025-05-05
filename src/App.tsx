import React, { useEffect } from 'react';
import Board from './components/Canvas/Board';
import Toolbar from './components/Toolbar/Toolbar';
import StatusBar from './components/StatusBar/StatusBar';
import CursorOverlay from './components/Cursor/CursorOverlay';

function App() {
  // Update document title
  useEffect(() => {
    document.title = "Whiteboard";
    
    // Set up keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent shortcuts when typing in text inputs
      if (
        e.target instanceof HTMLInputElement || 
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      
      // Ctrl+Z = Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        useCanvasStore.getState().undo();
      }
      
      // Ctrl+Shift+Z or Ctrl+Y = Redo
      if ((e.ctrlKey || e.metaKey) && ((e.shiftKey && e.key === 'z') || e.key === 'y')) {
        e.preventDefault();
        useCanvasStore.getState().redo();
      }
      
      // Delete or Backspace = Delete selected
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const { selectedIds, removeElement } = useCanvasStore.getState();
        for (const id of selectedIds) {
          removeElement(id);
        }
      }
      
      // Esc = Clear selection
      if (e.key === 'Escape') {
        useCanvasStore.getState().clearSelection();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
  
  return (
    <div className="w-full h-screen overflow-hidden bg-gray-50">
      <Toolbar />
      <Board />
      <StatusBar />
      <CursorOverlay />
    </div>
  );
}

// Add useCanvasStore import to make keyboard shortcuts work
// This needs to be imported here to avoid circular dependencies
import useCanvasStore from './store/useCanvasStore';

export default App;
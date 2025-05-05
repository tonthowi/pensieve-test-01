import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Stage, Layer, Group } from 'react-konva';
import useCanvasStore from '../../store/useCanvasStore';
import Grid from './Grid';
import StickyNote from '../Elements/StickyNote';
import TextBox from '../Elements/TextBox';
import RectangleShape from '../Elements/RectangleShape';
import EllipseShape from '../Elements/EllipseShape';
import DrawingElement from '../Elements/DrawingElement';
import ImageElement from '../Elements/ImageElement';
import { Position, Element } from '../../types';

// Boundary constants to prevent infinite panning
const MAX_PAN_DISTANCE = 10000; // Maximum distance users can pan away from center

const Board: React.FC = () => {
  const stageRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  
  const {
    elements,
    viewportPosition,
    zoomLevel,
    createElement,
    updateElement,
    clearSelection,
    selectedIds,
    tool,
    saveToHistory 
  } = useCanvasStore();

  const selectElement = useCanvasStore(state => state.selectElement);

  // Keep track of ongoing drawing
  const isDrawingRef = useRef(false);
  const currentDrawingId = useRef<string | null>(null);
  const lastPointerPosition = useRef<Position>({ x: 0, y: 0 });
  const isPanning = useRef(false);

  // Load canvas from localStorage on component mount
  useEffect(() => {
    useCanvasStore.getState().loadFromLocalStorage();
    
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    
    window.addEventListener('resize', handleResize);
    
    // Save canvas to localStorage periodically and before unloading
    const autoSaveInterval = setInterval(useCanvasStore.getState().saveToLocalStorage, 30000); // Auto-save every 30 seconds
    window.addEventListener('beforeunload', useCanvasStore.getState().saveToLocalStorage);
    
    // Prevent default touch behaviors that interfere with canvas interactions
    const preventDefaultTouchBehavior = (e: Event) => {
      // Cast to any since gesture events aren't in standard DOM types
      const touchEvent = e as any;
      if (touchEvent.touches && touchEvent.touches.length > 1) {
        e.preventDefault(); // Prevent browser pinch-zoom when using multi-touch on canvas
      }
    };
    
    // Mobile-specific gesture setup - these are non-standard events so we use string type
    document.addEventListener('gesturestart', preventDefaultTouchBehavior, { passive: false });
    document.addEventListener('gesturechange', preventDefaultTouchBehavior, { passive: false });
    document.addEventListener('touchmove', preventDefaultTouchBehavior, { passive: false });
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('beforeunload', useCanvasStore.getState().saveToLocalStorage);
      document.removeEventListener('gesturestart', preventDefaultTouchBehavior);
      document.removeEventListener('gesturechange', preventDefaultTouchBehavior);
      document.removeEventListener('touchmove', preventDefaultTouchBehavior);
      clearInterval(autoSaveInterval);
    };
  }, []);

  // Handle pointer down
  const handlePointerDown = (e: any) => {
    // Get pointer position relative to the stage
    const stage = stageRef.current;
    const pointerPos = stage.getPointerPosition();
    
    // Get the actual position accounting for zoom and pan
    const actualX = (pointerPos.x - stage.x()) / zoomLevel;
    const actualY = (pointerPos.y - stage.y()) / zoomLevel;
    
    // Store the pointer position for panning
    lastPointerPosition.current = { x: pointerPos.x, y: pointerPos.y };
    
    // Check if we clicked on the stage background
    const clickedOnEmpty = e.target === e.currentTarget;
    
    if (clickedOnEmpty) {
      // Clear selection if clicked on empty area
      clearSelection();
      
      // Check which tool is active
      if (tool === 'select' || tool === 'hand') {
        if (tool === 'hand' || e.evt.button === 1 || e.evt.ctrlKey || e.evt.metaKey) {
          // Middle button or Ctrl/Command key for panning
          isPanning.current = true;
          document.body.style.cursor = 'grabbing';
        }
      } else if (tool === 'drawing') {
        // Start drawing
        isDrawingRef.current = true;
        const id = createElement('drawing', { x: actualX, y: actualY });
        currentDrawingId.current = id;
      } else if (['sticky', 'text', 'rectangle', 'ellipse'].includes(tool)) {
        // Create a new element with auto-editing for text
        // After creation, it will auto-switch back to Select tool
        handleElementCreation(tool as Element['type'], { x: actualX, y: actualY });
      } else if (tool === 'image') {
        // Open file browser to select an image
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              // After creation, it will auto-switch back to Select tool
              const id = handleElementCreation('image', { x: actualX, y: actualY });
              const src = event.target?.result as string;
              updateElement(id, { 
                src,
                type: 'image'
              });
              saveToHistory();
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
      }
    }
  };

  // Handle pointer move
  const handlePointerMove = (e: any) => {
    if (!stageRef.current) return;
    
    const stage = stageRef.current;
    const pointerPos = stage.getPointerPosition();
    
    if (!pointerPos) return;
    
    // Get the actual position accounting for zoom and pan
    const actualX = (pointerPos.x - stage.x()) / zoomLevel;
    const actualY = (pointerPos.y - stage.y()) / zoomLevel;
    
    // Update drawing if we're drawing
    if (isDrawingRef.current && currentDrawingId.current) {
      useCanvasStore.getState().addPointToDrawing(currentDrawingId.current, { x: actualX, y: actualY });
    }
    
    // Handle panning
    if (isPanning.current) {
      const dx = pointerPos.x - lastPointerPosition.current.x;
      const dy = pointerPos.y - lastPointerPosition.current.y;
      
      // Calculate proposed new position after the move
      const currentPosition = viewportPosition;
      const proposedX = currentPosition.x + dx;
      const proposedY = currentPosition.y + dy;
      
      // Clamp position to prevent infinite panning
      const clampedX = Math.max(-MAX_PAN_DISTANCE, Math.min(MAX_PAN_DISTANCE, proposedX));
      const clampedY = Math.max(-MAX_PAN_DISTANCE, Math.min(MAX_PAN_DISTANCE, proposedY));
      
      // Apply movement with boundaries
      useCanvasStore.getState().moveViewport({ 
        x: clampedX === proposedX ? dx : 0, 
        y: clampedY === proposedY ? dy : 0 
      });
      
      // Visual feedback when hitting boundary
      if (clampedX !== proposedX || clampedY !== proposedY) {
        // Brief visual indication we've hit the edge
        document.body.style.cursor = 'not-allowed';
        setTimeout(() => {
          if (isPanning.current) document.body.style.cursor = 'grabbing';
        }, 200);
      }
      
      lastPointerPosition.current = { x: pointerPos.x, y: pointerPos.y };
    }
  };

  // Handle pointer up
  const handlePointerUp = () => {
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      currentDrawingId.current = null;
      saveToHistory();
    }
    
    if (isPanning.current) {
      isPanning.current = false;
      document.body.style.cursor = 'default';
    }
  };

  // Handle wheel event for zoom
  const handleWheel = (e: any) => {
    e.evt.preventDefault(); // Prevent browser scroll

    // Get pointer position relative to the stage
    const stage = stageRef.current;
    const pointer = stage.getPointerPosition();
    
    // Get current scale and calculate new scale
    const oldScale = zoomLevel;
    const scaleBy = 1.05; // Scale factor
    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    
    // Apply zoom limits
    const clampedScale = Math.max(0.1, Math.min(newScale, 5));
    
    // Calculate new position to zoom into/out of the point
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };
    
    // Update zoom level
    useCanvasStore.getState().setZoomLevel(clampedScale);
    
    // Calculate new position after zoom
    const newPos = {
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    };
    
    // Clamp position to boundaries
    const clampedX = Math.max(-MAX_PAN_DISTANCE, Math.min(MAX_PAN_DISTANCE, newPos.x));
    const clampedY = Math.max(-MAX_PAN_DISTANCE, Math.min(MAX_PAN_DISTANCE, newPos.y));
    
    useCanvasStore.getState().setViewportPosition({ x: clampedX, y: clampedY });
  };

  // Render elements based on their type
  const renderElement = (element: Element) => {
    const isSelected = selectedIds.includes(element.id);
    
    switch (element.type) {
      case 'sticky':
        return <StickyNote key={element.id} element={element} isSelected={isSelected} />;
      case 'text':
        return <TextBox key={element.id} element={element} isSelected={isSelected} />;
      case 'rectangle':
        return <RectangleShape key={element.id} element={element} isSelected={isSelected} />;
      case 'ellipse':
        return <EllipseShape key={element.id} element={element} isSelected={isSelected} />;
      case 'drawing':
        return <DrawingElement key={element.id} element={element} isSelected={isSelected} />;
      case 'image':
        return <ImageElement key={element.id} element={element} isSelected={isSelected} />;
      default:
        return null;
    }
  };

  // Memoize touch handlers for optimal performance
  const handleTouchStart = useCallback((e: any) => {
    // Map touch events to pointer events
    if (e.evt.touches.length === 2) {
      // Prepare for pinch-zoom gesture
      const touch1 = e.evt.touches[0];
      const touch2 = e.evt.touches[1];
      const center = {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2,
      };
      
      // Store initial distance for pinch calculation
      const dist = Math.sqrt(
        Math.pow(touch1.clientX - touch2.clientX, 2) +
        Math.pow(touch1.clientY - touch2.clientY, 2)
      );
      
      stageRef.current._lastPinchDistance = dist;
      stageRef.current._pinchCenter = center;
    } else {
      // Single touch - proceed with regular pointer down
      handlePointerDown(e);
    }
  }, [handlePointerDown]);
  
  const handleTouchMove = useCallback((e: any) => {
    e.evt.preventDefault();
    
    // Handle pinch-zoom
    if (e.evt.touches.length === 2) {
      const touch1 = e.evt.touches[0];
      const touch2 = e.evt.touches[1];
      
      const dist = Math.sqrt(
        Math.pow(touch1.clientX - touch2.clientX, 2) +
        Math.pow(touch1.clientY - touch2.clientY, 2)
      );
      
      if (!stageRef.current._lastPinchDistance) {
        stageRef.current._lastPinchDistance = dist;
        return;
      }
      
      const oldScale = zoomLevel;
      const center = stageRef.current._pinchCenter;
      const pointTo = {
        x: (center.x - viewportPosition.x) / oldScale,
        y: (center.y - viewportPosition.y) / oldScale,
      };
      
      // Calculate new scale based on pinch distance change
      const scaleChange = dist / stageRef.current._lastPinchDistance;
      const newScale = Math.max(0.1, Math.min(oldScale * scaleChange, 5));
      
      useCanvasStore.getState().setZoomLevel(newScale);
      
      // Apply new position
      const newPos = {
        x: center.x - pointTo.x * newScale,
        y: center.y - pointTo.y * newScale,
      };
      
      // Clamp position to boundaries
      const clampedX = Math.max(-MAX_PAN_DISTANCE, Math.min(MAX_PAN_DISTANCE, newPos.x));
      const clampedY = Math.max(-MAX_PAN_DISTANCE, Math.min(MAX_PAN_DISTANCE, newPos.y));
      
      useCanvasStore.getState().setViewportPosition({ x: clampedX, y: clampedY });
      
      stageRef.current._lastPinchDistance = dist;
    } else {
      // Single touch - proceed with regular pointer move
      handlePointerMove(e);
    }
  }, [handlePointerMove, zoomLevel, viewportPosition]);
  
  const handleTouchEnd = useCallback((e: any) => {
    // Reset pinch references
    stageRef.current._lastPinchDistance = 0;
    stageRef.current._pinchCenter = null;
    
    // Proceed with regular pointer up
    handlePointerUp();
  }, [handlePointerUp]);

  // Manage cursor display based on active tool
  React.useEffect(() => {
    const stageContainer = stageRef.current?.container();
    if (!stageContainer) return;
    
    // Remove any existing cursor classes
    stageContainer.classList.remove(
      'cursor-select', 'cursor-hand', 'cursor-sticky', 'cursor-text',
      'cursor-rectangle', 'cursor-ellipse', 'cursor-image', 'cursor-drawing', 'cursor-eraser',
      'cursor-none'
    );
    
    // Apply appropriate cursor styling
    if (tool === 'select') {
      // Use default system cursor for select tool (no class needed)
      // This will show the system's default arrow cursor
    } else if (tool === 'hand') {
      // Use grab cursor for hand tool
      stageContainer.classList.add('cursor-hand');
    } else {
      // For all other tools, hide the default cursor and use the overlay
      stageContainer.classList.add('cursor-none');
    }
  }, [tool]);

  // Store a reference to the newly created element ID for immediate editing
  const newElementIdRef = useRef<string | null>(null);
  
  // Handle element creation and auto-editing for text elements
  const handleElementCreation = useCallback((elementType: Element['type'], position: Position) => {
    const id = createElement(elementType, position);
    
    // Store the ID of the newly created element
    newElementIdRef.current = id;
    
    // Auto-focus text elements for editing
    if (elementType === 'text') {
      // Set a small timeout to allow the element to render
      setTimeout(() => {
        const textElement = document.querySelector(`[data-id="${id}"]`);
        if (textElement) {
          // Simulate a double click to start editing
          const dblClickEvent = new MouseEvent('dblclick', {
            bubbles: true,
            cancelable: true,
            view: window
          });
          textElement.dispatchEvent(dblClickEvent);
        }
      }, 50);
    }
    
    // Auto-switch back to Select tool after creating an element
    // except for drawing tool - users expect to continue drawing until manual switch
    if (elementType !== 'drawing') {
      // Use a small timeout to ensure other operations complete first
      setTimeout(() => {
        useCanvasStore.getState().setTool('select');
      }, 100);
    }
    
    return id;
  }, [createElement]);

  return (
    <Stage
      ref={stageRef}
      width={dimensions.width}
      height={dimensions.height}
      x={viewportPosition.x}
      y={viewportPosition.y}
      scaleX={zoomLevel}
      scaleY={zoomLevel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <Layer>
        <Grid width={dimensions.width} height={dimensions.height} />
      </Layer>
      <Layer>
        <Group>
          {elements.map(renderElement)}
        </Group>
      </Layer>
    </Stage>
  );
};

export default Board;
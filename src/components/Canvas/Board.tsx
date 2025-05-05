import React, { useEffect, useRef, useState } from 'react';
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

const Board: React.FC = () => {
  const stageRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  
  const {
    elements,
    selectedIds,
    tool,
    zoomLevel,
    viewportPosition,
    setViewportPosition,
    moveViewport,
    createElement,
    selectElement,
    clearSelection,
    addPointToDrawing,
    saveToHistory,
    saveToLocalStorage,
    loadFromLocalStorage
  } = useCanvasStore();

  // Keep track of ongoing drawing
  const isDrawingRef = useRef(false);
  const currentDrawingId = useRef<string | null>(null);
  const lastPointerPosition = useRef<Position>({ x: 0, y: 0 });
  const isPanning = useRef(false);

  // Load canvas from localStorage on component mount
  useEffect(() => {
    loadFromLocalStorage();
    
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    
    window.addEventListener('resize', handleResize);
    
    // Save canvas to localStorage before unloading
    window.addEventListener('beforeunload', saveToLocalStorage);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('beforeunload', saveToLocalStorage);
    };
  }, [loadFromLocalStorage, saveToLocalStorage]);

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
        // Create a new element
        createElement(tool as Element['type'], { x: actualX, y: actualY });
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
              const id = createElement('image', { x: actualX, y: actualY });
              const src = event.target?.result as string;
              useCanvasStore.getState().updateElement(id, { 
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
      addPointToDrawing(currentDrawingId.current, { x: actualX, y: actualY });
    }
    
    // Handle panning
    if (isPanning.current) {
      const dx = pointerPos.x - lastPointerPosition.current.x;
      const dy = pointerPos.y - lastPointerPosition.current.y;
      
      moveViewport({ x: dx, y: dy });
      
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
    e.evt.preventDefault();
    
    const stage = stageRef.current;
    const oldScale = zoomLevel;
    
    const pointer = stage.getPointerPosition();
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };
    
    // Determine new scale
    // Zoom in slower and out faster for better UX
    const zoomDirection = e.evt.deltaY > 0 ? -1 : 1;
    const scaleBy = zoomDirection > 0 ? 1.1 : 0.9;
    const newScale = Math.max(0.1, Math.min(oldScale * scaleBy, 5));
    
    useCanvasStore.getState().setZoomLevel(newScale);
    
    // Calculate new position after zoom
    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };
    
    setViewportPosition(newPos);
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
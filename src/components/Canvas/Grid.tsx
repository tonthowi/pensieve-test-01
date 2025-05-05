import React, { useMemo, memo, useRef, useEffect } from 'react';
import { Group, Circle } from 'react-konva';
import useCanvasStore from '../../store/useCanvasStore';

interface GridProps {
  width: number;
  height: number;
}

const Grid: React.FC<GridProps> = ({ width, height }) => {
  const zoomLevel = useCanvasStore(state => state.zoomLevel);
  const viewportPosition = useCanvasStore(state => state.viewportPosition);
  const gridVisible = useCanvasStore(state => state.gridVisible);

  // Ref for grid group to enable caching
  const groupRef = useRef<any>(null);
  
  // Use ref to track previous values to prevent recursive updates
  const prevPropsRef = useRef({ width, height, zoomLevel, x: viewportPosition.x, y: viewportPosition.y });
  
  // Memoize dots calculation
  const dots = useMemo(() => {
    const gridSize = 20;
    const scaledGridSize = gridSize * zoomLevel;
    const offsetX = (viewportPosition.x % scaledGridSize) - scaledGridSize;
    const offsetY = (viewportPosition.y % scaledGridSize) - scaledGridSize;
    const numCols = Math.ceil(width / scaledGridSize) + 2;
    const numRows = Math.ceil(height / scaledGridSize) + 2;
    return Array.from({ length: numCols }).flatMap((_, i) =>
      Array.from({ length: numRows }).map((_, j) => {
        const x = offsetX + i * scaledGridSize;
        const y = offsetY + j * scaledGridSize;
        return (
          <Circle
            key={`dot-${i}-${j}`}
            x={x}
            y={y}
            radius={1}
            fill="#000000"
            opacity={0.2}
          />
        );
      })
    );
  }, [width, height, zoomLevel, viewportPosition.x, viewportPosition.y]);

  // Cache grid layer as a single texture to avoid re-drawing thousands of circles
  
  useEffect(() => {
    if (!groupRef.current) return;
    
    // Check if values changed significantly enough to warrant a recache
    const prevProps = prevPropsRef.current;
    const hasSignificantChange = 
      Math.abs(prevProps.x - viewportPosition.x) > 10 || 
      Math.abs(prevProps.y - viewportPosition.y) > 10 ||
      prevProps.width !== width ||
      prevProps.height !== height ||
      prevProps.zoomLevel !== zoomLevel;
    
    if (!hasSignificantChange) return;
    
    // Update our ref with current values
    prevPropsRef.current = { 
      width, 
      height, 
      zoomLevel, 
      x: viewportPosition.x, 
      y: viewportPosition.y 
    };
    
    const gridSize = 20;
    const scaledGridSize = gridSize * zoomLevel;
    const x = viewportPosition.x - scaledGridSize;
    const y = viewportPosition.y - scaledGridSize;
    const w = width + scaledGridSize * 2;
    const h = height + scaledGridSize * 2;
    
    // Clear previous cache before setting a new one
    groupRef.current.clearCache();
    
    // Delay the cache operation slightly to break potential render loops
    setTimeout(() => {
      if (groupRef.current) {
        groupRef.current.cache({ 
          x, 
          y, 
          width: w, 
          height: h, 
          pixelRatio: Math.min(2, window.devicePixelRatio || 1)
        });
      }
    }, 0);
  }, [width, height, zoomLevel, viewportPosition.x, viewportPosition.y]);
  
  // Don't render if grid is not visible - IMPORTANT: only return after all hooks
  if (!gridVisible) return null;

  return (
    <Group ref={groupRef} listening={false} perfectDrawEnabled={false} hitGraphEnabled={false}>
      {dots}
    </Group>
  );
};

export default memo(Grid);
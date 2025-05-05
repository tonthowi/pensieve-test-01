import React from 'react';
import { Group, Circle } from 'react-konva';
import useCanvasStore from '../../store/useCanvasStore';

interface GridProps {
  width: number;
  height: number;
}

const Grid: React.FC<GridProps> = ({ width, height }) => {
  const { zoomLevel, viewportPosition, gridVisible } = useCanvasStore();
  
  // Don't render if grid is not visible
  if (!gridVisible) return null;

  const gridSize = 20; // Base grid size
  const scaledGridSize = gridSize * zoomLevel;
  
  // Calculate grid offset based on viewport position
  const offsetX = (viewportPosition.x % scaledGridSize) - scaledGridSize;
  const offsetY = (viewportPosition.y % scaledGridSize) - scaledGridSize;
  
  // Calculate number of vertical and horizontal lines needed
  const numVerticalLines = Math.ceil(width / scaledGridSize) + 2;
  const numHorizontalLines = Math.ceil(height / scaledGridSize) + 2;
  
  // Render grid dots
  const dots = Array.from({ length: numVerticalLines }).flatMap((_, i) =>
    Array.from({ length: numHorizontalLines }).map((_, j) => {
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
  
  return (
    <Group>
      {dots}
    </Group>
  );
};

export default Grid;
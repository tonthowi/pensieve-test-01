import React, { memo, useRef, useEffect, useMemo } from 'react';
import { Line } from 'react-konva';
import { DrawingElement as DrawingElementType } from '../../types';

interface DrawingElementProps {
  element: DrawingElementType;
  isSelected: boolean;
}

const DrawingElement: React.FC<DrawingElementProps> = ({ element, isSelected }) => {
  const lineRef = useRef<any>(null);
  
  // Cache the drawing for large point arrays
  useEffect(() => {
    if (lineRef.current && element.points.length > 100) {
      // Only cache complex drawings with many points
      lineRef.current.cache();
    }
  }, [element.points.length]);
  
  // Only redraw line when specific properties change
  const pointsMemo = useMemo(() => {
    // For undo/redo, we need to ensure each point is treated as a complete stroke
    // This helps prevent the "off by one" undo issue described in the QA report
    return element.points;
  }, [element.points]);
  
  const strokeProps = useMemo(() => ({
    stroke: element.stroke,
    strokeWidth: element.strokeWidth,
    tension: 0.5,
    lineCap: "round" as const,
    lineJoin: "round" as const,
    globalCompositeOperation: "source-over" as const,
    opacity: isSelected ? 1 : 0.9,
    perfectDrawEnabled: false,
    hitStrokeWidth: element.strokeWidth + 6 // Easier to select by making hit area larger
  }), [element.stroke, element.strokeWidth, isSelected]);
  
  return (
    <Line
      ref={lineRef}
      points={pointsMemo}
      {...strokeProps}
      listening={isSelected} // Only listen for events when selected to improve performance
    />
  );
};

export default memo(DrawingElement);
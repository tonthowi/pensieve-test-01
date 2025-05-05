import React from 'react';
import { Line } from 'react-konva';
import { DrawingElement as DrawingElementType } from '../../types';

interface DrawingElementProps {
  element: DrawingElementType;
  isSelected: boolean;
}

const DrawingElement: React.FC<DrawingElementProps> = ({ element, isSelected }) => {
  return (
    <Line
      points={element.points}
      stroke={element.stroke}
      strokeWidth={element.strokeWidth}
      tension={0.5}
      lineCap="round"
      lineJoin="round"
      globalCompositeOperation="source-over"
      opacity={isSelected ? 1 : 0.9}
    />
  );
};

export default DrawingElement;
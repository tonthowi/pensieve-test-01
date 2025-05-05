import React, { useRef } from 'react';
import { Group, Rect, Transformer } from 'react-konva';
import { RectangleElement } from '../../types';
import useCanvasStore from '../../store/useCanvasStore';

interface RectangleShapeProps {
  element: RectangleElement;
  isSelected: boolean;
}

const RectangleShape: React.FC<RectangleShapeProps> = ({ element, isSelected }) => {
  const shapeRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);

  const { updateElement, selectElement, saveToHistory } = useCanvasStore();

  // Set up transformer when selected
  React.useEffect(() => {
    if (isSelected && transformerRef.current && shapeRef.current) {
      transformerRef.current.nodes([shapeRef.current]);
      transformerRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  // Handle drag end and save to history
  const handleDragEnd = (e: any) => {
    updateElement(element.id, {
      position: { x: e.target.x(), y: e.target.y() }
    });
    saveToHistory();
  };

  // Handle transform end and update element dimensions
  const handleTransformEnd = () => {
    if (!shapeRef.current) return;

    const node = shapeRef.current;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    const rotation = node.rotation();

    // Reset scale and adjust size
    node.scaleX(1);
    node.scaleY(1);

    updateElement(element.id, {
      position: { x: node.x(), y: node.y() },
      size: { 
        width: Math.max(10, node.width() * scaleX), 
        height: Math.max(10, node.height() * scaleY) 
      },
      transform: { 
        rotation, 
        scaleX: 1, 
        scaleY: 1 
      }
    });
    saveToHistory();
  };

  return (
    <>
      <Group>
        <Rect
          ref={shapeRef}
          x={element.position.x}
          y={element.position.y}
          width={element.size.width}
          height={element.size.height}
          fill={element.fill}
          stroke={element.stroke}
          strokeWidth={element.strokeWidth}
          cornerRadius={4}
          draggable
          onClick={() => selectElement(element.id)}
          onTap={() => selectElement(element.id)}
          onDragEnd={handleDragEnd}
          rotation={element.transform.rotation}
        />
      </Group>
      {isSelected && (
        <Transformer
          ref={transformerRef}
          boundBoxFunc={(oldBox, newBox) => {
            // Limit resize to reasonable values
            if (newBox.width < 5 || newBox.height < 5) {
              return oldBox;
            }
            return newBox;
          }}
          onTransformEnd={handleTransformEnd}
          anchorSize={8}
          anchorCornerRadius={4}
          borderStroke="#3b82f6"
          borderStrokeWidth={1}
          anchorStroke="#3b82f6"
          anchorFill="#fff"
        />
      )}
    </>
  );
};

export default RectangleShape;
import React, { useRef, useEffect, useState } from 'react';
import { Group, Image, Transformer } from 'react-konva';
import { ImageElement as ImageElementType } from '../../types';
import useCanvasStore from '../../store/useCanvasStore';

interface ImageElementProps {
  element: ImageElementType;
  isSelected: boolean;
}

const ImageElement: React.FC<ImageElementProps> = ({ element, isSelected }) => {
  const imageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  
  const { updateElement, selectElement, saveToHistory } = useCanvasStore();

  // Load image
  useEffect(() => {
    if (element.src) {
      const img = new window.Image();
      img.src = element.src;
      img.onload = () => {
        setImage(img);
        
        // Update size if it's not set yet
        if (element.size.width === 100 && element.size.height === 100) {
          const aspectRatio = img.width / img.height;
          const newWidth = 200;
          const newHeight = newWidth / aspectRatio;
          
          updateElement(element.id, {
            size: { width: newWidth, height: newHeight }
          });
        }
      };
    }
  }, [element.src, element.id, updateElement]);

  // Set up transformer when selected
  useEffect(() => {
    if (isSelected && transformerRef.current && imageRef.current) {
      transformerRef.current.nodes([imageRef.current]);
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
    if (!imageRef.current) return;

    const node = imageRef.current;
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

  if (!image) return null;

  return (
    <Group>
      <Image
        ref={imageRef}
        x={element.position.x}
        y={element.position.y}
        image={image}
        width={element.size.width}
        height={element.size.height}
        draggable
        onClick={() => selectElement(element.id)}
        onTap={() => selectElement(element.id)}
        onDragEnd={handleDragEnd}
        rotation={element.transform.rotation}
      />
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
    </Group>
  );
};

export default ImageElement;
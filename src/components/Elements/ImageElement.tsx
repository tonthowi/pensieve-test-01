import React, { useRef, useEffect, useState, useCallback, memo } from 'react';
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
  
  // Use specific selectors for better performance
  const updateElement = useCanvasStore(state => state.updateElement);
  const selectElement = useCanvasStore(state => state.selectElement);
  const saveToHistory = useCanvasStore(state => state.saveToHistory);

  // Load image with memory cleanup
  useEffect(() => {
    if (!element.src) return;
    
    // Track if component is still mounted
    let isMounted = true;
    
    // Create a new image and store its URL for cleanup
    const img = new window.Image();
    let objectUrl = '';
    
    // Check if the source is a blob URL or a data URL
    if (element.src.startsWith('blob:')) {
      objectUrl = element.src;
    }
    
    img.src = element.src;
    img.onload = () => {
      // Only update state if component is still mounted
      if (isMounted) {
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
      }
    };
    
    // On unmount or when src changes, clean up resources
    return () => {
      isMounted = false;
      
      // Revoke the Blob URL to prevent memory leaks
      if (objectUrl && objectUrl.startsWith('blob:')) {
        URL.revokeObjectURL(objectUrl);
      }
      
      // Clear image reference
      setImage(null);
    };
  }, [element.src, element.id, element.size.width, element.size.height, updateElement]);

  // Set up transformer when selected
  useEffect(() => {
    if (isSelected && transformerRef.current && imageRef.current) {
      transformerRef.current.nodes([imageRef.current]);
      transformerRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  // Handle drag end and save to history
  const handleDragEnd = useCallback((e: any) => {
    updateElement(element.id, {
      position: { x: e.target.x(), y: e.target.y() }
    });
    saveToHistory();
  }, [element.id, updateElement, saveToHistory]);

  // Handle transform end and update element dimensions
  const handleTransformEnd = useCallback(() => {
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
  }, [element.id, updateElement, saveToHistory]);

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

export default memo(ImageElement);
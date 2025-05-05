import React, { useRef, useState } from 'react';
import { Group, Rect, Text, Transformer } from 'react-konva';
import { StickyElement } from '../../types';
import useCanvasStore from '../../store/useCanvasStore';

interface StickyNoteProps {
  element: StickyElement;
  isSelected: boolean;
}

const StickyNote: React.FC<StickyNoteProps> = ({ element, isSelected }) => {
  const shapeRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);
  const textRef = useRef<any>(null);
  const [isEditing, setIsEditing] = useState(false);

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
        width: Math.max(50, node.width() * scaleX), 
        height: Math.max(50, node.height() * scaleY) 
      },
      transform: { 
        rotation, 
        scaleX: 1, 
        scaleY: 1 
      }
    });
    saveToHistory();
  };

  // Handle double click to edit text
  const handleDblClick = () => {
    setIsEditing(true);
    // Create textarea over Konva text
    const textarea = document.createElement('textarea');
    const layer = textRef.current.getLayer();
    
    document.body.appendChild(textarea);
    
    // Position textarea precisely over the text element
    const textPosition = textRef.current.absolutePosition();
    const stageBox = textRef.current.getStage().container().getBoundingClientRect();
    const scale = textRef.current.getStage().scaleX();
    
    textarea.value = element.text;
    textarea.style.position = 'absolute';
    textarea.style.top = `${stageBox.top + textPosition.y - 5}px`;
    textarea.style.left = `${stageBox.left + textPosition.x}px`;
    textarea.style.width = `${textRef.current.width() * scale - 10}px`;
    textarea.style.height = `${textRef.current.height() * scale - 10}px`;
    textarea.style.fontSize = `${16 * scale}px`;
    textarea.style.border = 'none';
    textarea.style.padding = '5px';
    textarea.style.margin = '0px';
    textarea.style.overflow = 'hidden';
    textarea.style.background = 'none';
    textarea.style.outline = 'none';
    textarea.style.resize = 'none';
    textarea.style.lineHeight = 'normal';
    textarea.style.fontFamily = 'sans-serif';
    textarea.style.transformOrigin = 'left top';
    textarea.style.textAlign = 'left';
    textarea.style.color = '#000000';
    
    textarea.focus();
    
    // Save text on blur and remove textarea
    const handleBlur = () => {
      const newText = textarea.value;
      updateElement(element.id, { text: newText });
      document.body.removeChild(textarea);
      setIsEditing(false);
      saveToHistory();
      layer.batchDraw();
    };
    
    textarea.addEventListener('blur', handleBlur);
  };

  // Calculate content padding
  const padding = 12;

  // Create a subtle shadow effect
  const shadowProps = {
    shadowColor: 'rgba(0,0,0,0.2)',
    shadowBlur: 6,
    shadowOffset: { x: 1, y: 1 },
    shadowOpacity: 0.5
  };

  return (
    <>
      <Group
        x={element.position.x}
        y={element.position.y}
        draggable
        onClick={() => selectElement(element.id)}
        onTap={() => selectElement(element.id)}
        onDragEnd={handleDragEnd}
        ref={shapeRef}
        rotation={element.transform.rotation}
      >
        <Rect
          width={element.size.width}
          height={element.size.height}
          fill={element.color}
          cornerRadius={8}
          {...shadowProps}
        />
        <Text
          ref={textRef}
          text={element.text}
          fontSize={16}
          fontFamily="sans-serif"
          fill="#000000"
          width={element.size.width - padding * 2}
          height={element.size.height - padding * 2}
          x={padding}
          y={padding}
          wrap="word"
          onDblClick={handleDblClick}
          onDblTap={handleDblClick}
          visible={!isEditing}
        />
      </Group>
      {isSelected && (
        <Transformer
          ref={transformerRef}
          boundBoxFunc={(oldBox, newBox) => {
            // Limit resize to reasonable values
            if (newBox.width < 50 || newBox.height < 50) {
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

export default StickyNote;
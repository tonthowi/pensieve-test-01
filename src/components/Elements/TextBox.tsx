import React, { useRef, useState } from 'react';
import { Group, Text, Transformer } from 'react-konva';
import { TextElement } from '../../types';
import useCanvasStore from '../../store/useCanvasStore';

interface TextBoxProps {
  element: TextElement;
  isSelected: boolean;
}

const TextBox: React.FC<TextBoxProps> = ({ element, isSelected }) => {
  const textRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);
  const [isEditing, setIsEditing] = useState(false);

  const { updateElement, selectElement, saveToHistory } = useCanvasStore();

  // Set up transformer when selected
  React.useEffect(() => {
    if (isSelected && transformerRef.current && textRef.current) {
      transformerRef.current.nodes([textRef.current]);
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
    if (!textRef.current) return;

    const node = textRef.current;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    const rotation = node.rotation();

    // Reset scale and adjust size
    node.scaleX(1);
    node.scaleY(1);

    updateElement(element.id, {
      position: { x: node.x(), y: node.y() },
      size: { 
        width: Math.max(20, node.width() * scaleX), 
        height: Math.max(20, node.height() * scaleY) 
      },
      fontSize: element.fontSize * scaleX,
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
    textarea.style.top = `${stageBox.top + textPosition.y}px`;
    textarea.style.left = `${stageBox.left + textPosition.x}px`;
    textarea.style.width = `${element.size.width * scale}px`;
    textarea.style.height = `${element.size.height * scale}px`;
    textarea.style.fontSize = `${element.fontSize * scale}px`;
    textarea.style.border = 'none';
    textarea.style.padding = '0px';
    textarea.style.margin = '0px';
    textarea.style.overflow = 'hidden';
    textarea.style.background = 'none';
    textarea.style.outline = 'none';
    textarea.style.resize = 'none';
    textarea.style.lineHeight = 'normal';
    textarea.style.fontFamily = element.fontFamily;
    textarea.style.transformOrigin = 'left top';
    textarea.style.textAlign = 'left';
    textarea.style.color = element.fill;
    
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

  return (
    <>
      <Group
        draggable
        onClick={() => selectElement(element.id)}
        onTap={() => selectElement(element.id)}
        onDragEnd={handleDragEnd}
      >
        <Text
          ref={textRef}
          x={element.position.x}
          y={element.position.y}
          text={element.text}
          fontSize={element.fontSize}
          fontFamily={element.fontFamily}
          fontStyle={element.fontStyle}
          fill={element.fill}
          width={element.size.width}
          height={element.size.height}
          wrap="word"
          onDblClick={handleDblClick}
          onDblTap={handleDblClick}
          visible={!isEditing}
          rotation={element.transform.rotation}
          scaleX={element.transform.scaleX}
          scaleY={element.transform.scaleY}
        />
      </Group>
      {isSelected && (
        <Transformer
          ref={transformerRef}
          boundBoxFunc={(oldBox, newBox) => {
            // Limit resize to reasonable values
            if (newBox.width < 20 || newBox.height < 20) {
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

export default TextBox;
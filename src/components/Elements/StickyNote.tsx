import React, { useRef, useState, useCallback, memo, useMemo } from 'react';
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
  const [isDragging, setIsDragging] = useState(false);

  // Use specific selectors for better performance
  const updateElement = useCanvasStore(state => state.updateElement);
  const selectElement = useCanvasStore(state => state.selectElement);
  const saveToHistory = useCanvasStore(state => state.saveToHistory);

  // Set up transformer when selected
  React.useEffect(() => {
    if (isSelected && transformerRef.current && shapeRef.current) {
      transformerRef.current.nodes([shapeRef.current]);
      transformerRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  // Start dragging
  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  // Handle drag end and save to history
  const handleDragEnd = useCallback((e: any) => {
    setIsDragging(false);
    // Only update store position when drag ends
    updateElement(element.id, {
      position: { x: e.target.x(), y: e.target.y() }
    });
    saveToHistory();
  }, [element.id, updateElement, saveToHistory]);

  // Handle transform end and update element dimensions
  const handleTransformEnd = useCallback(() => {
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
  }, [element.id, updateElement, saveToHistory]);

  // Handle double click to edit text
  const handleDblClick = useCallback(() => {
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
    
    // Also handle Enter key to confirm edits
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        textarea.blur();
        e.preventDefault();
      }
    });
  }, [element.id, element.text, updateElement, saveToHistory]);

  // Memoize visual properties to prevent unnecessary recalculations
  const padding = 12;

  // Memoize shadow props
  const shadowProps = useMemo(() => ({
    shadowColor: 'rgba(0,0,0,0.2)',
    shadowBlur: 6,
    shadowOffset: { x: 1, y: 1 },
    shadowOpacity: 0.5
  }), []);

  // Memoize the styling properties for the sticky note
  const rectStyle = useMemo(() => ({
    width: element.size.width,
    height: element.size.height,
    fill: element.color,
    cornerRadius: 8,
    perfectDrawEnabled: false,
    ...shadowProps
  }), [element.size.width, element.size.height, element.color, shadowProps]);

  const textStyle = useMemo(() => ({
    text: element.text,
    fontSize: 16,
    fontFamily: 'sans-serif',
    fill: '#000000',
    width: element.size.width - padding * 2,
    height: element.size.height - padding * 2,
    x: padding,
    y: padding,
    wrap: 'word' as const,
    visible: !isEditing,
  }), [element.text, element.size.width, element.size.height, isEditing, padding]);

  return (
    <>
      <Group
        x={element.position.x}
        y={element.position.y}
        draggable
        onClick={() => selectElement(element.id)}
        onTap={() => selectElement(element.id)}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        ref={shapeRef}
        rotation={element.transform.rotation}
        opacity={isDragging ? 0.85 : 1}
        perfectDrawEnabled={false}
      >
        <Rect {...rectStyle} />
        <Text
          ref={textRef}
          {...textStyle}
          onDblClick={handleDblClick}
          onDblTap={handleDblClick}
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

export default memo(StickyNote);
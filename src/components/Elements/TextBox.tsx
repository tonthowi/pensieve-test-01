import React, { useRef, useState, useCallback, memo, useEffect } from 'react';
import { Text, Transformer, Rect } from 'react-konva';
import { TextElement } from '../../types';
import useCanvasStore from '../../store/useCanvasStore';

// Constants for styling and behavior consistency
const TEXT_PADDING = 8;
const MIN_WIDTH = 50;
const MIN_HEIGHT = 40;
const LINE_HEIGHT_RATIO = 1.2; // Line height as a multiple of font size
const DEBUG_MODE = true; // Set to true to log dimension consistency checks

interface TextBoxProps {
  element: TextElement;
  isSelected: boolean;
}

const TextBox: React.FC<TextBoxProps> = ({ element, isSelected }) => {
  const textRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  // Track which type of transform is being performed
  const [transformType, setTransformType] = useState<'scale' | 'resize' | null>(null);

  // Use specific selectors for better performance
  const updateElement = useCanvasStore(state => state.updateElement);
  const selectElement = useCanvasStore(state => state.selectElement);
  const saveToHistory = useCanvasStore(state => state.saveToHistory);
  const tool = useCanvasStore(state => state.tool);

  // Set up transformer when selected
  React.useEffect(() => {
    if (isSelected && transformerRef.current && textRef.current) {
      transformerRef.current.nodes([textRef.current]);
      transformerRef.current.getLayer().batchDraw();
      
      // Check if it's newly created with default text
      if (element.text === 'Type to write' && !isEditing) {
        handleEdit(); // Auto-focus when selected if it has placeholder text
      }
    }
  }, [isSelected]);

  // Handle drag end and save to history
  const handleDragEnd = useCallback((e: any) => {
    // Use the actual position from the drag event
    // This ensures the text element stays where the user dragged it
    const newPosition = { x: e.target.x(), y: e.target.y() };
    
    // Check if position actually changed to avoid unnecessary updates
    if (newPosition.x !== element.position.x || newPosition.y !== element.position.y) {
      updateElement(element.id, { position: newPosition });
      saveToHistory();
    }
  }, [element.id, element.position.x, element.position.y, updateElement, saveToHistory]);

  // Handle transform end and update element dimensions
  const handleTransformEnd = useCallback(() => {
    if (!textRef.current) return;
    setTransformType(null); // Reset transform type

    const node = textRef.current;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    
    // Reset scale
    node.scaleX(1);
    node.scaleY(1);
    
    const newWidth = Math.max(MIN_WIDTH, node.width() * scaleX);
    
    // Calculate a consistent height that will accommodate the text
    const currentText = element.text;
    
    // The actual measured dimensions from the node after transform - only used for debug/reference
    Math.max(MIN_HEIGHT, node.height() * scaleY);
    
    if (transformType === 'scale') {
      // Scaling: Maintain aspect ratio and update font size
      const scaleFactor = Math.min(scaleX, scaleY);
      const newFontSize = Math.max(12, Math.round(element.fontSize * scaleFactor));
      
      // Create a temp div to measure text dimensions with new font size
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.visibility = 'hidden';
      tempDiv.style.fontFamily = element.fontFamily || 'Arial';
      tempDiv.style.fontSize = `${newFontSize}px`;
      tempDiv.style.lineHeight = LINE_HEIGHT_RATIO.toString();
      tempDiv.style.whiteSpace = 'pre-wrap';
      tempDiv.style.wordBreak = 'break-word';
      tempDiv.style.width = `${newWidth}px`;
      tempDiv.style.padding = `${TEXT_PADDING}px`;
      tempDiv.textContent = currentText || 'Type to write';
      document.body.appendChild(tempDiv);
      
      // Get the measured height and add a bit of padding
      const measuredHeight = Math.max(MIN_HEIGHT, tempDiv.scrollHeight + TEXT_PADDING);
      document.body.removeChild(tempDiv);
      
      // Update element with new font size and measured dimensions
      updateElement(element.id, {
        position: { x: node.x(), y: node.y() },
        fontSize: newFontSize,
        size: {
          width: newWidth,
          height: measuredHeight
        },
        transform: { rotation: 0, scaleX: 1, scaleY: 1 }
      });
    } else {
      // Resizing: Adjust container width/height without scaling font
      // Create a temp div to measure text dimensions with current font size but new width
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.visibility = 'hidden';
      tempDiv.style.fontFamily = element.fontFamily || 'Arial';
      tempDiv.style.fontSize = `${element.fontSize}px`;
      tempDiv.style.lineHeight = LINE_HEIGHT_RATIO.toString();
      tempDiv.style.whiteSpace = 'pre-wrap';
      tempDiv.style.wordBreak = 'break-word';
      tempDiv.style.width = `${newWidth}px`;
      tempDiv.style.padding = `${TEXT_PADDING}px`;
      tempDiv.textContent = currentText || 'Type to write';
      document.body.appendChild(tempDiv);
      
      // Measure the content height
      const measuredHeight = Math.max(MIN_HEIGHT, tempDiv.scrollHeight + TEXT_PADDING);
      document.body.removeChild(tempDiv);
      
      // Store this height in prevHeightRef to prevent duplicate updates
      prevHeightRef.current = measuredHeight;
      
      updateElement(element.id, {
        position: { x: node.x(), y: node.y() },
        size: { 
          width: newWidth,
          height: measuredHeight
        },
        transform: { rotation: 0, scaleX: 1, scaleY: 1 }
      });
    }
    
    saveToHistory();
    
    // Force immediate redraw to prevent flicker
    if (node.getLayer()) {
      node.getLayer().batchDraw();
    }
  }, [element.id, element.fontSize, element.fontFamily, element.text, transformType, updateElement, saveToHistory]);

  // Check if this is a newly created text element that should be auto-focused
  useEffect(() => {
    // If this is a text element and was just created, auto-focus it
    if (element.type === 'text' && (element.text === 'Text' || element.text === 'Type to write') && tool === 'text') {
      // Auto-edit if text content is the default
      handleEdit();
    }
  }, [element.id]); // Only run once when the component mounts with a specific ID
  
  // Detect the type of transform based on anchor point (corner vs edge)
  const handleTransformStart = useCallback((e: any) => {
    // `e.target` is the Transformer instance. Use getActiveAnchor() to know which handle is used.
    const anchor = e.target.getActiveAnchor?.();
    const anchorName: string | undefined = anchor ? anchor.name() : undefined;

    // Corner anchors => scaling, edge anchors => resizing
    if (anchorName && ['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(anchorName)) {
      setTransformType('scale');
    } else {
      setTransformType('resize');
    }
  }, []);
  
  // Use a ref to track previous height to prevent update loops
  const prevHeightRef = useRef(element.size.height);
  
  // Auto-adjust the height based on content whenever text or font size changes
  // Use DOM measurement for consistent results with the textarea
  useEffect(() => {
    if (!textRef.current || isEditing) return;
    
    // Create an off-screen div that matches the Text component styling
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.visibility = 'hidden';
    tempDiv.style.fontFamily = element.fontFamily || 'Arial';
    tempDiv.style.fontSize = `${element.fontSize}px`;
    tempDiv.style.lineHeight = LINE_HEIGHT_RATIO.toString();
    tempDiv.style.whiteSpace = 'pre-wrap';
    tempDiv.style.wordBreak = 'break-word';
    tempDiv.style.width = `${element.size.width}px`;
    tempDiv.style.padding = `${TEXT_PADDING}px`;
    
    // Set text styling if present
    if (element.fontStyle) {
      if (element.fontStyle.includes('bold')) {
        tempDiv.style.fontWeight = 'bold';
      }
      if (element.fontStyle.includes('italic')) {
        tempDiv.style.fontStyle = 'italic';
      }
      if (element.fontStyle.includes('underline')) {
        tempDiv.style.textDecoration = 'underline';
      }
    }
    
    tempDiv.textContent = element.text || 'Type to write';
    document.body.appendChild(tempDiv);
    
    // Get the measured height
    const measuredHeight = Math.max(MIN_HEIGHT, tempDiv.scrollHeight + TEXT_PADDING);
    document.body.removeChild(tempDiv);
    
    // Only update if there's a meaningful difference
    const significantChange = Math.abs(measuredHeight - element.size.height) > 5;
    const notRepeating = Math.abs(measuredHeight - prevHeightRef.current) > 2;
    
    if (significantChange && notRepeating) {
      // Store current height before update to avoid loops
      prevHeightRef.current = measuredHeight;
      
      // Update with the measured height
      updateElement(element.id, {
        size: {
          width: element.size.width,
          height: measuredHeight
        }
      });
    }
  }, [element.text, element.fontSize, element.fontFamily, element.fontStyle, element.size.width, isEditing, element.id, updateElement]);
  
  // Update prevHeightRef when element.size.height changes from external sources
  useEffect(() => {
    prevHeightRef.current = element.size.height;
  }, [element.size.height]);

  // Create textarea for text editing
  const handleEdit = useCallback(() => {
    if (isEditing) return;
    setIsEditing(true);
    
    // Debug: Log dimensions before editing (for consistency check)
    if (DEBUG_MODE) {
      console.log('TextBox [EDIT START]', {
        id: element.id,
        text: element.text,
        fontSize: element.fontSize,
        width: element.size.width,
        height: element.size.height
      });
    }
    
    // When entering edit mode, select the element
    selectElement(element.id);
    // Create textarea over Konva text
    const textarea = document.createElement('textarea');
    const layer = textRef.current.getLayer();
    
    document.body.appendChild(textarea);
    
    // Position textarea precisely over the text element
    const stageBox = textRef.current.getStage().container().getBoundingClientRect();
    const scale = textRef.current.getStage().scaleX();
    
    // Check if text is the default placeholder
    const isDefaultText = element.text === 'Type to write';
    textarea.value = element.text;
    // Position and style the textarea to exactly match the Text component
    textarea.style.position = 'absolute';
    textarea.style.top = `${stageBox.top + element.position.y}px`;
    textarea.style.left = `${stageBox.left + element.position.x}px`;
    textarea.style.width = `${element.size.width}px`;
    textarea.style.height = 'auto'; // allow growth
    textarea.style.padding = `${TEXT_PADDING}px`;
    textarea.style.resize = 'none';
    textarea.style.border = '1px solid #3b82f6';
    textarea.style.borderRadius = '4px';
    textarea.style.outline = 'none';
    textarea.style.fontSize = `${element.fontSize * scale}px`;
    textarea.style.fontFamily = element.fontFamily || 'Arial';
    
    // Apply font style (bold, italic, underline)
    if (element.fontStyle) {
      if (element.fontStyle.includes('bold')) {
        textarea.style.fontWeight = 'bold';
      }
      if (element.fontStyle.includes('italic')) {
        textarea.style.fontStyle = 'italic';
      }
      if (element.fontStyle.includes('underline')) {
        textarea.style.textDecoration = 'underline';
      }
    }
    
    // Set line height to match Konva Text component
    textarea.style.lineHeight = LINE_HEIGHT_RATIO.toString();
    textarea.style.color = element.fill;
    
    // Set other styling to make it feel seamless
    textarea.style.background = 'rgba(255, 255, 255, 0.95)';
    textarea.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.1)';
    textarea.style.overflow = 'hidden';
    textarea.style.textAlign = 'left';
    textarea.style.transformOrigin = 'left top';
    textarea.style.whiteSpace = 'pre-wrap';
    textarea.style.wordBreak = 'break-word';
    textarea.style.boxSizing = 'border-box'; // Critical for consistent sizing
    
    textarea.focus();
    
    // If default text, select all text so it gets replaced on first keystroke
    if (isDefaultText) {
      textarea.select();
    }
    
    // Handle first keystroke to clear default text
    const handleInput = () => {
      if (isDefaultText && (textarea.value === 'Text' || textarea.value === 'Type to write')) {
        textarea.value = '';
      }
      // Remove this event listener after first input
      textarea.removeEventListener('input', handleInput);
    };
    textarea.addEventListener('input', handleInput);
    
    // Dynamic resize handler
    const syncTextareaSize = () => {
      // Ensure textarea height fits content
      textarea.style.height = 'auto';
      const measuredHeight = Math.max(MIN_HEIGHT, textarea.scrollHeight);
      textarea.style.height = `${measuredHeight}px`;
      
      // Avoid unnecessary canvas updates
      if (Math.abs(measuredHeight - prevHeightRef.current) > 2) {
        prevHeightRef.current = measuredHeight;
        updateElement(element.id, {
          size: {
            width: element.size.width,
            height: measuredHeight,
          },
        });
      }
    };
    
    // Initial sync and attach listener
    syncTextareaSize();
    textarea.addEventListener('input', syncTextareaSize);
    
    // Save text on blur and remove textarea
    const handleBlur = () => {
      const newText = textarea.value;
      // Height already synced in syncTextareaSize; use textarea.scrollHeight for authoritative value
      textarea.style.height = 'auto'; // reset to measure
      const measuredHeight = Math.max(MIN_HEIGHT, textarea.scrollHeight);

      // Prevent future auto-adjust from mis-detecting a change
      prevHeightRef.current = measuredHeight;

      // Cleanup listener and DOM
      textarea.removeEventListener('input', syncTextareaSize);
      document.body.removeChild(textarea);
      setIsEditing(false);

      // Persist text & size
      updateElement(element.id, {
        text: newText,
        size: {
          width: element.size.width,
          height: measuredHeight,
        },
      });

      // Debug
      if (DEBUG_MODE) {
        console.log('TextBox [EDIT END]', {
          id: element.id,
          text: newText,
          fontSize: element.fontSize,
          width: element.size.width,
          height: measuredHeight,
          method: 'textarea scrollHeight',
        });
      }

      // history & redraw
      saveToHistory();
      layer.batchDraw();
    };
    
    // Add key handlers for better editing experience
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && e.shiftKey) {
        // Allow multi-line with Shift+Enter
        return;
      } else if (e.key === 'Enter') {
        // Finish editing on Enter
        e.preventDefault();
        textarea.blur();
      } else if (e.key === 'Escape') {
        // Cancel editing on Escape
        const originalText = element.text;
        textarea.value = originalText;
        textarea.blur();
      }
    };
    
    textarea.addEventListener('blur', handleBlur);
    textarea.addEventListener('keydown', handleKeyDown);
    
    // Clean up event listeners when done
    return () => {
      textarea.removeEventListener('blur', handleBlur);
      textarea.removeEventListener('keydown', handleKeyDown);
      textarea.removeEventListener('input', handleInput);
    };
  }, [element.id, element.text, updateElement, saveToHistory]);
  
  // Alias for double-click to match our new naming
  const handleDblClick = handleEdit;

  // Create a TextFormatToolbar when text is selected
  useEffect(() => {
    if (isSelected && !isEditing && textRef.current) {
      // Get position for toolbar
      const stageBox = textRef.current.getStage().container().getBoundingClientRect();
      const scale = textRef.current.getStage().scaleX();
      
      // Create toolbar
      const toolbar = document.createElement('div');
      toolbar.id = `text-toolbar-${element.id}`;
      toolbar.style.position = 'absolute';
      toolbar.style.top = `${stageBox.top + element.position.y + element.size.height * scale + 10}px`;
      toolbar.style.left = `${stageBox.left + element.position.x}px`;
      toolbar.style.backgroundColor = 'white';
      toolbar.style.padding = '5px';
      toolbar.style.borderRadius = '4px';
      toolbar.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
      toolbar.style.zIndex = '1000';
      toolbar.style.display = 'flex';
      toolbar.style.gap = '5px';
      
      // Add font size controls
      const fontSizes = [
        { name: 'Smallest', size: 12 },
        { name: 'Small', size: 16 },
        { name: 'Normal', size: 20 },
        { name: 'Large', size: 24 },
        { name: 'Largest', size: 32 },
        { name: 'Headline', size: 48 }
      ];
      
      const fontSizeSelect = document.createElement('select');
      fontSizeSelect.style.padding = '4px';
      fontSizeSelect.style.borderRadius = '4px';
      fontSizeSelect.style.border = '1px solid #ccc';
      
      fontSizes.forEach(item => {
        const option = document.createElement('option');
        option.value = item.size.toString();
        option.textContent = item.name;
        option.selected = element.fontSize === item.size;
        fontSizeSelect.appendChild(option);
      });
      
      fontSizeSelect.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        const newFontSize = parseInt(target.value);
        
        // When changing font size, adjust container immediately to prevent clipping
        if (textRef.current) {
          const scaleFactor = newFontSize / element.fontSize;
          
          updateElement(element.id, { 
            fontSize: newFontSize,
            // Recalculate appropriate height based on new font size
            size: {
              width: element.size.width,
              height: element.size.height * scaleFactor
            }
          });
        } else {
          updateElement(element.id, { fontSize: newFontSize });
        }
        
        saveToHistory();
      });
      
      // Color Picker
      const colorPicker = document.createElement('input');
      colorPicker.type = 'color';
      colorPicker.value = element.fill;
      colorPicker.style.width = '30px';
      colorPicker.style.height = '30px';
      colorPicker.style.padding = '0';
      colorPicker.style.border = 'none';
      
      colorPicker.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        updateElement(element.id, { fill: target.value });
        saveToHistory();
      });
      
      // Style buttons group
      const styleGroup = document.createElement('div');
      styleGroup.style.display = 'flex';
      styleGroup.style.gap = '2px';
      
      // Bold button
      const boldButton = document.createElement('button');
      boldButton.textContent = 'B';
      boldButton.style.fontWeight = 'bold';
      boldButton.style.width = '30px';
      boldButton.style.height = '30px';
      boldButton.style.border = '1px solid #ccc';
      boldButton.style.borderRadius = '4px';
      boldButton.style.background = element.fontStyle.includes('bold') ? '#e0e0e0' : 'white';
      
      boldButton.addEventListener('click', () => {
        const newStyle = element.fontStyle.includes('bold') 
          ? element.fontStyle.replace('bold', '').trim() 
          : `${element.fontStyle} bold`.trim();
        updateElement(element.id, { fontStyle: newStyle });
        saveToHistory();
      });
      
      // Italic button
      const italicButton = document.createElement('button');
      italicButton.textContent = 'I';
      italicButton.style.fontStyle = 'italic';
      italicButton.style.width = '30px';
      italicButton.style.height = '30px';
      italicButton.style.border = '1px solid #ccc';
      italicButton.style.borderRadius = '4px';
      italicButton.style.background = element.fontStyle.includes('italic') ? '#e0e0e0' : 'white';
      
      italicButton.addEventListener('click', () => {
        const newStyle = element.fontStyle.includes('italic') 
          ? element.fontStyle.replace('italic', '').trim() 
          : `${element.fontStyle} italic`.trim();
        updateElement(element.id, { fontStyle: newStyle });
        saveToHistory();
      });
      
      // Underline is handled with a special flag since Konva doesn't support text decoration
      const underlineButton = document.createElement('button');
      underlineButton.textContent = 'U';
      underlineButton.style.textDecoration = 'underline';
      underlineButton.style.width = '30px';
      underlineButton.style.height = '30px';
      underlineButton.style.border = '1px solid #ccc';
      underlineButton.style.borderRadius = '4px';
      underlineButton.style.background = element.fontStyle.includes('underline') ? '#e0e0e0' : 'white';
      
      underlineButton.addEventListener('click', () => {
        const newStyle = element.fontStyle.includes('underline') 
          ? element.fontStyle.replace('underline', '').trim() 
          : `${element.fontStyle} underline`.trim();
        updateElement(element.id, { fontStyle: newStyle });
        saveToHistory();
      });
      
      // Add elements to toolbar
      styleGroup.appendChild(boldButton);
      styleGroup.appendChild(italicButton);
      styleGroup.appendChild(underlineButton);
      
      // Add labels
      const fontSizeLabel = document.createElement('span');
      fontSizeLabel.textContent = 'Size:';
      fontSizeLabel.style.fontSize = '12px';
      fontSizeLabel.style.margin = 'auto 0';
      
      const colorLabel = document.createElement('span');
      colorLabel.textContent = 'Color:';
      colorLabel.style.fontSize = '12px';
      colorLabel.style.margin = 'auto 0';
      
      // Append all elements to toolbar
      toolbar.appendChild(fontSizeLabel);
      toolbar.appendChild(fontSizeSelect);
      toolbar.appendChild(colorLabel);
      toolbar.appendChild(colorPicker);
      toolbar.appendChild(styleGroup);
      
      // Add toolbar to document
      document.body.appendChild(toolbar);
      
      // Return cleanup function
      return () => {
        if (document.body.contains(toolbar)) {
          document.body.removeChild(toolbar);
        }
      };
    }
  }, [isSelected, isEditing, element, updateElement, saveToHistory]);

  // Calculate whether this is a placeholder text that should be shown in a subtle color
  const isPlaceholderText = element.text === 'Type to write';
  
  // Check if this text element is newly created (to show different styling)
  const isNewElement = element.text === 'Type to write';

  return (
    <>
      {/* Add a background rect for newly created text elements */}
      {isNewElement && !isEditing && (
        <Rect
          x={element.position.x - 5}
          y={element.position.y - 5}
          width={element.size.width + 10}
          height={element.size.height + 10}
          cornerRadius={4}
          fill="rgba(59, 130, 246, 0.05)" /* Light blue fill */
          stroke="#3b82f6"
          strokeWidth={1.5}
          perfectDrawEnabled={false}
          shadowColor="rgba(0,0,0,0.1)"
          shadowBlur={5}
          shadowOffsetX={0}
          shadowOffsetY={2}
        />
      )}
      <Text
        ref={textRef}
        x={element.position.x}
        y={element.position.y}
        text={element.text}
        fontSize={element.fontSize}
        fontFamily={element.fontFamily || 'Arial'}
        fontStyle={element.fontStyle}
        fill={isPlaceholderText ? '#9ca3af' : element.fill} // Subtle gray for placeholder
        width={element.size.width}
        height={element.size.height}
        wrap="word"
        lineHeight={LINE_HEIGHT_RATIO} // Use constant for consistency
        padding={TEXT_PADDING} // Consistent padding with textarea
        align="left"
        onDblClick={handleDblClick}
        onDblTap={handleDblClick}
        visible={!isEditing}
        rotation={element.transform.rotation}
        scaleX={element.transform.scaleX}
        scaleY={element.transform.scaleY}
        perfectDrawEnabled={false}
        draggable
        onClick={() => selectElement(element.id)}
        onTap={() => selectElement(element.id)}
        onDragEnd={handleDragEnd}
        data-id={element.id}
      />
      {isSelected && !isEditing && (
        <Transformer
          ref={transformerRef}
          enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right', 'top-center', 'bottom-center']} // Allow both scaling and resizing
          boundBoxFunc={(_, newBox) => {
            // Limit resize to reasonable values
            const minWidth = 50;
            const minHeight = 40;
            
            if (newBox.width < minWidth) {
              newBox.width = minWidth;
            }
            
            if (newBox.height < minHeight) {
              newBox.height = minHeight;
            }
            
            return newBox;
          }}
          onTransformStart={handleTransformStart}
          onTransformEnd={handleTransformEnd}
          anchorSize={8}
          anchorCornerRadius={4}
          borderStroke="#3b82f6"
          borderStrokeWidth={1.5}
          borderDash={[]} // Solid line instead of dashed
          anchorStroke="#3b82f6"
          anchorFill="#fff"
          anchorStrokeWidth={1.5}
          padding={5}
          rotateEnabled={false} // Disable rotation for text boxes
          keepRatio={transformType === 'scale'} // Keep aspect ratio when scaling with corners
        />
      )}
    </>
  );
};

export default memo(TextBox);
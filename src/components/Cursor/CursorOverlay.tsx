import React, { useState, useEffect } from 'react';
import { MousePointer2, StickyNote, Type, Square, Circle, ImageIcon, Pencil, Eraser, Hand } from 'lucide-react';
import useCanvasStore from '../../store/useCanvasStore';

const CursorOverlay: React.FC = () => {
  const { tool } = useCanvasStore();
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);

  // Map of tools to their corresponding icons
  const toolIcons: Record<string, JSX.Element> = {
    'select': <MousePointer2 size={24} />,
    'hand': <Hand size={24} />,
    'sticky': <StickyNote size={24} />,
    'text': <Type size={24} />,
    'rectangle': <Square size={24} />,
    'ellipse': <Circle size={24} />,
    'image': <ImageIcon size={24} />,
    'drawing': <Pencil size={24} />,
    'eraser': <Eraser size={24} />
  };

  useEffect(() => {
    // Function to update cursor position
    const updatePosition = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    // Function to hide cursor when leaving the window
    const hideCursor = () => {
      setVisible(false);
    };

    // Only track cursor if we're on the canvas (not over UI elements)
    const handleMouseOver = (e: MouseEvent) => {
      // Check if we're hovering over the canvas and not UI elements
      const target = e.target as HTMLElement;
      
      // Only show cursor on the canvas, not on UI elements like toolbar
      // We also check parentElement to handle Konva's nested structure
      const isCanvas = target.tagName === 'CANVAS' || 
                      (target.parentElement && target.parentElement.tagName === 'CANVAS');
      const isUIElement = target.closest('button') || 
                          target.closest('.toolbar') || 
                          target.closest('.status-bar');
      
      if (isCanvas && !isUIElement) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    };

    // Add event listeners
    window.addEventListener('mousemove', updatePosition);
    window.addEventListener('mouseout', hideCursor);
    window.addEventListener('mouseover', handleMouseOver);

    // Clean up event listeners
    return () => {
      window.removeEventListener('mousemove', updatePosition);
      window.removeEventListener('mouseout', hideCursor);
      window.removeEventListener('mouseover', handleMouseOver);
    };
  }, []);

  // Don't render anything if there's no icon for this tool, not visible, or using select tool
  // For select tool, we want to use the system's default cursor instead
  if (!toolIcons[tool] || !visible || tool === 'select') {
    return null;
  }

  return (
    <div 
      className="cursor-overlay"
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y}px`,
        opacity: 0.8
      }}
    >
      {toolIcons[tool]}
    </div>
  );
};

export default CursorOverlay;

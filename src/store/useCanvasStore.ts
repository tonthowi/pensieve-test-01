import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { 
  CanvasState, 
  Element, 
  Position, 
  Size, 
  Tool,
  Point,
  StickyElement,
  TextElement,
  RectangleElement,
  EllipseElement,
  ImageElement,
  DrawingElement
} from '../types';

const DEFAULT_COLORS = {
  sticky: ['#FFFA8D', '#FFC582', '#FF9B93', '#B5DCFF', '#9DFFB3'],
  shapes: ['#FFFFFF', '#F5F5F5', '#E9ECEF', '#DEE2E6', '#CED4DA'],
  strokes: ['#212529', '#495057', '#6C757D', '#ADB5BD'],
  text: '#000000'
};

const DEFAULT_ELEMENT: Omit<Element, 'id' | 'type'> = {
  position: { x: 0, y: 0 },
  size: { width: 100, height: 100 },
  transform: { rotation: 0, scaleX: 1, scaleY: 1 },
  zIndex: 0
};

export const useCanvasStore = create<CanvasState & {
  addElement: (element: Partial<Element>) => void;
  updateElement: (id: string, changes: Partial<Element>) => void;
  duplicateElement: (id: string) => void;
  removeElement: (id: string) => void;
  selectElement: (id: string | null, multi?: boolean) => void;
  clearSelection: () => void;
  setTool: (tool: Tool) => void;
  setZoomLevel: (level: number) => void;
  toggleGrid: () => void;
  undo: () => void;
  redo: () => void;
  saveToHistory: () => void;
  setDrawingColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  addPointToDrawing: (id: string, point: Point) => void;
  moveViewport: (delta: Position) => void;
  setViewportPosition: (position: Position) => void;
  createElement: (type: Element['type'], position: Position, size?: Size) => string;
  saveToLocalStorage: () => void;
  loadFromLocalStorage: () => boolean;
  reset: () => void;
}>((set, get) => ({
  elements: [],
  selectedIds: [],
  tool: 'select',
  zoomLevel: 1,
  gridVisible: true,
  history: [],
  historyIndex: -1,
  drawingColor: DEFAULT_COLORS.strokes[0],
  strokeWidth: 2,
  viewportPosition: { x: 0, y: 0 },

  addElement: (element) => {
    const newElement = {
      ...DEFAULT_ELEMENT,
      ...element,
      id: element.id || nanoid()
    } as Element;

    set((state) => {
      const elements = [...state.elements, newElement];
      return { elements };
    });
    get().saveToHistory();
  },

  updateElement: (id, changes) => {
    set((state) => {
      const elements = state.elements.map((element) => 
        element.id === id ? { ...element, ...changes } : element
      );
      return { elements };
    });
  },

  duplicateElement: (id) => {
    const { elements } = get();
    const element = elements.find(el => el.id === id);
    if (!element) return;

    const duplicated = {
      ...element,
      id: nanoid(),
      position: {
        x: element.position.x + 20,
        y: element.position.y + 20
      }
    };

    set((state) => ({
      elements: [...state.elements, duplicated]
    }));
    get().saveToHistory();
  },

  removeElement: (id) => {
    set((state) => {
      const elements = state.elements.filter((element) => element.id !== id);
      const selectedIds = state.selectedIds.filter((selectedId) => selectedId !== id);
      return { elements, selectedIds };
    });
    get().saveToHistory();
  },

  selectElement: (id, multi = false) => {
    if (!id) {
      return get().clearSelection();
    }

    set((state) => {
      if (multi) {
        const isSelected = state.selectedIds.includes(id);
        return {
          selectedIds: isSelected 
            ? state.selectedIds.filter(selectedId => selectedId !== id)
            : [...state.selectedIds, id]
        };
      } else {
        return { selectedIds: [id] };
      }
    });
  },

  clearSelection: () => {
    set({ selectedIds: [] });
  },

  setTool: (tool) => {
    set({ tool });
  },

  setZoomLevel: (level) => {
    set({ zoomLevel: level });
  },

  toggleGrid: () => {
    set((state) => ({ gridVisible: !state.gridVisible }));
  },

  undo: () => {
    const { historyIndex, history } = get();
    if (historyIndex <= 0) return;
    
    const newIndex = historyIndex - 1;
    set({
      elements: history[newIndex] || [],
      historyIndex: newIndex,
      selectedIds: []
    });
  },

  redo: () => {
    const { historyIndex, history } = get();
    if (historyIndex >= history.length - 1) return;
    
    const newIndex = historyIndex + 1;
    set({
      elements: history[newIndex] || [],
      historyIndex: newIndex,
      selectedIds: []
    });
  },

  saveToHistory: () => {
    const { elements, history, historyIndex } = get();
    
    // Clone the elements to avoid reference issues
    const elementsCopy = JSON.parse(JSON.stringify(elements)) as Element[];
    
    // Truncate future history if we're not at the end
    const newHistory = history.slice(0, historyIndex + 1);
    
    set({
      history: [...newHistory, elementsCopy],
      historyIndex: historyIndex + 1
    });
  },

  setDrawingColor: (color) => {
    set({ drawingColor: color });
  },

  setStrokeWidth: (width) => {
    set({ strokeWidth: width });
  },

  addPointToDrawing: (id, point) => {
    set((state) => {
      const elements = state.elements.map((element) => {
        if (element.id === id && element.type === 'drawing') {
          const drawing = element as DrawingElement;
          return {
            ...drawing,
            points: [...drawing.points, point.x, point.y]
          };
        }
        return element;
      });
      return { elements };
    });
  },

  moveViewport: (delta) => {
    set((state) => ({
      viewportPosition: {
        x: state.viewportPosition.x + delta.x,
        y: state.viewportPosition.y + delta.y
      }
    }));
  },

  setViewportPosition: (position) => {
    set({ viewportPosition: position });
  },

  createElement: (type, position, size) => {
    let element: Element;
    const id = nanoid();
    const defaultSize = size || { width: 150, height: 150 };

    switch (type) {
      case 'sticky':
        element = {
          id,
          type,
          position,
          size: defaultSize,
          transform: { rotation: 0, scaleX: 1, scaleY: 1 },
          zIndex: get().elements.length,
          text: 'New Note',
          color: DEFAULT_COLORS.sticky[Math.floor(Math.random() * DEFAULT_COLORS.sticky.length)]
        } as StickyElement;
        break;

      case 'text':
        element = {
          id,
          type,
          position,
          size: { width: 200, height: 50 },
          transform: { rotation: 0, scaleX: 1, scaleY: 1 },
          zIndex: get().elements.length,
          text: 'Type to write',
          fontSize: 20,
          fontFamily: 'Arial',
          fontStyle: 'normal',
          fill: DEFAULT_COLORS.text
        } as TextElement;
        break;

      case 'rectangle':
        element = {
          id,
          type,
          position,
          size: defaultSize,
          transform: { rotation: 0, scaleX: 1, scaleY: 1 },
          zIndex: get().elements.length,
          fill: DEFAULT_COLORS.shapes[0],
          stroke: DEFAULT_COLORS.strokes[0],
          strokeWidth: 2
        } as RectangleElement;
        break;

      case 'ellipse':
        element = {
          id,
          type,
          position,
          size: defaultSize,
          transform: { rotation: 0, scaleX: 1, scaleY: 1 },
          zIndex: get().elements.length,
          fill: DEFAULT_COLORS.shapes[0],
          stroke: DEFAULT_COLORS.strokes[0],
          strokeWidth: 2
        } as EllipseElement;
        break;

      case 'drawing':
        element = {
          id,
          type,
          position,
          size: { width: 0, height: 0 },
          transform: { rotation: 0, scaleX: 1, scaleY: 1 },
          zIndex: get().elements.length,
          points: [position.x, position.y],
          stroke: get().drawingColor,
          strokeWidth: get().strokeWidth
        } as DrawingElement;
        break;

      case 'image':
      default:
        element = {
          id,
          type: 'image',
          position,
          size: defaultSize,
          transform: { rotation: 0, scaleX: 1, scaleY: 1 },
          zIndex: get().elements.length,
          src: '' // Will be filled later
        } as ImageElement;
    }

    get().addElement(element);
    return id;
  },

  saveToLocalStorage: () => {
    const { elements, viewportPosition, zoomLevel, gridVisible } = get();
    
    try {
      // Process elements to handle potential circular references
      const sanitizedElements = elements.map(el => {
        // Create a shallow copy to avoid mutating the original
        const cleanElement = { ...el };
        
        // Handle special case for Drawing elements with large point arrays
        if (el.type === 'drawing' && 'points' in el && el.points.length > 1000) {
          // Simplify extremely long paths to prevent storage limits
          const simplifiedPoints = [];
          for (let i = 0; i < el.points.length; i += 4) {
            simplifiedPoints.push(el.points[i]);
          }
          cleanElement.points = simplifiedPoints;
        }
        
        return cleanElement;
      });
      
      const dataToSave = {
        elements: sanitizedElements,
        viewportPosition,
        zoomLevel,
        gridVisible,
        lastSaved: new Date().toISOString()
      };
      
      // Use try-catch with JSON.stringify separately to catch circular reference errors
      const serialized = JSON.stringify(dataToSave);
      localStorage.setItem('whiteboard', serialized);
      
      // Create a backup in case the main save gets corrupted
      localStorage.setItem('whiteboard_backup', serialized);
      return true;
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
      // Attempt fallback save without elements if JSON serialization failed
      try {
        localStorage.setItem('whiteboard_error_fallback', JSON.stringify({
          viewportPosition,
          zoomLevel,
          gridVisible,
          error: String(error),
          timestamp: new Date().toISOString()
        }));
      } catch (fallbackError) {
        // Complete failure, nothing we can do
      }
      return false;
    }
  },

  loadFromLocalStorage: () => {
    try {
      // First try to load from primary storage
      const savedData = localStorage.getItem('whiteboard');
      if (!savedData) {
        // Try backup if main storage is empty
        const backupData = localStorage.getItem('whiteboard_backup');
        if (!backupData) return false;
        
        console.info('Restored from backup storage');
        return loadStateFromJson(backupData);
      }
      
      return loadStateFromJson(savedData);
    } catch (error) {
      console.error('Failed to load from primary localStorage:', error);
      
      // Try backup if main parsing failed
      try {
        const backupData = localStorage.getItem('whiteboard_backup');
        if (backupData) {
          console.info('Primary load failed, attempting backup restore');
          return loadStateFromJson(backupData);
        }
      } catch (backupError) {
        console.error('Both primary and backup localStorage loads failed:', backupError);
      }
      
      return false;
    }
    
    // Helper function to parse JSON and set state
    function loadStateFromJson(jsonData: string): boolean {
      try {
        // First try regular parsing
        const { elements, viewportPosition, zoomLevel, gridVisible } = JSON.parse(jsonData);
        
        // Validate elements to ensure they have required properties
        const validElements = (elements || []).filter(el => {
          return el && typeof el === 'object' && 'id' in el && 'type' in el && 'position' in el;
        });
        
        set({
          elements: validElements,
          viewportPosition: viewportPosition || { x: 0, y: 0 },
          zoomLevel: zoomLevel || 1,
          gridVisible: gridVisible ?? true,
          history: [validElements],
          historyIndex: 0,
          selectedIds: []
        });
        
        return true;
      } catch (parseError) {
        console.error('Failed to parse localStorage JSON:', parseError);
        return false;
      }
    }
  },

  reset: () => {
    set({
      elements: [],
      selectedIds: [],
      history: [],
      historyIndex: -1,
      viewportPosition: { x: 0, y: 0 },
      zoomLevel: 1
    });
    get().saveToHistory();
  }
}));

export default useCanvasStore;
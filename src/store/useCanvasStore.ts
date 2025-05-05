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
          text: 'Text',
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
      localStorage.setItem('whiteboard', JSON.stringify({
        elements,
        viewportPosition,
        zoomLevel,
        gridVisible,
      }));
      return true;
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
      return false;
    }
  },

  loadFromLocalStorage: () => {
    try {
      const savedData = localStorage.getItem('whiteboard');
      if (!savedData) return false;
      
      const { elements, viewportPosition, zoomLevel, gridVisible } = JSON.parse(savedData);
      
      set({
        elements: elements || [],
        viewportPosition: viewportPosition || { x: 0, y: 0 },
        zoomLevel: zoomLevel || 1,
        gridVisible: gridVisible ?? true,
        history: [elements || []],
        historyIndex: 0,
        selectedIds: []
      });
      
      return true;
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
      return false;
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
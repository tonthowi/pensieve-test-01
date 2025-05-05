export type ElementType = 'sticky' | 'text' | 'rectangle' | 'ellipse' | 'image' | 'drawing';

export type Position = {
  x: number;
  y: number;
};

export type Size = {
  width: number;
  height: number;
};

export type Transform = {
  rotation: number;
  scaleX: number;
  scaleY: number;
};

export type Point = {
  x: number;
  y: number;
};

export type Drawing = {
  tool: string;
  points: number[];
  color: string;
  strokeWidth: number;
};

export interface BaseElement {
  id: string;
  type: ElementType;
  position: Position;
  size: Size;
  transform: Transform;
  zIndex: number;
}

export interface StickyElement extends BaseElement {
  type: 'sticky';
  text: string;
  color: string;
}

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  fontStyle: string;
  fill: string;
}

export interface RectangleElement extends BaseElement {
  type: 'rectangle';
  fill: string;
  stroke: string;
  strokeWidth: number;
}

export interface EllipseElement extends BaseElement {
  type: 'ellipse';
  fill: string;
  stroke: string;
  strokeWidth: number;
}

export interface ImageElement extends BaseElement {
  type: 'image';
  src: string;
}

export interface DrawingElement extends BaseElement {
  type: 'drawing';
  points: number[];
  stroke: string;
  strokeWidth: number;
}

export type Element = 
  | StickyElement 
  | TextElement 
  | RectangleElement 
  | EllipseElement 
  | ImageElement 
  | DrawingElement;

export type Tool = 
  | 'select' 
  | 'sticky' 
  | 'text' 
  | 'rectangle' 
  | 'ellipse' 
  | 'image'
  | 'drawing' 
  | 'eraser' 
  | 'hand';

export interface CanvasState {
  elements: Element[];
  selectedIds: string[];
  tool: Tool;
  zoomLevel: number;
  gridVisible: boolean;
  history: Array<Element[]>;
  historyIndex: number;
  drawingColor: string;
  strokeWidth: number;
  viewportPosition: Position;
}

export interface HistoryAction {
  id: string;
  elements: Element[];
}
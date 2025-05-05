import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { TextBox } from './TextBox';
import useCanvasStore from '../../store/useCanvasStore';
import { TextElement } from '../../types';

// Mock Konva components
jest.mock('react-konva', () => ({
  Text: ({ children, ...props }: any) => <div data-testid="konva-text" {...props}>{children}</div>,
  Transformer: ({ children, ...props }: any) => <div data-testid="konva-transformer" {...props}>{children}</div>,
  Rect: ({ children, ...props }: any) => <div data-testid="konva-rect" {...props}>{children}</div>,
}));

// Mock canvas store
jest.mock('../../store/useCanvasStore', () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe('TextBox Component', () => {
  const mockUpdateElement = jest.fn();
  const mockSelectElement = jest.fn();
  const mockSaveToHistory = jest.fn();
  
  // Sample text element
  const element: TextElement = {
    id: 'test-1',
    type: 'text',
    position: { x: 100, y: 100 },
    size: { width: 200, height: 50 },
    transform: { rotation: 0, scaleX: 1, scaleY: 1 },
    zIndex: 0,
    text: 'Sample Text',
    fontSize: 16,
    fontFamily: 'Arial',
    fontStyle: 'normal',
    fill: '#000000'
  };
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup mock store returns
    (useCanvasStore as jest.Mock).mockImplementation((selector) => {
      if (selector.name === 'state => state.updateElement') return mockUpdateElement;
      if (selector.name === 'state => state.selectElement') return mockSelectElement;
      if (selector.name === 'state => state.saveToHistory') return mockSaveToHistory;
      return jest.fn();
    });
    
    // Mock DOM methods
    document.createElement = jest.fn().mockImplementation((tagName) => {
      if (tagName === 'textarea') {
        return {
          style: {},
          focus: jest.fn(),
          select: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          value: '',
          scrollHeight: 100, // Simulate height when measuring
        };
      }
      if (tagName === 'div') {
        return {
          style: {},
          appendChild: jest.fn(),
          scrollHeight: 100, // Simulate height when measuring
          textContent: '',
        };
      }
      return {};
    });
    document.body.appendChild = jest.fn();
    document.body.removeChild = jest.fn();
  });
  
  test('Dimensions remain consistent when switching between view and edit modes', () => {
    // Create spy functions to track size changes
    const heightBeforeEdit = element.size.height;
    const widthBeforeEdit = element.size.width;
    let heightAfterEdit = 0;
    let widthAfterEdit = 0;
    
    // Mock implementation for updateElement to capture size changes
    mockUpdateElement.mockImplementation((id, changes) => {
      if (changes.size) {
        heightAfterEdit = changes.size.height;
        widthAfterEdit = changes.size.width;
      }
    });
    
    // Render the component
    const { rerender } = render(
      <TextBox element={element} isSelected={true} />
    );
    
    // Simulate double-click to enter edit mode
    const textElement = screen.getByTestId('konva-text');
    
    // Mock the Text component methods needed by handleEdit
    textElement.getLayer = jest.fn().mockReturnValue({
      batchDraw: jest.fn()
    });
    textElement.absolutePosition = jest.fn().mockReturnValue({ x: 100, y: 100 });
    textElement.getStage = jest.fn().mockReturnValue({
      container: jest.fn().mockReturnValue({
        getBoundingClientRect: jest.fn().mockReturnValue({
          top: 0, left: 0, width: 800, height: 600
        })
      }),
      scaleX: jest.fn().mockReturnValue(1)
    });
    
    // Trigger edit mode
    fireEvent.doubleClick(textElement);
    
    // Simulate text edit and blur
    const textarea = document.createElement('textarea');
    textarea.value = 'New text content';
    
    // Mock blur event to trigger dimension calculation
    const mockBlurHandler = mockUpdateElement.mock.calls[0][1].onBlur;
    if (mockBlurHandler) {
      act(() => {
        mockBlurHandler();
      });
    }
    
    // Re-render with updated element
    const updatedElement = {
      ...element,
      text: 'New text content',
      size: { width: widthAfterEdit || element.size.width, height: heightAfterEdit || element.size.height }
    };
    
    rerender(
      <TextBox element={updatedElement} isSelected={true} />
    );
    
    // Assert that dimensions remain consistent
    expect(Math.abs(heightAfterEdit - heightBeforeEdit)).toBeLessThan(10);
    expect(widthAfterEdit).toBe(widthBeforeEdit);
    
    // Verify element was updated exactly once for height/text
    expect(mockUpdateElement).toHaveBeenCalled();
  });
  
  test('Maintains consistent dimensions after transform operations', () => {
    // Setup
    const mockTransformerRef = {
      current: {
        nodes: jest.fn(),
        getLayer: jest.fn().mockReturnValue({ batchDraw: jest.fn() }),
      }
    };
    const mockTextRef = {
      current: {
        x: jest.fn().mockReturnValue(100),
        y: jest.fn().mockReturnValue(100),
        width: jest.fn().mockReturnValue(200),
        height: jest.fn().mockReturnValue(50),
        scaleX: jest.fn().mockReturnValue(1.5), // Simulate transform
        scaleY: jest.fn().mockReturnValue(1.5),
        getLayer: jest.fn().mockReturnValue({ batchDraw: jest.fn() }),
      }
    };
    
    // Simulate transform end
    const originalElement = { ...element };
    let updatedSize = { width: 0, height: 0 };
    
    // Track element size updates
    mockUpdateElement.mockImplementation((id, changes) => {
      if (changes.size) {
        updatedSize = changes.size;
      }
    });
    
    // Mock React useRef hook
    jest.spyOn(React, 'useRef').mockImplementation((initialValue) => {
      if (initialValue === null && mockTransformerRef.current) {
        return mockTransformerRef;
      } 
      if (initialValue === null && mockTextRef.current) {
        return mockTextRef;
      }
      return { current: initialValue };
    });
    
    // Render the component
    render(<TextBox element={originalElement} isSelected={true} />);
    
    // Call the transform end handler directly
    act(() => {
      // This would normally be handled by Konva's transform end event
      // Simulate a scale transform from corner handles
      mockUpdateElement.mock.calls[0][1].onTransformEnd({
        target: mockTextRef.current
      });
    });
    
    // Assert that dimensions are updated proportionally
    expect(updatedSize.width).toBeGreaterThan(originalElement.size.width);
    expect(updatedSize.height).toBeGreaterThanOrEqual(originalElement.size.height);
    
    // Verify that the transform operation maintains proportion
    const widthRatio = updatedSize.width / originalElement.size.width;
    const heightRatio = updatedSize.height / originalElement.size.height;
    
    // The ratios may not be exactly equal due to text fitting logic
    // but they should be relatively close
    expect(Math.abs(widthRatio - heightRatio)).toBeLessThan(0.5);
  });
});

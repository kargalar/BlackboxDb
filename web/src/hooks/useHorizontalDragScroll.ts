import { useRef, type DragEventHandler, type MouseEventHandler } from 'react';

interface UseHorizontalDragScrollOptions {
  movementThreshold?: number;
}

export function useHorizontalDragScroll({
  movementThreshold = 6,
}: UseHorizontalDragScrollOptions = {}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);
  const suppressClickRef = useRef(false);
  const dragStartXRef = useRef(0);
  const scrollStartLeftRef = useRef(0);

  const handleMouseDown: MouseEventHandler<HTMLDivElement> = (event) => {
    if (event.button !== 0) {
      return;
    }

    const container = containerRef.current;
    if (!container) {
      return;
    }

    isDraggingRef.current = true;
    suppressClickRef.current = false;
    dragStartXRef.current = event.clientX;
    scrollStartLeftRef.current = container.scrollLeft;
  };

  const handleMouseMove: MouseEventHandler<HTMLDivElement> = (event) => {
    const container = containerRef.current;
    if (!container || !isDraggingRef.current) {
      return;
    }

    const deltaX = event.clientX - dragStartXRef.current;
    if (Math.abs(deltaX) > movementThreshold) {
      suppressClickRef.current = true;
    }

    event.preventDefault();
    container.scrollLeft = scrollStartLeftRef.current - deltaX;
  };

  const finishDrag = () => {
    if (!isDraggingRef.current) {
      return;
    }

    isDraggingRef.current = false;
  };

  const handleMouseUp: MouseEventHandler<HTMLDivElement> = () => {
    finishDrag();
  };

  const handleMouseLeave: MouseEventHandler<HTMLDivElement> = () => {
    finishDrag();
  };

  const handleDragStart: DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
  };

  const handleClickCapture: MouseEventHandler<HTMLDivElement> = (event) => {
    if (!suppressClickRef.current) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    suppressClickRef.current = false;
  };

  return {
    containerRef,
    dragScrollProps: {
      ref: containerRef,
      onDragStart: handleDragStart,
      onClickCapture: handleClickCapture,
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseLeave,
    },
  };
}

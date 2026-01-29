import { useRef, useEffect } from 'react';
import '../styles/Resizer.css';

interface ResizerProps {
  direction: 'horizontal' | 'vertical';
  onResize: (delta: number) => void;
}

/**
 * 드래그로 크기 조절 가능한 리사이저
 */
function Resizer({ direction, onResize }: ResizerProps) {
  const isDragging = useRef(false);
  const startPos = useRef(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;

      const delta = direction === 'horizontal' 
        ? e.clientX - startPos.current
        : e.clientY - startPos.current;
      
      onResize(delta);
      startPos.current = direction === 'horizontal' ? e.clientX : e.clientY;
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [direction, onResize]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    startPos.current = direction === 'horizontal' ? e.clientX : e.clientY;
    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
  };

  return (
    <div
      className={`resizer resizer-${direction}`}
      onMouseDown={handleMouseDown}
    />
  );
}

export default Resizer;

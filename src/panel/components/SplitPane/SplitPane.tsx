import React, { useState, useCallback, useRef, useEffect } from 'react';
import styles from './SplitPane.module.css';

interface SplitPaneProps {
  children:
    | [React.ReactNode, React.ReactNode]
    | [React.ReactNode, React.ReactNode, React.ReactNode];
  direction?: 'horizontal' | 'vertical';
  defaultSizes?: number[];
  minSizes?: number[];
  maxSizes?: number[];
}

export function SplitPane({
  children,
  direction = 'horizontal',
  defaultSizes,
  minSizes,
  maxSizes,
}: SplitPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sizes, setSizes] = useState<number[]>(
    defaultSizes || children.map(() => 100 / children.length)
  );
  const [isDragging, setIsDragging] = useState(false);
  const [activeDivider, setActiveDivider] = useState<number | null>(null);

  const handleMouseDown = useCallback((index: number) => {
    setIsDragging(true);
    setActiveDivider(index);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setActiveDivider(null);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || activeDivider === null || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const totalSize = direction === 'horizontal' ? rect.width : rect.height;
      const position = direction === 'horizontal' ? e.clientX - rect.left : e.clientY - rect.top;
      const percentage = (position / totalSize) * 100;

      setSizes((prevSizes) => {
        const newSizes = [...prevSizes];
        const beforeIndex = activeDivider;
        const afterIndex = activeDivider + 1;

        // Calculate the combined size of the two panes being adjusted
        const combinedSize = prevSizes[beforeIndex] + prevSizes[afterIndex];

        // Calculate the position relative to the start of the first pane
        let offset = 0;
        for (let i = 0; i < beforeIndex; i++) {
          offset += prevSizes[i];
        }

        let newFirstSize = percentage - offset;
        let newSecondSize = combinedSize - newFirstSize;

        // Apply constraints
        const minFirst = minSizes?.[beforeIndex] ?? 5;
        const minSecond = minSizes?.[afterIndex] ?? 5;
        const maxFirst = maxSizes?.[beforeIndex] ?? 95;
        const maxSecond = maxSizes?.[afterIndex] ?? 95;

        // Convert pixel constraints to percentages if needed
        const minFirstPct = (minFirst / totalSize) * 100;
        const minSecondPct = (minSecond / totalSize) * 100;
        const maxFirstPct = (maxFirst / totalSize) * 100;
        const maxSecondPct = (maxSecond / totalSize) * 100;

        if (newFirstSize < minFirstPct) {
          newFirstSize = minFirstPct;
          newSecondSize = combinedSize - newFirstSize;
        } else if (newSecondSize < minSecondPct) {
          newSecondSize = minSecondPct;
          newFirstSize = combinedSize - newSecondSize;
        }

        if (newFirstSize > maxFirstPct) {
          newFirstSize = maxFirstPct;
          newSecondSize = combinedSize - newFirstSize;
        } else if (newSecondSize > maxSecondPct) {
          newSecondSize = maxSecondPct;
          newFirstSize = combinedSize - newSecondSize;
        }

        newSizes[beforeIndex] = newFirstSize;
        newSizes[afterIndex] = newSecondSize;

        return newSizes;
      });
    },
    [isDragging, activeDivider, direction, minSizes, maxSizes]
  );

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp, direction]);

  return (
    <div ref={containerRef} className={`${styles.container} ${styles[direction]}`}>
      {React.Children.map(children, (child, index) => (
        <React.Fragment key={index}>
          <div
            className={styles.pane}
            style={{
              [direction === 'horizontal' ? 'width' : 'height']: `${sizes[index]}%`,
            }}
          >
            {child}
          </div>
          {index < children.length - 1 && (
            <div
              className={`${styles.divider} ${isDragging && activeDivider === index ? styles.active : ''}`}
              onMouseDown={() => handleMouseDown(index)}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

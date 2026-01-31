import { useMemo } from 'react';
import styles from './HexViewer.module.css';

interface HexViewerProps {
  base64: string;
}

export function HexViewer({ base64 }: HexViewerProps) {
  const lines = useMemo(() => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const result: { offset: string; hex: string; ascii: string }[] = [];
    const bytesPerLine = 16;

    for (let i = 0; i < bytes.length; i += bytesPerLine) {
      const chunk = bytes.slice(i, i + bytesPerLine);
      const offset = i.toString(16).padStart(8, '0');

      let hex = '';
      let ascii = '';

      for (let j = 0; j < bytesPerLine; j++) {
        if (j < chunk.length) {
          hex += chunk[j].toString(16).padStart(2, '0') + ' ';
          // Show printable ASCII characters
          const char = chunk[j];
          if (char >= 32 && char < 127) {
            ascii += String.fromCharCode(char);
          } else {
            ascii += '.';
          }
        } else {
          hex += '   ';
          ascii += ' ';
        }

        if (j === 7) hex += ' ';
      }

      result.push({ offset, hex: hex.trim(), ascii });
    }

    return result;
  }, [base64]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.offsetHeader}>Offset</span>
        <span className={styles.hexHeader}>Hex</span>
        <span className={styles.asciiHeader}>ASCII</span>
      </div>
      <div className={styles.content}>
        {lines.map((line, index) => (
          <div key={index} className={styles.line}>
            <span className={styles.offset}>{line.offset}</span>
            <span className={styles.hex}>{line.hex}</span>
            <span className={styles.ascii}>{line.ascii}</span>
          </div>
        ))}
      </div>
      {lines.length > 0 && (
        <div className={styles.footer}>Showing first {Math.min(1024, lines.length * 16)} bytes</div>
      )}
    </div>
  );
}

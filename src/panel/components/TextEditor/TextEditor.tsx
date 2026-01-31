import { useEffect, useRef } from 'react';
import { EditorState, Compartment } from '@codemirror/state';
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLineGutter,
  highlightSpecialChars,
  drawSelection,
  dropCursor,
  rectangularSelection,
  crosshairCursor,
  highlightActiveLine,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import {
  syntaxHighlighting,
  defaultHighlightStyle,
  bracketMatching,
  foldGutter,
  indentOnInput,
  foldKeymap,
} from '@codemirror/language';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { markdown } from '@codemirror/lang-markdown';
import { getLanguageFromFilename } from '../../utils/file';
import styles from './TextEditor.module.css';

interface TextEditorProps {
  content: string;
  filename: string;
  onChange?: (content: string) => void;
  onSave?: () => void;
  readOnly?: boolean;
}

const themeCompartment = new Compartment();
const languageCompartment = new Compartment();
const readOnlyCompartment = new Compartment();

function getLanguageExtension(lang: string) {
  switch (lang) {
    case 'javascript':
    case 'typescript':
      return javascript({ jsx: true, typescript: lang === 'typescript' });
    case 'json':
      return json();
    case 'css':
      return css();
    case 'html':
      return html();
    case 'markdown':
      return markdown();
    default:
      return [];
  }
}

const baseTheme = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: '12px',
    fontFamily: "'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace",
  },
  '.cm-content': {
    padding: '8px 0',
  },
  '.cm-scroller': {
    overflow: 'auto',
  },
  '.cm-gutters': {
    backgroundColor: 'var(--color-bg-secondary)',
    color: 'var(--color-text-tertiary)',
    border: 'none',
    paddingRight: '4px',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'var(--color-bg-hover)',
  },
  '.cm-activeLine': {
    backgroundColor: 'var(--color-bg-hover)',
  },
  '.cm-selectionBackground': {
    backgroundColor: 'rgba(0, 113, 227, 0.3) !important',
  },
  '&.cm-focused .cm-cursor': {
    borderLeftColor: 'var(--color-accent)',
  },
  '&.cm-focused .cm-selectionBackground': {
    backgroundColor: 'rgba(0, 113, 227, 0.3)',
  },
});

export function TextEditor({
  content,
  filename,
  onChange,
  onSave,
  readOnly = false,
}: TextEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onSaveRef = useRef(onSave);

  // Keep refs updated
  useEffect(() => {
    onChangeRef.current = onChange;
    onSaveRef.current = onSave;
  }, [onChange, onSave]);

  useEffect(() => {
    if (!containerRef.current) return;

    const lang = getLanguageFromFilename(filename);

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged && onChangeRef.current) {
        onChangeRef.current(update.state.doc.toString());
      }
    });

    const saveKeymap = keymap.of([
      {
        key: 'Mod-s',
        run: () => {
          if (onSaveRef.current) {
            onSaveRef.current();
            return true;
          }
          return false;
        },
      },
    ]);

    const state = EditorState.create({
      doc: content,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        foldGutter(),
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        bracketMatching(),
        rectangularSelection(),
        crosshairCursor(),
        highlightActiveLine(),
        keymap.of([...defaultKeymap, ...historyKeymap, ...foldKeymap]),
        saveKeymap,
        languageCompartment.of(getLanguageExtension(lang)),
        readOnlyCompartment.of(EditorState.readOnly.of(readOnly)),
        themeCompartment.of(baseTheme),
        updateListener,
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    editorRef.current = view;

    return () => {
      view.destroy();
    };
  }, []);

  // Update content when it changes externally
  useEffect(() => {
    if (editorRef.current) {
      const currentContent = editorRef.current.state.doc.toString();
      if (currentContent !== content) {
        editorRef.current.dispatch({
          changes: {
            from: 0,
            to: currentContent.length,
            insert: content,
          },
        });
      }
    }
  }, [content]);

  // Update readOnly when it changes
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.dispatch({
        effects: readOnlyCompartment.reconfigure(EditorState.readOnly.of(readOnly)),
      });
    }
  }, [readOnly]);

  // Update language when filename changes
  useEffect(() => {
    if (editorRef.current) {
      const lang = getLanguageFromFilename(filename);
      editorRef.current.dispatch({
        effects: languageCompartment.reconfigure(getLanguageExtension(lang)),
      });
    }
  }, [filename]);

  return (
    <div className={styles.container}>
      <div ref={containerRef} className={styles.editor} />
    </div>
  );
}

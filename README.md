# OPFS Finder

![OPFS Finder - Logo](./assets/logo/project-logo.png)

Chrome DevTools extension for browsing and managing the Origin Private File System (OPFS) with a Finder-like UI.

![OPFS Finders](./assets/logo/opfs-finders.png)

An eerie logo for a practical purpose: a Chrome DevTools extension to quickly inspect and manage OPFS with an intuitive UI.

## Features

- **3-Pane Finder-like UI**: Sidebar, file list, and preview panel
- **File Operations**: Create, read, update, delete, copy, move, rename, duplicate
- **Text Editing**: CodeMirror 6 with syntax highlighting, save with Cmd+S
- **Image Editing**: Crop, rotate, flip, resize with undo/redo
- **Drag & Drop**: Import files and move items between folders
- **Search & Sort**: Filter files and sort by name, size, date, or kind
- **Global Search**: Search across all files in OPFS (toggle with globe icon)
- **Clown Mode (Optional)**: Switch between classic icons and custom playful icons
- **Favorites & Recents**: Quick access to frequently used locations
- **Dark/Light Mode**: Follows system preference
- **Storage Usage**: Visual indicator of OPFS quota usage

## Requirements

- Node.js 18+
- Chrome 102+ (Manifest V3 support)

## Manual QA Checklist

- Open DevTools on any HTTPS page → "OPFS Finder" panel appears
- Create new folder → Folder created and visible
- Create new text file → File created
- Edit text file and save (Cmd+S) → Changes persisted
- Preview image file → Image displayed with zoom controls
- Edit image (crop/rotate) and save → Changes persisted
- Drag & drop files to import → Files imported
- Copy/paste files → Files duplicated with conflict resolution
- Delete file → Confirmation dialog, file removed
- Rename file → Name updated
- Search files → List filtered
- Toggle global search (globe icon) → Search across all folders
- Sort by different columns → Order changes
- Add folder to favorites → Appears in sidebar
- Dark mode toggle → Theme switches

## Known Limitations

- **Large file preview**: Images >10MB and text files >2MB are truncated
- **Folder export**: ZIP export for folders is not implemented (individual file export only)
- **File locks**: Files locked by other tabs cannot be deleted (error message shown)
- **Cross-origin**: Only works on the origin of the inspected page

## Installation

```bash
npm install
```

## Development

```bash
# Watch mode - rebuilds on file changes
npm run dev
```

## Build

```bash
npm run build
```

## Load Extension in Chrome

1. Run `npm run build`
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `dist` folder

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Build in watch mode |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |
| `npm test` | Run unit tests |
| `npm run test:e2e` | Run Playwright tests |

## Project Structure

```
src/
├── background/       # Service worker (RPC handler)
├── devtools/         # DevTools panel registration
├── panel/            # Main React UI
│   ├── components/   # UI components
│   ├── hooks/        # Custom React hooks
│   ├── store/        # Zustand state management
│   ├── styles/       # Global CSS
│   └── utils/        # Utilities (RPC, path, file)
├── shared/           # Shared types and RPC definitions
└── injected/         # OPFS operations (injected into page)
```

## License

MIT

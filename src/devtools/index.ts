// Create the OPFS Finder panel in DevTools
chrome.devtools.panels.create(
  'OPFS Finder',
  'icons/icon32.png',
  'src/panel/index.html',
  (_panel) => {
    // Panel created
  }
);

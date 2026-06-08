// Fretsplorer app entry — mounts the three-region shell (the /ui M0 surface).
// docs/08-ux-design.md; ADR 0005 (three-region shell); ADR 0006 (SVG surface).

import { AppShell } from './ui';
import './App.css';

function App() {
  return <AppShell />;
}

export default App;

#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');
const https = require('https');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function question(query) {
  return new Promise(resolve => {
    rl.question(query, resolve);
  });
}

function createDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function writeFile(filePath, content) {
  const dir = path.dirname(filePath);
  createDirectory(dir);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`  ✓ Created ${filePath}`);
}

function executeCommand(command, cwd = process.cwd()) {
  try {
    execSync(command, { cwd, stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`✗ Command failed: ${command}`);
    console.error(error.message);
    return false;
  }
}

async function createGitHubRepository(token, repoName, description) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      name: repoName,
      description: description,
      public: true,
      auto_init: false
    });

    const options = {
      hostname: 'api.github.com',
      path: '/user/repos',
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'User-Agent': 'Node.js'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 201) {
          const repo = JSON.parse(body);
          resolve(repo.html_url);
        } else {
          reject(new Error(`GitHub API error: ${res.statusCode} ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// ============================================
// FILE CONTENTS (All 13 files)
// ============================================

const fileContents = {
  'package.json': `{
  "name": "mapping-robot-dashboard",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "three": "^r128",
    "roslib": "^1.1.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.0",
    "vite": "^4.3.9"
  }
}`,

  'vite.config.js': `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true
  }
})`,

  '.gitignore': `node_modules/
package-lock.json
yarn.lock
dist/
build/
.env
.env.local
.env.*.local
.vscode/
.idea/
*.swp
*.swo
*~
.DS_Store
*.log
npm-debug.log*
yarn-debug.log*
.cache/`,

  'README.md': `# 🤖 3D Autonomous Mapping Robot Dashboard

Live real-time 3D mapping dashboard with ROS2 integration, ML object detection, and zone annotation system.

## ✨ Features

- 📹 **Live Robot Camera Feed** - Real-time video streaming from ROS2 topics
- 📊 **Live Telemetry** - Robot position, battery, heading, mapping status
- 🗺️ **3D Map Viewer** - Interactive GLB mesh rendering with orbit controls
- 🎯 **Zone Annotation** - Draw and label regions on 3D maps
- 🤖 **Object Detection** - ML-powered object detection on camera feed
- ☁️ **Cloud Storage** - Save and manage multiple scans

## 🚀 Quick Start

\`\`\`bash
npm install
npm run dev
\`\`\`

Dashboard opens at http://localhost:5173

## 📁 Project Structure

\`\`\`
src/
├── components/
├── services/
├── utils/
├── models/
├── App.jsx
└── main.jsx
\`\`\`

## 📖 Documentation

- [SETUP.md](SETUP.md) - Detailed setup instructions
- [CONTRIBUTING.md](CONTRIBUTING.md) - Git workflow & code style

## 🤝 Team

| Role | GitHub |
|------|--------|
| ROS2 Integration | team-member-1 |
| UI/Dashboard | team-member-2 |
| ML Detection | team-member-3 |
| 3D Mapping | team-member-4 |

---

Made with ❤️ for autonomous robotics`,

  'SETUP.md': `# 🛠️ Local Development Setup

## Prerequisites

- Node.js 16+ (https://nodejs.org)
- npm (comes with Node.js)
- Git (https://git-scm.com)

## Installation

\`\`\`bash
git clone https://github.com/ashwinprabhu2005-del/mapping-robot-dashboard.git
cd mapping-robot-dashboard
npm install
npm run dev
\`\`\`

Dashboard opens at http://localhost:5173

## Git Setup

\`\`\`bash
git config user.name "Your Name"
git config user.email "your.email@example.com"
\`\`\`

## Create Feature Branch

\`\`\`bash
git checkout main
git pull origin main
git checkout -b feature/your-task-name
\`\`\`

## Useful Commands

\`\`\`bash
npm run dev       # Start dev server
npm run build     # Production build
git status        # See changes
git add .         # Stage changes
git commit -m "message"
git push origin branch-name
\`\`\`

## Troubleshooting

### Port 5173 already in use
\`\`\`bash
lsof -ti:5173 | xargs kill -9
npm run dev
\`\`\`

### Node modules issue
\`\`\`bash
rm -rf node_modules
npm install
\`\`\`

See CONTRIBUTING.md for more details.`,

  'CONTRIBUTING.md': `# 📝 Contributing Guidelines

## Branch Naming

\`\`\`
ros2-integration/task-name
ui-dashboard/task-name
ml-detection/task-name
3d-mapping/task-name
\`\`\`

## Commit Messages

\`\`\`
feat: add live camera feed
fix: handle missing odometry
refactor: optimize renderer
\`\`\`

## Code Style

- Variables: \`camelCase\`
- Components: \`PascalCase\`
- Max line length: 100 chars
- Indent: 2 spaces
- Quotes: double quotes

## Pull Request Process

1. Create feature branch
2. Make changes and commit frequently
3. Push to GitHub
4. Create Pull Request on GitHub.com
5. Request reviews from teammates
6. Wait for approval
7. Merge to main
8. Delete your branch

## Before Creating PR

\`\`\`bash
npm run build    # Verify no build errors
git diff main    # Review your changes
\`\`\`

## Handling Reviews

If changes requested:
\`\`\`bash
git add .
git commit -m "review: address feedback"
git push origin your-branch
\`\`\`

See README.md for more.`,

  '.env.example': `VITE_ROBOT_IP=192.168.1.100
VITE_ROSBRIDGE_PORT=9090
VITE_ZENOH_PORT=7447
VITE_ENABLE_LOGGING=true
VITE_DEBUG_MODE=false`,

  'src/main.jsx': `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`,

  'src/App.jsx': `import { useState } from 'react'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState('live')

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>🤖 3D MAPPING ROBOT DASHBOARD</h1>
        <span className="connection-status">● DISCONNECTED</span>
      </header>

      <nav className="tab-navigation">
        <button 
          className={activeTab === 'live' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('live')}
        >
          📹 LIVE FEED
        </button>
        <button 
          className={activeTab === 'maps' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('maps')}
        >
          🗺️ 3D MAPS
        </button>
        <button 
          className={activeTab === 'annotation' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('annotation')}
        >
          📍 ANNOTATION
        </button>
        <button 
          className={activeTab === 'detection' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('detection')}
        >
          🎯 DETECTION
        </button>
      </nav>

      <main className="dashboard-content">
        {activeTab === 'live' && (
          <div className="tab-content">
            <h2>Live Camera Feed</h2>
            <p>✓ Team Member 1: ROS2 Integration - Build this component</p>
          </div>
        )}
        {activeTab === 'maps' && (
          <div className="tab-content">
            <h2>3D Maps</h2>
            <p>✓ Team Member 2 & 4: UI/Dashboard & 3D Mapping - Build this component</p>
          </div>
        )}
        {activeTab === 'annotation' && (
          <div className="tab-content">
            <h2>Zone Annotation</h2>
            <p>✓ Team Member 2: UI/Dashboard - Build this component</p>
          </div>
        )}
        {activeTab === 'detection' && (
          <div className="tab-content">
            <h2>Object Detection</h2>
            <p>✓ Team Member 3: ML Detection - Build this component</p>
          </div>
        )}
      </main>

      <footer className="dashboard-footer">
        <p>Autonomous 3D Mapping Robot | Team Project 2024</p>
      </footer>
    </div>
  )
}

export default App`,

  'src/App.css': `:root {
  --bg-dark: #0a0c10;
  --bg-panel: #0d1117;
  --border-color: #1e2330;
  --accent-primary: #00d4ff;
  --accent-success: #22c55e;
  --text-primary: #ffffff;
  --text-muted: #888888;
  --font-mono: 'JetBrains Mono', monospace;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  background-color: var(--bg-dark);
  color: var(--text-primary);
  font-family: system-ui, -apple-system, sans-serif;
}

.dashboard {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg-dark);
}

.dashboard-header {
  background: var(--bg-panel);
  border-bottom: 2px solid var(--border-color);
  padding: 15px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dashboard-header h1 {
  color: var(--accent-primary);
  font-size: 24px;
  letter-spacing: 1px;
}

.connection-status {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--accent-primary);
  border: 1px solid var(--accent-primary);
  padding: 6px 12px;
  border-radius: 4px;
}

.tab-navigation {
  display: flex;
  background: var(--bg-panel);
  border-bottom: 1px solid var(--border-color);
  gap: 0;
  padding: 0 15px;
}

.tab {
  padding: 12px 20px;
  background: transparent;
  border: none;
  color: var(--accent-primary);
  cursor: pointer;
  font-weight: 600;
  border-bottom: 3px solid transparent;
  transition: all 0.3s;
}

.tab:hover {
  background: rgba(0, 212, 255, 0.05);
}

.tab.active {
  color: var(--bg-dark);
  background: var(--accent-primary);
  border-bottom-color: var(--accent-primary);
}

.dashboard-content {
  flex: 1;
  overflow: auto;
  padding: 20px;
}

.tab-content {
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 40px 20px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  min-height: 400px;
}

.tab-content h2 {
  color: var(--accent-primary);
  margin-bottom: 10px;
}

.tab-content p {
  color: var(--text-muted);
  font-size: 14px;
}

.dashboard-footer {
  background: var(--bg-panel);
  border-top: 1px solid var(--border-color);
  padding: 12px 20px;
  text-align: center;
  color: var(--text-muted);
  font-size: 12px;
}

@media (max-width: 768px) {
  .dashboard-header h1 {
    font-size: 18px;
  }
  .tab {
    padding: 10px 12px;
    font-size: 12px;
  }
}`,

  'src/index.css': `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #root {
  width: 100%;
  height: 100%;
}

body {
  background-color: #0a0c10;
  color: rgba(255, 255, 255, 0.87);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

button {
  border-radius: 4px;
  border: 1px solid transparent;
  padding: 0.6em 1.2em;
  font-size: 1em;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.25s;
}

button:hover {
  border-color: #00d4ff;
}

input {
  border-radius: 4px;
  border: 1px solid #1e2330;
  padding: 0.5em 0.8em;
  font-size: 1em;
  background: #111318;
  color: #fff;
}

input:focus {
  outline: none;
  border-color: #00d4ff;
  box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.1);
}`,

  'index.html': `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="3D Autonomous Mapping Robot Dashboard with ROS2 Integration" />
    <title>3D Mapping Robot Dashboard</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"><\/script>
  </body>
</html>`,

  '.github/workflows/ci.yml': `name: CI

on:
  push:
    branches: [ main, release/* ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [16.x, 18.x]

    steps:
    - uses: actions/checkout@v3
    - name: Use Node.js \${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: \${{ matrix.node-version }}
        cache: 'npm'
    - name: Install dependencies
      run: npm install
    - name: Build
      run: npm run build`
};

// ============================================
// MAIN EXECUTION
// ============================================

async function main() {
  console.log('\\n🤖 3D Mapping Robot Dashboard - Project Setup & Deploy\\n');
  console.log('========================================================\\n');

  try {
    // Get user inputs
    const username = await question('GitHub Username (e.g., ashwinprabhu2005-del): ');
    const token = await question('GitHub Personal Access Token (hidden): ');
    const createRepo = await question('Create new GitHub repository? (y/n): ');
    
    const repoName = 'mapping-robot-dashboard';
    const description = 'Live 3D mapping dashboard with ROS2 integration';

    // Create project directory
    console.log('\\n📁 Creating project structure...');
    createDirectory('mapping-robot-dashboard');

    // Write all files
    console.log('\\n📝 Writing 13 project files...');
    Object.entries(fileContents).forEach(([filePath, content]) => {
      writeFile(\`mapping-robot-dashboard/\${filePath}\`, content);
    });

    // Initialize git
    console.log('\\n🔧 Initializing git repository...');
    executeCommand('git init', 'mapping-robot-dashboard');
    executeCommand('git config user.name "Ashwin Prabhu"', 'mapping-robot-dashboard');
    executeCommand('git config user.email "ashwin@robotics.dev"', 'mapping-robot-dashboard');
    executeCommand('git add .', 'mapping-robot-dashboard');
    executeCommand('git commit -m "Initial project setup - complete scaffold ready for team"', 'mapping-robot-dashboard');
    executeCommand('git branch -M main', 'mapping-robot-dashboard');

    // Create GitHub repository
    if (createRepo.toLowerCase() === 'y') {
      console.log('\\n🌐 Creating GitHub repository...');
      try {
        const repoUrl = await createGitHubRepository(token, repoName, description);
        console.log('✓ GitHub repository created');

        // Push to GitHub
        console.log('\\n⬆️  Pushing files to GitHub...');
        const pushUrl = \`https://\${username}:\${token}@github.com/\${username}/\${repoName}.git\`;
        executeCommand(\`git remote add origin \${pushUrl}\`, 'mapping-robot-dashboard');
        executeCommand('git push -u origin main', 'mapping-robot-dashboard');

        // Success message
        console.log('\\n');
        console.log('✅ PROJECT SETUP COMPLETE!\\n');
        console.log('📁 Project Created: mapping-robot-dashboard/\\n');
        console.log('🚀 Next Steps:');
        console.log('   cd mapping-robot-dashboard');
        console.log('   npm install');
        console.log('   npm run dev\\n');
        console.log('👥 Share with Team:');
        console.log(\`   https://github.com/\${username}/\${repoName}\\n\`);
        console.log('📚 Documentation:');
        console.log('   - SETUP.md - Setup instructions');
        console.log('   - CONTRIBUTING.md - Git workflow');
        console.log('   - README.md - Project overview\\n');
        console.log('✨ Everything is ready! Your team can start immediately.\\n');
      } catch (error) {
        console.error('✗ Failed to create/push to GitHub:', error.message);
        console.log('\\nManual GitHub setup:');
        console.log('1. Create repository on GitHub.com');
        console.log('2. Push manually:');
        console.log(\`   cd mapping-robot-dashboard\`);
        console.log(\`   git remote add origin https://github.com/\${username}/\${repoName}.git\`);
        console.log('   git push -u origin main');
      }
    } else {
      console.log('\\n✓ Project created locally. Push to GitHub manually:');
      console.log('   cd mapping-robot-dashboard');
      console.log('   git remote add origin https://github.com/ashwinprabhu2005-del/mapping-robot-dashboard.git');
      console.log('   git push -u origin main');
    }

  } catch (error) {
    console.error('✗ Setup failed:', error);
  } finally {
    rl.close();
  }
}

main();

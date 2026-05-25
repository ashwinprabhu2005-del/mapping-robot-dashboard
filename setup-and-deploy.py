#!/usr/bin/env python3

import os
import json
import subprocess
import urllib.request
import urllib.error
from getpass import getpass

# ============================================
# HELPER FUNCTIONS
# ============================================

def create_directory(dir_path):
    os.makedirs(dir_path, exist_ok=True)

def write_file(file_path, content):
    create_directory(os.path.dirname(file_path) or '.')
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"  ✓ Created {file_path}")

def execute_command(command, cwd=None):
    if cwd is None:
        cwd = os.getcwd()
    try:
        subprocess.run(command, shell=True, check=True, cwd=cwd)
        return True
    except subprocess.CalledProcessError as e:
        print(f"✗ Command failed: {command}")
        print(e)
        return False

def create_github_repository(token, repo_name, description):
    url = "https://api.github.com/user/repos"
    data = json.dumps({
        "name": repo_name,
        "description": description,
        "public": True,
        "auto_init": False
    }).encode('utf-8')

    req = urllib.request.Request(url, data=data, method="POST")
    req.add_header("Authorization", f"token {token}")
    req.add_header("Content-Type", "application/json")
    req.add_header("User-Agent", "Python-urllib")

    try:
        with urllib.request.urlopen(req) as response:
            if response.status == 201:
                repo = json.loads(response.read().decode('utf-8'))
                return repo.get('html_url')
            else:
                raise Exception(f"GitHub API error: {response.status}")
    except urllib.error.HTTPError as e:
        error_msg = e.read().decode('utf-8')
        raise Exception(f"GitHub API error: {e.code} {error_msg}")

# ============================================
# FILE CONTENTS (All 13 files)
# ============================================

file_contents = {
    'package.json': '''{
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
}''',

    'vite.config.js': '''import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true
  }
})''',

    '.gitignore': '''node_modules/
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
.cache/''',

    'README.md': '''# 🤖 3D Autonomous Mapping Robot Dashboard

Live real-time 3D mapping dashboard with ROS2 integration, ML object detection, and zone annotation system.

## ✨ Features

- 📹 **Live Robot Camera Feed** - Real-time video streaming from ROS2 topics
- 📊 **Live Telemetry** - Robot position, battery, heading, mapping status
- 🗺️ **3D Map Viewer** - Interactive GLB mesh rendering with orbit controls
- 🎯 **Zone Annotation** - Draw and label regions on 3D maps
- 🤖 **Object Detection** - ML-powered object detection on camera feed
- ☁️ **Cloud Storage** - Save and manage multiple scans

## 🚀 Quick Start

```bash
npm install
npm run dev
```

Dashboard opens at http://localhost:5173

## 📁 Project Structure

```
src/
├── components/
├── services/
├── utils/
├── models/
├── App.jsx
└── main.jsx
```

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

Made with ❤️ for autonomous robotics''',

    'SETUP.md': '''# 🛠️ Local Development Setup

## Prerequisites

- Node.js 16+ (https://nodejs.org)
- npm (comes with Node.js)
- Git (https://git-scm.com)

## Installation

```bash
git clone https://github.com/ashwinprabhu2005-del/mapping-robot-dashboard.git
cd mapping-robot-dashboard
npm install
npm run dev
```

Dashboard opens at http://localhost:5173

## Git Setup

```bash
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

## Create Feature Branch

```bash
git checkout main
git pull origin main
git checkout -b feature/your-task-name
```

## Useful Commands

```bash
npm run dev       # Start dev server
npm run build     # Production build
git status        # See changes
git add .         # Stage changes
git commit -m "message"
git push origin branch-name
```

## Troubleshooting

### Port 5173 already in use
```bash
lsof -ti:5173 | xargs kill -9
npm run dev
```

### Node modules issue
```bash
rm -rf node_modules
npm install
```

See CONTRIBUTING.md for more details.''',

    'CONTRIBUTING.md': '''# 📝 Contributing Guidelines

## Branch Naming

```
ros2-integration/task-name
ui-dashboard/task-name
ml-detection/task-name
3d-mapping/task-name
```

## Commit Messages

```
feat: add live camera feed
fix: handle missing odometry
refactor: optimize renderer
```

## Code Style

- Variables: `camelCase`
- Components: `PascalCase`
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

```bash
npm run build    # Verify no build errors
git diff main    # Review your changes
```

## Handling Reviews

If changes requested:
```bash
git add .
git commit -m "review: address feedback"
git push origin your-branch
```

See README.md for more.''',

    '.env.example': '''VITE_ROBOT_IP=192.168.1.100
VITE_ROSBRIDGE_PORT=9090
VITE_ZENOH_PORT=7447
VITE_ENABLE_LOGGING=true
VITE_DEBUG_MODE=false''',

    'src/main.jsx': '''import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)''',

    'src/App.jsx': '''import { useState } from 'react'
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

export default App''',

    'src/App.css': ''':root {
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
}''',

    'src/index.css': '''* {
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
}''',

    'index.html': '''<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="3D Autonomous Mapping Robot Dashboard with ROS2 Integration" />
    <title>3D Mapping Robot Dashboard</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>''',

    '.github/workflows/ci.yml': '''name: CI

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
    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
    - name: Install dependencies
      run: npm install
    - name: Build
      run: npm run build'''
}

# ============================================
# MAIN EXECUTION
# ============================================

def main():
    print('\\n🤖 3D Mapping Robot Dashboard - Project Setup & Deploy\\n')
    print('========================================================\\n')

    try:
        # Get user inputs
        username = input('GitHub Username (e.g., ashwinprabhu2005-del): ')
        token = getpass('GitHub Personal Access Token (hidden): ')
        create_repo = input('Create new GitHub repository? (y/n): ')
        
        repo_name = 'mapping-robot-dashboard'
        description = 'Live 3D mapping dashboard with ROS2 integration'

        # Create project directory
        print('\\n📁 Creating project structure...')
        create_directory('mapping-robot-dashboard')

        # Write all files
        print('\\n📝 Writing 13 project files...')
        for file_path, content in file_contents.items():
            full_path = os.path.join('mapping-robot-dashboard', file_path)
            write_file(full_path, content)

        # Initialize git
        print('\\n🔧 Initializing git repository...')
        execute_command('git init', cwd='mapping-robot-dashboard')
        execute_command('git config user.name "Ashwin Prabhu"', cwd='mapping-robot-dashboard')
        execute_command('git config user.email "ashwin@robotics.dev"', cwd='mapping-robot-dashboard')
        execute_command('git add .', cwd='mapping-robot-dashboard')
        execute_command('git commit -m "Initial project setup - complete scaffold ready for team"', cwd='mapping-robot-dashboard')
        execute_command('git branch -M main', cwd='mapping-robot-dashboard')

        # Create GitHub repository
        if create_repo.lower() == 'y':
            print('\\n🌐 Creating GitHub repository...')
            try:
                repo_url = create_github_repository(token, repo_name, description)
                print('✓ GitHub repository created')

                # Push to GitHub
                print('\\n⬆️  Pushing files to GitHub...')
                push_url = f"https://{username}:{token}@github.com/{username}/{repo_name}.git"
                execute_command(f'git remote add origin {push_url}', cwd='mapping-robot-dashboard')
                execute_command('git push -u origin main', cwd='mapping-robot-dashboard')

                # Success message
                print('\\n')
                print('✅ PROJECT SETUP COMPLETE!\\n')
                print('📁 Project Created: mapping-robot-dashboard/\\n')
                print('🚀 Next Steps:')
                print('   cd mapping-robot-dashboard')
                print('   npm install')
                print('   npm run dev\\n')
                print('👥 Share with Team:')
                print(f'   https://github.com/{username}/{repo_name}\\n')
                print('📚 Documentation:')
                print('   - SETUP.md - Setup instructions')
                print('   - CONTRIBUTING.md - Git workflow')
                print('   - README.md - Project overview\\n')
                print('✨ Everything is ready! Your team can start immediately.\\n')
            except Exception as error:
                print(f'✗ Failed to create/push to GitHub: {error}')
                print('\\nManual GitHub setup:')
                print('1. Create repository on GitHub.com')
                print('2. Push manually:')
                print('   cd mapping-robot-dashboard')
                print(f'   git remote add origin https://github.com/{username}/{repo_name}.git')
                print('   git push -u origin main')
        else:
            print('\\n✓ Project created locally. Push to GitHub manually:')
            print('   cd mapping-robot-dashboard')
            print('   git remote add origin https://github.com/ashwinprabhu2005-del/mapping-robot-dashboard.git')
            print('   git push -u origin main')

    except KeyboardInterrupt:
        print('\\n✗ Setup cancelled.')
    except Exception as e:
        print(f'✗ Setup failed: {e}')

if __name__ == '__main__':
    main()

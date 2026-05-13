# React Snake Game

A Vite + React project for a browser-based snake game.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`
3. Open the URL shown in the terminal to view the game.

## GitHub Pages

This repository is configured to deploy `dist/` to GitHub Pages via GitHub Actions.
The published site will be available at: `https://hychang23.github.io/GAS/`

### Setup

To deploy successfully, enable GitHub Pages in the repository settings first:

1. Go to `Settings` → `Pages`
2. Set the source to `GitHub Actions`
3. Save the settings

After Pages is enabled, the workflow will build and deploy `./dist` automatically.

If auto-enabling Pages fails, you can still use this workflow once Pages is manually configured.

### Setup

**Option 1: Manual Setup (Simpler)**
1. Go to repository settings → Pages
2. Set source to `GitHub Actions`
3. The workflow will automatically deploy on next push

**Option 2: Auto-enable with Personal Access Token**
1. Create a GitHub Personal Access Token with `repo` or `pages:write` permission
2. Add it as a repository secret named `PAGES_TOKEN`
3. Update the workflow to use `token: ${{ secrets.PAGES_TOKEN }}`
4. The workflow will automatically enable and deploy Pages

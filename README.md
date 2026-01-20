<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1YqQhcAuzUkj4ymYWWPHLnOMkW2SZMvlm

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy to GitHub Pages

This project is configured to automatically deploy to GitHub Pages using GitHub Actions.

### 1. Configure Secrets
The application requires environment variables defined in `.env.example`.
1. Go to your repository's **Settings** > **Secrets and variables** > **Actions**.
2. Click **New repository secret**.
3. Add the following secret (refer to `.env.example`):
   - Name: `GEMINI_API_KEY`
   - Value: Your actual Gemini API key

### 2. Enable GitHub Pages
1. Go to **Settings** > **Pages**.
2. Under **Build and deployment** > **Source**, select **GitHub Actions**.

### 3. Trigger Deployment
1. Push your changes to the `main` branch.
2. The Action will automatically build and deploy your app.
3. Track progress in the **Actions** tab.

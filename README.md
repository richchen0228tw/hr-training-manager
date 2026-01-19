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

To deploy this application to GitHub Pages automatically using the configured GitHub Action:

1.  **Configure Repository Secrets:**
    The application requires environment variables defined in `.env.example` to be set as secrets in your repository.
    *   Go to your GitHub repository **Settings** > **Secrets and variables** > **Actions**.
    *   Click **New repository secret**.
    *   Add `GEMINI_API_KEY` (Refer to `.env.example` for the variable name).
    *   Value: Your actual Gemini API Key.

2.  **Enable GitHub Pages:**
    *   Go to **Settings** > **Pages**.
    *   Under **Build and deployment** > **Source**, select **GitHub Actions**.

3.  **Trigger Deployment:**
    *   Push your changes to the `main` branch.
    *   The deployment workflow will start automatically. You can check its progress in the **Actions** tab.


# EmailJS 設定教學

為了讓系統能夠發送真實的「重置密碼」信件，您需要註冊免費的 EmailJS 帳號並取得相關金鑰。請依照以下步驟操作：

## 第一步：註冊與登入
1. 前往 [EmailJS 官網](https://www.emailjs.com/)。
2. 點擊 **"Sign Up Free"** 註冊一個免費帳號。

## 第二步：建立 Email Service (郵件服務)
1. 登入後，點擊左側選單的 **"Email Services"**。
2. 點擊 **"Add New Service"**。
3. 選擇您想用來寄信的服務商 (推薦選擇 **Gmail**)。
4. 點擊 **"Connect Account"** 並授權您的 Gmail 帳號。
5. 建立成功後，您會看到一個 **Service ID** (通常是 `service_xxxxxx`)。
   - 複製這個 ID。
   - 填入 `.env.local` 的 `VITE_EMAILJS_SERVICE_ID` 欄位。

## 第三步：建立 Email Template (信件範本)
1. 點擊左側選單的 **"Email Templates"**。
2. 點擊 **"Create New Template"**。
3. 設計您的信件內容。
   - **Subject (主旨)**: `密碼重置通知`
   - **Content (內容)**: 請確保包含以下變數，系統才能自動填入：
     ```text
     親愛的 {{to_name}} 您好，

     您的臨時密碼為：{{temp_password}}

     請使用此密碼登入系統，並立即變更您的密碼。
     ```
   - 請務必保留 `{{to_name}}` 和 `{{temp_password}}` 這兩個變數名稱，因為程式碼是這樣對應的。
4. 設定 **"To Email"** (收件人) 為 `{{to_email}}` (這很重要！)。
5. 儲存範本後，點擊上方的 **"Settings"** 分頁。
6. 複製 **Template ID** (通常是 `template_xxxxxx`)。
   - 填入 `.env.local` 的 `VITE_EMAILJS_TEMPLATE_ID` 欄位。

## 第四步：取得 Public Key (公鑰)
1. 點擊右上角的個人頭像，選擇 **"Account"** (或 Dashboard 頁面的 "Account" 分頁)。
2. 在 **"General"** 頁面下方，找到 **"API Keys"** 區塊。
3. 複製 **Public Key** (一串亂碼)。
   - 填入 `.env.local` 的 `VITE_EMAILJS_PUBLIC_KEY` 欄位。

## 第五步：重啟專案
1. 確保 `.env.local` 三個欄位都已填寫完畢。
2. 在終端機按下 `Ctrl + C` 停止伺服器。
3. 重新執行 `npm run dev`。

完成以上步驟後，再次使用「忘記密碼」功能，您應該就會收到真實的 Email 了！

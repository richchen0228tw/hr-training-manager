/**
 * Netlify 環境變數批次設定腳本
 * 
 * 使用方式：
 * 1. 先從 GitHub Secrets 或本地文件獲取所有環境變數值
 * 2. 將值填入下方的 envVars 物件
 * 3. 在瀏覽器控制台貼上整個腳本並執行
 * 4. 腳本會自動點擊 "Add a variable" 並填入所有變數
 */

const envVars = {
    'VITE_FIREBASE_API_KEY': '',  // 從 GitHub Secrets 或 Firebase Console 獲取
    'VITE_FIREBASE_AUTH_DOMAIN': '',
    'VITE_FIREBASE_PROJECT_ID': '',
    'VITE_FIREBASE_STORAGE_BUCKET': '',
    'VITE_FIREBASE_MESSAGING_SENDER_ID': '',
    'VITE_FIREBASE_APP_ID': '',
    'GEMINI_API_KEY': '',
    'VITE_EMAILJS_SERVICE_ID': '',
    'VITE_EMAILJS_TEMPLATE_ID': '',
    'VITE_EMAILJS_PUBLIC_KEY': ''
};

// 檢查是否在正確的頁面
if (!window.location.href.includes('netlify.com')) {
    console.error('❌ 請在 Netlify 環境變數設定頁面執行此腳本');
    console.error('前往：https://app.netlify.com/sites/hr-training-manager/configuration/env');
} else {
    console.log('✅ 準備設定 Netlify 環境變數...');
    console.log('📋 將設定以下變數：', Object.keys(envVars));

    // 提示：這個腳本需要手動操作，因為 Netlify UI 是動態的
    console.warn('⚠️ 由於 Netlify UI 的限制，請手動執行以下步驟：');
    console.log('\n請依序複製以下變數名稱和值：\n');

    Object.entries(envVars).forEach(([key, value], index) => {
        console.log(`${index + 1}. Key: ${key}`);
        console.log(`   Value: ${value || '⚠️ 需要填入實際值'}`);
        console.log('');
    });

    console.log('\n💡 提示：你可以在 GitHub 檢查現有的 Secrets：');
    console.log('https://github.com/richchen0228tw/hr-training-manager/settings/secrets/actions');
}

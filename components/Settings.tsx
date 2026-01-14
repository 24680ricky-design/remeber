import React, { useState, useEffect } from 'react';
import { STORAGE_KEYS, DEFAULT_CATEGORIES } from '../constants';
import { Category } from '../types';
import { Save, RefreshCw, X, Plus, HelpCircle, ChevronDown, ChevronUp, UploadCloud } from 'lucide-react';
import { api } from '../services/api';

interface SettingsProps {
  categories: Category[];
  onCategoriesChange: (cats: Category[]) => void;
}

const Settings: React.FC<SettingsProps> = ({ categories, onCategoriesChange }) => {
  const [gasUrl, setGasUrl] = useState('');
  const [appTitle, setAppTitle] = useState('生活管家');
  const [newCatName, setNewCatName] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    setGasUrl(localStorage.getItem(STORAGE_KEYS.GAS_URL) || '');
    setAppTitle(localStorage.getItem(STORAGE_KEYS.APP_TITLE) || '生活管家');
  }, []);

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEYS.GAS_URL, gasUrl);
    localStorage.setItem(STORAGE_KEYS.APP_TITLE, appTitle);
    alert('設定已儲存，即將重新整理。');
    window.location.reload();
  };

  const handleSync = async () => {
    if (!gasUrl) return alert('請先設定並儲存 Script URL');
    if (!window.confirm('確定要將本機的所有資料匯入雲端嗎？\n請確認雲端為空的或可以接受重複資料。')) return;

    setIsSyncing(true);
    try {
      const res = await api.syncLocalToCloud();
      alert(res.message);
    } catch (e) {
      alert('同步失敗: ' + e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddCategory = () => {
    if (!newCatName) return;
    const newCat: Category = {
      id: `cat_${Date.now()}`,
      label: newCatName,
      iconKey: 'Circle', // Default
      color: '#d1d5db'
    };
    const updated = [...categories, newCat];
    onCategoriesChange(updated);
    setNewCatName('');
  };

  const handleRemoveCategory = (id: string) => {
    if (window.confirm('確定要刪除此類別嗎？')) {
      onCategoriesChange(categories.filter(c => c.id !== id));
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Help / Guide Section */}
      <div className="bg-white rounded-[2rem] shadow-sm overflow-hidden border border-gray-50">
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="w-full flex items-center justify-between p-6 bg-nordic-pink/10 text-nordic-text font-bold"
        >
          <div className="flex items-center gap-2">
            <HelpCircle size={20} className="text-nordic-blue" />
            使用說明 (App Guide)
          </div>
          {showGuide ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {showGuide && (
          <div className="p-6 text-sm text-gray-600 space-y-4 bg-gray-50/50">
            <div>
              <h4 className="font-bold text-gray-800 mb-1">📦 雙模式儲存</h4>
              <p>本 App 支援兩種模式：</p>
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li><span className="font-medium text-nordic-green">本機模式 (預設)</span>：所有資料僅儲存在您的瀏覽器中，清除快取會遺失資料。</li>
                <li><span className="font-medium text-nordic-green">雲端模式 (Google Sheets)</span>：設定 GAS URL 後，資料將同步至您的 Google 表格。</li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-gray-800 mb-1">🔗 如何設定雲端同步？</h4>
              <ol className="list-decimal pl-5 space-y-1 mt-1">
                <li>建立一個新的 Google Sheet。</li>
                <li>點擊擴充功能 &gt; Apps Script，貼上專案提供的 <code>backend_google_script.gs</code> 代碼。</li>
                <li>點擊「部署」 &gt; 「新增部署」 &gt; 類型選擇「網頁應用程式」。</li>
                <li><strong className="text-red-500">重要：</strong>將「執行身分」設為「我 (Me)」，「存取權」設為「任何人 (Anyone)」。</li>
                <li>複製產生的網頁應用程式 URL，貼入下方的「Script URL」欄位並儲存。</li>
              </ol>
            </div>

            <div>
              <h4 className="font-bold text-gray-800 mb-1">✨ 待辦轉記帳功能</h4>
              <p>當您在「待辦」頁面打勾完成事項時，系統會詢問是否將其轉為支出。選擇「是」後，事項名稱會自動帶入記帳備註欄位。</p>
            </div>
          </div>
        )}
      </div>

      {/* Cloud Settings */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm">
        <h3 className="text-lg font-bold text-gray-800 mb-4">雲端同步設定 (Google Sheets)</h3>
        <p className="text-xs text-gray-400 mb-4">
          請貼上 Google Apps Script 部署後的網址。若留空則使用本機儲存。
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Script URL</label>
            <input
              type="url"
              value={gasUrl}
              onChange={e => setGasUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/..."
              className="w-full bg-gray-50 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-nordic-blue"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">應用程式標題</label>
            <input
              type="text"
              value={appTitle}
              onChange={e => setAppTitle(e.target.value)}
              className="w-full bg-gray-50 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-nordic-blue"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 bg-gray-800 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-black transition-colors"
            >
              <Save size={18} /> 儲存並重新整理
            </button>
          </div>

          {gasUrl && (
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 border-2 transition-all ${isSyncing
                  ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                  : 'border-nordic-blue text-nordic-blue hover:bg-nordic-blue hover:text-white'
                }`}
            >
              <UploadCloud size={18} />
              {isSyncing ? '同步中...' : '匯入本機資料到雲端'}
            </button>
          )}
        </div>
      </div>

      {/* Categories */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm">
        <h3 className="text-lg font-bold text-gray-800 mb-4">分類管理</h3>
        <div className="flex gap-2 mb-4">
          <input
            value={newCatName}
            onChange={e => setNewCatName(e.target.value)}
            placeholder="新增分類名稱..."
            className="flex-1 bg-gray-50 px-3 py-2 rounded-xl text-sm outline-none"
          />
          <button onClick={handleAddCategory} className="bg-nordic-green text-white p-2 rounded-xl">
            <Plus size={20} />
          </button>
        </div>
        <div className="space-y-2">
          {categories.map(cat => (
            <div key={cat.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color }}></div>
                <span className="text-sm font-medium">{cat.label}</span>
              </div>
              <button onClick={() => handleRemoveCategory(cat.id)} className="text-gray-400 hover:text-red-400">
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Settings;
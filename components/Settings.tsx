import React, { useState, useEffect } from 'react';
import { STORAGE_KEYS, DEFAULT_CATEGORIES } from '../constants';
import { Category } from '../types';
import { Save, RefreshCw, X, Plus, HelpCircle, ChevronDown, ChevronUp, UploadCloud, Copy, Check } from 'lucide-react';
import { api } from '../services/api';

interface SettingsProps {
  categories: Category[];
  onCategoriesChange: (cats: Category[]) => void;
}

const DEFAULT_BACKEND_CODE = `// --- CONFIGURATION ---
var SCRIPT_PROP = PropertiesService.getScriptProperties();

function setup() {
  var doc = SpreadsheetApp.getActiveSpreadsheet();
  SCRIPT_PROP.setProperty("key", doc.getId());
  
  // Ensure sheets exist
  ensureSheet("Transactions", ["id", "date", "type", "categoryId", "amount", "note"]);
  ensureSheet("Todos", ["id", "text", "isCompleted", "createdAt"]);
}

function ensureSheet(name, headers) {
  var doc = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = doc.getSheetByName(name);
  if (!sheet) {
    sheet = doc.insertSheet(name);
    sheet.appendRow(headers);
  }
}

// --- API ENTRY POINTS ---

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var action = e.parameter.action;
    
    // If POST, body is in e.postData.contents
    var payload = null;
    if (e.postData && e.postData.contents) {
        var body = JSON.parse(e.postData.contents);
        action = body.action;
        payload = body.payload;
    }

    var doc = SpreadsheetApp.openById(SCRIPT_PROP.getProperty("key"));
    var result = {};

    if (action === "GET_DATA") {
       result = getAllData(doc);
    } 
    else if (action === "ADD_TRANSACTION") {
       addTransaction(doc, payload);
       result = { success: true };
    }
    else if (action === "DELETE_TRANSACTION") {
       deleteRow(doc, "Transactions", payload.id);
       result = { success: true };
    }
    else if (action === "ADD_TODO") {
       addTodo(doc, payload);
       result = { success: true };
    }
    else if (action === "TOGGLE_TODO") {
       toggleTodo(doc, payload.id, payload.isCompleted);
       result = { success: true };
    }
    else if (action === "DELETE_TODO") {
       deleteRow(doc, "Todos", payload.id);
       result = { success: true };
    }
    else if (action === "REORDER_TODOS") {
       updateAllTodos(doc, payload);
       result = { success: true };
    }
    else {
       result = { success: false, message: "Unknown Action" };
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (e) {
    return ContentService
      .createTextOutput(JSON.stringify({ "success": false, "message": e.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// --- LOGIC ---

function getAllData(doc) {
  var txSheet = doc.getSheetByName("Transactions");
  var todoSheet = doc.getSheetByName("Todos");
  
  var txData = sheetToObjects(txSheet);
  // Convert amount to number
  txData.forEach(function(t) { t.amount = Number(t.amount); });

  var todoData = sheetToObjects(todoSheet);
  // Convert boolean
  todoData.forEach(function(t) { t.isCompleted = (t.isCompleted === 'TRUE' || t.isCompleted === true); });

  // Helper for Default Categories (Static in GAS, could be dynamic)
  var categories = [
    { id: 'cat_1', label: '飲食', iconKey: 'Utensils', color: '#e8d5d5' },
    { id: 'cat_2', label: '交通', iconKey: 'Bus', color: '#8fa3ad' },
    { id: 'cat_3', label: '購物', iconKey: 'ShoppingBag', color: '#8da399' },
    { id: 'cat_4', label: '娛樂', iconKey: 'Film', color: '#f0c4c4' },
    { id: 'cat_5', label: '帳單', iconKey: 'Zap', color: '#b8c5d6' },
    { id: 'cat_6', label: '醫療', iconKey: 'Heart', color: '#d6b8b8' }
  ];

  return {
    success: true,
    data: {
      transactions: txData.reverse(), // Newest first
      todos: todoData,
      categories: categories
    }
  };
}

function addTransaction(doc, data) {
  var sheet = doc.getSheetByName("Transactions");
  sheet.appendRow([data.id, data.date, data.type, data.categoryId, data.amount, data.note]);
}

function addTodo(doc, data) {
  var sheet = doc.getSheetByName("Todos");
  sheet.appendRow([data.id, data.text, data.isCompleted, data.createdAt]);
}

function updateAllTodos(doc, todos) {
  var sheet = doc.getSheetByName("Todos");
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
  }
  if (todos.length > 0) {
      var rows = todos.map(function(t) {
        return [t.id, t.text, t.isCompleted, t.createdAt];
      });
      sheet.getRange(2, 1, rows.length, 4).setValues(rows);
  }
}

function toggleTodo(doc, id, isCompleted) {
  var sheet = doc.getSheetByName("Todos");
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.getRange(i + 1, 3).setValue(isCompleted); 
      break;
    }
  }
}

function deleteRow(doc, sheetName, id) {
  var sheet = doc.getSheetByName(sheetName);
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
}

function sheetToObjects(sheet) {
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var result = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j];
    }
    result.push(obj);
  }
  return result;
}`;

const Settings: React.FC<SettingsProps> = ({ categories, onCategoriesChange }) => {
  const [gasUrl, setGasUrl] = useState('');
  const [appTitle, setAppTitle] = useState('生活管家');
  const [newCatName, setNewCatName] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const handleCopyCode = () => {
    navigator.clipboard.writeText(DEFAULT_BACKEND_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
                <li>點擊 <span className="font-bold text-nordic-blue">擴充功能 (Extensions)</span> &gt; Apps Script。</li>
                <li>
                  複製下方代碼並貼上，覆原有內容：
                  <div className="relative mt-2 mb-2">
                    <pre className="bg-gray-800 text-gray-300 p-3 rounded-xl overflow-x-auto text-xs h-32 custom-scrollbar font-mono">
                      {DEFAULT_BACKEND_CODE}
                    </pre>
                    <button
                      onClick={handleCopyCode}
                      className="absolute top-2 right-2 bg-white/10 hover:bg-white/20 text-white p-1.5 rounded-lg transition-colors backdrop-blur-sm"
                      title="複製代碼"
                    >
                      {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                    </button>
                  </div>
                </li>
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
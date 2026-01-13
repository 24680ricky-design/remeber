// --- CONFIGURATION ---
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

function toggleTodo(doc, id, isCompleted) {
  var sheet = doc.getSheetByName("Todos");
  var data = sheet.getDataRange().getValues();
  // Find row by ID (Column 0)
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      // isCompleted is column index 2 (0, 1, 2)
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

// --- UTILS ---

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
}
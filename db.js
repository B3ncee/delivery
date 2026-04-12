// db.js - IndexedDB kezelő függvények

const DB_NAME = 'DeliveryAppDB';
const DB_VERSION = 1;
let db = null;

const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('state')) {
        db.createObjectStore('state', { keyPath: 'id' });
      }
    };
  });
};

const saveStateToDB = async () => {
  if (!db) await initDB();
  const transaction = db.transaction(['state'], 'readwrite');
  const store = transaction.objectStore('state');
  const cloned = {
    id: 'appState',
    users: state.users,
    currentUser: state.currentUser ? state.currentUser.username : null,
    shift: state.shift,
    orders: state.orders,
    currentOrderId: state.currentOrder ? state.currentOrder.id : null,
    historyShifts: state.historyShifts,
    historyOrders: state.historyOrders,
    logs: state.logs,
  };
  store.put(cloned);
  transaction.oncomplete = () => console.log('Állapot mentve az adatbázisba.');
  transaction.onerror = () => console.error('Hiba az állapot mentésekor:', transaction.error);
};

const loadStateFromDB = async () => {
  if (!db) await initDB();
  const transaction = db.transaction(['state'], 'readonly');
  const store = transaction.objectStore('state');
  const request = store.get('appState');
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const copy = request.result;
      if (copy) {
        if (copy.historyShifts) state.historyShifts = copy.historyShifts;
        if (copy.historyOrders) state.historyOrders = copy.historyOrders;
        if (copy.logs) state.logs = copy.logs;
        if (copy.shift) state.shift = copy.shift;
        if (copy.orders) state.orders = copy.orders;
        if (copy.currentUser) {
          const user = state.users.find(u => u.username === copy.currentUser);
          if (user) state.currentUser = user;
        }
        if (copy.currentOrderId && state.shift) {
          const order = state.shift.orders.find(o => o.id === copy.currentOrderId) || state.orders.find(o => o.id === copy.currentOrderId);
          if (order) state.currentOrder = order;
        }
      }
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
};
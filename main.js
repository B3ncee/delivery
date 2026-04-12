// main.js - Alkalmazás inicializáció és event handlerek

const initApp = async () => {
  await initDB();
  await loadStateFromDB();
  renderCarSelect();
  refreshState();
};

// Event handlerek
el('login-btn').addEventListener('click', () => {
  const user = el('username').value.trim();
  const pass = el('password').value;
  const found = state.users.find(u => u.username === user && u.password === pass);
  if (!found) {
    el('login-error').textContent = 'Helytelen felhasználó vagy jelszó.';
    return;
  }
  state.currentUser = found;
  logEvent(`Bejelentkezés: ${found.name}`);
  saveStateToDB();
  el('login-error').textContent = '';
  refreshState();
});

el('logout-btn').addEventListener('click', () => {
  if (state.currentUser) logEvent(`Kijelentkezés: ${state.currentUser.name}`);
  state.currentUser = null;
  // Megtartjuk a state.shift-et, hogy újranyitáskor folytatható legyen a szolgálat
  // state.shift = null;
  // state.orders = [];
  state.currentOrder = null;
  el('username').value = '';
  el('password').value = '';
  saveStateToDB();
  refreshState();
  toast('Kijelentkezve (szolgálat megőrizve)');
});

el('start-shift-btn').addEventListener('click', () => {
  show('shift-panel');
});

el('confirm-shift-btn').addEventListener('click', () => {
  const car = el('car-select').value;
  const startKm = Number(el('start-km').value || 0);
  const startCash = Number(el('start-cash').value || 0);
  if (!car || startKm < 0 || startCash < 0) {
    toast('Add meg a rendszámot, induló km-et és készpénz értéket.');
    return;
  }
  setActiveShift(car, startKm, startCash);
  toast('Szolgálat elindítva és mentve.');
  el('start-km').value = '';
  el('start-cash').value = '';
  hide('shift-panel');
});

el('close-day-btn').addEventListener('click', () => {
  if (!state.shift) {
    toast('Nincs aktív szolgálat.');
    return;
  }
  const closedShift = { ...state.shift, endTime: new Date().toISOString() };
  state.historyShifts.push(closedShift);
  state.shift.orders.forEach(order => {
    if (order.paid && !order.archived) {
      order.archived = true;
      moveOrderToHistory(order);
    }
  });
  state.shift = null;
  state.currentOrder = null;
  saveStateToDB();
  logEvent(`Napzárás végrehajtva: szolgálat lezárva ${closedShift.car}`);
  refreshState();
  toast('Napzárás megtörtént, szolgálat lezárva.');
});

el('start-tracking-btn').addEventListener('click', () => {
  startTracking();
});

el('stop-tracking-btn').addEventListener('click', () => {
  stopTracking();
});

el('add-order-btn').addEventListener('click', () => {
  addOrder();
});

el('confirm-payment-btn').addEventListener('click', () => {
  confirmPayment();
});

el('add-tip-btn').addEventListener('click', () => {
  addTip();
});

// Tab gombok
el('show-orders-btn').addEventListener('click', () => {
  show('order-list-panel');
  hide('history-panel');
  hide('log-panel');
  hide('profile-panel');
});

el('show-history-btn').addEventListener('click', () => {
  hide('order-list-panel');
  show('history-panel');
  hide('log-panel');
  hide('profile-panel');
  renderHistory();
});

el('show-log-btn').addEventListener('click', () => {
  hide('order-list-panel');
  hide('history-panel');
  show('log-panel');
  hide('profile-panel');
});

el('show-profile-btn').addEventListener('click', () => {
  hide('order-list-panel');
  hide('history-panel');
  hide('log-panel');
  show('profile-panel');
  renderProfile();
});

// Inicializálás
initApp();
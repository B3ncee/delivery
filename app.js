const state = {
  users: [
    { username: 'futar', password: '1234', name: 'Futár', totalKm: 0, totalTip: 0 }
  ],
  currentUser: null,
  shift: null,
  orders: [],
  currentOrder: null,
  logs: [],
  historyShifts: [],
  historyOrders: []
};

const saveStateToStorage = () => {
  const cloned = {
    users: state.users,
    historyShifts: state.historyShifts,
    historyOrders: state.historyOrders,
    logs: state.logs,
  };
  localStorage.setItem('deliveryAppState', JSON.stringify(cloned));
};

const loadStateFromStorage = () => {
  const raw = localStorage.getItem('deliveryAppState');
  if (!raw) return;
  try {
    const copy = JSON.parse(raw);
    if (copy.historyShifts) state.historyShifts = copy.historyShifts;
    if (copy.historyOrders) state.historyOrders = copy.historyOrders;
    if (copy.logs) state.logs = copy.logs;
  } catch (err) {
    console.warn('Nem sikerült betölteni az állapotot:', err);
  }
};

loadStateFromStorage();

const carOptions = ['JXJ-978'];

let map = null;
let trackLayer = null;
let pathPoints = [];
let watchId = null;

const el = id => document.getElementById(id);

const show = id => el(id).classList.remove('hidden');
const hide = id => el(id).classList.add('hidden');

const toast = msg => {
  const t = el('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 1600);
};

const logEvent = text => {
  const time = new Date().toLocaleTimeString();
  state.logs.unshift({ time, text });
  renderLog();
};

const initMap = () => {
  if (!map) {
    map = L.map('map');
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    trackLayer = L.polyline([], { color: 'red', weight: 4 }).addTo(map);
  }
};

const startTracking = () => {
  if (!('geolocation' in navigator)) {
    toast('A böngésző nem támogatja a helymeghatározást.');
    return;
  }
  initMap();
  pathPoints = [];
  trackLayer.setLatLngs(pathPoints);
  show('map');
  show('stop-tracking-btn');
  hide('start-tracking-btn');
  el('tracking-status').textContent = 'GPS indítva. Várakozás az első pozícióra...';

  watchId = navigator.geolocation.watchPosition(position => {
    const latlng = [position.coords.latitude, position.coords.longitude];
    pathPoints.push(latlng);
    trackLayer.setLatLngs(pathPoints);
    map.setView(latlng, 16);
    L.circleMarker(latlng, { radius: 5, color: 'blue' }).addTo(map);
    el('tracking-status').textContent = `Pozíció: ${latlng[0].toFixed(6)}, ${latlng[1].toFixed(6)} (pontok: ${pathPoints.length})`;
  }, error => {
    const errMap = {
      1: 'Helymeghatározás elutasítva.',
      2: 'Nem lehet pozíciót kapni.',
      3: 'Időtúllépés a helymeghatározásnál.'
    };
    el('tracking-status').textContent = errMap[error.code] || 'Ismeretlen GPS hiba.';
    toast(el('tracking-status').textContent);
  }, {
    enableHighAccuracy: true,
    maximumAge: 1000,
    timeout: 10000
  });

  logEvent('GPS követés indítva.');
};

const stopTracking = () => {
  if (watchId != null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  hide('stop-tracking-btn');
  show('start-tracking-btn');
  el('tracking-status').textContent = `GPS leállt. Teljes táv pontok száma: ${pathPoints.length}`;
  logEvent('GPS követés leállítva.');
};

const renderLog = () => {
  const log = el('log');
  log.innerHTML = state.logs.map(l => `<div class="log-entry"><b>${l.time}</b> — ${l.text}</div>`).join('');
};

const renderCarSelect = () => {
  const select = el('car-select');
  select.innerHTML = carOptions.map(c => `<option value="${c}">${c}</option>`).join('');
};

const resetOrderForm = () => {
  el('order-code').value = '';
  el('order-amount').value = '';
  el('order-address').value = '';
  el('order-phone').value = '';
  el('order-pay-method').value = 'kp';
};

const renderOrderList = () => {
  const list = el('orders-list');
  const orders = state.shift ? state.shift.orders : [];
  const activeOrders = orders.filter(o => !o.paid || !o.delivered);
  const finishedOrders = orders.filter(o => o.paid && o.delivered);

  const makeOrderHtml = order => {
    const status = order.paid ? 'Kifizetett' : 'Fizetetlen';
    const delivery = order.delivered ? 'Kiszállítva' : (order.deliveryStart ? 'Úton' : 'Várakozik');
    const duration = order.deliveryDuration ? ` (${order.deliveryDuration}s)` : '';
    return `
      <div class="order-row" id="order-${order.id}">
        <strong>${order.code} - ${order.amount} Ft</strong>
        <span>Cím: ${order.address}</span>
        <span>Tel: ${order.phone} <button data-action="copy" data-id="${order.id}" class="mini-btn">Másol</button></span>
        <span>Fizetési mód: ${order.payMethod} (${status})</span>
        <span>Borravaló: ${order.tip || 0} Ft</span>
        <span>Státusz: ${delivery}${duration}</span>
        <div class="order-actions">
          <button data-action="pay" data-id="${order.id}" ${order.paid ? 'disabled' : ''}>Fizetés</button>
          <button data-action="tip" data-id="${order.id}" ${!order.paid ? 'disabled' : ''}>Borravaló</button>
          <button data-action="delivery" data-id="${order.id}" ${order.delivered ? 'disabled' : ''}>${order.deliveryStart ? (order.delivered ? 'Kiszállítva' : 'Kiszállítás befejezése') : 'Kiszállítás indítása'}</button>
        </div>
      </div>`;
  };

  if (!orders.length) {
    list.innerHTML = '<p>Nincsenek rendelések.</p>';
    return;
  }

  const activeHtml = activeOrders.length ? `<h4>Aktív rendelések</h4>${activeOrders.map(makeOrderHtml).join('')}` : '<p>Nincsenek aktív rendelések.</p>';
  const finishedHtml = finishedOrders.length ? `<h4>Fizetett + lezárt rendelések</h4>${finishedOrders.map(makeOrderHtml).join('')}` : '<p>Nincsenek fizetett lezárt rendelések.</p>';

  list.innerHTML = `${activeHtml}${finishedHtml}`;

  list.querySelectorAll('.order-row button').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.id);
      const order = orders.find(o => o.id === id);
      if (!order) return;
      if (btn.dataset.action === 'copy') {
        navigator.clipboard.writeText(order.phone).then(() => toast('Telefonszám másolva'));
        return;
      }
      if (btn.dataset.action === 'pay') {
        setCurrentOrderForPayment(order);
        return;
      }
      if (btn.dataset.action === 'tip') {
        state.currentOrder = order;
        toast('Most add meg a borravalót és nyomd meg a Borravaló mentése gombot.');
        return;
      }
      if (btn.dataset.action === 'delivery') {
        if (order.delivered) {
          toast('Ez a rendelés már teljesen lezárt.');
          return;
        }
        if (!order.deliveryStart) {
          order.deliveryStart = Date.now();
          logEvent(`Kiszállítás indítva: ${order.code}`);
          renderOrderList();
          return;
        }
        if (!order.paid) {
          setCurrentOrderForPayment(order);
          toast('Először fizesd ki a rendelést a fizetési panelen, majd jelöld készre.');
          return;
        }
        order.deliveryDuration = Math.round((Date.now() - order.deliveryStart) / 1000);
        order.delivered = true;
        logEvent(`Kiszállítás befejezve: ${order.code} (${order.deliveryDuration}s)`);
        if (state.shift) {
          state.historyOrders.push(order);
        }
        saveStateToStorage();
        renderOrderList();
        return;
      }
    });
  });
};

const setCurrentOrderForPayment = order => {
  state.currentOrder = order;
  el('actual-payment-type').value = order.payMethod;
  if (order.payMethod === 'kp') show('cash-denominations'); else hide('cash-denominations');
  show('payment-panel');
  show('tip-panel');
  logEvent(`Rendelés kiválasztva fizetéshez: ${order.code} (${order.amount} Ft)`);
};

const renderHistory = () => {
  const list = el('history-list');
  if (!state.historyOrders.length && !state.historyShifts.length) {
    list.innerHTML = '<p>Nincs korábbi adat.</p>';
    return;
  }
  let html = '';
  if (state.historyShifts.length) {
    html += '<h4>Zárt szolgálatok</h4>' + state.historyShifts.map(s => `<div class="history-entry"><strong>${s.car}</strong> ${new Date(s.startTime).toLocaleString()} - ${new Date(s.endTime).toLocaleString()}</div>`).join('');
  }
  if (state.historyOrders.length) {
    html += '<h4>Fizetett rendelések</h4>' + state.historyOrders.map(o => `<div class="history-entry">${o.code} - ${o.amount} Ft - ${o.address} - ${o.payMethod} - ${o.paid ? 'Kifizetett' : 'Nincs fizetve'} - ${o.delivered ? 'Kiszállítva' : 'Nem kiszállítva'}</div>`).join('');
  }
  list.innerHTML = html;
};

const renderProfile = () => {
  const panel = el('profile-info');
  if (!state.currentUser) {
    panel.innerHTML = '<p>Nincs bejelentkezett felhasználó</p>';
    return;
  }
  const shiftKm = state.shift ? `Mostani váltó km: ${state.shift.startKm || 0}` : '';
  panel.innerHTML = `
    <p><strong>Futár:</strong> ${state.currentUser.name}</p>
    <p><strong>Össz km:</strong> ${state.currentUser.totalKm} km</p>
    <p><strong>Össz borravaló:</strong> ${state.currentUser.totalTip} Ft</p>
    <p>${shiftKm}</p>
  `;
};

const setActiveShift = (car, km, cash) => {
  state.shift = { car, startKm: km, cash: cash, startTime: new Date().toISOString(), orders: [] };
  state.currentOrder = null;
  show('order-panel');
  show('order-list-panel');
  show('payment-panel');
  show('tip-panel');
  show('map-panel');
  renderOrderList();
  logEvent(`Szolgálat indítva: ${car}, start km: ${km}, készpénz: ${cash} Ft`);
  saveStateToStorage();
};

const refreshState = () => {
  if (!state.currentUser) {
    hide('main-section');
    show('login-section');
    return;
  }
  el('welcome').textContent = `${state.currentUser.name} bejelentkezve`;
  hide('login-section');
  show('main-section');
  hide('order-list-panel');
  hide('log-panel');
  hide('profile-panel');
  if (!state.shift) {
    hide('shift-panel');
    hide('order-panel');
    hide('payment-panel');
    hide('tip-panel');
    hide('map-panel');
    hide('map');
    hide('stop-tracking-btn');
    show('start-tracking-btn');
  } else {
    show('order-list-panel');
    renderOrderList();
  }
};

// event handlers
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
  saveStateToStorage();
  el('login-error').textContent = '';
  echoStart();
});

el('logout-btn').addEventListener('click', () => {
  if (state.currentUser) logEvent(`Kijelentkezés: ${state.currentUser.name}`);
  state.currentUser = null;
  state.shift = null;
  state.orders = [];
  state.currentOrder = null;
  el('username').value = '';
  el('password').value = '';
  saveStateToStorage();
  refreshState();
  toast('Kijelentkezve');
});

const echoStart = () => {
  renderCarSelect();
  refreshState();
  show('shift-panel');
};

el('start-shift-btn').addEventListener('click', () => {
  show('shift-panel');
});

el('close-day-btn').addEventListener('click', () => {
  if (!state.shift) {
    toast('Nincs aktív szolgálat.');
    return;
  }
  const closedShift = { ...state.shift, endTime: new Date().toISOString() };
  state.historyShifts.push(closedShift);
  state.historyOrders.push(...closedShift.orders);
  state.shift = null;
  state.currentOrder = null;
  saveStateToStorage();
  logEvent(`Napzárás végrehajtva: szolgálat lezárva ${closedShift.car}`);
  refreshState();
  toast('Napzárás megtörtént, szolgálat lezárva.');
});

el('show-orders-btn').addEventListener('click', () => {
  show('order-list-panel');
  hide('log-panel');
  renderOrderList();
});

el('show-log-btn').addEventListener('click', () => {
  hide('order-list-panel');
  hide('history-panel');
  hide('profile-panel');
  show('log-panel');
});

el('show-history-btn').addEventListener('click', () => {
  hide('order-list-panel');
  hide('log-panel');
  hide('profile-panel');
  show('history-panel');
  renderHistory();
});

el('show-profile-btn').addEventListener('click', () => {
  hide('order-list-panel');
  hide('log-panel');
  hide('history-panel');
  show('profile-panel');
  renderProfile();
});

el('start-tracking-btn').addEventListener('click', () => {
  if (!state.shift) {
    toast('Előbb indítsd a szolgálatot, és csak utána indítsd a GPS követést.');
    return;
  }
  show('map-panel');
  startTracking();
});

el('stop-tracking-btn').addEventListener('click', () => {
  stopTracking();
});

el('confirm-shift-btn').addEventListener('click', () => {
  const car = el('car-select').value;
  const km = Number(el('start-km').value);
  const cash = Number(el('start-cash').value);
  if (!car || isNaN(km) || isNaN(cash)) {
    toast('Kérlek töltsd ki az összes mezőt!');
    return;
  }
  setActiveShift(car, km, cash);
});

el('add-order-btn').addEventListener('click', () => {
  if (!state.shift) {
    toast('Előbb indítsd a szolgálatot!');
    return;
  }
  const code = el('order-code').value.trim();
  const amount = Number(el('order-amount').value);
  const payMethod = el('order-pay-method').value;
  const address = el('order-address').value.trim();
  const phone = el('order-phone').value.trim();
  if (!code || !amount || !address || !phone) {
    toast('Minden rendelés mezőt tölts ki!');
    return;
  }
  const order = { id: Date.now(), code, amount, payMethod, address, phone, paid: false, tip: 0 };
  state.orders.push(order);
  state.shift.orders.push(order);
  state.currentOrder = order;
  logEvent(`Rendelés felvéve: ${code}, ${amount} Ft, fizetés: ${payMethod}, cím: ${address}, tel: ${phone}`);
  resetOrderForm();
  renderOrderList();
  show('order-list-panel');
  hide('log-panel');
  toast('Rendelés rögzítve');
});

el('actual-payment-type').addEventListener('change', (e) => {
  const v = e.target.value;
  if (v === 'kp') {
    show('cash-denominations');
  } else {
    hide('cash-denominations');
  }
});

el('confirm-payment-btn').addEventListener('click', () => {
  if (!state.currentOrder) {
    toast('Előbb vegyél fel rendelést!');
    return;
  }
  const method = el('actual-payment-type').value;
  const order = state.currentOrder;
  order.paid = true;
  order.paymentType = method;

  if (method === 'kp') {
    const denominations = [20000,10000,5000,2000,1000,500,200,100,50];
    let sum = 0;
    denominations.forEach(v => {
      const cnt = Number(el(`d${v}`).value) || 0;
      sum += cnt * v;
    });
    state.shift.cash += sum;
    logEvent(`Készpénz fizetés: ${order.amount} Ft, címletek: ${sum} Ft. Tárca érték most: ${state.shift.cash} Ft`);
  } else {
    const typeName = method === 'bank' ? 'bankkártya' : 'szép kártya';
    logEvent(`Fizetés megerősítve ${typeName}-ként majd a rendelés lezárva: ${order.amount} Ft`);
  }

  saveStateToStorage();
  show('tip-panel');
  toast('Fizetés rögzítve');
});

el('add-tip-btn').addEventListener('click', () => {
  if (!state.currentOrder || !state.currentOrder.paid) {
    toast('Előbb fizess be a rendelést!');
    return;
  }
  const tip = Number(el('tip-amount').value);
  if (isNaN(tip) || tip < 0) {
    toast('Adjon meg érvényes borravalót.');
    return;
  }
  state.currentOrder.tip = tip;
  if (state.shift) state.shift.cash += tip;
  if (state.currentUser) state.currentUser.totalTip += tip;
  logEvent(`Borravaló rögzítve ${tip} Ft. Tárca: ${state.shift.cash} Ft`);
  saveStateToStorage();
  renderProfile();
  toast('Borravaló mentve');
  el('tip-amount').value = '';
});

el('close-day-btn').addEventListener('click', () => {
  if (!state.shift) {
    toast('Még nincs aktív szolgálat.');
    return;
  }
  const closingKm = Number(prompt('Záró km óraállás?'));
  if (isNaN(closingKm) || closingKm < state.shift.startKm) {
    toast('Érvénytelen km óraállás.');
    return;
  }
  const kmTotal = closingKm - state.shift.startKm;
  const finalCash = state.shift.cash;
  logEvent(`Napzárás: záró km ${closingKm}, megtett: ${kmTotal} km, tárcában: ${finalCash} Ft`);
  state.shift = null;
  state.orders = [];
  state.currentOrder = null;
  hide('order-panel');
  hide('order-list-panel');
  hide('payment-panel');
  hide('tip-panel');
  // naplózzuk a km-t a profilban is
  if (state.currentUser) {
    state.currentUser.totalKm += kmTotal;
  }
  show('log-panel');
  renderProfile();
  toast('Napzárás kész');
});

refreshState();

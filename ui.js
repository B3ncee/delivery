// ui.js - UI render és event handler függvények

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
  const activeOrders = orders.filter(o => !o.archived);
  const finishedOrders = orders.filter(o => o.archived);

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
        saveStateToDB();
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
    html += '<h4>Zárt szolgálatok</h4>' + state.historyShifts.map(s => `<div class="history-entry"><strong>${s.car}</strong> ${new Date(s.startTime).toLocaleString()} - ${new Date(s.endTime).toLocaleString()} | Napi készpénz: ${s.cash || 0} Ft</div>`).join('');
  }
  if (state.historyOrders.length) {
    html += '<h4>Fizetett + archivált rendelések</h4>' + state.historyOrders.map(o => `
      <div class="history-entry" id="history-${o.id}">
        ${o.code} - ${o.amount} Ft - ${o.address} - ${o.payMethod} - ${o.paid ? 'Kifizetett' : 'Nincs fizetve'} - ${o.delivered ? 'Kiszállítva' : 'Nem kiszállítva'} - Borravaló: ${o.tip || 0} Ft
        <button data-action="edit-history" data-id="${o.id}" class="mini-btn">Szerkesztés</button>
      </div>
    `).join('');
  }
  list.innerHTML = html;

  list.querySelectorAll('button[data-action="edit-history"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.id);
      const order = state.historyOrders.find(o => o.id === id);
      if (!order) return;
      state.currentOrder = order;
      el('tip-amount').value = order.tip || 0;
      el('actual-payment-type').value = order.payMethod;
      show('payment-panel');
      show('tip-panel');
      toast(`Szerkesztheted: ${order.code}`);
      renderOrderList();
    });
  });
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

const moveOrderToHistory = (order) => {
  const existing = state.historyOrders.find(o => o.id === order.id);
  if (!existing) {
    state.historyOrders.push({ ...order });
  }
};

const settleOrderIfReady = (order) => {
  if (order && order.paid) {
    if (order.tip == null) order.tip = 0;
    if (!order.archived) {
      order.archived = true;
      moveOrderToHistory(order);
      logEvent(`Rendelés archiválva: ${order.code} (${order.amount} Ft, borravaló: ${order.tip || 0} Ft)`);
    }
  }
};

const addOrder = () => {
  if (!state.shift) {
    toast('Előbb indítsd el a szolgálatot.');
    return;
  }
  const code = el('order-code').value.trim();
  const amount = Number(el('order-amount').value || 0);
  const address = el('order-address').value.trim();
  const phone = el('order-phone').value.trim();
  const payMethod = el('order-pay-method').value;
  if (!code || amount <= 0 || !address || !phone) {
    toast('Minden mezőt ki kell tölteni, összeg > 0.');
    return;
  }
  const order = {
    id: safeOrderId(),
    code,
    amount,
    address,
    phone,
    payMethod,
    paid: false,
    delivered: false,
    deliveryStart: null,
    deliveryDuration: null,
    tip: 0,
    paymentTime: null,
    archived: false
  };
  state.shift.orders.push(order);
  logEvent(`Új rendelés felvéve: ${code} (${amount} Ft, ${payMethod})`);
  resetOrderForm();
  saveStateToDB();
  renderOrderList();
};

const confirmPayment = async () => {
  if (!state.currentOrder) {
    toast('Válassz rendelést a fizetéshez.');
    return;
  }
  const selectedPayMethod = el('actual-payment-type').value;
  const order = state.currentOrder;
  order.payMethod = selectedPayMethod;
  if (selectedPayMethod === 'kp') {
    const denominations = [20000,10000,5000,2000,1000,500,200,100,50];
    let sum = 0;
    denominations.forEach(d => {
      const value = Number(el(`d${d}`).value || 0);
      sum += value * d;
    });
    if (sum < order.amount) {
      toast('A készpénz összege legalább a rendelés értéke legyen.');
      return;
    }
    if (state.shift) {
      state.shift.cash += order.amount;
    }
  }

  // Valós idejű fizetés szimuláció
  const paymentPanel = el('payment-panel');
  paymentPanel.classList.add('loading');
  el('confirm-payment-btn').disabled = true;
  toast('Fizetés feldolgozása...');

  // Várakozás 5 másodperc (valós alkalmazásban ez API hívás lenne)
  await new Promise(resolve => setTimeout(resolve, 5000));

  order.paid = true;
  order.paymentTime = new Date().toISOString();

  if (state.currentUser) {
    state.currentUser.totalTip = state.currentUser.totalTip || 0;
  }

  logEvent(`Rendelés kifizetve: ${order.code} (${order.amount} Ft) (${selectedPayMethod})`);
  settleOrderIfReady(order);
  saveStateToDB();
  renderOrderList();
  paymentPanel.classList.remove('loading');
  el('confirm-payment-btn').disabled = false;
  toast('Fizetés sikeresen rögzítve! Adj hozzá borravalót, ha van.');
};

const addTip = () => {
  if (!state.currentOrder) {
    toast('Válassz rendelést, amire borravalót szeretnél adni.');
    return;
  }
  const tipValue = Number(el('tip-amount').value || 0);
  if (tipValue < 0) {
    toast('Borravaló nem lehet negatív.');
    return;
  }
  state.currentOrder.tip = tipValue;
  if (state.currentUser) {
    state.currentUser.totalTip = (state.currentUser.totalTip || 0) + tipValue;
  }
  logEvent(`Borravaló rögzítve: ${state.currentOrder.code} +${tipValue} Ft`);
  settleOrderIfReady(state.currentOrder);
  saveStateToDB();
  renderOrderList();
  toast('Borravaló mentve.');
};

const setActiveShift = (car, km, cash) => {
  state.shift = { car, startKm: km, cash: cash, startTime: new Date().toISOString(), orders: [] };
  state.currentOrder = null;
  show('order-panel');
  show('order-list-panel');
  show('payment-panel');
  show('tip-panel');
  // GPS panel el lesz távolítva (nem hangsúlyos)
  hide('map-panel');
  renderOrderList();
  logEvent(`Szolgálat indítva: ${car}, start km: ${km}, készpénz: ${cash} Ft`);
  saveStateToDB();
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
    hide('start-tracking-btn');
  } else {
    show('order-list-panel');
    show('order-panel');
    show('payment-panel');
    show('tip-panel');
    hide('map-panel');
    hide('start-tracking-btn');
    hide('stop-tracking-btn');
    renderOrderList();
  }
};
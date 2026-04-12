// state.js - Alkalmazás állapot és alapvető függvények

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

const safeOrderId = () => Date.now() + Math.floor(Math.random() * 1000);
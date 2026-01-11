const toastEl = document.getElementById("toast");

function toast(message, kind = "ok") {
  toastEl.className = `toast ${kind}`;
  toastEl.textContent = message;
  toastEl.classList.remove("hidden");
  setTimeout(() => toastEl.classList.add("hidden"), 2800);
}

async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options
  });

  if (!res.ok) {
    let payload = null;
    try { payload = await res.json(); } catch {}
    const msg = payload?.message || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.payload = payload;
    throw err;
  }

  if (res.status === 204) return null;
  return res.json();
}

let state = {
  tariffs: [],
  types: [],
  selectedTariffId: null
};

const tariffsListEl = document.getElementById("tariffsList");
const tariffCreateForm = document.getElementById("tariffCreateForm");
const tariffNameInput = document.getElementById("tariffNameInput");

const tariffEmpty = document.getElementById("tariffEmpty");
const tariffDetails = document.getElementById("tariffDetails");
const tariffIdEl = document.getElementById("tariffId");
const tariffNameEl = document.getElementById("tariffName");
const tariffSaveBtn = document.getElementById("tariffSaveBtn");
const tariffDeleteBtn = document.getElementById("tariffDeleteBtn");

const typesListEl = document.getElementById("typesList");
const typeCreateForm = document.getElementById("typeCreateForm");
const typeNameInput = document.getElementById("typeNameInput");

const servicesBlock = document.getElementById("servicesBlock");
const servicesEmpty = document.getElementById("servicesEmpty");
const servicesTbody = document.getElementById("servicesTbody");

const serviceCreateForm = document.getElementById("serviceCreateForm");
const serviceTypeSelect = document.getElementById("serviceTypeSelect");
const serviceValueInput = document.getElementById("serviceValueInput");
const serviceUnitInput = document.getElementById("serviceUnitInput");

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderTariffs() {
  tariffsListEl.innerHTML = "";
  for (const t of state.tariffs) {
    const el = document.createElement("div");
    el.className = "item " + (t.id === state.selectedTariffId ? "active" : "");
    el.innerHTML = `
      <div class="item__title">${escapeHtml(t.name)}</div>
      <div class="item__sub">ID: ${escapeHtml(t.id)} · услуг: ${t.services.length}</div>
    `;
    el.onclick = () => {
      state.selectedTariffId = t.id;
      renderAll();
    };
    tariffsListEl.appendChild(el);
  }
}

function renderTariffDetails() {
  const t = state.tariffs.find(x => x.id === state.selectedTariffId);
  if (!t) {
    tariffEmpty.classList.remove("hidden");
    tariffDetails.classList.add("hidden");
    servicesBlock.classList.add("hidden");
    servicesEmpty.classList.remove("hidden");
    return;
  }

  tariffEmpty.classList.add("hidden");
  tariffDetails.classList.remove("hidden");
  tariffIdEl.value = t.id;
  tariffNameEl.value = t.name;

  servicesEmpty.classList.add("hidden");
  servicesBlock.classList.remove("hidden");
}

function renderTypes() {
  typesListEl.innerHTML = "";
  for (const tp of state.types) {
    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `
      <div class="item__title">${escapeHtml(tp.name)}</div>
      <div class="item__sub">ID: ${escapeHtml(tp.id)}</div>
    `;
    typesListEl.appendChild(el);
  }

  serviceTypeSelect.innerHTML = "";
  for (const tp of state.types) {
    const opt = document.createElement("option");
    opt.value = tp.id;
    opt.textContent = tp.name;
    serviceTypeSelect.appendChild(opt);
  }
}

function renderServices() {
  servicesTbody.innerHTML = "";
  const t = state.tariffs.find(x => x.id === state.selectedTariffId);
  if (!t) return;

  for (const s of t.services) {
    const tr = document.createElement("tr");

    const moveSelect = document.createElement("select");
    moveSelect.className = "input";

    const otherTariffs = state.tariffs.filter(x => x.id !== t.id);
    for (const other of otherTariffs) {
      const opt = document.createElement("option");
      opt.value = other.id;
      opt.textContent = other.name;
      moveSelect.appendChild(opt);
    }

    const moveBtn = document.createElement("button");
    moveBtn.className = "btn secondary";
    moveBtn.type = "button";
    moveBtn.textContent = "Перенести";
    moveBtn.onclick = async () => {
      if (moveSelect.options.length === 0) return toast("Некуда переносить: нет других тарифов", "warn");
      try {
        await api(`/api/services/${s.id}/move`, {
          method: "POST",
          body: JSON.stringify({ targetTariffId: moveSelect.value })
        });
        toast("Услуга перенесена", "ok");
        await loadAll();
      } catch (e) {
        if (e.status === 409) toast(e.message, "warn");
        else toast(e.message, "err");
      }
    };

    const editBtn = document.createElement("button");
    editBtn.className = "btn secondary";
    editBtn.type = "button";
    editBtn.textContent = "Редактировать";
    editBtn.onclick = async () => {
      const newValue = prompt("Новое числовое значение:", String(s.value));
      if (newValue === null) return;
      const newUnit = prompt("Новая единица измерения:", s.unit);
      if (newUnit === null) return;

      try {
        await api(`/api/services/${s.id}`, {
          method: "PUT",
          body: JSON.stringify({ value: Number(newValue), unit: newUnit })
        });
        toast("Услуга обновлена", "ok");
        await loadAll();
      } catch (e) {
        if (e.status === 409) toast(e.message, "warn");
        else toast(e.message, "err");
      }
    };

    const delBtn = document.createElement("button");
    delBtn.className = "btn danger";
    delBtn.type = "button";
    delBtn.textContent = "Удалить";
    delBtn.onclick = async () => {
      if (!confirm("Удалить услугу?")) return;
      try {
        await api(`/api/services/${s.id}`, { method: "DELETE" });
        toast("Услуга удалена", "ok");
        await loadAll();
      } catch (e) {
        toast(e.message, "err");
      }
    };

    tr.innerHTML = `
      <td>${escapeHtml(s.id)}</td>
      <td>${escapeHtml(s.type?.name || "")}</td>
      <td>${escapeHtml(String(s.value))} ${escapeHtml(s.unit)}</td>
      <td></td>
      <td></td>
    `;

    const moveTd = tr.children[3];
    moveTd.appendChild(moveSelect);
    moveTd.appendChild(moveBtn);

    const actionsTd = tr.children[4];
    actionsTd.appendChild(editBtn);
    actionsTd.appendChild(delBtn);

    servicesTbody.appendChild(tr);
  }
}

function renderAll() {
  renderTariffs();
  renderTariffDetails();
  renderTypes();
  renderServices();
}

async function loadAll() {
  const [tariffs, types] = await Promise.all([
    api("/api/tariffs"),
    api("/api/service-types")
  ]);

  state.tariffs = tariffs;
  state.types = types;

  if (state.selectedTariffId && !state.tariffs.some(t => t.id === state.selectedTariffId)) {
    state.selectedTariffId = null;
  }

  renderAll();
}

/** events */
tariffCreateForm.onsubmit = async (e) => {
  e.preventDefault();
  const name = tariffNameInput.value.trim();
  if (!name) return toast("Введите название тарифа", "warn");

  try {
    const created = await api("/api/tariffs", {
      method: "POST",
      body: JSON.stringify({ name })
    });
    tariffNameInput.value = "";
    state.selectedTariffId = created.id;
    toast("Тариф создан", "ok");
    await loadAll();
  } catch (e2) {
    toast(e2.message, "err");
  }
};

tariffSaveBtn.onclick = async () => {
  const t = state.tariffs.find(x => x.id === state.selectedTariffId);
  if (!t) return;

  const name = tariffNameEl.value.trim();
  if (!name) return toast("Название не может быть пустым", "warn");

  try {
    await api(`/api/tariffs/${t.id}`, {
      method: "PUT",
      body: JSON.stringify({ name })
    });
    toast("Тариф обновлён", "ok");
    await loadAll();
  } catch (e) {
    toast(e.message, "err");
  }
};

tariffDeleteBtn.onclick = async () => {
  const t = state.tariffs.find(x => x.id === state.selectedTariffId);
  if (!t) return;

  if (!confirm("Удалить тариф? Услуги внутри тоже удалятся.")) return;

  try {
    await api(`/api/tariffs/${t.id}`, { method: "DELETE" });
    state.selectedTariffId = null;
    toast("Тариф удалён", "ok");
    await loadAll();
  } catch (e) {
    toast(e.message, "err");
  }
};

typeCreateForm.onsubmit = async (e) => {
  e.preventDefault();
  const name = typeNameInput.value.trim();
  if (!name) return toast("Введите название типа услуги", "warn");

  try {
    await api("/api/service-types", {
      method: "POST",
      body: JSON.stringify({ name })
    });
    typeNameInput.value = "";
    toast("Тип услуги добавлен", "ok");
    await loadAll();
  } catch (e2) {
    if (e2.status === 409) toast(e2.message, "warn");
    else toast(e2.message, "err");
  }
};

serviceCreateForm.onsubmit = async (e) => {
  e.preventDefault();
  const tariffId = state.selectedTariffId;
  if (!tariffId) return toast("Сначала выберите тариф", "warn");

  const typeId = serviceTypeSelect.value;
  const value = serviceValueInput.value.trim();
  const unit = serviceUnitInput.value.trim();

  if (!typeId) return toast("Выберите тип услуги", "warn");
  if (!value || Number.isNaN(Number(value))) return toast("Введите числовое значение параметра", "warn");
  if (!unit) return toast("Введите единицу измерения", "warn");

  try {
    await api(`/api/tariffs/${tariffId}/services`, {
      method: "POST",
      body: JSON.stringify({ typeId, value: Number(value), unit })
    });
    serviceValueInput.value = "";
    serviceUnitInput.value = "";
    toast("Услуга добавлена", "ok");
    await loadAll();
  } catch (e2) {
    if (e2.status === 409) toast("Нельзя добавить: услуга такого типа уже есть в тарифе", "warn");
    else toast(e2.message, "err");
  }
};

loadAll().catch((e) => toast(e.message, "err"));

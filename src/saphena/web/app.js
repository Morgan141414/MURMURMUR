const state = {
  token: localStorage.getItem("saphena_token") || "",
  account: JSON.parse(localStorage.getItem("saphena_account") || "null"),
  clinics: [],
  patients: [],
  employeesByClinic: new Map(),
};

const panels = document.querySelectorAll(".panel");
const navItems = document.querySelectorAll(".nav-item");
const alerts = document.getElementById("alerts");
const sessionName = document.getElementById("session-name");
const logoutButton = document.getElementById("logout-button");

function showAlert(message, kind = "success") {
  alerts.innerHTML = `<div class="alert ${kind}">${message}</div>`;
  window.setTimeout(() => {
    alerts.innerHTML = "";
  }, 5000);
}

function setSession(token, account) {
  state.token = token || "";
  state.account = account || null;
  if (token) {
    localStorage.setItem("saphena_token", token);
  } else {
    localStorage.removeItem("saphena_token");
  }
  if (account) {
    localStorage.setItem("saphena_account", JSON.stringify(account));
  } else {
    localStorage.removeItem("saphena_account");
  }
  sessionName.textContent = account
    ? `${account.person.first_name} ${account.person.last_name} (${account.person.iin})`
    : "не выполнен вход";
}

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }
  const response = await fetch(path, { ...options, headers });
  if (!response.ok) {
    let detail = "Request failed";
    try {
      const payload = await response.json();
      detail = payload.detail || JSON.stringify(payload);
    } catch {
      detail = await response.text();
    }
    throw new Error(detail);
  }
  if (response.status === 204) {
    return null;
  }
  return response.json();
}

function activatePanel(panelName) {
  panels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.id === `panel-${panelName}`);
  });
  navItems.forEach((item) => {
    item.classList.toggle("is-active", item.dataset.panel === panelName);
  });
}

function emptyState(text) {
  return `<div class="muted-empty">${text}</div>`;
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("ru-RU", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderApplications(items) {
  const node = document.getElementById("applications-list");
  if (!items.length) {
    node.innerHTML = emptyState("Заявок пока нет.");
    return;
  }
  node.innerHTML = items
    .map(
      (item) => `
      <div class="list-item">
        <h4>${item.name}</h4>
        <div class="meta-line">${item.legal_name}</div>
        <div class="meta-line">Статус: ${item.status} • БИН/ИИН: ${item.bin_iin}</div>
        <div class="meta-line">${item.address}</div>
        <div class="action-row">
          <button data-approve="${item.id}">Approve</button>
          <button data-needs="${item.id}">Needs changes</button>
          <button data-reject="${item.id}">Reject</button>
        </div>
      </div>
    `
    )
    .join("");
  node.querySelectorAll("[data-approve]").forEach((button) => {
    button.onclick = () => moderateApplication(button.dataset.approve, "approved");
  });
  node.querySelectorAll("[data-needs]").forEach((button) => {
    button.onclick = () => moderateApplication(button.dataset.needs, "needs_changes");
  });
  node.querySelectorAll("[data-reject]").forEach((button) => {
    button.onclick = () => moderateApplication(button.dataset.reject, "rejected");
  });
}

function renderClinics(items) {
  const node = document.getElementById("clinics-list");
  if (!items.length) {
    node.innerHTML = emptyState("Клиники еще не созданы.");
    return;
  }
  node.innerHTML = items
    .map(
      (clinic) => `
      <div class="list-item">
        <h4>${clinic.name}</h4>
        <div class="meta-line">${clinic.legal_name}</div>
        <div class="badge-row">
          <span class="badge">${clinic.status}</span>
          <span class="badge">${clinic.bin_iin}</span>
        </div>
        <div class="meta-line">${clinic.address}</div>
        <div class="action-row">
          <button data-members="${clinic.id}">Сотрудники</button>
          <button data-patients="${clinic.id}">Пациенты</button>
          <button data-appointments="${clinic.id}">Записи</button>
        </div>
      </div>
    `
    )
    .join("");

  node.querySelectorAll("[data-members]").forEach((button) => {
    button.onclick = () => loadEmployees(button.dataset.members);
  });
  node.querySelectorAll("[data-patients]").forEach((button) => {
    button.onclick = () => loadClinicPatients(button.dataset.patients);
  });
  node.querySelectorAll("[data-appointments]").forEach((button) => {
    button.onclick = () => loadAppointments(button.dataset.appointments);
  });
}

function renderRoles(items) {
  const node = document.getElementById("roles-list");
  const select = document.getElementById("role-code-select");
  if (!items.length) {
    node.innerHTML = emptyState("Роли не загружены.");
    select.innerHTML = "";
    return;
  }
  node.innerHTML = items
    .map((item) => {
      const permissions = JSON.parse(item.permissions);
      return `
        <div class="list-item">
          <h4>${item.title}</h4>
          <div class="meta-line">${item.code} • ${item.scope}</div>
          <div class="badge-row">${permissions.slice(0, 4).map((p) => `<span class="badge">${p}</span>`).join("")}</div>
        </div>
      `;
    })
    .join("");
  select.innerHTML = items
    .filter((item) => item.scope === "clinic")
    .map((item) => `<option value="${item.code}">${item.title}</option>`)
    .join("");
}

function renderPatients(items, targetId = "patients-list") {
  const node = document.getElementById(targetId);
  if (!items.length) {
    node.innerHTML = emptyState("Пациентов пока нет.");
    return;
  }
  node.innerHTML = items
    .map(
      (item) => `
      <div class="table-row">
        <h4>${item.person.last_name} ${item.person.first_name}</h4>
        <div class="meta-line">ИИН: ${item.person.iin}</div>
        <div class="meta-line">Телефон: ${item.person.phone || "—"} • Email: ${item.person.email || "—"}</div>
        <div class="meta-line">Профиль: ${item.id}</div>
      </div>
    `
    )
    .join("");
}

function renderAppointments(items) {
  const node = document.getElementById("appointments-list");
  if (!items.length) {
    node.innerHTML = emptyState("Записей пока нет.");
    return;
  }
  node.innerHTML = items
    .map(
      (item) => `
      <div class="list-item">
        <h4>Запись #${item.id}</h4>
        <div class="meta-line">Пациент: ${item.patient_profile_id} • Врач: ${item.doctor_membership_id || "—"}</div>
        <div class="meta-line">${formatDate(item.starts_at)} → ${formatDate(item.ends_at)}</div>
        <div class="badge-row">
          <span class="badge">${item.status}</span>
        </div>
        <div class="meta-line">${item.reason || "Без описания"}</div>
      </div>
    `
    )
    .join("");
}

function renderLeads(items) {
  const node = document.getElementById("leads-list");
  if (!items.length) {
    node.innerHTML = emptyState("Лидов пока нет.");
    return;
  }
  node.innerHTML = items
    .map(
      (item) => `
      <div class="table-row">
        <h4>${item.full_name}</h4>
        <div class="meta-line">Клиника: ${item.clinic_id} • Статус: ${item.status}</div>
        <div class="meta-line">Источник: ${item.source || "—"} • Телефон: ${item.phone || "—"}</div>
        <div class="meta-line">${item.note || "Без комментария"}</div>
      </div>
    `
    )
    .join("");
}

function renderSupport(items) {
  const node = document.getElementById("support-list");
  if (!items.length) {
    node.innerHTML = emptyState("Тикетов пока нет.");
    return;
  }
  node.innerHTML = items
    .map(
      (item) => `
      <div class="list-item">
        <h4>${item.topic}</h4>
        <div class="meta-line">Статус: ${item.status} • Клиника: ${item.clinic_id || "—"}</div>
        <div class="meta-line">${item.message}</div>
      </div>
    `
    )
    .join("");
}

function renderNotifications(items) {
  const node = document.getElementById("notifications-list");
  if (!items.length) {
    node.innerHTML = emptyState("Уведомлений пока нет.");
    return;
  }
  node.innerHTML = items
    .map(
      (item) => `
      <div class="list-item">
        <h4>${item.title}</h4>
        <div class="meta-line">${item.body}</div>
        <div class="meta-line">${formatDate(item.created_at)}</div>
      </div>
    `
    )
    .join("");
}

function renderAudit(items) {
  const node = document.getElementById("audit-list");
  if (!items.length) {
    node.innerHTML = emptyState("Аудит пуст.");
    return;
  }
  node.innerHTML = items
    .map(
      (item) => `
      <div class="table-row">
        <h4>${item.action}</h4>
        <div class="meta-line">Entity: ${item.entity_type} / ${item.entity_id || "—"}</div>
        <div class="meta-line">Clinic: ${item.clinic_id || "—"} • Actor: ${item.actor_account_id || "—"}</div>
        <div class="meta-line">${formatDate(item.created_at)}</div>
      </div>
    `
    )
    .join("");
}

function populateClinicSelects() {
  const options = state.clinics
    .map((clinic) => `<option value="${clinic.id}">${clinic.name}</option>`)
    .join("");
  ["employee-clinic", "appointment-clinic", "lead-clinic", "support-clinic"].forEach((id) => {
    const select = document.getElementById(id);
    if (select) select.innerHTML = options;
  });
}

function populatePatientSelect() {
  const select = document.getElementById("appointment-patient");
  select.innerHTML = state.patients
    .map((item) => `<option value="${item.id}">${item.person.last_name} ${item.person.first_name}</option>`)
    .join("");
}

async function moderateApplication(id, status) {
  try {
    await api(`/api/v1/clinics/applications/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    showAlert(`Заявка ${id} обновлена: ${status}`);
    await loadApplications();
    await loadClinics();
  } catch (error) {
    showAlert(error.message, "error");
  }
}

async function loadApplications() {
  try {
    const data = await api("/api/v1/clinics/applications");
    renderApplications(data);
  } catch (error) {
    renderApplications([]);
    showAlert(error.message, "error");
  }
}

async function loadClinics() {
  try {
    state.clinics = await api("/api/v1/clinics");
    renderClinics(state.clinics);
    populateClinicSelects();
  } catch (error) {
    renderClinics([]);
    showAlert(error.message, "error");
  }
}

async function loadRoles() {
  try {
    const data = await api("/api/v1/clinics/roles/catalog");
    renderRoles(data);
  } catch (error) {
    renderRoles([]);
    showAlert(error.message, "error");
  }
}

async function loadPatients() {
  try {
    state.patients = await api("/api/v1/patients");
    renderPatients(state.patients);
    populatePatientSelect();
  } catch (error) {
    renderPatients([]);
    showAlert(error.message, "error");
  }
}

async function loadClinicPatients(clinicId) {
  try {
    const data = await api(`/api/v1/clinics/${clinicId}/patients`);
    renderPatients(data);
    activatePanel("patients");
  } catch (error) {
    showAlert(error.message, "error");
  }
}

async function loadEmployees(clinicId) {
  try {
    const data = await api(`/api/v1/clinics/${clinicId}/employees`);
    state.employeesByClinic.set(Number(clinicId), data);
    const doctors = data.filter((item) => item.role_code === "doctor");
    const doctorSelect = document.getElementById("appointment-doctor");
    doctorSelect.innerHTML = doctors
      .map((item) => `<option value="${item.id}">${item.position || item.role_code} #${item.id}</option>`)
      .join("");
    showAlert(`Загружено сотрудников клиники ${clinicId}: ${data.length}`);
  } catch (error) {
    showAlert(error.message, "error");
  }
}

async function loadAppointments(clinicId = null) {
  try {
    const selectedClinicId = clinicId || document.getElementById("appointment-clinic").value;
    if (!selectedClinicId) {
      renderAppointments([]);
      return;
    }
    const data = await api(`/api/v1/clinics/${selectedClinicId}/appointments`);
    renderAppointments(data);
    activatePanel("appointments");
  } catch (error) {
    renderAppointments([]);
    showAlert(error.message, "error");
  }
}

async function loadLeads() {
  try {
    renderLeads(await api("/api/v1/crm/leads"));
  } catch (error) {
    renderLeads([]);
    showAlert(error.message, "error");
  }
}

async function loadSupport() {
  try {
    renderSupport(await api("/api/v1/support/tickets"));
  } catch (error) {
    renderSupport([]);
    showAlert(error.message, "error");
  }
}

async function loadNotifications() {
  try {
    renderNotifications(await api("/api/v1/notifications"));
  } catch (error) {
    renderNotifications([]);
    showAlert(error.message, "error");
  }
}

async function loadAudit() {
  try {
    renderAudit(await api("/api/v1/admin/audit"));
  } catch (error) {
    renderAudit([]);
    showAlert(error.message, "error");
  }
}

async function refreshAll() {
  if (!state.token) return;
  await Promise.allSettled([
    loadApplications(),
    loadClinics(),
    loadRoles(),
    loadPatients(),
    loadLeads(),
    loadSupport(),
    loadNotifications(),
    loadAudit(),
  ]);
}

navItems.forEach((item) => {
  item.onclick = () => activatePanel(item.dataset.panel);
});

logoutButton.onclick = () => {
  setSession("", null);
  showAlert("Сессия очищена");
};

document.getElementById("bootstrap-demo").onsubmit = null;
document.getElementById("bootstrap-demo").onclick = async () => {
  try {
    const result = await api("/api/v1/bootstrap/demo", { method: "POST" });
    document.getElementById("demo-credentials").textContent =
      `Superadmin: ${result.superadmin_iin} / ${result.superadmin_password}\n` +
      `Founder: ${result.founder_iin} / ${result.founder_password}`;
    showAlert(result.message);
  } catch (error) {
    showAlert(error.message, "error");
  }
};

document.getElementById("login-form").onsubmit = async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  try {
    const result = await api("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify(Object.fromEntries(form.entries())),
    });
    setSession(result.access_token, result.account);
    await refreshAll();
    showAlert("Вход выполнен");
  } catch (error) {
    showAlert(error.message, "error");
  }
};

document.getElementById("register-form").onsubmit = async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  try {
    await api("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify(Object.fromEntries(form.entries())),
    });
    showAlert("Пользователь зарегистрирован");
    event.currentTarget.reset();
  } catch (error) {
    showAlert(error.message, "error");
  }
};

document.getElementById("application-form").onsubmit = async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  try {
    await api("/api/v1/clinics/applications", {
      method: "POST",
      body: JSON.stringify({ ...Object.fromEntries(form.entries()), submit: true }),
    });
    showAlert("Заявка отправлена");
    event.currentTarget.reset();
    await loadApplications();
  } catch (error) {
    showAlert(error.message, "error");
  }
};

document.getElementById("employee-form").onsubmit = async (event) => {
  event.preventDefault();
  const form = Object.fromEntries(new FormData(event.currentTarget).entries());
  try {
    await api(`/api/v1/clinics/${form.clinic_id}/employees`, {
      method: "POST",
      body: JSON.stringify({
        iin: form.iin,
        role_code: form.role_code,
        department: form.department,
        position: form.position,
      }),
    });
    showAlert("Сотрудник назначен");
    await loadEmployees(form.clinic_id);
  } catch (error) {
    showAlert(error.message, "error");
  }
};

document.getElementById("patient-form").onsubmit = async (event) => {
  event.preventDefault();
  const form = Object.fromEntries(new FormData(event.currentTarget).entries());
  try {
    const patient = await api("/api/v1/patients", {
      method: "POST",
      body: JSON.stringify(form),
    });
    const clinicId = document.getElementById("employee-clinic").value;
    if (clinicId) {
      await api(`/api/v1/clinics/${clinicId}/patients/${patient.id}`, { method: "POST" });
    }
    showAlert("Пациент создан");
    event.currentTarget.reset();
    await loadPatients();
  } catch (error) {
    showAlert(error.message, "error");
  }
};

document.getElementById("appointment-form").onsubmit = async (event) => {
  event.preventDefault();
  const form = Object.fromEntries(new FormData(event.currentTarget).entries());
  try {
    await api(`/api/v1/clinics/${form.clinic_id}/appointments`, {
      method: "POST",
      body: JSON.stringify({
        patient_profile_id: Number(form.patient_profile_id),
        doctor_membership_id: form.doctor_membership_id ? Number(form.doctor_membership_id) : null,
        starts_at: new Date(form.starts_at).toISOString(),
        ends_at: new Date(form.ends_at).toISOString(),
        reason: form.reason,
        status: "created",
      }),
    });
    showAlert("Запись создана");
    await loadAppointments(form.clinic_id);
  } catch (error) {
    showAlert(error.message, "error");
  }
};

document.getElementById("lead-form").onsubmit = async (event) => {
  event.preventDefault();
  const form = Object.fromEntries(new FormData(event.currentTarget).entries());
  try {
    await api("/api/v1/crm/leads", {
      method: "POST",
      body: JSON.stringify({ ...form, clinic_id: Number(form.clinic_id), status: "new" }),
    });
    showAlert("Лид сохранен");
    await loadLeads();
  } catch (error) {
    showAlert(error.message, "error");
  }
};

document.getElementById("support-form").onsubmit = async (event) => {
  event.preventDefault();
  const form = Object.fromEntries(new FormData(event.currentTarget).entries());
  try {
    await api("/api/v1/support/tickets", {
      method: "POST",
      body: JSON.stringify({
        clinic_id: form.clinic_id ? Number(form.clinic_id) : null,
        topic: form.topic,
        message: form.message,
      }),
    });
    showAlert("Тикет отправлен");
    await loadSupport();
    await loadNotifications();
  } catch (error) {
    showAlert(error.message, "error");
  }
};

document.getElementById("refresh-applications").onclick = loadApplications;
document.getElementById("refresh-clinics").onclick = loadClinics;
document.getElementById("refresh-roles").onclick = loadRoles;
document.getElementById("refresh-patients").onclick = loadPatients;
document.getElementById("refresh-appointments").onclick = () => loadAppointments();
document.getElementById("refresh-leads").onclick = loadLeads;
document.getElementById("refresh-support").onclick = loadSupport;
document.getElementById("refresh-notifications").onclick = loadNotifications;
document.getElementById("refresh-audit").onclick = loadAudit;
document.getElementById("appointment-clinic").onchange = async (event) => {
  await loadEmployees(event.target.value);
  await loadAppointments(event.target.value);
};

setSession(state.token, state.account);
if (state.token) {
  refreshAll();
}

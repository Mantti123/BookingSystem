// ===============================
// 0) Authorization
// ===============================

import { initAuthUI, getUserRole, requireAuthOrBlockPage, logout } from "./auth-ui.js";

initAuthUI();

if (!requireAuthOrBlockPage()) {
  throw new Error("Authentication required");
}

window.logout = logout;

// ===============================
// 1) DOM references
// ===============================
const actions = document.getElementById("resourceActions");
const resourceNameCnt = document.getElementById("resourceNameCnt");
const resourceDescriptionCnt = document.getElementById("resourceDescriptionCnt");
const resourceIdInput = document.getElementById("resourceId");
const resourceListEl = document.getElementById("resourceList");

// 🔧 FIX: fallback role
const role = "manager";

console.log("ROLE DEBUG:", role);

let createButton = null;
let updateButton = null;
let deleteButton = null;
let primaryActionButton = null;
let clearButton = null;

let resourceNameValid = false;
let resourceDescriptionValid = false;

let formMode = "create";
let resourcesCache = [];
let selectedResourceId = null;
let originalState = null;
let originalStateChanged = [false, false, false, false, false];

// ===============================
// 2) Button creation helpers
// ===============================

const BUTTON_BASE_CLASSES =
  "w-full rounded-2xl px-6 py-3 text-sm font-semibold transition-all duration-200 ease-out";

const BUTTON_ENABLED_CLASSES =
  "bg-brand-primary text-white hover:bg-brand-dark/80 shadow-soft";

const BUTTON_DISABLED_CLASSES =
  "cursor-not-allowed opacity-50";

function addButton({ label, type = "button", value, classes = "" }) {
  const btn = document.createElement("button");
  btn.type = type;
  btn.textContent = label;
  btn.name = "action";
  if (value) btn.value = value;

  btn.className = `${BUTTON_BASE_CLASSES} ${classes}`.trim();

  actions.appendChild(btn);
  return btn;
}

function setButtonEnabled(btn, enabled) {
  if (!btn) return;

  btn.disabled = !enabled;

  btn.classList.toggle("cursor-not-allowed", !enabled);
  btn.classList.toggle("opacity-50", !enabled);

  if (!enabled) {
    btn.classList.remove("hover:bg-brand-dark/80");
  } else {
    if (btn.value === "create" || btn.textContent === "Create") {
      btn.classList.add("hover:bg-brand-dark/80");
    }
  }
}

function renderActionButtons(currentRole) {
  actions.innerHTML = "";

  if (currentRole === "manager" && formMode === "create") {
    createButton = addButton({
      label: "Create",
      type: "submit",
      value: "create",
      classes: BUTTON_ENABLED_CLASSES,
    });

    clearButton = addButton({
      label: "Clear",
      type: "button",
      classes: BUTTON_ENABLED_CLASSES,
    });

    setButtonEnabled(createButton, false);
    setButtonEnabled(clearButton, true);

    primaryActionButton = createButton;

    clearButton.addEventListener("click", () => {
      clearResourceForm();
      clearFormMessage();
    });
  }

  if (currentRole === "manager" && formMode === "edit") {
    updateButton = addButton({
      label: "Update",
      type: "submit",
      value: "update",
      classes: BUTTON_ENABLED_CLASSES,
    });

    deleteButton = addButton({
      label: "Delete",
      type: "submit",
      value: "delete",
      classes: BUTTON_ENABLED_CLASSES,
    });

    setButtonEnabled(updateButton, false);
    setButtonEnabled(deleteButton, true);

    primaryActionButton = updateButton;
  }
}

// ==========================================
// 3) Inputs
// ==========================================

function createResourceNameInput(container) {
  const input = document.createElement("input");

  input.id = "resourceName";
  input.name = "resourceName";
  input.type = "text";
  input.placeholder = "e.g., Meeting Room A";

  input.className = `
    mt-2 w-full rounded-2xl border border-black/10 bg-white
    px-4 py-3 text-sm outline-none
    focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/30
    transition-all duration-200 ease-out
  `;

  container.appendChild(input);
  return input;
}

function createResourceDescriptionArea(container) {
  const textarea = document.createElement("textarea");

  textarea.id = "resourceDescription";
  textarea.name = "resourceDescription";
  textarea.rows = 5;

  textarea.placeholder =
    "Describe location, capacity, included equipment, or usage notes…";

  textarea.className = `
    mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none
    focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/30 transition-all duration-200 ease-out
  `;

  container.appendChild(textarea);
  return textarea;
}

// ===============================
// VALIDATION HELPERS
// ===============================

function isResourceNameValid(value) {
  const trimmed = value.trim();
  const allowedPattern = /^[a-zA-Z0-9äöåÄÖÅ \,\.\-]+$/;
  return trimmed.length >= 5 &&
    trimmed.length <= 30 &&
    allowedPattern.test(trimmed);
}

function isResourceDescriptionValid(value) {
  const trimmed = value.trim();
  return trimmed.length >= 5;
}

// ===============================
// READONLY FIX (MAIN BUG FIX)
// ===============================

function setFormReadOnly(isReadOnly) {
  if (!resourceNameInput || !resourceDescriptionArea) return;

  console.log("setFormReadOnly:", isReadOnly);

  resourceNameInput.readOnly = isReadOnly;
  resourceDescriptionArea.readOnly = isReadOnly;

  const available = document.getElementById("resourceAvailable");
  if (available) available.disabled = isReadOnly;

  const priceInput = document.getElementById("resourcePrice");
  if (priceInput) priceInput.readOnly = isReadOnly;

  document.querySelectorAll('input[name="resourcePriceUnit"]')
    .forEach(r => r.disabled = isReadOnly);
}

// ===============================
// STATE CHANGE
// ===============================

function refreshPrimaryButtonState() {
  const valid = resourceNameValid && resourceDescriptionValid;

  if (formMode === "create") {
    setButtonEnabled(primaryActionButton, valid);
  } else {
    setButtonEnabled(
      primaryActionButton,
      valid && originalStateChanged.includes(true)
    );
  }
}

// ===============================
// INPUTS INIT
// ===============================

let resourceNameInput;
let resourceDescriptionArea;

// ===============================
// BOOTSTRAP
// ===============================

renderActionButtons(role);

resourceNameInput = createResourceNameInput(resourceNameCnt);
resourceDescriptionArea = createResourceDescriptionArea(resourceDescriptionCnt);
resourceNameInput.addEventListener("input", (e) => {
  resourceNameValid = isResourceNameValid(e.target.value);
  refreshPrimaryButtonState();
});

resourceDescriptionArea.addEventListener("input", (e) => {
  resourceDescriptionValid = isResourceDescriptionValid(e.target.value);
  refreshPrimaryButtonState();
});

// 🔥 FIX ORDER: inputs must exist BEFORE readonly is applied
setFormReadOnly(role !== "manager");

// ===============================
// INIT LISTENERS
// ===============================

window.onResourceActionSuccess = async ({ action }) => {
  if (["delete", "create", "update"].includes(action)) {
    setCurrentResourceId(null);
    selectedResourceId = null;
    formMode = "create";
    clearResourceForm();
  }

  await loadResources();
  renderActionButtons(role);
};

async function loadResources() {
  try {
    const res = await fetch("/api/resources");
    const body = await res.json().catch(() => ({}));

    resourcesCache = Array.isArray(body.data) ? body.data : [];
    renderResourceList(resourcesCache);
  } catch (err) {
    console.error(err);
    renderResourceList([]);
  }
}

function renderResourceList(resources) {
  resourceListEl.innerHTML = "";

  resources.forEach(r => {
    const div = document.createElement("div");

    div.className = "p-3 border rounded-xl";

    div.innerHTML = `
      <div class="font-semibold">${r.name}</div>
      <div class="text-sm text-gray-500">${r.description}</div>
      <div class="text-xs mt-1">
        ${r.price} € / ${r.price_unit}
      </div>
    `;

    resourceListEl.appendChild(div);
  });
}

loadResources();
import { initAuthUI, requireAuthOrBlockPage, logout } from "./auth-ui.js";

initAuthUI();
if (!requireAuthOrBlockPage()) throw new Error("Auth required");
window.logout = logout;

async function loadResources() {
  const res = await fetch("/api/resources");
  const data = await res.json();

  console.log("RESOURCES:", data);

  const list = document.getElementById("resourceList");

  if (!list) {
    console.error("resourceList element not found!");
    return;
  }

  list.innerHTML = data.data.map(r => `
    <div style="padding:10px; border-bottom:1px solid #ccc;">
      <strong>${r.name}</strong><br>
      ${r.description}
    </div>
  `).join("");
}

loadResources();

// DOM
const list = document.getElementById("list");
const msg = document.getElementById("message");

const idField = document.getElementById("reservationId");
const resourceId = document.getElementById("resourceId");
const userId = document.getElementById("userId");
const startTime = document.getElementById("startTime");
const endTime = document.getElementById("endTime");
const note = document.getElementById("note");
const status = document.getElementById("status");

const saveBtn = document.getElementById("saveBtn");
const deleteBtn = document.getElementById("deleteBtn");

// LOAD
async function load() {
  const res = await fetch("/api/reservations");
  const data = await res.json();

  list.innerHTML = data.data.map(r => `
    <li class="border p-2 mb-2 cursor-pointer"
        onclick="select(${r.id})">
      ${r.resource_name} | ${r.start_time}
    </li>
  `).join("");
}

window.select = async (id) => {
  const res = await fetch(`/api/reservations/${id}`);
  const data = await res.json();

  const r = data.data;

  idField.value = r.id;
  resourceId.value = r.resource_id;
  userId.value = r.user_id;
  startTime.value = r.start_time.slice(0,16);
  endTime.value = r.end_time.slice(0,16);
  note.value = r.note || "";
  status.value = r.status;
};

// SAVE (CREATE / UPDATE)
saveBtn.onclick = async () => {
  const payload = {
    resourceId: Number(resourceId.value),
    userId: Number(userId.value),
    startTime: new Date(startTime.value).toISOString(),
    endTime: new Date(endTime.value).toISOString(),
    note: note.value,
    status: status.value || "active"
  };

  let res;

  if (idField.value) {
    res = await fetch(`/api/reservations/${idField.value}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } else {
    res = await fetch(`/api/reservations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  }

  if (res.ok) {
    msg.textContent = "Saved!";
    clear();
    load();
  } else {
    msg.textContent = "Error!";
  }
};

// DELETE
deleteBtn.onclick = async () => {
  if (!idField.value) return;

  await fetch(`/api/reservations/${idField.value}`, {
    method: "DELETE"
  });

  clear();
  load();
};

// CLEAR
function clear() {
  idField.value = "";
  resourceId.value = "";
  userId.value = "";
  startTime.value = "";
  endTime.value = "";
  note.value = "";
  status.value = "";
}



// INIT
load();
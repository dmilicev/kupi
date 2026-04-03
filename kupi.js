// ============================================================
// POČETNI PODACI  (iz tvog uploadovanog kupi.js)
// ============================================================
const DEFAULT_ITEMS = [
  { name: "p jabuke",                   active: true  },
  { name: "p kupus",                    active: true  },
  { name: "p peršun list",              active: true  },
  { name: "v limun",                    active: true  },
  { name: "v banane",                   active: true  },
  { name: "s WC papir",                 active: true  },
  { name: "s čaj",                      active: true  },
  { name: "Idea šunka",                 active: true  },
  { name: "Idea kačkavalj",             active: true  },
  { name: "Idea šampinjoni",            active: false },
  { name: "Lidl, pica",                 active: false },
  { name: "Lidl, losos",                active: false },
  { name: "Dis pasta za zube",          active: false },
  { name: "zh kim 150g",                active: false },
  { name: "zh susam 200g",              active: false },
  { name: "UnionMZ puter 125g",         active: false },
];

// ============================================================
// STATE
// ============================================================
const STORAGE_KEY  = "kupi_items_v1";
let items          = [];
let selectedIndex  = null;

// --- Dugi pritisak ---
// Koristimo jednu promenljivu po stavci, ne globalnu.
// Za svaku text-zone čuvamo timer i flag zasebno kroz closure.
const LONG_PRESS_MS = 400;   // skraćeno sa 600 na 400ms

// ============================================================
// PERSISTENCIJA
// ============================================================
function loadItems() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        items = parsed;
        return;
      }
    }
  } catch (e) { /* ignore */ }
  items = DEFAULT_ITEMS.map(i => ({ ...i }));
}

function saveItems() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) { /* ignore */ }
}

// ============================================================
// SORTIRANJE
// ============================================================
function sortItems() {
  items.sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    return a.name.localeCompare(b.name, "sr");
  });
}

// ============================================================
// TOOLBAR
// ============================================================
function updateToolbar() {
  const has = selectedIndex !== null;
  document.getElementById("btnEdit").disabled   = !has;
  document.getElementById("btnDelete").disabled = !has;
}

// ============================================================
// RENDER
// ============================================================
function render() {
  const ul = document.getElementById("shoppingList");
  ul.innerHTML = "";

  let activeSepAdded   = false;
  let inactiveSepAdded = false;

  items.forEach((item, index) => {
    if (item.active && !activeSepAdded) {
      activeSepAdded = true;
      ul.appendChild(makeSeparator("Za kupovinu"));
    }
    if (!item.active && !inactiveSepAdded) {
      inactiveSepAdded = true;
      ul.appendChild(makeSeparator("Nije označeno"));
    }

    const li = document.createElement("li");
    li.className = "item" +
      (item.active ? " active" : " inactive") +
      (selectedIndex === index ? " selected" : "");
    li.dataset.index = index;

    // ---- ZONA ČEKBOKSA ----
    const checkZone = document.createElement("div");
    checkZone.className = "checkbox-zone";
    const cb = document.createElement("span");
    cb.className = "custom-checkbox";
    checkZone.appendChild(cb);

    checkZone.addEventListener("click", (e) => {
      e.stopPropagation();
      clearSelection();
      items[index].active = !items[index].active;
      sortItems();
      saveItems();
      render();
    });

    li.appendChild(checkZone);

    // ---- ZONA TEKSTA ----
    const textZone = document.createElement("div");
    textZone.className = "text-zone";
    const txt = document.createElement("span");
    txt.className = "item-text";
    txt.textContent = item.name;
    textZone.appendChild(txt);

    // Svaka text-zone ima sopstveni timer i flag (closure)
    let lp_timer  = null;
    let lp_fired  = false;
    let lp_moved  = false;

    // === TOUCH ===
    textZone.addEventListener("touchstart", (e) => {
      lp_fired = false;
      lp_moved = false;
      lp_timer = setTimeout(() => {
        if (!lp_moved) {
          lp_fired = true;
          selectItem(index);
        }
      }, LONG_PRESS_MS);
    }, { passive: true });

    textZone.addEventListener("touchmove", () => {
      // Ako se prst pomeri, otkazujemo dugi pritisak
      lp_moved = true;
      clearTimeout(lp_timer);
    }, { passive: true });

    textZone.addEventListener("touchend", (e) => {
      clearTimeout(lp_timer);
      if (lp_fired) {
        // Sprečavamo ghost click koji bi odmah deselektovao
        e.preventDefault();
        e.stopPropagation();
      }
    });

    textZone.addEventListener("touchcancel", () => {
      clearTimeout(lp_timer);
    });

    // === DESKTOP: levi klik + držanje ===
    textZone.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      lp_fired = false;
      lp_timer = setTimeout(() => {
        lp_fired = true;
        selectItem(index);
      }, LONG_PRESS_MS);
    });

    textZone.addEventListener("mouseup", () => {
      clearTimeout(lp_timer);
      // Kratki klik: ne radimo ništa (lp_fired je false)
    });

    textZone.addEventListener("mouseleave", () => {
      clearTimeout(lp_timer);
    });

    // Kratki klik — ništa
    textZone.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    // Desni klik — selekcija (alternativa na desktopu)
    textZone.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      selectItem(index);
    });

    li.appendChild(textZone);
    ul.appendChild(li);
  });

  updateToolbar();
}

function makeSeparator(text) {
  const li = document.createElement("li");
  li.className = "separator";
  li.textContent = text;
  return li;
}

// ============================================================
// SELEKCIJA
// ============================================================
function selectItem(index) {
  if (selectedIndex === index) {
    clearSelection();
  } else {
    closeAllForms();
    selectedIndex = index;
  }
  render();
}

function clearSelection() {
  selectedIndex = null;
}

// ============================================================
// EDITOVANJE
// ============================================================
function openEditForm() {
  if (selectedIndex === null) return;
  const index = selectedIndex;
  closeAddForm();
  const form  = document.getElementById("editForm");
  const input = document.getElementById("editItemInput");
  form.classList.remove("hidden");
  form.classList.add("edit-mode");
  input.value = items[index].name;
  input.dataset.editIndex = index;
  input.focus();
  input.select();
}

function confirmEdit() {
  const input   = document.getElementById("editItemInput");
  const index   = parseInt(input.dataset.editIndex);
  const newName = input.value.trim();
  if (!newName) { input.focus(); return; }
  const duplicate = items.some((it, i) =>
    i !== index && it.name.toLowerCase() === newName.toLowerCase()
  );
  if (duplicate) {
    alert('Stavka "' + newName + '" već postoji na listi.');
    input.select();
    return;
  }
  items[index].name = newName;
  sortItems();
  saveItems();
  closeEditForm();
  clearSelection();
  render();
}

function closeEditForm() {
  const form  = document.getElementById("editForm");
  const input = document.getElementById("editItemInput");
  form.classList.add("hidden");
  form.classList.remove("edit-mode");
  input.value = "";
  delete input.dataset.editIndex;
}

// ============================================================
// DODAVANJE
// ============================================================
function openAddForm() {
  clearSelection();
  closeEditForm();
  const form = document.getElementById("addForm");
  form.classList.toggle("hidden");
  if (!form.classList.contains("hidden")) {
    document.getElementById("newItemInput").focus();
  }
  render();
}

function confirmAdd() {
  const input = document.getElementById("newItemInput");
  const name  = input.value.trim();
  if (!name) { input.focus(); return; }
  const duplicate = items.some(i => i.name.toLowerCase() === name.toLowerCase());
  if (duplicate) {
    alert('Stavka "' + name + '" već postoji na listi.');
    input.select();
    return;
  }
  items.push({ name, active: true });
  sortItems();
  saveItems();
  input.value = "";
  closeAddForm();
  render();
}

function closeAddForm() {
  document.getElementById("newItemInput").value = "";
  document.getElementById("addForm").classList.add("hidden");
}

function closeAllForms() {
  closeAddForm();
  closeEditForm();
}

// ============================================================
// BRISANJE
// ============================================================
function deleteSelected() {
  if (selectedIndex === null) return;
  const naziv = items[selectedIndex].name;
  if (!confirm('Obrisati stavku "' + naziv + '"?')) return;
  items.splice(selectedIndex, 1);
  clearSelection();
  sortItems();
  saveItems();
  render();
}

// ============================================================
// EXPORT
// ============================================================
function exportItems() {
  try {
    const data = JSON.stringify(items, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    const d    = new Date();
    const ds   = d.getFullYear() + "-" +
                 String(d.getMonth() + 1).padStart(2, "0") + "-" +
                 String(d.getDate()).padStart(2, "0");
    a.href     = url;
    a.download = "kupi-" + ds + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showInfo("Lista uspešno sačuvana u fajl.", "success");
  } catch (e) {
    showInfo("Greška pri čuvanju fajla.", "error");
  }
}

// ============================================================
// IMPORT
// ============================================================
function importItems(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        showInfo("Fajl ne sadrži ispravne podatke.", "error");
        return;
      }
      const valid = parsed.every(
        it => typeof it.name === "string" && typeof it.active === "boolean"
      );
      if (!valid) {
        showInfo("Format fajla nije ispravan.", "error");
        return;
      }
      if (!confirm("Uvezeni podaci će ZAMENITI trenutnu listu. Nastavi?")) return;
      items = parsed;
      sortItems();
      saveItems();
      clearSelection();
      render();
      showInfo("Lista uvezena (" + items.length + " stavki).", "success");
    } catch (err) {
      showInfo("Greška: fajl nije validan JSON.", "error");
    }
  };
  reader.readAsText(file, "UTF-8");
}

// ============================================================
// INFO PORUKA
// ============================================================
let infoTimer = null;
function showInfo(msg, type) {
  const el = document.getElementById("infoMsg");
  el.textContent = msg;
  el.className = "info-msg " + type;
  if (infoTimer) clearTimeout(infoTimer);
  infoTimer = setTimeout(() => { el.className = "info-msg hidden"; }, 3500);
}

// ============================================================
// HELP
// ============================================================
function openHelp() {
  document.getElementById("helpOverlay").classList.remove("hidden");
  // Scroll panel na vrh pri svakom otvaranju
  const panel = document.querySelector(".help-panel");
  if (panel) panel.scrollTop = 0;
  // Scroll overlay na vrh
  document.getElementById("helpOverlay").scrollTop = 0;
}

function closeHelp() {
  document.getElementById("helpOverlay").classList.add("hidden");
}

// ============================================================
// EVENT LISTENERI — TOOLBAR
// ============================================================
document.getElementById("btnNew").addEventListener("click", openAddForm);
document.getElementById("btnEdit").addEventListener("click", openEditForm);
document.getElementById("btnDelete").addEventListener("click", deleteSelected);
document.getElementById("btnHelp").addEventListener("click", openHelp);
document.getElementById("btnHelpClose").addEventListener("click", closeHelp);

// Klik na tamni overlay (van panela) zatvara help
document.getElementById("helpOverlay").addEventListener("click", (e) => {
  if (e.target === document.getElementById("helpOverlay")) closeHelp();
});

document.getElementById("btnReset").addEventListener("click", () => {
  if (!confirm("Resetovati sve stavke na neaktivno?")) return;
  closeAllForms();
  clearSelection();
  items.forEach(i => i.active = false);
  saveItems();
  render();
});

document.getElementById("btnExport").addEventListener("click", exportItems);

document.getElementById("btnImport").addEventListener("click", () => {
  document.getElementById("importFileInput").value = "";
  document.getElementById("importFileInput").click();
});

document.getElementById("importFileInput").addEventListener("change", (e) => {
  importItems(e.target.files[0]);
});

// ============================================================
// EVENT LISTENERI — FORME
// ============================================================
document.getElementById("btnConfirmAdd").addEventListener("click", confirmAdd);
document.getElementById("btnCancelAdd").addEventListener("click", closeAddForm);
document.getElementById("newItemInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter")  confirmAdd();
  if (e.key === "Escape") closeAddForm();
});

document.getElementById("btnConfirmEdit").addEventListener("click", confirmEdit);
document.getElementById("btnCancelEdit").addEventListener("click", () => {
  closeEditForm();
  clearSelection();
  render();
});
document.getElementById("editItemInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter")  confirmEdit();
  if (e.key === "Escape") { closeEditForm(); clearSelection(); render(); }
});

// Klik na pozadinu deselektuje stavku
document.addEventListener("click", (e) => {
  if (selectedIndex !== null &&
      !e.target.closest(".item") &&
      !e.target.closest(".inline-form") &&
      !e.target.closest(".toolbar")) {
    clearSelection();
    render();
  }
});

// ============================================================
// INIT
// ============================================================
loadItems();
sortItems();
saveItems();
render();

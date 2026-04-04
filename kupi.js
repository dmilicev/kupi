// ============================================================
// POČETNI PODACI
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

// Dupli tap: maksimalni razmak između dva uzastopna tapa
const DOUBLE_TAP_MS = 350;

// ============================================================
// DETEKCIJA TOUCH UREĐAJA
// ============================================================
const isTouchDevice = () =>
  ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

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

  const touch = isTouchDevice();
  const activeLabel   = touch ? "Za kupovinu  •  dupli tap = označi" : "Za kupovinu";
  const inactiveLabel = touch ? "Nije označeno  •  dupli tap = označi" : "Nije označeno";

  let activeSepAdded   = false;
  let inactiveSepAdded = false;

  items.forEach((item, index) => {
    if (item.active && !activeSepAdded) {
      activeSepAdded = true;
      ul.appendChild(makeSeparator(activeLabel));
    }
    if (!item.active && !inactiveSepAdded) {
      inactiveSepAdded = true;
      ul.appendChild(makeSeparator(inactiveLabel));
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

    // =====================================================
    // MOBILNI: DUPLI TAP za selekciju
    // Logika:
    //   touchstart - pamtimo vreme i poziciju prsta
    //   touchend   - ako se prst nije pomerio (scroll) i
    //                vreme od prethodnog tapa je kratko -> dupli tap
    // Scroll nije blokiran jer ne pozivamo preventDefault na scroll.
    // =====================================================
    let lastTapTime = 0;
    let tapStartX = 0;
    let tapStartY = 0;

    textZone.addEventListener("touchstart", (e) => {
      // Pamtimo poziciju i vreme pocetka tapa
      const t = e.touches[0];
      tapStartX = t.clientX;
      tapStartY = t.clientY;
    }, { passive: true });

    textZone.addEventListener("touchend", (e) => {
      const now = Date.now();

      // Koliko se prst pomerio od touchstart do touchend
      const t = e.changedTouches[0];
      const dx = Math.abs(t.clientX - tapStartX);
      const dy = Math.abs(t.clientY - tapStartY);

      // Ako je prst previse pomeren -> bio je scroll, ne tap
      if (dx > 10 || dy > 10) {
        lastTapTime = 0;  // resetuj - scroll prekida niz
        return;
      }

      const diff = now - lastTapTime;

      if (diff > 0 && diff < DOUBLE_TAP_MS) {
        // Dupli tap detektovan
        e.preventDefault();   // spreci ghost click
        e.stopPropagation();
        lastTapTime = 0;
        selectItem(index);
      } else {
        // Prvi tap - pamtimo vreme
        lastTapTime = now;
      }
    }, { passive: false });

    // =====================================================
    // DESKTOP: kratki klik = ništa, dugi klik/desni klik = selekcija
    // =====================================================
    let lp_timer = null;
    let lp_fired = false;

    textZone.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      lp_fired = false;
      lp_timer = setTimeout(() => {
        lp_fired = true;
        selectItem(index);
      }, 400);
    });

    textZone.addEventListener("mouseup", () => {
      clearTimeout(lp_timer);
    });

    textZone.addEventListener("mouseleave", () => {
      clearTimeout(lp_timer);
    });

    // Kratki klik: ništa
    textZone.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    // Desni klik: selekcija
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

// Tap/klik na pozadinu deselektuje stavku
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

// ============================================================
// POČETNI PODACI
// ============================================================
const DEFAULT_ITEMS = [
  { name: "pijaca, banane",             active: true  },
  { name: "pijaca, kupus",              active: true  },
  { name: "pijaca, peršun list",        active: true  },
  { name: "vocara, jabuke",             active: true  },
  { name: "vocara, limun",              active: true  },
  { name: "vocara, urme",               active: true  },
  { name: "Lidl, raženi hleb",          active: true  },
  { name: "UnioMZ, WC papir",           active: true  },
  { name: "Idea, čaj",                  active: true  },
  { name: "Idea, mrvice za rezance",    active: true  },
  { name: "avokado",                    active: false },
  { name: "bosiljak",                   active: false },
  { name: "brokoli",                    active: false },
  { name: "celer",                      active: false },
  { name: "čili",                       active: false },
  { name: "djumbir",                    active: false },
  { name: "jaja",                       active: false },
  { name: "kačkavalj",                  active: false },
  { name: "karfiol",                    active: false },
  { name: "kese za đubre ljubičaste",   active: false },
  { name: "kim 150g",                   active: false },
  { name: "kiselo mleko",               active: false },
  { name: "kivi",                       active: false },
  { name: "krastavci",                  active: false },
  { name: "Lidl, testo za picu",        active: false },
  { name: "ljute paprike",              active: false },
  { name: "masline",                    active: false },
  { name: "origano",                    active: false },
  { name: "paškanat",                   active: false },
  { name: "pelat paradajza",            active: false },
  { name: "peršun",                     active: false },
  { name: "pomorandže",                 active: false },
  { name: "puter",                      active: false },
  { name: "sapun",                      active: false },
  { name: "senf",                       active: false },
  { name: "sir President Somborska",    active: false },
  { name: "slanina",                    active: false },
  { name: "slatka Aleva",               active: false },
  { name: "sremuš",                     active: false },
  { name: "susam 200g",                 active: false },
  { name: "šampinjoni",                 active: false },
  { name: "šargarepe",                  active: false },
  { name: "šunka",                      active: false },
  { name: "Takovo kocke za supu",       active: false },
  { name: "Thomy majonez",              active: false },
  { name: "tortilje",                   active: false },
  { name: "zelena salata",              active: false },
];

// ============================================================
// STATE
// ============================================================
const STORAGE_KEY   = "kupi_items_v1";
let items           = [];
let selectedIndex   = null;   // stavka izabrana dugim pritiskom
let longPressTimer  = null;
let longPressFired  = false;
const LONG_PRESS_MS = 600;

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
// SORTIRANJE  (uvek se poziva nakon svake izmene)
// ============================================================
function sortItems() {
  items.sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    return a.name.localeCompare(b.name, "sr");
  });
}

// ============================================================
// TOOLBAR DUGMAD — Edit i Delete se aktiviraju/deaktiviraju
// ============================================================
function updateToolbar() {
  const hasSelection = selectedIndex !== null;
  document.getElementById("btnEdit").disabled   = !hasSelection;
  document.getElementById("btnDelete").disabled = !hasSelection;
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

    // ---- ZONA ČEKBOKSA ----------------------------------------
    // Klik na ovu zonu menja status aktivno/neaktivno
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

    // ---- ZONA TEKSTA ------------------------------------------
    // Kratki tap: ništa
    // Dugi tap (600ms): selektuj stavku
    const textZone = document.createElement("div");
    textZone.className = "text-zone";

    const txt = document.createElement("span");
    txt.className = "item-text";
    txt.textContent = item.name;
    textZone.appendChild(txt);

    // --- Touch (mobilni) ---
    textZone.addEventListener("touchstart", (e) => {
      longPressFired = false;
      longPressTimer = setTimeout(() => {
        longPressFired = true;
        selectItem(index);
      }, LONG_PRESS_MS);
    }, { passive: true });

    textZone.addEventListener("touchend", (e) => {
      clearTimeout(longPressTimer);
      // Ako je dugi pritisak već okidnut, sprečimo da browser
      // ne okine i click event
      if (longPressFired) {
        e.preventDefault();
      }
    });

    textZone.addEventListener("touchmove", () => {
      clearTimeout(longPressTimer);
    });

    // --- Desktop: dugi klik mišem (mousedown + timeout) ---
    textZone.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return; // samo levi klik
      longPressFired = false;
      longPressTimer = setTimeout(() => {
        longPressFired = true;
        selectItem(index);
      }, LONG_PRESS_MS);
    });

    textZone.addEventListener("mouseup", () => {
      clearTimeout(longPressTimer);
    });

    textZone.addEventListener("mouseleave", () => {
      clearTimeout(longPressTimer);
    });

    // Kratki klik mišem na tekst — ne radi ništa
    textZone.addEventListener("click", (e) => {
      e.stopPropagation();
      // namerno prazno
    });

    // Desni klik — selektuj (kao alternativa dugom pritisku na desktopu)
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
  // Ako se klikne na već izabranu — deselektuj
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
  render(); // osveži toolbar
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
    const data  = JSON.stringify(items, null, 2);
    const blob  = new Blob([data], { type: "application/json" });
    const url   = URL.createObjectURL(blob);
    const a     = document.createElement("a");
    const d     = new Date();
    const ds    = d.getFullYear() + "-" +
                  String(d.getMonth() + 1).padStart(2, "0") + "-" +
                  String(d.getDate()).padStart(2, "0");
    a.href      = url;
    a.download  = "kupi-" + ds + ".json";
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
// EVENT LISTENERI — TOOLBAR
// ============================================================
document.getElementById("btnNew").addEventListener("click", openAddForm);

document.getElementById("btnEdit").addEventListener("click", openEditForm);

document.getElementById("btnDelete").addEventListener("click", deleteSelected);

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
document.getElementById("btnCancelAdd").addEventListener("click", () => {
  closeAddForm();
});
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

// Klik na pozadinu deselektuje
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

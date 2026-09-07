const listCard = document.querySelector('.list-card');
const addItemForm = document.querySelector('#add-item-form');
const newItemInput = document.querySelector('#new-item');
const quickAddButtons = document.querySelectorAll('[data-quick-add]');
const announcer = document.querySelector('.announcer');
const itemDialog = document.querySelector('#item-dialog');
const editItemForm = document.querySelector('#edit-item-form');
const editNameInput = document.querySelector('#edit-name');
const editNoteInput = document.querySelector('#edit-note');
let selectedRow = null;

function updateListSummary() {
  const archivedRows = document.querySelectorAll('.completed-items .item-row');

  document.querySelector('#completed-count').textContent = `${archivedRows.length} ${archivedRows.length === 1 ? 'item' : 'items'}`;
}

function getItemName(row) {
  return row.querySelector('.item-name').textContent;
}

function setCompleteState(checkbox) {
  const row = checkbox.closest('.item-row');
  row.classList.toggle('is-complete', checkbox.checked);

  const itemName = getItemName(row);
  const checkboxText = row.querySelector('.checkbox-label .visually-hidden');
  checkboxText.textContent = checkbox.checked ? `Mark ${itemName} not done` : `Mark ${itemName} done`;
  announcer.textContent = checkbox.checked ? `${itemName} marked done` : `${itemName} moved back to the list`;
}

function makeItemRow(itemName) {
  const id = `item-${crypto.randomUUID()}`;
  const row = document.createElement('li');
  row.className = 'item-row';

  const detailsButton = document.createElement('button');
  detailsButton.className = 'item-details';
  detailsButton.type = 'button';
  const itemCopy = document.createElement('span');
  itemCopy.className = 'item-copy';
  const name = document.createElement('span');
  name.className = 'item-name';
  name.textContent = itemName;
  itemCopy.append(name);
  detailsButton.append(itemCopy);

  const checkboxLabel = document.createElement('label');
  checkboxLabel.className = 'checkbox-label';
  const checkboxText = document.createElement('span');
  checkboxText.className = 'visually-hidden';
  checkboxText.textContent = `Mark ${itemName} done`;
  const checkbox = document.createElement('input');
  checkbox.id = id;
  checkbox.type = 'checkbox';
  checkboxLabel.append(checkboxText, checkbox);

  row.append(detailsButton, checkboxLabel);
  return row;
}

function addItem(itemName) {
  document.querySelector('.active-items').append(makeItemRow(itemName));
  announcer.textContent = `${itemName} added to the list`;
}

function openItemDialog(row) {
  selectedRow = row;
  const itemName = getItemName(row);

  document.querySelector('#dialog-title').textContent = itemName;
  editNameInput.value = itemName;
  editNoteInput.value = row.querySelector('.item-note')?.textContent ?? '';
  itemDialog.showModal();
}

function saveItemChanges() {
  if (!selectedRow) return;

  const previousName = getItemName(selectedRow);
  const itemCopy = selectedRow.querySelector('.item-copy');
  let note = selectedRow.querySelector('.item-note');

  selectedRow.querySelector('.item-name').textContent = editNameInput.value.trim();
  selectedRow.querySelector('.checkbox-label .visually-hidden').textContent = `Mark ${editNameInput.value.trim()} ${selectedRow.classList.contains('is-complete') ? 'not done' : 'done'}`;

  if (editNoteInput.value.trim()) {
    if (!note) {
      note = document.createElement('span');
      note.className = 'item-note';
      itemCopy.append(note);
    }
    note.textContent = editNoteInput.value.trim();
  } else {
    note?.remove();
  }

  announcer.textContent = `${previousName} updated`;
}

addItemForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const itemName = newItemInput.value.trim();

  if (!itemName) return;

  addItem(itemName);
  addItemForm.reset();
  newItemInput.focus();
});

quickAddButtons.forEach((button) => {
  button.addEventListener('click', () => addItem(button.dataset.quickAdd));
});

listCard.addEventListener('change', (event) => {
  if (event.target.matches('input[type="checkbox"]')) setCompleteState(event.target);
});

listCard.addEventListener('click', (event) => {
  const detailsButton = event.target.closest('.item-details');
  if (detailsButton) openItemDialog(detailsButton.closest('.item-row'));
});

editItemForm.addEventListener('submit', saveItemChanges);
document.querySelector('.dialog-close').addEventListener('click', () => itemDialog.close());
document.querySelector('.remove-item').addEventListener('click', () => {
  if (!selectedRow) return;

  const itemName = getItemName(selectedRow);
  selectedRow.remove();
  itemDialog.close();
  updateListSummary();
  announcer.textContent = `${itemName} removed`;
});

itemDialog.addEventListener('click', (event) => {
  if (event.target === itemDialog) itemDialog.close();
});

updateListSummary();

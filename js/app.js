const state = {
  pendingFile: null,
  books: [
    { title: 'Clean Code', author: 'Robert C. Martin', category: 'Programação', color: '#34495e', shelf: '#6687a8' },
    { title: 'O Design do Dia a Dia', author: 'Don Norman', category: 'Design', color: '#8d5a45', shelf: '#c96b52' },
    { title: '1984', author: 'George Orwell', category: 'Literatura', color: '#333333', shelf: '#718a6a' },
    { title: 'Hábitos Atômicos', author: 'James Clear', category: 'Psicologia', color: '#6d5c82', shelf: '#8a789b' },
    { title: 'O Poder do Hábito', author: 'Charles Duhigg', category: 'Psicologia', color: '#876d37', shelf: '#8a789b' }
  ]
};

const $ = (id) => document.getElementById(id);
const fileInput = $('fileInput');
const dialog = $('bookDialog');
const readerDialog = $('readerDialog');
const readerFrame = $('readerFrame');
const readerUnavailable = $('readerUnavailable');

function renderShelves() {
  const shelves = $('shelves');
  const empty = $('emptyLibrary');
  shelves.innerHTML = '';
  if (!state.books.length) { empty.hidden = false; return; }
  empty.hidden = true;
  const groups = {};
  state.books.forEach(book => (groups[book.category] ??= []).push(book));
  Object.entries(groups).forEach(([category, books], index) => {
    const colors = ['#c96b52','#6687a8','#718a6a','#d4a84f','#8a789b'];
    const shelf = document.createElement('section');
    shelf.className = 'shelf';
    shelf.style.setProperty('--shelf', books[0].shelf || colors[index % colors.length]);
    shelf.innerHTML = `<div class="shelf-title"><h3>${escapeHtml(category)}</h3><span>${books.length} livro${books.length === 1 ? '' : 's'}</span></div><div class="books-row"></div>`;
    const row = shelf.querySelector('.books-row');
    books.forEach(book => {
      const item = document.createElement('article');
      item.className = `book${book.file ? ' can-open' : ''}`;
      item.innerHTML = `<div class="cover" style="--cover:${book.color || '#777'}"><span class="mini">LIBRYARI</span><strong>${escapeHtml(book.title)}</strong><span class="mini">${escapeHtml(book.author)}</span></div><div class="book-info"><strong>${escapeHtml(book.title)}</strong><span>${escapeHtml(book.author)}</span></div>`;
      if (book.file) {
        item.tabIndex = 0;
        item.setAttribute('role', 'button');
        item.setAttribute('aria-label', `Abrir ${book.title}`);
        item.addEventListener('click', () => openReader(book));
        item.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openReader(book);
          }
        });
      }
      row.appendChild(item);
    });
    shelves.appendChild(shelf);
  });
}

function openImport() {
  // Keep the picker call directly inside the button's click handler so mobile
  // browsers treat it as a user action and allow access to the file chooser.
  fileInput.click();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[character]);
}

function showDialog(element) {
  if (typeof element.showModal === 'function') {
    try {
      element.showModal();
      return;
    } catch (error) {
      // Use the CSS fallback when the browser exposes dialog but cannot open it.
    }
  }

  element.setAttribute('open', '');
  element.classList.add('dialog-fallback-open');
  document.body.classList.add('dialog-fallback-active');
}

function closeDialog(element) {
  if (element.classList.contains('dialog-fallback-open')) {
    element.removeAttribute('open');
    element.classList.remove('dialog-fallback-open');
    document.body.classList.remove('dialog-fallback-active');
    return;
  }

  if (typeof element.close === 'function' && element.open) {
    element.close();
  }
}

function showBookDialog() { showDialog(dialog); }
function closeBookDialog() { closeDialog(dialog); }

function isPdf(file) {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
}

function clearReaderSource() {
  readerFrame.removeAttribute('src');
  const url = state.readerUrl;
  if (url) URL.revokeObjectURL(url);
  state.readerUrl = null;
}

function openReader(book) {
  clearReaderSource();
  const url = URL.createObjectURL(book.file);
  const canReadInBrowser = isPdf(book.file);
  state.readerUrl = url;
  $('readerTitle').textContent = book.title;
  $('readerOpenFile').href = url;
  $('readerOpenFile').textContent = canReadInBrowser ? 'Abrir em outra aba' : 'Abrir arquivo';
  readerFrame.hidden = !canReadInBrowser;
  readerUnavailable.hidden = canReadInBrowser;
  if (canReadInBrowser) readerFrame.src = url;
  showDialog(readerDialog);
}

function closeReader() {
  closeDialog(readerDialog);
  clearReaderSource();
}

$('addBtn').addEventListener('click', openImport);
$('emptyLibraryBtn').addEventListener('click', openImport);

fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (!file) return;
  state.pendingFile = file;
  $('dialogTitle').textContent = file.name.replace(/\.(pdf|epub|mobi|azw3?)$/i, '').replace(/[-_]+/g, ' ');
  $('dialogMeta').textContent = `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB`;
  showBookDialog();
  fileInput.value = '';
});

$('saveBook').onclick = () => {
  const file = state.pendingFile;
  if (!file) return;
  const title = $('dialogTitle').textContent.trim();
  const category = $('categorySelect').value;
  const palette = ['#34495e','#8d5a45','#333333','#6d5c82','#876d37'];
  state.books.unshift({ title, author: 'Importado', category, color: palette[Math.floor(Math.random()*palette.length)], shelf: getShelf(category), file });
  renderShelves();
  closeBookDialog();
  state.pendingFile = null;
};
$('dialogClose').onclick = closeBookDialog;
$('readerClose').onclick = closeReader;
readerDialog.addEventListener('close', clearReaderSource);

document.querySelectorAll('.filter').forEach(btn => btn.onclick = () => {
  document.querySelectorAll('.filter').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
});
$('searchBtn').onclick = () => alert('Busca global entra na próxima etapa do MVP.');

function getShelf(category) {
  return ({ Programação:'#6687a8', Design:'#c96b52', Literatura:'#718a6a', Psicologia:'#8a789b', Negócios:'#d4a84f', Estudos:'#6687a8' })[category] || '#c96b52';
}
renderShelves();

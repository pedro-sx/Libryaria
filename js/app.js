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
    shelf.innerHTML = `<div class="shelf-title"><h3>${category}</h3><span>${books.length} livro${books.length === 1 ? '' : 's'}</span></div><div class="books-row"></div>`;
    const row = shelf.querySelector('.books-row');
    books.forEach(book => {
      const item = document.createElement('article');
      item.className = 'book';
      item.innerHTML = `<div class="cover" style="--cover:${book.color || '#777'}"><span class="mini">LIBRYARI</span><strong>${book.title}</strong><span class="mini">${book.author}</span></div><div class="book-info"><strong>${book.title}</strong><span>${book.author}</span></div>`;
      row.appendChild(item);
    });
    shelves.appendChild(shelf);
  });
}

function openImport() { fileInput.click(); }
$('addBtn').onclick = openImport;
$('emptyAddBtn').onclick = openImport;
$('emptyLibraryBtn').onclick = openImport;

fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (!file) return;
  state.pendingFile = file;
  $('dialogTitle').textContent = file.name.replace(/\.(pdf|epub|mobi|azw3?)$/i, '').replace(/[-_]+/g, ' ');
  $('dialogMeta').textContent = `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB`;
  dialog.showModal();
  fileInput.value = '';
});

$('saveBook').onclick = () => {
  const file = state.pendingFile;
  if (!file) return;
  const title = $('dialogTitle').textContent.trim();
  const category = $('categorySelect').value;
  const palette = ['#34495e','#8d5a45','#333333','#6d5c82','#876d37'];
  state.books.unshift({ title, author: 'Importado', category, color: palette[Math.floor(Math.random()*palette.length)], shelf: getShelf(category) });
  renderShelves();
  dialog.close();
  state.pendingFile = null;
};
$('dialogClose').onclick = () => dialog.close();

document.querySelectorAll('.filter').forEach(btn => btn.onclick = () => {
  document.querySelectorAll('.filter').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
});
$('searchBtn').onclick = () => alert('Busca global entra na próxima etapa do MVP.');

function getShelf(category) {
  return ({ Programação:'#6687a8', Design:'#c96b52', Literatura:'#718a6a', Psicologia:'#8a789b', Negócios:'#d4a84f', Estudos:'#6687a8' })[category] || '#c96b52';
}
renderShelves();

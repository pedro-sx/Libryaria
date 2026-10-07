const state = {
  pendingFile: null,
  readerUrl: null,
  readerBook: null,
  readerRendition: null,
  readerPdf: null,
  readerPdfPage: 1,
  readerMode: null,
  readerSession: 0,
  books: [
    { title: 'Verity', author: 'Colleen Hoover', category: 'Literatura', color: '#2c2038', shelf: '#718a6a', source: 'assets/verity.epub', fileName: 'Verity.epub' },
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
const readerPage = $('readerPage');
const readerFrame = $('readerFrame');
const readerLoading = $('readerLoading');
const readerUnavailable = $('readerUnavailable');
const readerPageStatus = $('readerPageStatus');
const readerPrevious = $('readerPrevious');
const readerNext = $('readerNext');

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
      item.className = `book${book.file || book.source ? ' can-open' : ''}`;
      item.innerHTML = `<div class="cover" style="--cover:${book.color || '#777'}"><span class="mini">LIBRYARI</span><strong>${escapeHtml(book.title)}</strong><span class="mini">${escapeHtml(book.author)}</span></div><div class="book-info"><strong>${escapeHtml(book.title)}</strong><span>${escapeHtml(book.author)}</span></div>`;
      if (book.file || book.source) {
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

function isEpub(file) {
  return file.type === 'application/epub+zip' || /\.epub$/i.test(file.name);
}

function clearReaderSource() {
  state.readerSession += 1;
  if (state.readerRendition?.destroy) state.readerRendition.destroy();
  if (state.readerBook?.destroy) state.readerBook.destroy();
  readerFrame.replaceChildren();
  const url = state.readerUrl;
  if (url) URL.revokeObjectURL(url);
  state.readerUrl = null;
  state.readerBook = null;
  state.readerRendition = null;
  state.readerPdf = null;
  state.readerPdfPage = 1;
  state.readerMode = null;
  readerLoading.hidden = true;
}

function setReaderLoading(isLoading) {
  readerLoading.hidden = !isLoading;
}

function showReaderUnavailable(message) {
  setReaderLoading(false);
  readerFrame.hidden = true;
  readerUnavailable.hidden = false;
  readerUnavailable.querySelector('p').textContent = message;
}

function setReaderActive(isActive) {
  document.documentElement.classList.toggle('reader-active', isActive);
  document.body.classList.toggle('reader-active', isActive);
}

function updateReaderNavigation(current, total) {
  readerPageStatus.textContent = total ? `${current} / ${total}` : 'Leitura';
  readerPrevious.disabled = !total || current <= 1;
  readerNext.disabled = !total || current >= total;
}

function updateEpubNavigation(location) {
  const page = (location.start?.displayed?.page || 0) + 1;
  readerPageStatus.textContent = `Página ${page}`;
  readerPrevious.disabled = Boolean(location.atStart);
  readerNext.disabled = Boolean(location.atEnd);
}

async function renderPdfPage() {
  const pdf = state.readerPdf;
  if (!pdf) return;

  const page = await pdf.getPage(state.readerPdfPage);
  const width = Math.max(readerFrame.clientWidth, 1);
  const height = Math.max(readerFrame.clientHeight, 1);
  const original = page.getViewport({ scale: 1 });
  const scale = Math.min(width / original.width, height / original.height) * window.devicePixelRatio;
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { alpha: false });
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  canvas.style.width = `${Math.floor(viewport.width / window.devicePixelRatio)}px`;
  canvas.style.height = `${Math.floor(viewport.height / window.devicePixelRatio)}px`;
  readerFrame.replaceChildren(canvas);
  await page.render({ canvasContext: context, viewport }).promise;
  updateReaderNavigation(state.readerPdfPage, pdf.numPages);
  setReaderLoading(false);
}

async function renderPdf(file, session) {
  if (!window.pdfjsLib) {
    showReaderUnavailable('Não foi possível carregar o leitor PDF. Toque em Abrir para abrir o arquivo em outra aba.');
    return;
  }

  try {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const data = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data }).promise;
    if (state.readerSession !== session) return;
    state.readerPdf = pdf;
    state.readerMode = 'pdf';
    await renderPdfPage();
  } catch (error) {
    if (state.readerSession === session) {
      showReaderUnavailable('Não foi possível abrir este PDF aqui. Toque em Abrir para abrir o arquivo em outra aba.');
    }
  }
}

async function renderEpub(file, session) {
  if (typeof window.ePub !== 'function') {
    showReaderUnavailable('Não foi possível carregar o leitor EPUB. Toque em Abrir arquivo para continuar no leitor do aparelho.');
    return;
  }

  try {
    const data = await file.arrayBuffer();
    if (state.readerSession !== session) return;

    const book = window.ePub(data, { replacements: 'blobUrl' });
    const rendition = book.renderTo(readerFrame, {
      width: '100%',
      height: '100%',
      flow: 'paginated',
      spread: 'none'
    });
    rendition.hooks.content.register((contents) => {
      const document = contents.document;
      if (document.getElementById('libryari-reader-image-style')) return;
      const pageWidth = Math.max(readerFrame.clientWidth, 1);
      const style = document.createElement('style');
      style.id = 'libryari-reader-image-style';
      style.textContent = `
        html {
          width: 100% !important;
          height: 100% !important;
          min-height: 100% !important;
          overflow: hidden !important;
        }
        body {
          /* EPUB.js lays paginated content out in columns that extend beyond
             the body's first-page box. Hiding overflow on the body clips every
             column after the first, leaving a cream page with accessible text. */
          width: ${pageWidth}px !important;
          height: 100% !important;
          min-height: 100% !important;
          overflow: visible !important;
        }
        body {
          box-sizing: border-box !important;
          margin: 0 !important;
          padding: 1.25rem 1.1rem !important;
          font-size: 1.12rem !important;
          line-height: 1.6 !important;
        }
        p, blockquote, div, section {
          max-width: 100% !important;
          min-height: 0 !important;
        }
        p, blockquote {
          margin: 0 0 1rem !important;
        }
        [class^="calibre_"], [class*=" calibre_"] {
          width: auto !important;
          height: auto !important;
          min-height: 0 !important;
          margin: 1.15rem 0 0 !important;
        }
        .mbp_pagebreak {
          display: none !important;
        }
        img, svg, video, canvas {
          box-sizing: border-box !important;
          display: block !important;
          max-width: 100% !important;
          max-height: 72vh !important;
          width: auto !important;
          height: auto !important;
          margin: 0 auto !important;
          object-fit: contain !important;
        }
        body { overflow-wrap: anywhere !important; }
      `;
      document.head.appendChild(style);
    });
    let contentReady = Promise.resolve();
    rendition.on('rendered', (section, view) => {
      const document = view?.contents?.document;
      const assets = Array.from(document?.images || []);
      contentReady = Promise.all(assets.map((image) => new Promise((resolve) => {
        if (image.complete) {
          resolve();
          return;
        }

        let timeout;
        const finish = () => {
          clearTimeout(timeout);
          image.removeEventListener('load', finish);
          image.removeEventListener('error', finish);
          resolve();
        };
        image.addEventListener('load', finish, { once: true });
        image.addEventListener('error', finish, { once: true });
        timeout = setTimeout(finish, 2500);
        if (image.complete) finish();
      })));
    });
    rendition.on('relocated', async (location) => {
      if (state.readerRendition !== rendition) return;
      updateEpubNavigation(location);
      await contentReady;
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      if (state.readerRendition === rendition) setReaderLoading(false);
    });
    state.readerBook = book;
    state.readerRendition = rendition;
    state.readerMode = 'epub';
    readerPrevious.disabled = true;
    readerNext.disabled = false;
    await rendition.display();
  } catch (error) {
    if (state.readerSession === session) {
      showReaderUnavailable('Não foi possível abrir este EPUB aqui. Toque em Abrir arquivo para usar o leitor do aparelho.');
    }
  }
}

async function getBookFile(book) {
  if (book.file) return book.file;
  const response = await fetch(book.source);
  if (!response.ok) throw new Error('Book asset unavailable');
  const blob = await response.blob();
  book.file = new File([blob], book.fileName || book.source.split('/').pop(), {
    type: blob.type || 'application/epub+zip'
  });
  return book.file;
}

async function openReader(book) {
  clearReaderSource();
  const session = state.readerSession;
  $('readerTitle').textContent = book.title;
  readerPage.hidden = false;
  setReaderActive(true);
  setReaderLoading(true);
  updateReaderNavigation(0, 0);
  if (window.location.hash !== '#leitor') {
    window.history.pushState({ reader: true }, '', '#leitor');
  }
  try {
    const file = await getBookFile(book);
    if (state.readerSession !== session) return;
    const url = URL.createObjectURL(file);
    const canReadInBrowser = isPdf(file) || isEpub(file);
    state.readerUrl = url;
    $('readerOpenFile').href = url;
    readerFrame.hidden = !canReadInBrowser;
    readerUnavailable.hidden = canReadInBrowser;
    if (isPdf(file)) renderPdf(file, session);
    if (isEpub(file)) renderEpub(file, session);
    if (!canReadInBrowser) {
      showReaderUnavailable('Este formato será aberto pelo leitor de arquivos do seu aparelho.');
    }
  } catch (error) {
    if (state.readerSession === session) {
      showReaderUnavailable('Não foi possível carregar este livro. Tente novamente.');
    }
  }
}

function closeReader() {
  if (readerPage.hidden) return;
  readerPage.hidden = true;
  setReaderActive(false);
  clearReaderSource();
  if (window.location.hash === '#leitor') window.history.back();
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
readerPrevious.onclick = async () => {
  if (state.readerMode === 'epub') {
    setReaderLoading(true);
    await state.readerRendition?.prev();
  }
  if (state.readerMode === 'pdf' && state.readerPdfPage > 1) {
    setReaderLoading(true);
    state.readerPdfPage -= 1;
    await renderPdfPage();
  }
};
readerNext.onclick = async () => {
  if (state.readerMode === 'epub') {
    setReaderLoading(true);
    await state.readerRendition?.next();
  }
  if (state.readerMode === 'pdf' && state.readerPdf && state.readerPdfPage < state.readerPdf.numPages) {
    setReaderLoading(true);
    state.readerPdfPage += 1;
    await renderPdfPage();
  }
};
window.addEventListener('popstate', () => {
  if (!readerPage.hidden) {
    readerPage.hidden = true;
    setReaderActive(false);
    clearReaderSource();
  }
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !readerPage.hidden) closeReader();
});

document.querySelectorAll('.filter').forEach(btn => btn.onclick = () => {
  document.querySelectorAll('.filter').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
});
$('searchBtn').onclick = () => alert('Busca global entra na próxima etapa do MVP.');

function getShelf(category) {
  return ({ Programação:'#6687a8', Design:'#c96b52', Literatura:'#718a6a', Psicologia:'#8a789b', Negócios:'#d4a84f', Estudos:'#6687a8' })[category] || '#c96b52';
}
renderShelves();

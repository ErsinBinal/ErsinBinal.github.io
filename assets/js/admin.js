(function() {
  'use strict';

  const backend = window.ConviviumBackend;
  const tools = window.ConviviumArticleTools || {};

  const gate = document.getElementById('adminGate');
  const workspace = document.getElementById('adminWorkspace');
  const status = document.getElementById('adminStatus');
  const form = document.getElementById('articleForm');
  const list = document.getElementById('articleList');
  const articleTotal = document.getElementById('articleTotal');
  const articleSearch = document.getElementById('articleSearch');
  const statusFilter = document.getElementById('statusFilter');
  const clearButton = document.getElementById('clearForm');
  const deleteButton = document.getElementById('deleteArticle');
  const saveDraftButton = document.getElementById('saveDraft');
  const publishButton = document.getElementById('publishArticle');
  const submitButton = document.getElementById('submitArticle');
  const titleInput = document.getElementById('title');
  const slugInput = document.getElementById('slug');
  const contentInput = document.getElementById('content_html');
  const visualEditor = document.getElementById('visualEditor');
  const preview = document.getElementById('articlePreview');
  const importFile = document.getElementById('articleImportFile');
  const importStatus = document.getElementById('importStatus');
  const pasteAsMarkdown = document.getElementById('pasteAsMarkdown');
  const cleanHtml = document.getElementById('cleanHtml');
  const wordCount = document.getElementById('wordCount');
  const readTime = document.getElementById('readTime');
  const dirtyState = document.getElementById('dirtyState');

  if (!form) return;

  const state = {
    articles: [],
    filtered: [],
    activeId: '',
    dirty: false,
    slugLocked: false
  };

  const autosaveKey = 'convivium.article.autosave';

  function setStatus(message, type = 'info') {
    status.textContent = message || '';
    status.dataset.type = type;
  }

  function setImportStatus(message, type = 'info') {
    if (!importStatus) return;
    importStatus.textContent = message || '';
    importStatus.dataset.type = type;
  }

  function setGate(message) {
    gate.textContent = message;
    gate.hidden = false;
    workspace.hidden = true;
  }

  function escapeHtml(value) {
    if (tools.escapeHtml) return tools.escapeHtml(value);
    return String(value || '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  function sanitizeHtml(html) {
    return tools.sanitizeHtml ? tools.sanitizeHtml(html) : String(html || '');
  }

  function stripHtml(html) {
    if (tools.stripHtml) return tools.stripHtml(html);
    const box = document.createElement('div');
    box.innerHTML = html || '';
    return box.textContent.replace(/\s+/g, ' ').trim();
  }

  function markdownToHtml(markdown) {
    return tools.markdownToHtml
      ? tools.markdownToHtml(markdown)
      : textToHtml(markdown);
  }

  function slugify(value) {
    return backend?.slugify ? backend.slugify(value) : String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function textToHtml(text) {
    return String(text || '')
      .replace(/\r\n/g, '\n')
      .split(/\n{2,}/)
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => `<p>${escapeHtml(part).replace(/\n/g, '<br>')}</p>`)
      .join('\n');
  }

  function formData() {
    syncEditorToTextarea();
    return Object.fromEntries(new FormData(form).entries());
  }

  function setDirty(isDirty) {
    state.dirty = Boolean(isDirty);
    dirtyState.textContent = state.dirty ? 'Kaydedilmemis degisiklik var' : 'Degisiklik yok';
    dirtyState.dataset.dirty = String(state.dirty);
  }

  function syncEditorToTextarea() {
    const clean = sanitizeHtml(visualEditor.innerHTML);
    contentInput.value = clean;
    return clean;
  }

  function setEditorHtml(html) {
    const clean = sanitizeHtml(html || '');
    visualEditor.innerHTML = clean || '';
    contentInput.value = clean;
    updatePreview();
    updateStats();
  }

  function updatePreview() {
    const html = sanitizeHtml(visualEditor.innerHTML || contentInput.value || '');
    preview.innerHTML = html || '<p>Onizleme burada gorunur.</p>';
  }

  function updateStats() {
    const text = stripHtml(visualEditor.innerHTML);
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
    const minutes = Math.max(1, Math.ceil(words / 200));
    wordCount.textContent = `${words} kelime`;
    readTime.textContent = `~${minutes} dk okuma`;

    const summary = form.elements.summary;
    if (summary && !summary.value.trim() && words > 20) {
      summary.value = text.slice(0, 260);
    }
  }

  function saveAutosave() {
    const data = formData();
    try {
      localStorage.setItem(autosaveKey, JSON.stringify({
        ...data,
        content_html: contentInput.value,
        saved_at: new Date().toISOString()
      }));
    } catch (error) {
      console.warn('[Convivium] Autosave failed:', error);
    }
  }

  function clearAutosave() {
    try {
      localStorage.removeItem(autosaveKey);
    } catch (error) {
      console.warn('[Convivium] Autosave cleanup failed:', error);
    }
  }

  function statusLabel(value) {
    if (value === 'published') return 'Yayinda';
    if (value === 'archived') return 'Arsiv';
    return 'Taslak';
  }

  function rowDate(article) {
    return String(article.published_at || article.updated_at || article.created_at || '').slice(0, 10) || 'Tarihsiz';
  }

  function filterArticles() {
    const q = articleSearch.value.trim().toLowerCase();
    const statusValue = statusFilter.value;
    state.filtered = state.articles.filter((article) => {
      const statusOk = statusValue === 'all' || article.status === statusValue;
      const queryOk = !q || `${article.title} ${article.summary} ${article.slug}`.toLowerCase().includes(q);
      return statusOk && queryOk;
    });
    renderList();
  }

  function renderList() {
    list.innerHTML = '';
    articleTotal.textContent = state.articles.length;

    if (!state.filtered.length) {
      const empty = document.createElement('li');
      empty.className = 'studio-empty';
      empty.textContent = 'Bu filtrede makale yok.';
      list.appendChild(empty);
      return;
    }

    state.filtered.forEach((article) => {
      const item = document.createElement('li');
      const button = document.createElement('button');
      const title = document.createElement('strong');
      const summary = document.createElement('span');
      const meta = document.createElement('em');

      button.type = 'button';
      button.className = 'studio-list-button';
      button.classList.toggle('is-active', article.id === state.activeId);
      title.textContent = article.title || 'Basliksiz';
      summary.textContent = article.summary || article.slug;
      meta.textContent = `${statusLabel(article.status)} / ${rowDate(article)}`;
      button.append(title, summary, meta);
      button.addEventListener('click', () => fillForm(article));
      item.appendChild(button);
      list.appendChild(item);
    });
  }

  function fillForm(article) {
    const hasArticle = Boolean(article);
    state.activeId = hasArticle ? article.id : '';
    state.slugLocked = hasArticle;

    form.elements.id.value = hasArticle ? article.id : '';
    form.elements.title.value = hasArticle ? article.title || '' : '';
    form.elements.slug.value = hasArticle ? article.slug || '' : '';
    form.elements.summary.value = hasArticle ? article.summary || '' : '';
    form.elements.status.value = hasArticle ? article.status || 'draft' : 'draft';
    form.elements.published_at.value = hasArticle && article.published_at ? article.published_at.slice(0, 16) : '';
    setEditorHtml(hasArticle ? article.content_html || '' : '');

    deleteButton.disabled = !hasArticle;
    submitButton.textContent = hasArticle ? 'Guncelle' : 'Kaydet';
    setDirty(false);
    renderList();
  }

  function validateArticle(data) {
    if (!data.title.trim()) throw new Error('Baslik gerekli.');
    if (!data.slug.trim()) throw new Error('Slug gerekli.');
    if (!data.summary.trim()) throw new Error('Ozet gerekli.');
    if (!stripHtml(data.content_html).trim()) throw new Error('Makale icerigi bos olamaz.');
  }

  async function loadArticles(selectId = state.activeId) {
    setStatus('Icerikler yukleniyor...', 'info');
    state.articles = await backend.fetchManagedArticles();
    state.filtered = [...state.articles];
    filterArticles();

    const selected = state.articles.find((article) => article.id === selectId);
    if (selected) fillForm(selected);
    else if (!state.activeId && state.articles[0]) fillForm(state.articles[0]);
    else setDirty(false);

    setStatus('Icerik listesi guncel.', 'success');
  }

  async function saveArticle(forceStatus) {
    const data = formData();
    if (forceStatus) {
      data.status = forceStatus;
      form.elements.status.value = forceStatus;
    }

    data.slug = slugify(data.slug || data.title);
    form.elements.slug.value = data.slug;
    data.content_html = sanitizeHtml(data.content_html);
    if (data.status === 'published' && !data.published_at) {
      data.published_at = new Date().toISOString();
    } else if (data.published_at) {
      data.published_at = new Date(data.published_at).toISOString();
    }

    validateArticle(data);

    setStatus(data.status === 'published' ? 'Makale yayina hazirlaniyor...' : 'Makale kaydediliyor...', 'info');
    const saved = await backend.saveArticle({
      id: data.id,
      title: data.title,
      slug: data.slug,
      summary: data.summary,
      status: data.status,
      published_at: data.published_at,
      content_html: data.content_html
    });

    clearAutosave();
    await loadArticles(saved.id);
    setStatus(data.status === 'published' ? 'Makale yayinda.' : 'Makale kaydedildi.', 'success');
  }

  function insertHtml(html) {
    visualEditor.focus();
    document.execCommand('insertHTML', false, sanitizeHtml(html));
    handleEditorChange();
  }

  function toEmbedUrl(raw) {
    const value = String(raw || '').trim();
    if (!value) return '';
    try {
      const url = new URL(value);
      if (url.hostname.includes('youtu.be')) {
        return `https://www.youtube-nocookie.com/embed/${url.pathname.replace('/', '')}`;
      }
      if (url.hostname.includes('youtube.com')) {
        const id = url.searchParams.get('v') || url.pathname.split('/').filter(Boolean).pop();
        return id ? `https://www.youtube-nocookie.com/embed/${id}` : value;
      }
      if (url.hostname.includes('vimeo.com')) {
        const id = url.pathname.split('/').filter(Boolean).pop();
        return id ? `https://player.vimeo.com/video/${id}` : value;
      }
    } catch (error) {
      return value;
    }
    return value;
  }

  function handleInsert(type) {
    if (type === 'link') {
      const href = window.prompt('Link URL');
      if (!href) return;
      const label = window.getSelection().toString() || window.prompt('Link metni', 'Kaynak') || 'Kaynak';
      insertHtml(`<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`);
      return;
    }

    if (type === 'image') {
      const src = window.prompt('Gorsel URL');
      if (!src) return;
      const alt = window.prompt('Gorsel aciklamasi', 'Makale gorseli') || 'Makale gorseli';
      const caption = window.prompt('Altyazi', '') || '';
      insertHtml(`<figure class="article-image">
  <img class="responsive" src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async">
  ${caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ''}
</figure>`);
      return;
    }

    if (type === 'video') {
      const src = toEmbedUrl(window.prompt('YouTube veya Vimeo URL'));
      if (!src) return;
      insertHtml(`<figure class="article-video">
  <iframe src="${escapeHtml(src)}" title="Makale videosu" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture" allowfullscreen></iframe>
</figure>`);
    }
  }

  async function importDocx(file) {
    if (!window.mammoth) throw new Error('DOCX aktarim kutuphanesi yuklenemedi.');
    const arrayBuffer = await file.arrayBuffer();
    const result = await window.mammoth.convertToHtml({ arrayBuffer });
    return result.value || '';
  }

  async function importPdf(file) {
    if (!window.pdfjsLib) throw new Error('PDF aktarim kutuphanesi yuklenemedi.');
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
    const data = new Uint8Array(await file.arrayBuffer());
    const pdf = await window.pdfjsLib.getDocument({ data }).promise;
    const pages = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items.map((item) => item.str).join(' ').replace(/\s+/g, ' ').trim();
      if (text) pages.push(text);
    }

    return textToHtml(pages.join('\n\n'));
  }

  async function importFileContent(file) {
    const name = file.name || 'icerik';
    const ext = name.split('.').pop().toLowerCase();
    setImportStatus(`${name} okunuyor...`, 'info');

    if (ext === 'docx') return importDocx(file);
    if (ext === 'pdf') return importPdf(file);

    const text = await file.text();
    if (ext === 'md' || ext === 'markdown') return markdownToHtml(text);
    if (ext === 'html' || ext === 'htm') return sanitizeHtml(text);
    return textToHtml(text);
  }

  function applyImportedHtml(html, sourceName) {
    const clean = sanitizeHtml(html);
    if (!stripHtml(clean)) {
      setImportStatus('Dosyadan aktarilacak metin bulunamadi.', 'error');
      return;
    }

    const hasContent = Boolean(stripHtml(visualEditor.innerHTML));
    const shouldAppend = hasContent && window.confirm('Mevcut icerigin sonuna eklensin mi? Iptal derseniz editor icerigi degisir.');
    setEditorHtml(shouldAppend ? `${visualEditor.innerHTML}\n${clean}` : clean);

    if (!titleInput.value.trim() && sourceName) {
      titleInput.value = sourceName.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
      if (!slugInput.value.trim()) slugInput.value = slugify(titleInput.value);
    }

    handleEditorChange();
    setImportStatus(`${sourceName || 'Dosya'} aktarildi.`, 'success');
  }

  function handleEditorChange() {
    syncEditorToTextarea();
    updatePreview();
    updateStats();
    setDirty(true);
    saveAutosave();
  }

  async function boot() {
    if (!backend || !backend.isConfigured()) {
      setGate('Supabase baglantisi henuz yok. assets/js/supabase-config.js dosyasini doldurduktan sonra bu panel acilir.');
      return;
    }

    try {
      const session = await backend.getSession();
      if (!session) {
        setGate('Admin paneli icin once uyelik sayfasindan giris yapin.');
        return;
      }

      const admin = await backend.isAdmin();
      if (!admin) {
        setGate('Bu hesap admin rolune sahip degil. Ilk kurulumda Supabase SQL Editor ile profilinizi admin yapin.');
        return;
      }

      gate.hidden = true;
      workspace.hidden = false;
      await loadArticles();
    } catch (error) {
      setGate(error.message);
    }
  }

  titleInput.addEventListener('input', () => {
    if (!state.slugLocked || !slugInput.value.trim()) {
      slugInput.value = slugify(titleInput.value);
    }
    setDirty(true);
  });

  slugInput.addEventListener('input', () => {
    state.slugLocked = Boolean(slugInput.value.trim());
    setDirty(true);
  });

  form.elements.summary.addEventListener('input', () => setDirty(true));
  form.elements.status.addEventListener('change', () => setDirty(true));
  form.elements.published_at.addEventListener('input', () => setDirty(true));

  visualEditor.addEventListener('input', handleEditorChange);
  visualEditor.addEventListener('paste', (event) => {
    event.preventDefault();
    const html = event.clipboardData.getData('text/html');
    const text = event.clipboardData.getData('text/plain');
    insertHtml(html ? sanitizeHtml(html) : textToHtml(text));
  });

  document.querySelectorAll('[data-command]').forEach((button) => {
    button.addEventListener('click', () => {
      const command = button.dataset.command;
      const value = button.dataset.value || null;
      visualEditor.focus();
      document.execCommand(command, false, value);
      handleEditorChange();
    });
  });

  document.querySelectorAll('[data-insert]').forEach((button) => {
    button.addEventListener('click', () => handleInsert(button.dataset.insert));
  });

  articleSearch.addEventListener('input', filterArticles);
  statusFilter.addEventListener('change', filterArticles);

  clearButton.addEventListener('click', () => {
    if (state.dirty && !window.confirm('Kaydedilmemis degisiklikler silinsin mi?')) return;
    fillForm(null);
    clearAutosave();
    setStatus('Yeni makale hazir.', 'info');
  });

  saveDraftButton.addEventListener('click', () => {
    saveArticle('draft').catch((error) => setStatus(error.message, 'error'));
  });

  publishButton.addEventListener('click', () => {
    saveArticle('published').catch((error) => setStatus(error.message, 'error'));
  });

  cleanHtml.addEventListener('click', () => {
    setEditorHtml(sanitizeHtml(visualEditor.innerHTML));
    handleEditorChange();
    setImportStatus('Icerik temizlendi.', 'success');
  });

  pasteAsMarkdown.addEventListener('click', async () => {
    const text = window.prompt('Markdown metnini yapistirin');
    if (!text) return;
    applyImportedHtml(markdownToHtml(text), 'Markdown');
  });

  importFile.addEventListener('change', async () => {
    const file = importFile.files && importFile.files[0];
    if (!file) return;

    try {
      const html = await importFileContent(file);
      applyImportedHtml(html, file.name);
    } catch (error) {
      setImportStatus(error.message || 'Dosya aktarilamadi.', 'error');
    } finally {
      importFile.value = '';
    }
  });

  deleteButton.addEventListener('click', async () => {
    if (!state.activeId) return;
    if (!window.confirm('Bu makale kalici olarak silinsin mi?')) return;

    try {
      setStatus('Makale siliniyor...', 'info');
      await backend.deleteArticle(state.activeId);
      state.activeId = '';
      fillForm(null);
      await loadArticles('');
      setStatus('Makale silindi.', 'success');
    } catch (error) {
      setStatus(error.message, 'error');
    }
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    saveArticle().catch((error) => setStatus(error.message, 'error'));
  });

  window.addEventListener('beforeunload', (event) => {
    if (!state.dirty) return;
    event.preventDefault();
    event.returnValue = '';
  });

  document.addEventListener('DOMContentLoaded', boot);
})();

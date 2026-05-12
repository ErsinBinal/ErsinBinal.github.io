(function() {
  'use strict';

  const backend = window.ConviviumBackend;
  const gate = document.getElementById('adminGate');
  const workspace = document.getElementById('adminWorkspace');
  const status = document.getElementById('adminStatus');
  const list = document.getElementById('articleList');
  const form = document.getElementById('articleForm');
  const clearButton = document.getElementById('clearForm');
  const deleteButton = document.getElementById('deleteArticle');
  const slugInput = document.getElementById('slug');
  const titleInput = document.getElementById('title');
  const contentInput = document.getElementById('content_html');
  const preview = document.getElementById('articlePreview');
  let activeId = '';
  let articles = [];

  function setStatus(message, type) {
    status.textContent = message || '';
    status.dataset.type = type || 'info';
  }

  function setGate(message) {
    gate.textContent = message;
    gate.hidden = false;
    workspace.hidden = true;
  }

  function formData() {
    const data = new FormData(form);
    return Object.fromEntries(data.entries());
  }

  function fillForm(article) {
    activeId = article ? article.id : '';
    form.elements.id.value = activeId;
    form.elements.title.value = article ? article.title : '';
    form.elements.slug.value = article ? article.slug : '';
    form.elements.summary.value = article ? article.summary : '';
    form.elements.status.value = article ? article.status : 'draft';
    form.elements.published_at.value = article && article.published_at ? article.published_at.slice(0, 16) : '';
    form.elements.content_html.value = article ? article.content_html : '';
    deleteButton.disabled = !activeId;
    updatePreview();
  }

  function updatePreview() {
    preview.innerHTML = contentInput.value.trim() || '<p>Onizleme burada gorunur.</p>';
  }

  function renderList() {
    list.innerHTML = '';
    if (!articles.length) {
      const empty = document.createElement('li');
      empty.textContent = 'Henuz veritabaninda makale yok.';
      list.appendChild(empty);
      return;
    }

    articles.forEach((article) => {
      const item = document.createElement('li');
      const button = document.createElement('button');
      const title = document.createElement('strong');
      const details = document.createElement('span');
      const meta = article.status === 'published' ? 'yayinda' : article.status;
      button.type = 'button';
      button.className = 'content-list-button';
      title.textContent = article.title;
      details.textContent = `${meta} / ${article.slug}`;
      button.append(title, details);
      button.addEventListener('click', () => fillForm(article));
      item.appendChild(button);
      list.appendChild(item);
    });
  }

  async function loadArticles() {
    setStatus('Icerikler yukleniyor...', 'info');
    articles = await backend.fetchManagedArticles();
    renderList();
    setStatus('Icerik listesi guncel.', 'success');
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
    if (!slugInput.value.trim()) {
      slugInput.value = backend.slugify(titleInput.value);
    }
  });

  contentInput.addEventListener('input', updatePreview);

  clearButton.addEventListener('click', () => {
    fillForm(null);
    setStatus('Form temizlendi.', 'info');
  });

  deleteButton.addEventListener('click', async () => {
    if (!activeId) return;
    const approved = window.confirm('Bu makale silinsin mi?');
    if (!approved) return;

    try {
      setStatus('Makale siliniyor...', 'info');
      await backend.deleteArticle(activeId);
      fillForm(null);
      await loadArticles();
    } catch (error) {
      setStatus(error.message, 'error');
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = formData();

    try {
      setStatus('Makale kaydediliyor...', 'info');
      await backend.saveArticle({
        id: data.id,
        title: data.title,
        slug: data.slug,
        summary: data.summary,
        status: data.status,
        published_at: data.published_at ? new Date(data.published_at).toISOString() : '',
        content_html: data.content_html
      });
      fillForm(null);
      await loadArticles();
      setStatus('Makale kaydedildi.', 'success');
    } catch (error) {
      setStatus(error.message, 'error');
    }
  });

  document.addEventListener('DOMContentLoaded', boot);
})();

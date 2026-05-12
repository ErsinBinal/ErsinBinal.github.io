(function() {
  'use strict';

  const categoryLabels = {
    finance: 'Finance',
    academic: 'Research',
    software: 'Software'
  };

  function formatDate(value) {
    if (!value) return '';
    try {
      return new Intl.DateTimeFormat('tr-TR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date(value));
    } catch (error) {
      return String(value).slice(0, 10);
    }
  }

  function createNewsCard(item, compact) {
    const article = document.createElement('article');
    article.className = compact ? 'ai-news-card ai-news-card-compact' : 'ai-news-card';

    const category = document.createElement('span');
    category.className = 'ai-news-category';
    category.textContent = categoryLabels[item.category] || item.category;

    const title = document.createElement('h3');
    const link = document.createElement('a');
    link.href = `makaleler.html#ai-news-${item.id}`;
    link.textContent = item.title;
    title.appendChild(link);

    const summary = document.createElement('p');
    summary.textContent = item.summary;

    const meta = document.createElement('div');
    meta.className = 'ai-news-meta';
    meta.textContent = `${item.primary_source_name} / ${formatDate(item.source_published_at || item.collected_at)}`;

    article.append(category, title, summary, meta);
    return article;
  }

  function renderFullItem(item) {
    const article = document.createElement('article');
    article.className = 'ai-news-article';
    article.id = `ai-news-${item.id}`;

    const category = document.createElement('span');
    category.className = 'ai-news-category';
    category.textContent = categoryLabels[item.category] || item.category;

    const title = document.createElement('h3');
    title.textContent = item.title;

    const summary = document.createElement('p');
    summary.className = 'summary';
    summary.textContent = item.summary;

    const body = document.createElement('div');
    body.className = 'full active';
    body.innerHTML = item.body_html;

    const source = document.createElement('a');
    source.className = 'btn';
    source.href = item.primary_source_url;
    source.target = '_blank';
    source.rel = 'noopener noreferrer';
    source.textContent = `Kaynak: ${item.primary_source_name}`;

    const meta = document.createElement('div');
    meta.className = 'ai-news-meta';
    meta.textContent = `Toplandi: ${formatDate(item.collected_at)}${item.source_published_at ? ` / Yayin: ${formatDate(item.source_published_at)}` : ''}`;

    article.append(category, title, summary, body, source, meta);
    return article;
  }

  async function loadNews() {
    const targets = [...document.querySelectorAll('[data-ai-news-target]')];
    if (!targets.length) return;

    targets.forEach((target) => {
      target.textContent = 'AI gundem sinyali bekleniyor...';
    });

    if (!window.ConviviumBackend || !window.ConviviumBackend.isConfigured()) {
      targets.forEach((target) => {
        target.textContent = 'AI gundem icin Supabase baglantisi bekleniyor.';
      });
      return;
    }

    try {
      const items = await window.ConviviumBackend.fetchAiNewsItems(Number(targets[0]?.dataset.limit || 5));
      targets.forEach((target) => {
        const mode = target.dataset.aiNewsTarget;
        target.innerHTML = '';
        if (!items.length) {
          target.textContent = 'Henuz dogrulanmis AI gundem kaydi yok.';
          return;
        }

        if (mode === 'full') {
          items.forEach((item) => target.appendChild(renderFullItem(item)));
          if (window.location.hash) {
            window.setTimeout(() => {
              document.querySelector(window.location.hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 80);
          }
          return;
        }

        items.slice(0, Number(target.dataset.limit || 4)).forEach((item) => {
          target.appendChild(createNewsCard(item, true));
        });
      });
    } catch (error) {
      targets.forEach((target) => {
        target.textContent = 'AI gundem simdilik okunamadi.';
      });
      console.warn('[Convivium] AI news load failed:', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadNews);
  } else {
    loadNews();
  }
})();

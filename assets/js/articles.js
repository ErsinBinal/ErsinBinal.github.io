(function() {
  'use strict';

  const fallbackArticles = [
    {
      id: 'stat-1',
      slug: 'abonelik-modelinin-yukselisi',
      title: 'Abonelik Modelinin Yukselisi',
      date: '2025-03-02',
      summary: 'Dijital icerik platformlarinin buyumesiyle abonelik modelleri isletmelerin oncelikli stratejisi oldu.',
      content: `
        <figure class="article-image">
          <img class="responsive" src="/assets/icons/og-image.png" alt="Convivium terminal arayuzu" width="1200" height="630" loading="lazy" decoding="async">
          <figcaption>Surekli gelir modelleri, urun kadar ritim tasarimi da ister.</figcaption>
        </figure>
        <h2>Abonelik Ekonomisinin Evrimi</h2>
        <p>Son yillarda dijital icerik platformlarinin buyumesiyle abonelik modeli isletmelerin oncelikli stratejisi haline geldi. Netflix, Spotify ve benzeri sirketler, kullanicilara surekli icerik sunarak gelir modelini donusturdu.</p>
        <h3>Neden Abonelik?</h3>
        <p>Abonelik modelleri sirketlere tahmin edilebilir gelir akisi saglar. Musteri yasam boyu degeri artarken, kazanim maliyetleri daha kontrollu yonetilir. Bu model ozellikle SaaS sirketleri icin guclu bir standarttir.</p>
        <blockquote>Abonelik modeli, musteri iliskisini bir kerelik satistan surekli deger yaratma surecine tasir.</blockquote>
        <h3>Basari Faktorleri</h3>
        <ul>
          <li>Surekli deger sunumu ve icerik guncellemeleri</li>
          <li>Musteri sadakati programlari ve kisisellestirme</li>
          <li>Esnek paketler ve net fiyatlandirma</li>
          <li>Dusuk giris engelleri ve deneme sureleri</li>
        </ul>
      `
    },
    {
      id: 'stat-2',
      slug: 'dijital-donusumde-yapay-zeka',
      title: 'Dijital Donusumde Yapay Zeka',
      date: '2025-02-15',
      summary: 'Yapay zeka musteri hizmetleri, veri analizi ve otomasyonda buyuk etkiler yaratiyor.',
      content: `
        <h2>YZ'nin Is Dunyasindaki Yeri</h2>
        <p>Yapay zeka, is dunyasinda karar verme hizini ve operasyonel verimliligi degistiriyor. Musteri hizmetleri, veri analizi ve otomasyon alanlarinda etkisi daha gorunur hale geliyor.</p>
        <h3>Temel Uygulama Alanlari</h3>
        <ol>
          <li><strong>Musteri hizmetleri:</strong> Chatbotlar ve sanal asistanlar 7/24 destek sagliyor.</li>
          <li><strong>Veri analizi:</strong> Buyuk veri setlerinden kullanilabilir icgoruler uretiliyor.</li>
          <li><strong>Otomasyon:</strong> Rutin isler daha tutarli ve izlenebilir hale geliyor.</li>
          <li><strong>Kisisellestirme:</strong> Deneyim bireysel ihtiyaclara gore uyarlaniyor.</li>
        </ol>
        <p>YZ entegrasyonu artik sadece teknoloji karari degil; organizasyonun nasil ogrendigini belirleyen stratejik bir tercih.</p>
      `
    },
    {
      id: 'stat-3',
      slug: 'gelir-modelleri-nasil-evrimlesti',
      title: 'Gelir Modelleri Nasil Evrimlesti?',
      date: '2025-01-28',
      summary: 'Barter ekonomisinden SaaS donemine kadar gelir modellerindeki kirilma noktalari.',
      content: `
        <h2>Tarihin Sayfalarinda Gelir Modelleri</h2>
        <p>Gelir modelleri tarih boyunca teknoloji, guven ve dagitim kanallarinin degisimiyle donustu. Her yeni kanal, degerin nasil paketlenecegine dair yeni bir dil uretti.</p>
        <h3>Evrim Asamalari</h3>
        <p><strong>1. Barter ekonomisi:</strong> Mal ve hizmet takasi<br>
        <strong>2. Para ekonomisi:</strong> Standart degisim araci<br>
        <strong>3. Perakende:</strong> Fiziksel magaza satislari<br>
        <strong>4. E-ticaret:</strong> Online satis platformlari<br>
        <strong>5. Abonelik:</strong> Surekli gelir modelleri<br>
        <strong>6. Platform ekonomisi:</strong> Cok tarafli pazaryerleri</p>
        <p>Her asama, teknolojinin actigi yeni firsatlarla ve musteri davranisindaki yeni beklentilerle sekillendi.</p>
      `
    },
    {
      id: 'stat-4',
      slug: 'gelir-yonetiminin-gizli-dili',
      title: 'Fiyatin Otesinde: Gelir Yonetiminin Gizli Dili',
      date: '2025-03-05',
      summary: 'Veri temelli fiyatlandirma ve cift tarafli gelir modellerinin avantajlari.',
      content: `
        <h2>Modern Fiyatlandirma Stratejileri</h2>
        <p>Veri temelli fiyatlandirma hem uyelik ucretlerini hem de veri istihbarati gelirlerini kapsayabilir. Cift tarafli gelir modelleri sirketlere daha dayanikli bir gelir mimarisi kurma sansi verir.</p>
        <h3>Veri Temelli Yaklasim</h3>
        <p>Sirketler musteri davranislarini analiz ederek dinamik fiyatlandirma yapabiliyor. Boylece talep dalgalanmalarina daha hizli tepki veriliyor ve teklif daha iyi baglama oturuyor.</p>
        <ul>
          <li>Talep dalgalanmalarina hizli tepki</li>
          <li>Kisisellestirilmis fiyat teklifleri</li>
          <li>Gelir maksimizasyonu</li>
          <li>Musteri segmentasyonu optimizasyonu</li>
        </ul>
        <blockquote>Fiyat sadece bir sayi degil, musteri algisinin ve deger onerisinin bir yansimasidir.</blockquote>
      `
    }
  ];

  const state = {
    all: [],
    filtered: [],
    activeSlug: '',
    topic: 'all',
    query: ''
  };

  const topicRules = [
    { key: 'gelir', label: 'Gelir', pattern: /gelir|fiyat|abonelik|pricing|saas|model/i },
    { key: 'yapay-zeka', label: 'Yapay Zeka', pattern: /yapay zeka|ai|yz|otomasyon|veri analizi/i },
    { key: 'platform', label: 'Platform', pattern: /platform|pazaryeri|ekosistem|e-ticaret/i },
    { key: 'donusum', label: 'Donusum', pattern: /donusum|strateji|operasyon|musteri/i }
  ];

  const allowedTags = new Set([
    'A', 'ABBR', 'B', 'BLOCKQUOTE', 'BR', 'CODE', 'DIV', 'EM', 'FIGCAPTION',
    'FIGURE', 'H2', 'H3', 'H4', 'HR', 'I', 'IFRAME', 'IMG', 'LI', 'OL',
    'P', 'PICTURE', 'PRE', 'SOURCE', 'SPAN', 'STRONG', 'TABLE', 'TBODY',
    'TD', 'TH', 'THEAD', 'TR', 'UL', 'VIDEO'
  ]);

  const allowedAttrs = new Set([
    'allow', 'allowfullscreen', 'alt', 'class', 'controls', 'decoding',
    'height', 'href', 'loading', 'poster', 'referrerpolicy', 'rel',
    'sandbox', 'src', 'srcset', 'target', 'title', 'type', 'width'
  ]);

  function qs(selector) {
    return document.querySelector(selector);
  }

  function stripHtml(value) {
    const box = document.createElement('div');
    box.innerHTML = String(value || '');
    return box.textContent.replace(/\s+/g, ' ').trim();
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  function isSafeUrl(value, mediaOnly) {
    const raw = String(value || '').trim();
    if (!raw) return false;
    if (raw.startsWith('/') || raw.startsWith('#')) return true;
    if (raw.startsWith('data:image/')) return mediaOnly !== false;
    try {
      const url = new URL(raw, window.location.origin);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
      if (mediaOnly && url.origin !== window.location.origin) {
        return /(^|\.)youtube\.com$|(^|\.)youtube-nocookie\.com$|(^|\.)vimeo\.com$|(^|\.)supabase\.co$|images\.unsplash\.com$|cdn\.jsdelivr\.net$/i.test(url.hostname);
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  function sanitizeHtml(html) {
    const template = document.createElement('template');
    template.innerHTML = String(html || '');

    [...template.content.querySelectorAll('*')].forEach((node) => {
      if (!allowedTags.has(node.tagName)) {
        node.replaceWith(...node.childNodes);
        return;
      }

      [...node.attributes].forEach((attr) => {
        const name = attr.name.toLowerCase();
        if (name.startsWith('on') || !allowedAttrs.has(name)) {
          node.removeAttribute(attr.name);
          return;
        }

        if ((name === 'href' || name === 'src' || name === 'poster') && !isSafeUrl(attr.value, name !== 'href')) {
          node.removeAttribute(attr.name);
        }
      });

      if (node.tagName === 'A') {
        node.setAttribute('rel', 'noopener noreferrer');
      }

      if (node.tagName === 'IMG') {
        node.setAttribute('loading', 'lazy');
        node.setAttribute('decoding', 'async');
        if (!node.classList.contains('responsive')) node.classList.add('responsive');
      }

      if (node.tagName === 'IFRAME') {
        const src = node.getAttribute('src') || '';
        const ok = /youtube\.com\/embed|youtube-nocookie\.com\/embed|player\.vimeo\.com\/video/i.test(src);
        if (!ok) {
          node.remove();
          return;
        }
        node.setAttribute('loading', 'lazy');
        node.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
        node.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
      }
    });

    return template.innerHTML;
  }

  function slugify(value) {
    if (window.ConviviumBackend?.slugify) return window.ConviviumBackend.slugify(value);
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 96);
  }

  function readTime(html) {
    const words = stripHtml(html).split(/\s+/).filter(Boolean).length;
    return `~${Math.max(1, Math.ceil(words / 200))} dk`;
  }

  function normalize(article, index) {
    const content = article.content || article.content_html || '';
    const title = article.title || `Makale ${index + 1}`;
    const slug = article.slug || slugify(title) || `makale-${index + 1}`;
    const topic = inferTopic({ ...article, content });
    return {
      id: article.id || slug,
      slug,
      title,
      date: article.date || String(article.published_at || article.created_at || '').slice(0, 10) || '',
      summary: article.summary || stripHtml(content).slice(0, 180),
      content,
      topic,
      readTime: readTime(content)
    };
  }

  function inferTopic(article) {
    const haystack = `${article.title || ''} ${article.summary || ''} ${stripHtml(article.content || article.content_html || '')}`;
    const rule = topicRules.find((item) => item.pattern.test(haystack));
    return rule ? rule.key : 'notlar';
  }

  function topicLabel(key) {
    if (key === 'all') return 'Tum Kayitlar';
    const rule = topicRules.find((item) => item.key === key);
    return rule ? rule.label : 'Notlar';
  }

  function loadLocalArticles() {
    try {
      const parsed = JSON.parse(localStorage.getItem('articles') || '[]');
      if (!Array.isArray(parsed)) return [];
      return parsed.map((item, index) => ({
        id: `local-${index}`,
        slug: item.slug || `local-${index}`,
        title: item.title,
        date: item.date,
        summary: item.summary || stripHtml(item.content || '').slice(0, 180),
        content: item.content
      }));
    } catch (error) {
      console.warn('[Convivium] Local article parse failed:', error);
      return [];
    }
  }

  function mergeArticles(...groups) {
    const seen = new Set();
    const merged = [];
    groups.flat().forEach((article, index) => {
      const normalized = normalize(article, index);
      if (!normalized.slug || seen.has(normalized.slug)) return;
      seen.add(normalized.slug);
      merged.push(normalized);
    });
    return merged.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }

  function latestDate(articles) {
    return articles
      .map((article) => article.date)
      .filter(Boolean)
      .sort((a, b) => String(b).localeCompare(String(a)))[0] || '';
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function setStatus(message) {
    setText('contentSourceStatus', message);
  }

  function withTimeout(promise, ms, message) {
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = window.setTimeout(() => reject(new Error(message)), ms);
    });
    return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timer));
  }

  function mediaFromContent(content) {
    const box = document.createElement('div');
    box.innerHTML = sanitizeHtml(content);
    const img = box.querySelector('img[src]');
    const iframe = box.querySelector('iframe[src]');
    const video = box.querySelector('video[src], video source[src]');
    return {
      image: img ? { src: img.getAttribute('src'), alt: img.getAttribute('alt') || '' } : null,
      video: iframe ? { src: iframe.getAttribute('src'), type: 'iframe' } :
        (video ? { src: video.getAttribute('src'), type: 'video' } : null)
    };
  }

  function generateToc(html) {
    const box = document.createElement('div');
    box.innerHTML = html;
    const headings = [...box.querySelectorAll('h2, h3')];
    if (headings.length < 2) return box.innerHTML;

    const links = headings.map((heading, index) => {
      const id = heading.id || `section-${index + 1}`;
      heading.id = id;
      return `<li class="${heading.tagName === 'H3' ? 'toc-child' : ''}"><a href="#${id}">${escapeHtml(heading.textContent)}</a></li>`;
    }).join('');

    return `<nav class="toc" aria-label="Makale icindekiler"><h4 class="toc-title">Icindekiler</h4><ul>${links}</ul></nav>${box.innerHTML}`;
  }

  function removeCoverMedia(html, media) {
    if (!media?.image?.src) return html;
    const box = document.createElement('div');
    box.innerHTML = html;
    const image = [...box.querySelectorAll('img[src]')]
      .find((img) => img.getAttribute('src') === media.image.src);
    if (image) {
      const wrapper = image.closest('figure, .article-image, picture') || image;
      wrapper.remove();
    }
    return box.innerHTML;
  }

  function renderFilters() {
    const mount = qs('#topicFilters');
    if (!mount) return;
    const topics = ['all', ...new Set(state.all.map((article) => article.topic))];
    mount.innerHTML = '';
    topics.forEach((topic) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'filter-chip';
      button.textContent = topicLabel(topic);
      button.setAttribute('aria-pressed', String(state.topic === topic));
      button.addEventListener('click', () => {
        state.topic = topic;
        applyFilters();
      });
      mount.appendChild(button);
    });
  }

  function applyFilters() {
    const query = state.query.trim().toLowerCase();
    state.filtered = state.all.filter((article) => {
      const topicOk = state.topic === 'all' || article.topic === state.topic;
      const queryOk = !query || `${article.title} ${article.summary} ${stripHtml(article.content)}`.toLowerCase().includes(query);
      return topicOk && queryOk;
    });

    renderFilters();
    renderList();

    if (!state.filtered.some((article) => article.slug === state.activeSlug)) {
      renderReader(state.filtered[0] || null, { updateHash: false });
    }
  }

  function renderList() {
    const container = qs('#articles');
    const template = qs('#article-card-template');
    if (!container || !template) return;

    setText('visibleCount', state.filtered.length);
    container.innerHTML = '';

    if (!state.filtered.length) {
      const empty = document.createElement('p');
      empty.className = 'article-empty-state';
      empty.textContent = 'Aramanizla eslesen makale yok.';
      container.appendChild(empty);
      return;
    }

    state.filtered.forEach((article, index) => {
      const node = template.content.cloneNode(true);
      const button = node.querySelector('.article-row');
      button.dataset.slug = article.slug;
      button.classList.toggle('is-active', article.slug === state.activeSlug);
      node.querySelector('.article-row-index').textContent = String(index + 1).padStart(2, '0');
      node.querySelector('.article-row-title').textContent = article.title;
      node.querySelector('.article-row-summary').textContent = article.summary;
      node.querySelector('.article-row-meta').textContent = `${article.date || 'Tarihsiz'} / ${article.readTime} / ${topicLabel(article.topic)}`;
      button.addEventListener('click', () => renderReader(article));
      container.appendChild(node);
    });
  }

  function renderReader(article, options = {}) {
    const reader = qs('#reader');
    if (!reader) return;

    if (!article) {
      state.activeSlug = '';
      reader.innerHTML = `
        <div class="reader-empty">
          <span class="reader-empty-mark">_</span>
          <p>Bu filtrede okunacak makale bulunamadi.</p>
        </div>`;
      renderList();
      return;
    }

    state.activeSlug = article.slug;
    const media = mediaFromContent(article.content);
    const safeContent = generateToc(removeCoverMedia(sanitizeHtml(article.content), media));
    const currentIndex = state.filtered.findIndex((item) => item.slug === article.slug);
    const previous = state.filtered[currentIndex - 1];
    const next = state.filtered[currentIndex + 1];
    const related = state.all
      .filter((item) => item.slug !== article.slug && item.topic === article.topic)
      .slice(0, 3);

    const mediaHtml = media.image
      ? `<figure class="reader-media"><img class="responsive" src="${escapeHtml(media.image.src)}" alt="${escapeHtml(media.image.alt || article.title)}" loading="lazy" decoding="async"></figure>`
      : '';

    reader.innerHTML = `
      <header class="reader-head">
        <div class="reader-meta">
          <span>${escapeHtml(article.date || 'Tarihsiz')}</span>
          <span>${escapeHtml(article.readTime)} okuma</span>
          <span class="reader-topic">${escapeHtml(topicLabel(article.topic))}</span>
        </div>
        <h2 class="reader-title">${escapeHtml(article.title)}</h2>
        <p class="reader-summary">${escapeHtml(article.summary)}</p>
        <div class="reader-actions">
          <button class="btn" type="button" data-reader-jump="prev" ${previous ? '' : 'disabled'}>Onceki</button>
          <button class="btn btn-primary" type="button" data-reader-jump="next" ${next ? '' : 'disabled'}>Sonraki</button>
          <button class="btn" type="button" data-reader-copy>Link</button>
        </div>
      </header>
      ${mediaHtml}
      <div class="reader-content">${safeContent}${renderRelated(related)}</div>
    `;

    reader.querySelector('[data-reader-jump="prev"]')?.addEventListener('click', () => renderReader(previous));
    reader.querySelector('[data-reader-jump="next"]')?.addEventListener('click', () => renderReader(next));
    reader.querySelector('[data-reader-copy]')?.addEventListener('click', async (event) => {
      const url = `${window.location.origin}${window.location.pathname}#${article.slug}`;
      try {
        await navigator.clipboard.writeText(url);
        event.currentTarget.textContent = 'Kopyalandi';
        window.setTimeout(() => {
          event.currentTarget.textContent = 'Link';
        }, 1200);
      } catch (error) {
        window.prompt('Makale linki', url);
      }
    });
    reader.querySelectorAll('[data-related-slug]').forEach((button) => {
      button.addEventListener('click', () => {
        const target = state.all.find((item) => item.slug === button.dataset.relatedSlug);
        if (target) renderReader(target);
      });
    });

    if (options.updateHash !== false) {
      history.replaceState(null, '', `#${article.slug}`);
    }

    if (window.toggleProgress) window.toggleProgress(reader);
    renderList();
    reader.focus({ preventScroll: true });
  }

  function renderRelated(related) {
    if (!related.length) return '';
    const links = related
      .map((item) => `<button type="button" data-related-slug="${escapeHtml(item.slug)}">${escapeHtml(item.title)}</button>`)
      .join('');
    return `<section class="related-strip"><h3>Devam rotalari</h3><div class="related-links">${links}</div></section>`;
  }

  async function bootReader() {
    if (!document.body.classList.contains('articles-page')) return;

    const backend = window.ConviviumBackend;
    const localArticles = loadLocalArticles();
    let remoteArticles = [];

    if (backend?.isConfigured?.()) {
      setText('articleSource', 'Hazirlaniyor');
      setStatus('Yayin arsivi guncelleniyor...');
      try {
        remoteArticles = await withTimeout(
          backend.fetchPublishedArticles(),
          3500,
          'Veritabani yaniti zaman asimina ugradi.'
        );
        setText('articleSource', remoteArticles.length ? 'Canli arsiv' : 'Yerel arsiv');
        setStatus(remoteArticles.length
          ? `${remoteArticles.length} yayin okuma odasina alindi.`
          : 'Henuz yayinlanmis yeni makale yok; secili arsiv gosteriliyor.');
      } catch (error) {
        console.warn('[Convivium] Remote article load failed:', error);
        setText('articleSource', 'Yerel arsiv');
        setStatus('Canli arsive ulasilamadi; kayitli arsiv gosteriliyor.');
      }
    } else {
      setText('articleSource', 'Yerel arsiv');
      setStatus('Kayitli arsiv gosteriliyor.');
    }

    state.all = mergeArticles(remoteArticles, fallbackArticles, localArticles);
    state.filtered = [...state.all];
    const lastDate = latestDate(state.all);
    setText('articleCount', `${state.all.length}${lastDate ? ` / ${lastDate}` : ''}`);

    const search = qs('#search');
    search?.addEventListener('input', (event) => {
      state.query = event.target.value;
      applyFilters();
    });

    renderFilters();
    renderList();

    const hashSlug = decodeURIComponent(window.location.hash.replace(/^#/, ''));
    const initial = state.all.find((article) => article.slug === hashSlug) || state.all[0];
    renderReader(initial, { updateHash: Boolean(hashSlug) });
  }

  function markdownToHtml(markdown) {
    const lines = String(markdown || '').replace(/\r\n/g, '\n').split('\n');
    const html = [];
    let listType = '';
    let paragraph = [];

    function flushParagraph() {
      if (!paragraph.length) return;
      html.push(`<p>${inlineMarkdown(paragraph.join(' '))}</p>`);
      paragraph = [];
    }

    function closeList() {
      if (!listType) return;
      html.push(`</${listType}>`);
      listType = '';
    }

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        flushParagraph();
        closeList();
        return;
      }

      const heading = trimmed.match(/^(#{1,4})\s+(.+)$/);
      if (heading) {
        flushParagraph();
        closeList();
        const level = Math.min(4, Math.max(2, heading[1].length + 1));
        html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
        return;
      }

      const unordered = trimmed.match(/^[-*]\s+(.+)$/);
      const ordered = trimmed.match(/^\d+\.\s+(.+)$/);
      if (unordered || ordered) {
        flushParagraph();
        const nextType = unordered ? 'ul' : 'ol';
        if (listType && listType !== nextType) closeList();
        if (!listType) {
          listType = nextType;
          html.push(`<${listType}>`);
        }
        html.push(`<li>${inlineMarkdown((unordered || ordered)[1])}</li>`);
        return;
      }

      if (trimmed.startsWith('> ')) {
        flushParagraph();
        closeList();
        html.push(`<blockquote>${inlineMarkdown(trimmed.slice(2))}</blockquote>`);
        return;
      }

      paragraph.push(trimmed);
    });

    flushParagraph();
    closeList();
    return sanitizeHtml(html.join('\n'));
  }

  function inlineMarkdown(value) {
    return escapeHtml(value)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2">$1</a>');
  }

  window.ConviviumArticleTools = {
    escapeHtml,
    markdownToHtml,
    sanitizeHtml,
    slugify,
    stripHtml
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootReader);
  } else {
    bootReader();
  }
})();

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
  const bugyStatus = document.getElementById('bugyStatus');
  const bugySummon = document.getElementById('bugySummon');
  const bugyNextAction = document.getElementById('bugyNextAction');
  const bugyEngineSelect = document.getElementById('bugyEngineSelect');
  const bugyRandomToggle = document.getElementById('bugyRandomToggle');
  const bugySkinSelect = document.getElementById('bugySkinSelect');
  const arcadeStatus = document.getElementById('arcadeKitStatus');
  const arcadePaletteSelect = document.getElementById('arcadePaletteSelect');
  const arcadeCharacterSelect = document.getElementById('arcadeCharacterSelect');
  const arcadeDebugToggle = document.getElementById('arcadeDebugToggle');
  const arcadeDemoMount = document.getElementById('arcadeDemoMount');
  let activeId = '';
  let articles = [];
  let arcadeStage = null;
  let arcadeScene = null;
  let arcadeTemplate = null;
  let arcadeSprite = null;
  let arcadeCharacter = null;
  let arcadeSpriteIndex = 0;
  const bugyEngineKey = 'convivium.bugy.engine';

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

  function renderBugyStatus() {
    if (!bugyStatus) return;
    const engine = getBugyEngine();
    if (!engine) {
      bugyStatus.textContent = 'Bugy motoru yuklenmedi.';
      bugyStatus.dataset.type = 'error';
      return;
    }

    const state = engine.getState();
    bugyStatus.textContent = `Motor: ${state.engine || getSelectedBugyEngine().toUpperCase()} / Durum: ${state.state} / skin: ${state.skin} / random: ${state.randomEnabled ? 'acik' : 'kapali'} / x:${state.x} y:${state.y}`;
    bugyStatus.dataset.type = 'success';
    if (bugyEngineSelect) bugyEngineSelect.value = getSelectedBugyEngine();
    if (bugyRandomToggle) bugyRandomToggle.checked = state.randomEnabled;
    if (bugySkinSelect) bugySkinSelect.value = state.skin;
  }

  function setBugyMessage(message, type) {
    if (!bugyStatus) return;
    bugyStatus.textContent = message;
    bugyStatus.dataset.type = type || 'info';
  }

  function runBugyAction(action) {
    const engine = getBugyEngine();
    if (!engine) {
      renderBugyStatus();
      return;
    }

    engine.summon();
    window.setTimeout(() => {
      const ok = engine.trigger(action);
      setBugyMessage(ok ? `Aksiyon baslatildi: ${action}` : `Aksiyon baslatilamadi: ${action}`, ok ? 'success' : 'error');
      window.setTimeout(renderBugyStatus, 900);
    }, 120);
  }

  function getSelectedBugyEngine() {
    return localStorage.getItem(bugyEngineKey) === 'v2' ? 'v2' : 'v1';
  }

  function getBugyEngine() {
    return getSelectedBugyEngine() === 'v2' ? window.BugyV2 : window.Bugy;
  }

  function setBugyEngine(version) {
    const next = version === 'v2' ? 'v2' : 'v1';
    localStorage.setItem(bugyEngineKey, next);
    document.body.classList.toggle('bugy-v1-muted', next === 'v2');
    if (next === 'v2') {
      window.BugyV2?.activate?.();
    } else {
      window.BugyV2?.deactivate?.();
      window.Bugy?.summon?.();
    }
    renderBugyStatus();
    return next;
  }

  function bootBugyControls() {
    const waitForBugy = window.setInterval(() => {
      if (!window.Bugy || (getSelectedBugyEngine() === 'v2' && !window.BugyV2)) return;
      window.clearInterval(waitForBugy);
      setBugyEngine(getSelectedBugyEngine());
      renderBugyStatus();
    }, 120);

    window.setTimeout(() => {
      window.clearInterval(waitForBugy);
      renderBugyStatus();
    }, 4000);

    document.querySelectorAll('[data-bugy-action]').forEach((button) => {
      button.addEventListener('click', () => {
        if (!window.Bugy) {
          renderBugyStatus();
          return;
        }
        runBugyAction(button.dataset.bugyAction);
      });
    });

    bugySummon?.addEventListener('click', () => {
      const engine = getBugyEngine();
      if (!engine) {
        renderBugyStatus();
        return;
      }
      engine.summon();
      renderBugyStatus();
    });

    bugyNextAction?.addEventListener('click', () => {
      const engine = getBugyEngine();
      if (!engine) {
        renderBugyStatus();
        return;
      }
      engine.next();
      setBugyMessage('Siradaki aksiyon baslatildi.', 'success');
      window.setTimeout(renderBugyStatus, 900);
    });

    bugyEngineSelect?.addEventListener('change', () => {
      const next = setBugyEngine(bugyEngineSelect.value);
      setBugyMessage(`Bugy motoru secildi: ${next.toUpperCase()}`, 'success');
      window.setTimeout(renderBugyStatus, 700);
    });

    bugyRandomToggle?.addEventListener('change', () => {
      const engine = getBugyEngine();
      if (!engine) {
        renderBugyStatus();
        return;
      }
      engine.setRandom(bugyRandomToggle.checked);
      renderBugyStatus();
    });

    bugySkinSelect?.addEventListener('change', () => {
      const engine = getBugyEngine();
      if (!engine) {
        renderBugyStatus();
        return;
      }
      const skin = engine.setSkin(bugySkinSelect.value);
      setBugyMessage(`Skin secildi: ${skin}`, 'success');
      window.setTimeout(renderBugyStatus, 700);
    });

    window.addEventListener('bugy:state', renderBugyStatus);
    window.addEventListener('bugy-v2:state', renderBugyStatus);
    window.setInterval(renderBugyStatus, 1200);
  }

  function setArcadeStatus(message, type) {
    if (!arcadeStatus) return;
    arcadeStatus.textContent = message;
    arcadeStatus.dataset.type = type || 'info';
  }

  function stopArcadeTemplate() {
    arcadeTemplate?.destroy?.();
    arcadeTemplate = null;
  }

  function spawnArcadeSprite(form) {
    if (!arcadeScene) return;
    if (arcadeSprite) arcadeScene.remove(arcadeSprite);
    arcadeSprite = arcadeScene.sprite({
      form,
      x: 130,
      y: 72,
      w: form === 'ship' ? 34 : 30,
      h: form === 'orb' ? 30 : 34,
      hitbox: { x: 4, y: 4, w: form === 'ship' ? 24 : 22, h: form === 'orb' ? 22 : 26 },
      label: `arcade ${form}`
    });
  }

  function spawnArcadeCharacter(model) {
    if (!arcadeScene) return;
    if (arcadeCharacter) arcadeScene.remove(arcadeCharacter);
    arcadeCharacter = arcadeScene.actor({
      model,
      pose: 'idle',
      x: 210,
      y: 108,
      scale: model === 'boss' ? 1 : 1.08,
      tags: ['actor'],
      label: `arcade character ${model}`
    });
  }

  function bootArcadeStage(kit) {
    stopArcadeTemplate();
    arcadeStage?.destroy?.();
    arcadeStage = kit.createStage({
      mount: arcadeDemoMount,
      palette: arcadePaletteSelect?.value || 'neon',
      minHeight: 190
    });
    arcadeScene = kit.createScene({
      stage: arcadeStage,
      fps: 30,
      debug: Boolean(arcadeDebugToggle?.checked)
    });
    spawnArcadeSprite('hero');
    spawnArcadeCharacter(arcadeCharacterSelect?.value || 'mascot');
    arcadeScene.onCollision('sprite', 'actor', () => {
      kit.fx.flash(arcadeStage, { color: 'rgba(245,255,107,0.18)', duration: 80 });
    });
    arcadeScene.step();
    kit.fx.popup(arcadeStage, 'READY', { x: 18, y: 18 });
    kit.fx.burst(arcadeStage, { x: 150, y: 92, count: 12 });
  }

  function bootArcadeKitControls() {
    if (!arcadeDemoMount) return;
    const waitForArcade = window.setInterval(() => {
      if (!window.ConviviumArcadeKit) return;
      window.clearInterval(waitForArcade);
      const kit = window.ConviviumArcadeKit;
      bootArcadeStage(kit);
      setArcadeStatus(`Arcade Kit ${kit.version} aktif.`, 'success');
    }, 120);

    window.setTimeout(() => {
      window.clearInterval(waitForArcade);
      if (!window.ConviviumArcadeKit) setArcadeStatus('Arcade Kit yuklenmedi.', 'error');
    }, 4000);

    arcadePaletteSelect?.addEventListener('change', () => {
      if (!arcadeStage) return;
      arcadeStage.setPalette(arcadePaletteSelect.value);
      setArcadeStatus(`Palet secildi: ${arcadePaletteSelect.value}`, 'success');
    });

    arcadeCharacterSelect?.addEventListener('change', () => {
      stopArcadeTemplate();
      spawnArcadeCharacter(arcadeCharacterSelect.value);
      arcadeScene?.step();
      setArcadeStatus(`Karakter modeli: ${arcadeCharacterSelect.value}`, 'success');
    });

    arcadeDebugToggle?.addEventListener('change', () => {
      arcadeScene?.setDebug(arcadeDebugToggle.checked);
      setArcadeStatus(`Hitbox debug: ${arcadeDebugToggle.checked ? 'acik' : 'kapali'}`, 'success');
    });

    document.querySelectorAll('[data-arcade-demo]').forEach((button) => {
      button.addEventListener('click', () => {
        if (!window.ConviviumArcadeKit || !arcadeStage) {
          setArcadeStatus('Arcade Kit henuz hazir degil.', 'error');
          return;
        }

        const kit = window.ConviviumArcadeKit;
        const action = button.dataset.arcadeDemo;
        if (action === 'burst') kit.fx.burst(arcadeStage, { x: 150, y: 92, count: 22 });
        else if (action === 'flash') kit.fx.flash(arcadeStage, { color: 'rgba(245,255,107,0.42)' });
        else if (action === 'shake') kit.fx.shake(arcadeStage);
        else if (action === 'popup') kit.fx.popup(arcadeStage, 'INSERT COIN', { x: 76, y: 34 });
        else if (action === 'timeline' || action === 'tornado' || action === 'portal') {
          stopArcadeTemplate();
          arcadeTemplate = kit.templates.petAction({
            stage: arcadeStage,
            model: arcadeCharacterSelect?.value || 'mascot'
          });
          arcadeCharacter = null;
          arcadeSprite = null;
          const timelineAction = action === 'timeline' ? 'storm' : action;
          arcadeTemplate.runAction(timelineAction);
          setArcadeStatus(`Timeline aksiyonu: ${timelineAction}`, 'success');
        }
        else if (action === 'shooter') {
          stopArcadeTemplate();
          arcadeScene?.stop();
          arcadeStage?.clear();
          arcadeTemplate = kit.templates.miniShooter({
            stage: arcadeStage,
            debug: Boolean(arcadeDebugToggle?.checked)
          });
          arcadeScene = arcadeTemplate.scene;
          arcadeSprite = arcadeTemplate.player;
          arcadeCharacter = null;
          setArcadeStatus('Mini shooter template calisiyor.', 'success');
        }
        else if (action === 'canvas') {
          stopArcadeTemplate();
          arcadeScene?.stop();
          arcadeStage?.clear();
          const renderer = kit.renderers.canvas2d({
            stage: arcadeStage,
            width: 320,
            height: 180
          });
          renderer
            .clear('#050505')
            .rect(38, 42, 48, 48, '#00eaff')
            .outline(38, 42, 48, 48, '#f5ff6b')
            .rect(124, 66, 72, 22, '#ff2ea6')
            .rect(218, 36, 34, 84, '#00ff66')
            .text('CANVAS2D READY', 82, 142, { color: '#c9ffd6', font: '12px monospace' });
          arcadeTemplate = { destroy: () => renderer.destroy() };
          setArcadeStatus('Canvas2D renderer hazir.', 'success');
        }
        else if (action === 'storage') {
          const store = kit.storage.create('admin-lab');
          const nextScore = store.best('highScore', Math.floor(1000 + Math.random() * 9000));
          kit.fx.popup(arcadeStage, `HI ${nextScore}`, { x: 96, y: 26 });
          setArcadeStatus(`Storage high score: ${nextScore}`, 'success');
        }
        else if (action === 'sprite') {
          stopArcadeTemplate();
          const forms = ['hero', 'ship', 'orb'];
          arcadeSpriteIndex += 1;
          spawnArcadeSprite(forms[arcadeSpriteIndex % forms.length]);
          arcadeScene?.step();
        }
      });
    });

    document.querySelectorAll('[data-character-pose]').forEach((button) => {
      button.addEventListener('click', () => {
        if (!arcadeCharacter) {
          setArcadeStatus('Karakter modeli henuz hazir degil.', 'error');
          return;
        }
        arcadeCharacter.pose(button.dataset.characterPose);
        setArcadeStatus(`Pose: ${button.dataset.characterPose}`, 'success');
      });
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

  document.addEventListener('DOMContentLoaded', () => {
    bootArcadeKitControls();
    bootBugyControls();
    boot();
  });
})();

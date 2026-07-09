(function() {
  'use strict';

  const fallbackArticles = [
    {
      id: 'guide-terminal',
      slug: 'convivium-terminal-rehberi-terminal-guide',
      title: 'Convivium Terminal Rehberi / Terminal Guide',
      date: '2026-07-09',
      summary: 'Terminalden ulasilan oyunlar, uygulamalar ve rehber komutlari icin iki dilli baslangic haritasi.',
      content: `
        <figure class="article-image">
          <img class="responsive" src="/assets/img/guides/terminal-guide.svg" alt="Convivium terminal rehberi" width="1200" height="630" loading="lazy" decoding="async">
          <figcaption>Terminal, Convivium icinde menuden daha hizli bir rota katmani gibi calisir.</figcaption>
        </figure>
        <h2>Turkce: Terminali nasil okumali?</h2>
        <p>Convivium ana sayfasindaki komut satiri yalnizca arama kutusu degildir. Oyunlari acar, uygulamalara gecis verir, gizli terminal oyuncaklarini baslatir ve okuma odasindaki rehberleri dogrudan cagirir. Kisa komutlar, sayfanin genel haritasini ezberlemeden ilerlemek icindir.</p>
        <p>Baslamak icin <code>help</code> tum komutlari listeler, <code>guide</code> terminal icinde kisa rehber verir, <code>how to play</code> oyunlar icin hizli oynanis ozetini acar. Uzun okuma icin <code>read guide</code> veya <code>read game guide</code> kullanilir. Daha dogrudan gitmek istersen <code>run logic</code>, <code>open oracle</code>, <code>dart</code>, <code>barista</code> gibi rota komutlari sayfayi degistirir.</p>
        <div class="guide-grid">
          <section class="guide-card">
            <h3>Okuma ve kesif</h3>
            <p><code>open dossier</code>, <code>notes</code>, <code>archive</code>, <code>map</code></p>
          </section>
          <section class="guide-card">
            <h3>Oyunlar</h3>
            <p><code>run logic</code>, <code>run signal</code>, <code>run ash</code>, <code>run serpent</code>, <code>pipe</code>, <code>outrun</code></p>
          </section>
          <section class="guide-card">
            <h3>Uygulamalar</h3>
            <p><code>open oracle</code>, <code>bartender</code>, <code>barista</code>, <code>realists bar</code>, <code>ekol</code>, <code>paradox</code></p>
          </section>
        </div>
        <h2>English: How to use the terminal</h2>
        <p>The Convivium command line is a navigation layer. It opens games, tools, guide articles, hidden mini-games and public reading rooms without exposing any local developer shell. Everything stays inside the public site surface.</p>
        <p>Use <code>help</code> for the full command list, <code>guide</code> for a short terminal note, and <code>how to play</code> for a quick game summary. Use <code>read guide</code> or <code>read game guide</code> when you want the full article view. Route commands such as <code>run logic</code>, <code>open oracle</code>, <code>dart</code> and <code>barista</code> jump directly into the matching experience.</p>
        <table class="command-table">
          <thead><tr><th>Command</th><th>Opens</th><th>Use when</th></tr></thead>
          <tbody>
            <tr><td><code>game guide</code></td><td>Games guide</td><td>You want controls, goals and scoring tips.</td></tr>
            <tr><td><code>app guide</code></td><td>Tools guide</td><td>You want Oracle, Barista, Bartender or Ekol Aynasi explained.</td></tr>
            <tr><td><code>terminal games</code></td><td>Hidden terminal games</td><td>You want Pipe-90i or Out Run 86 inside the shell.</td></tr>
            <tr><td><code>score guide</code></td><td>Score and session guide</td><td>You want to understand accounts, dashboard and scoreboards.</td></tr>
          </tbody>
        </table>
        <blockquote>Short version: type <code>guide</code> to stay in the terminal, then <code>read guide</code> when you want the full reading room.</blockquote>
      `
    },
    {
      id: 'guide-games',
      slug: 'oyunlar-how-to-play-games-guide',
      title: 'Oyunlar: How to Play / Games Guide',
      date: '2026-07-09',
      summary: 'Convivium oyunlarinin amaci, kontrolleri, terminal komutlari ve ilk deneme taktigi.',
      content: `
        <figure class="article-image">
          <img class="responsive" src="/assets/img/guides/games-guide.svg" alt="Convivium oyun rehberi gorseli" width="1200" height="630" loading="lazy" decoding="async">
          <figcaption>Oyun rehberi; mantik, aksiyon, yilan ritmi ve terminal operasyonlarini ayni haritada toplar.</figcaption>
        </figure>
        <h2>Turkce: Oyun rotalari</h2>
        <p>Convivium oyunlari kisa oturumlar icin tasarlandi: once mekanigi anla, sonra ritmi hizlandir, sonra skorunu kaydet. Terminalden <code>how to play</code>, <code>game guide</code> veya dogrudan oyun adini yazarak baslayabilirsin.</p>
        <table class="command-table">
          <thead><tr><th>Oyun</th><th>Komut</th><th>Amaç</th><th>Kontrol</th></tr></thead>
          <tbody>
            <tr><td>Cyberpunk Logic</td><td><code>run logic</code></td><td>Kisa mantik sorularinda dogru secimi bul.</td><td>Seceneklere tikla; hiz ve dogruluk puani belirler.</td></tr>
            <tr><td>Uc Gunes Sinyali</td><td><code>run signal</code></td><td>Terminal temali sureli operasyonu yonet.</td><td>Ekrandaki komut ve secenekleri takip et.</td></tr>
            <tr><td>Kul Hatti</td><td><code>run ash</code></td><td>Yandan akan aksiyonda hayatta kal, hurda topla, dusmanlari temizle.</td><td>WASD/Ok hareket, J saldiri, K/E kaldir-firlat, L sarj.</td></tr>
            <tr><td>Kul Hatti II</td><td><code>ash2</code> veya <code>run ash</code> sonrasinda rota</td><td>Yaya aksiyon ve gemi duellosunu ayni kosuda yonet.</td><td>WASD/Ok hareket, J ates/yumruk, K bomba/etkilesim, Bosluk dash.</td></tr>
            <tr><td>Neon River</td><td><code>run flow</code></td><td>Neon akintida yakit, ritim ve kacis hattini dengede tut.</td><td>Klavye veya dokunmatik kontrol; yakit ve engelleri izle.</td></tr>
            <tr><td>Neon Serpent</td><td><code>run serpent</code></td><td>Yilan ritmini buyut, carpismadan skor al.</td><td>Ok/WASD yon degistirme; acele donuslerden kacin.</td></tr>
            <tr><td>Universe-2</td><td><code>universe</code></td><td>Kurgu/deneyim hattinda sahne sahne ilerle.</td><td>Sayfa icindeki secimleri ve gecisleri takip et.</td></tr>
          </tbody>
        </table>
        <h3>Ilk deneme plani</h3>
        <ol>
          <li><code>game guide</code> ile hangi oyunu sececegine karar ver.</li>
          <li>Refleks oyunu istiyorsan <code>run ash</code> veya <code>run serpent</code> yaz.</li>
          <li>Dusunme oyunu istiyorsan <code>run logic</code> veya <code>run signal</code> yaz.</li>
          <li>Skor kaydi gerekiyorsa oyun sonunda dashboard veya skor paneli yonlendirmesini kullan.</li>
        </ol>
        <h2>English: Game routes</h2>
        <p>Convivium games are built for short, readable sessions. Learn the core rule first, then chase a cleaner run. From the terminal, use <code>how to play</code>, <code>game guide</code>, or a direct route command.</p>
        <ul>
          <li><strong>Cyberpunk Logic:</strong> a compact logic quiz. Pick the best answer, protect your score, finish clean.</li>
          <li><strong>Three Body Signal:</strong> a terminal-style timed operation. Read the prompts before acting.</li>
          <li><strong>Ash Runner:</strong> retro brawler movement, throws and charged attacks. Keep space before chasing score.</li>
          <li><strong>Neon River:</strong> arcade survival on a neon current. Fuel and positioning matter more than panic movement.</li>
          <li><strong>Neon Serpent:</strong> snake-like rhythm play. Plan turns one beat early.</li>
          <li><strong>Universe-2:</strong> an atmospheric fiction route; move through scenes rather than chasing a timer.</li>
        </ul>
        <blockquote>Best first command: <code>run logic</code> if you want a quick puzzle, <code>run ash</code> if you want movement, <code>run serpent</code> if you want pure arcade focus.</blockquote>
      `
    },
    {
      id: 'guide-apps',
      slug: 'uygulamalar-apps-guide',
      title: 'Uygulamalar: Apps Guide / Kullanım Rehberi',
      date: '2026-07-09',
      summary: 'Oracle, Barista, Bartender, Realists Bar, Paradox Terminal ve Ekol Aynasi icin iki dilli kullanim notlari.',
      content: `
        <figure class="article-image">
          <img class="responsive" src="/assets/img/guides/apps-guide.svg" alt="Convivium uygulama rehberi gorseli" width="1200" height="630" loading="lazy" decoding="async">
          <figcaption>Oracle, kahve, kokteyl ve dusunce aynasi ayni ritual arac ailesinde durur.</figcaption>
        </figure>
        <h2>Turkce: Uygulamalar ne ise yarar?</h2>
        <p>Bu bolumdeki uygulamalar klasik fayda araci ile rituel arayuz arasinda durur. Kimi karar dilini sadeleştirir, kimi icecek secimini ruh haline baglar, kimi dusunce tarzini aynalar. Terminalden isimlerini yazarak acabilirsin.</p>
        <table class="command-table">
          <thead><tr><th>Uygulama</th><th>Komut</th><th>Kullanim</th></tr></thead>
          <tbody>
            <tr><td>The Oracle</td><td><code>open oracle</code></td><td>Konu sec, kisa sorulara cevap ver, cikan yorumu karar notu gibi oku.</td></tr>
            <tr><td>Cyber Barista</td><td><code>barista</code></td><td>Ruh hali ve ihtiyaca gore kahve onerisi al.</td></tr>
            <tr><td>Bartender</td><td><code>bartender</code></td><td>Kokteyl veya rituel icecek fikri sec.</td></tr>
            <tr><td>The Realists Bar</td><td><code>realists bar</code></td><td>Daha pragmatik, filtrelenebilir icecek onerileri gor.</td></tr>
            <tr><td>Paradox Terminal</td><td><code>paradox</code></td><td>Kisa paradokslar arasinda gezin, dusunce egzersizi yap.</td></tr>
            <tr><td>Ekol Aynasi</td><td><code>ekol</code></td><td>Senaryolara verdigin cevaplardan dusunce ekolu yakinligini oku.</td></tr>
            <tr><td>Bugy Studio</td><td><code>bugy studio</code></td><td>Bugy katmani ve gorsel oyuncaklarla deney yap.</td></tr>
          </tbody>
        </table>
        <h3>Daha iyi sonuc icin</h3>
        <p>Oracle ve Ekol Aynasi gibi araclarda uzun cevap aramak yerine net bir karar baglami dusun. Barista ve Bartender tarafinda ise secimi bir tariften cok bir ruh hali protokolu gibi kullan.</p>
        <h2>English: What the apps are for</h2>
        <p>The apps are small ritual tools. Some help you frame a decision, some recommend a drink, and some turn reflection into a structured interaction. Use direct terminal commands when you already know where you want to go.</p>
        <ul>
          <li><strong>Oracle:</strong> choose a theme, answer the prompts, read the output as a decision mirror.</li>
          <li><strong>Barista and Bartender:</strong> use them when you want a mood-based coffee or drink ritual.</li>
          <li><strong>The Realists Bar:</strong> use filters when you want a sharper, more practical drink shortlist.</li>
          <li><strong>Paradox Terminal:</strong> read one paradox at a time; it works best as a short thinking break.</li>
          <li><strong>Ekol Aynasi:</strong> answer scenario questions and compare the ranked schools as a map, not as a fixed label.</li>
        </ul>
        <blockquote>Command shortcut: <code>app guide</code> gives the terminal summary; <code>read app guide</code> returns here; <code>open oracle</code> is the best first app route.</blockquote>
      `
    },
    {
      id: 'guide-terminal-games',
      slug: 'terminal-oyunlari-pipe-outrun-guide',
      title: 'Terminal Oyunlari: Pipe-90i ve Out Run 86 / Shell Games',
      date: '2026-07-09',
      summary: 'Ana terminalin icinde calisan gizli mini oyunlar icin komut, amac ve hizli taktik rehberi.',
      content: `
        <figure class="article-image">
          <img class="responsive" src="/assets/img/guides/terminal-games-guide.svg" alt="Pipe ve Out Run terminal oyunlari gorseli" width="1200" height="630" loading="lazy" decoding="async">
          <figcaption>Terminal oyunlari yeni sayfa acmadan komut ciktisini oyun alanina cevirir.</figcaption>
        </figure>
        <h2>Turkce: Terminal icindeki oyunlar</h2>
        <p>Bazi oyunlar yeni sayfa acmaz; terminal cikti alanini oyun ekranina cevirir. Bu oyunlar public kabuk icinde kalir, yerel dosya sistemine veya gelistirici araclarina erisim vermez.</p>
        <div class="guide-grid">
          <section class="guide-card">
            <h3>Pipe-90i</h3>
            <p><code>pipe</code> veya <code>pipe new</code> ile baslar. Amaç, sogutma hattini reaktor cekirdegine ulasacak sekilde boru parcasi yerlestirmektir.</p>
            <p><code>pipe rotate</code>, <code>pipe place</code>, <code>pipe flow</code>, <code>pipe quit</code> komutlarini kullan.</p>
          </section>
          <section class="guide-card">
            <h3>Out Run 86</h3>
            <p><code>outrun</code> ile baslar. Terminalde sahte-3B yol ritmini takip eder, seridi korur ve hizini kontrol edersin.</p>
            <p><code>outrun help</code> oyun aktifken kontrol ozetini verir; <code>outrun quit</code> cikar.</p>
          </section>
        </div>
        <h3>Oynama taktigi</h3>
        <p>Pipe-90i'de once cikis ve hedef yonunu oku; parcayi rastgele yerlestirme. Out Run 86'da metin ekranini skor tablosu gibi degil, ritim cizgisi gibi oku: hiz iyi ama gec tepki pahali.</p>
        <h2>English: Games inside the shell</h2>
        <p>Some games do not open a new page. They take over the command output area and run inside the public terminal UI. They are playful shell simulations, not access to a real developer environment.</p>
        <ul>
          <li><strong>Pipe-90i:</strong> start with <code>pipe</code>. Rotate and place pipe pieces, then trigger flow when the route looks complete.</li>
          <li><strong>Out Run 86:</strong> start with <code>outrun</code>. Read the ASCII road, manage speed and react early.</li>
        </ul>
        <blockquote>Best discovery commands: <code>terminal games</code>, <code>pipe help</code>, <code>outrun help</code>. Full read: <code>read terminal games</code>.</blockquote>
      `
    },
    {
      id: 'guide-score',
      slug: 'skor-oturum-dashboard-guide',
      title: 'Skor, Oturum ve Dashboard / Score and Session Guide',
      date: '2026-07-09',
      summary: 'Dart Skorbord, oyun skor kaydi, hesap girisi ve dashboard akisinin iki dilli ozeti.',
      content: `
        <figure class="article-image">
          <img class="responsive" src="/assets/img/guides/score-guide.svg" alt="Skor ve dashboard rehberi gorseli" width="1200" height="630" loading="lazy" decoding="async">
          <figcaption>Skor katmani oyun, dart ve dashboard izlerini ayni oturum hafizasinda okur.</figcaption>
        </figure>
        <h2>Turkce: Skorlar nerede yasar?</h2>
        <p>Convivium'da skor ve oturum katmani iki amaca hizmet eder: oyunlardan kalan ilerlemeyi gorunur yapmak ve Dart Skorbord gibi araclarda mac akisini duzenlemek. Giris yapmadan da gezebilirsin; ancak bazi kayit ve cihazlar arasi tasima davranislari hesap gerektirebilir.</p>
        <table class="command-table">
          <thead><tr><th>Bolum</th><th>Komut</th><th>Not</th></tr></thead>
          <tbody>
            <tr><td>Dart Skorbord</td><td><code>dart</code></td><td>501, ATC ve Cricket modlari; manuel giris, butonlar, CPU ve oda akisi.</td></tr>
            <tr><td>Dashboard</td><td><code>dashboard</code></td><td>Kayitli skorlar, oturum izleri ve kullanici yuzeyi.</td></tr>
            <tr><td>Giris</td><td><code>access</code></td><td>Hesap gerektiren kayitlar icin auth ekranini acar.</td></tr>
            <tr><td>Komut gecmisi</td><td><code>history</code></td><td>Terminalde son komutlarini listeler; site hesabi degildir.</td></tr>
          </tbody>
        </table>
        <h3>Dart Skorbord hizli kullanim</h3>
        <ol>
          <li>Modu sec: 501, Around the Clock veya Cricket.</li>
          <li>Oyuncu/karsilasma ayarlarini yap; istersen CPU sec.</li>
          <li>Ok skorunu sayisal alandan veya segment butonlarindan gir.</li>
          <li>Yanlis giriste <strong>Geri Al</strong> ile son hamleyi duzelt.</li>
        </ol>
        <h2>English: Scores and sessions</h2>
        <p>The score layer keeps runs, matches and session traces visible. You can browse without signing in, while some persistence and cross-device behavior may require an account.</p>
        <ul>
          <li><code>dart</code> opens the scoreboard with 501, Around the Clock and Cricket modes.</li>
          <li><code>dashboard</code> opens the place where saved activity and scores can be reviewed.</li>
          <li><code>access</code> opens authentication when a feature needs an account.</li>
          <li><code>history</code> is only terminal command history; it is separate from your account data.</li>
        </ul>
        <blockquote>Use <code>score guide</code> for the terminal summary and <code>read score guide</code> when you need this map again.</blockquote>
      `
    },
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
    { key: 'rehber', label: 'Rehber', pattern: /rehber|guide|how to play|kullanim|kilavuz|terminal|score|dashboard|oturum/i },
    { key: 'oyun', label: 'Oyun', pattern: /oyun|game|play|arcade|runner|serpent|river|pipe|outrun|logic|signal/i },
    { key: 'uygulama', label: 'Uygulama', pattern: /uygulama|app|oracle|barista|bartender|paradox|ekol|tool/i },
    { key: 'gelir', label: 'Gelir', pattern: /gelir|fiyat|abonelik|pricing|saas|model/i },
    { key: 'yapay-zeka', label: 'Yapay Zeka', pattern: /yapay zeka|ai|yz|otomasyon|veri analizi/i },
    { key: 'platform', label: 'Platform', pattern: /platform|pazaryeri|ekosistem|e-ticaret/i },
    { key: 'donusum', label: 'Donusum', pattern: /donusum|strateji|operasyon|musteri/i }
  ];

  const allowedTags = new Set([
    'A', 'ABBR', 'B', 'BLOCKQUOTE', 'BR', 'CODE', 'DIV', 'EM', 'FIGCAPTION',
    'FIGURE', 'H2', 'H3', 'H4', 'HR', 'I', 'IFRAME', 'IMG', 'LI', 'OL',
    'P', 'PICTURE', 'PRE', 'SECTION', 'SOURCE', 'SPAN', 'STRONG', 'TABLE', 'TBODY',
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
      // Kullanici-kaynakli okuma sinyali (Bugy gibi dinleyiciler besleyebilir).
      window.dispatchEvent(new CustomEvent('convivium:activity', { detail: { kind: 'read', id: article.id } }));
    }

    updateArticleSeo(article);
    if (window.toggleProgress) window.toggleProgress(reader);
    renderList();
    reader.focus({ preventScroll: true });
  }

  // SEO (PO-9): acilan makale icin sayfa basligi + JSON-LD Article schema.
  // JSON, </script> kacisiyla (<) yazilir; icerik enjeksiyonuna kapali.
  function updateArticleSeo(article) {
    document.title = `${article.title} | Convivium Makaleler`;
    const url = `https://ersinbinal.github.io/pages/makaleler.html#${encodeURIComponent(article.slug)}`;
    const data = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: String(article.title || '').slice(0, 110),
      description: String(article.summary || '').slice(0, 200),
      datePublished: article.date || undefined,
      inLanguage: 'tr',
      url,
      mainEntityOfPage: url,
      author: { '@type': 'Person', name: 'Ersin Binal', url: 'https://ersinbinal.github.io/' },
      publisher: { '@type': 'Person', name: 'Ersin Binal' }
    };
    let node = document.getElementById('article-jsonld');
    if (!node) {
      node = document.createElement('script');
      node.type = 'application/ld+json';
      node.id = 'article-jsonld';
      document.head.appendChild(node);
    }
    node.textContent = JSON.stringify(data).replace(/</g, '\\u003c');
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
    // Gizlilik-dostu sayac: kimliksiz gorunum (oturumda 1; tablo yoksa no-op).
    backend?.recordSiteEvent?.('articles.view', '/pages/makaleler.html');
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

(() => {
  'use strict';

  // SITE KULLANIM KILAVUZU
  //
  // Okuma odasina (makaleler) ayri bir "Kullanim Kilavuzu" klasoru olarak
  // duser. articles.js bu diziyi fallback arsivle birlikte birlestirir;
  // dosya yuklenmezse okuma odasi eskisi gibi calisir (fail-soft).
  //
  // Gorseller GERCEK terminalden uretilir: npm run build:guide-shots
  // Komut degisirse gorsel de degisir; elle cizilmis ekran yok.

  const shot = (name, alt, caption) => `
        <figure class="article-image">
          <img class="responsive" src="/assets/img/guides/kilavuz/${name}.webp"
               alt="${alt}" width="1280" height="900" loading="lazy" decoding="async">
          <figcaption>${caption}</figcaption>
        </figure>`;

  const articles = [
    // ------------------------------------------------------------------
    {
      id: 'kilavuz-baslangic',
      slug: 'kullanim-kilavuzu-baslangic',
      title: 'Kullanim Kilavuzu 1 — Terminale baslangic',
      date: '2026-08-29',
      summary: 'Terminal nasil acilir, ilk dakikada hangi bes komut yeter ve oneri motoru nasil dusunur.',
      content: `
        <p>Convivium'un ana yuzeyi bir menu degil, bir <strong>komut satiri</strong>. Bu kilavuz onu
        sifirdan anlatir. Hicbir sey ezberlemen gerekmiyor; ilk bes komut yeterli.</p>

        <h2>Terminali acmak</h2>
        <p>Ana sayfadaki yesil <code>TERMINALI AC</code> dugmesi. Alternatifler: sag alttaki
        <code>CMD</code> dugmesi, ya da klavyeden <code>?</code> veya <code>Ctrl+K</code>.</p>
        <p><strong>Sik dusulen tuzak:</strong> acilinca once bir acilis dizisi akar. Komutlar
        <code>OK: terminal ready</code> satiri gorunene kadar islenmez. Kapatmak icin
        <code>Esc</code> ya da <code>exit</code>.</p>

        <h2>Kayboldugunda: bu bes komut yeter</h2>
        <table class="command-table">
          <thead><tr><th>Komut</th><th>Ne yapar</th></tr></thead>
          <tbody>
            <tr><td><code>help</code></td><td>Kisa pusula: niyet gruplari, nerede oldugun, siradaki hedef</td></tr>
            <tr><td><code>help all</code></td><td>Butun komutlarin tam listesi, canli kayittan uretilir</td></tr>
            <tr><td><code>man &lt;komut&gt;</code></td><td>Tek bir komutun kilavuzu</td></tr>
            <tr><td><code>look</code></td><td>Bulundugun odayi tasvir eder</td></tr>
            <tr><td><code>journal</code></td><td>Gorev kutugu: ilerleme ve siradaki hedef</td></tr>
          </tbody>
        </table>
        <p><code>find &lt;kelime&gt;</code> komut ve rota arasinda arar.</p>
        ${shot('terminal-help', 'Terminalde help komutunun ciktisi', '<code>help</code> alti niyet grubunu, bulundugun odayi ve siradaki hedefi tek ekranda verir.')}

        <h2>Terminal nasil dusunur</h2>
        <p>Bunu bilmek yuzlerce komutu ezberlemekten daha cok ise yarar.</p>
        <h3>Kanonik komut ve alias</h3>
        <p>Her komutun bir asil adi, bazen de duzinelerce takma adi var. <code>harita</code>
        yazarsan calisir, ama oneride sana <code>map</code> gosterilir — kanonik olan odur.
        Boylece zamanla asil adlari ogrenirsin.</p>
        <h3>Oneriler</h3>
        <p>Yazarken en fazla uc oneri cikar ve su kurallara uyar:</p>
        <ul>
          <li>Yazarken yazdigin sey <strong>kendiliginden degismez</strong>.</li>
          <li><code>Tab</code> aktif oneriyi satira alir.</li>
          <li>Fare veya dokunmatik secim yalnizca doldurur; calistirmaz.</li>
          <li>Ok tuslariyla <strong>acikca</strong> sectigin oneri <code>Enter</code> ile calisir.</li>
          <li>Yazim hatasinda ilk <code>Enter</code> yalnizca duzeltir, ikinci <code>Enter</code> calistirir.</li>
        </ul>
        <p>Bu kurallar kazayla yanlis komut calistirmani engellemek icin var.</p>

        <h2>Sonraki adim</h2>
        <p>Kilavuzun ikinci bolumu sitenin kendi gecmisini kazmayi ve arsivde aramayi anlatir.
        Terminalde <code>open dossier</code> yazip <em>Kullanim Kilavuzu</em> klasorune bakabilirsin.</p>
      `
    },

    // ------------------------------------------------------------------
    {
      id: 'kilavuz-kazi',
      slug: 'kullanim-kilavuzu-kazi-ve-arsiv',
      title: 'Kullanim Kilavuzu 2 — Kazi ve arsiv',
      date: '2026-08-29',
      summary: 'kaz, tabaka, damar, taban ve ara: sitenin kendi gecmisini kazmak ve arsivi cevrimdisi taramak.',
      content: `
        <p>Convivium eskiden uydurma kalintilar tasiyordu. Artik gercek bir katman var:
        deponun kendi gecmisi. Bu bolum onu kazan komutlari anlatir.</p>

        <h2><code>kaz</code> — bir tabaka cikar</h2>
        <p>Sitenin git gecmisinden gercek bir parca cikarir: tarih, commit, dosya ve o gun
        degisen kod. Uydurma degildir; her karotun altinda hangi commit'ten geldigi yazar.</p>
        <table class="command-table">
          <thead><tr><th>Kullanim</th><th>Ne yapar</th></tr></thead>
          <tbody>
            <tr><td><code>kaz</code></td><td>Gunun karotu — herkes ayni gun ayni tabakayi kazar</td></tr>
            <tr><td><code>kaz 42</code></td><td>42. derinlik (1 = en eski)</td></tr>
            <tr><td><code>kaz cdbbc3f</code></td><td>Belirli bir commit</td></tr>
          </tbody>
        </table>
        ${shot('terminal-kaz', 'kaz komutunun ciktisi', 'Kazilan her tabaka kaynagini soyler: <em>bu tabaka uydurulmadi</em>.')}

        <h2><code>tabaka</code> — eralar</h2>
        <p>Deponun gecmisi sekiz eraya ayrilir. Ayrim tarihe gore degil, <strong>neyle
        ugrasildigina</strong> gore yapilir: her commit'in dosyalari sekiz kategoriye dagilir ve
        bu dagilimin degistigi noktalar isaretlenir.</p>
        <p>Eralarin Turkce adlari var — Atolye Katmani, Oyun Katmani, Zemin Katmani gibi.
        Ad, o donemin ortalamadan en cok sapan kategorisinden uretilir.</p>
        ${shot('terminal-tabaka', 'tabaka komutunun ciktisi', 'Eralar zaman ekseninde degil, ugras ekseninde bulunur.')}

        <h2><code>damar</code> — birlikte degisen dosyalar</h2>
        <p>Iki dosya ayni commit'te sik degisiyorsa aralarinda bir damar vardir. Bu komut o
        kumeleri gosterir. Ortaya cikanlar bazen sitenin unuttugu seylerdir: <code>/tools/</code>
        klasorune tasinmadan onceki kok seviye donem, terk edilmis prototipler, silinmis
        denemeler.</p>

        <h2><code>taban</code> — zemin</h2>
        <p>Neredeyse her commit'te degisen dosyalar bir damar degildir; sitenin uzerinde durdugu
        zemindir. <code>taban</code> onlari ayri gosterir — cunku damar listesine karisirlarsa
        her seyi birbirine baglar ve yapiyi gorunmez kilarlar.</p>

        <h2><code>ara</code> — arsivi tara</h2>
        <p>Arsiv aramasi tamamen tarayicinda calisir: sunucu yok, ag istegi yok, ucak modunda
        bile calisir. Ama asil onemli olan bulunan sonuc degil, <strong>neden</strong> bulundugu.
        Her sonucun altinda hangi kelimenin ne kadar katki verdigi yazar.</p>
        ${shot('terminal-ara', 'ara komutunun ciktisi', 'Her sonucun altindaki <code>neden:</code> satiri skorun nereden geldigini soyler.')}
        <p><code>arsiv indeks</code> ile indeksin neyi kapsadigina bakabilirsin.</p>
        <p class="article-note"><strong>Not:</strong> <code>/net</code> bulmacasi arama
        indeksine bilerek dahil edilmemistir. Bir bulmacanin cevabi arama sonucunda cikmamali.</p>
      `
    },

    // ------------------------------------------------------------------
    {
      id: 'kilavuz-mekanizma',
      slug: 'kullanim-kilavuzu-mekanizma',
      title: 'Kullanim Kilavuzu 3 — Mekanizmayi gormek',
      date: '2026-08-29',
      summary: 'neden, step ve iz: kararin gerekcesini gormek, komutu calistirmadan incelemek ve ciktiyi paylasmak.',
      content: `
        <p>Bu sitenin imzasi tek cumle: <strong>hicbir cikti, kendisini nasil urettigini
        gosteremiyorsa yayinlanmaz.</strong> Bu bolumdeki uc komut o cumlenin karsiligi.</p>

        <h2><code>neden</code> — oneri motorunun gerekcesi</h2>
        <p>Terminal sana bir komut onerdiginde, <strong>neden</strong> onerdigini sorabilirsin.
        Cevap suslenmis bir aciklama degil; motorun skoru hangi etkenlerden topladiginin
        dokumudur.</p>
        <pre><code>neden hepl</code></pre>
        ${shot('terminal-neden', 'neden komutunun ciktisi', 'Alttaki katkilarin toplami ustteki skora esittir; esit degilse bu bir hatadir.')}
        <p>Buradaki kural onemli: alt satirlardaki katkilarin toplami, ustteki toplam skora
        <strong>esit olmak zorunda</strong>. Yani gosterilen gerekce, gercekten uygulanan karardir.</p>

        <h2><code>step</code> — komutu calistirmadan incele</h2>
        <p><code>step</code> bir komutu <strong>calistirmaz</strong>; kararin nasil verildigini
        gosterir. Ornegin yazim hatasi duzeltmesinin arkasindaki dinamik programlama matrisini
        cizer ve hangi yolun izlendigini isaretler.</p>
        <pre><code>step cd hepl
step suggest hepl</code></pre>
        <p>Makinenin <em>yapmadigi</em> sey de gorunur: uzunluk farki cok buyukse hic hesaplamaz
        ve bunu <code>BUDANDI</code> diye soyler. Kisayolu gizlemek yerine gostermek daha
        ogretici.</p>
        <p><code>step</code> hicbir sey degistirmez: calistirdiktan sonra sitede tek bir durum
        bile degismemis olur.</p>

        <h2><code>iz</code> — ciktiyi paylas</h2>
        <p>Kazdigin bir tabakayi ya da bir arama sonucunu baskasina gonderebilirsin. Adres
        cubugunda <code>#iz=</code> ile baslayan kisa bir adres olusur.</p>
        ${shot('terminal-iz', 'iz komutunun ciktisi', 'Adres, alti haneli muhur ve gorsel parmak izi.')}
        <p>Bu adresin ilginc yani: <strong>icerik tasimaz.</strong> Yalnizca "hangi tur, hangi
        girdi" bilgisini tasir ve cikti karsi tarafin cihazinda yeniden hesaplanir. Sunucuda
        hicbir sey saklanmaz, link 10-20 karakterdir.</p>
        <p>Her adres bir <strong>muhur</strong> tasir. Link eksik kopyalanmis ya da bozulmussa
        sessizce yanlis bir sey acmak yerine acikca reddedilir.</p>
        <p>Ayrica tarayicinin <strong>geri tusu</strong> artik terminalde de calisir.</p>
      `
    },

    // ------------------------------------------------------------------
    {
      id: 'kilavuz-uyelik',
      slug: 'kullanim-kilavuzu-uyelik',
      title: 'Kullanim Kilavuzu 4 — Uyelikle acilanlar',
      date: '2026-08-29',
      summary: 'Giris yapinca ne degisir: sise mesaji, kolektif ritual, ortak ruya, gezgin karti, kart hediyesi ve kalici sohbet.',
      content: `
        <p>Convivium'da <strong>dusunmeyi gosteren hicbir sey giris istemez.</strong> Kazi,
        arsiv aramasi, gerekce dokumu, sergiler — hepsi girissiz calisir.</p>
        <p>Giris yalnizca iki sey acar: <strong>kaliciligi</strong> (ilerlemen cihazlar arasinda
        tasinsin) ve <strong>sosyal katmani</strong> (baska gezginlerle etkilesim).</p>

        <h2>Sise mesaji</h2>
        <p>Gelecege ya da bilinmeyen bir gezgine mesaj birakma yolu.</p>
        <table class="command-table">
          <thead><tr><th>Komut</th><th>Ne yapar</th></tr></thead>
          <tbody>
            <tr><td><code>bottle throw &lt;mesaj&gt;</code></td><td>Sise atar (24 saatte en fazla 3)</td></tr>
            <tr><td><code>bottle catch</code></td><td>Baskasinin attigi rastgele bir siseyi yakalar</td></tr>
            <tr><td><code>bottle list</code></td><td>Kendi sattigin ve yakaladigin siseler</td></tr>
          </tbody>
        </table>
        <p>Yalnizca kendi gonderdigin ve yakaladigin siseleri okuyabilirsin.</p>

        <h2>Kolektif ritual ve ortak ruya</h2>
        <p><code>card</code> gunun sinyal kartini gosterir, <code>collect</code> onu koleksiyona
        ekler (gunde bir). <code>frekans</code> o gun site genelinde kac kisinin kart topladigini
        soyler — esik asilirsa herkese ortak bir bonus duser.</p>
        <p><code>dream</code> sitenin "dun gece gordugu" ortak ruyayi okur. Ruya, onceki gunun
        kimliksiz toplam sayilarindan deterministik olarak dokulur: kimin ne yaptigi degil,
        yalnizca kac kez oldugu.</p>

        <h2>Gezgin karti ve hediye</h2>
        <table class="command-table">
          <thead><tr><th>Komut</th><th>Ne yapar</th></tr></thead>
          <tbody>
            <tr><td><code>finger on</code></td><td>Kendi kartini gorunur yapar (varsayilan KAPALI)</td></tr>
            <tr><td><code>finger @handle</code></td><td>Baska bir gezginin kamusal karti</td></tr>
            <tr><td><code>gift card:YYYY-MM-DD @handle</code></td><td>Arkadasina kart hediye eder</td></tr>
          </tbody>
        </table>
        <p>Gorunurluk <strong>opt-in</strong>: acmayan kimse listede cikmaz. Kart hediyesi
        yalnizca karsilikli arkadaslar arasinda calisir ve kart gonderenden silinir.</p>

        <h2>Sohbet ve arkadaslik</h2>
        <p><code>chat</code> guverteyi acar: canli ortak akis, kalici ozel mesaj, arkadaslik ve
        gruplar. <code>say &lt;mesaj&gt;</code> acik kanala yazar. <code>who</code> o an sitede
        gezen anonim sinyalleri listeler.</p>
        <p>Ozel mesaj yalnizca engellenmemis arkadaslar arasinda acilir; engelleme arkadasligi
        ve ortak konusmayi birlikte kaldirir.</p>

        <h2>Ilerleme ve rapor</h2>
        <p><code>shards</code> bakiyeni gosterir; giris yapinca bakiye cihazlar arasinda tasinir.
        <code>shop</code> kozmetikleri, <code>cards</code> koleksiyonu, <code>wrapped</code> ise
        kisisel iz raporunu verir.</p>
      `
    },

    // ------------------------------------------------------------------
    {
      id: 'kilavuz-ileri',
      slug: 'kullanim-kilavuzu-ileri',
      title: 'Kullanim Kilavuzu 5 — Odalar, ag bulmacasi ve kabuk',
      date: '2026-08-29',
      summary: 'Sanal odalar, /home dosya sistemi, /net ag kesif bulmacasi ve gercek kabuk ozellikleri.',
      content: `
        <h2>Sanal dunya</h2>
        <p><code>cd</code> ile gezdigin sey sayfa degil, terminalin kendi dunyasi. Kokte
        <code>ls</code> yapinca gorunenler:</p>
        <pre><code>/routes    home · map · archive · notes · open dossier
/lab       run logic · run signal · run ash · pipe · outrun
/notes     quote · note · ritual · manifest · clues
/system    whoami · uptime · version · memory · ps
/vault     muhurlu — acman gerekiyor
/home      SENIN dosyalarin</code></pre>
        <p>Kok listede gorunmeyen odalar da var: <code>/core</code> ve <code>/atlas</code>
        muhurlu, <code>/ruins</code> ve <code>/net</code> ise calisma aninda baglanir.
        <code>cd ruins</code> ve <code>cd net</code> calisir.</p>
        <p>Odalarda su dongu isler: <code>look</code> &rarr; <code>examine &lt;nesne&gt;</code>
        &rarr; <code>take &lt;nesne&gt;</code> &rarr; <code>inventory</code> &rarr;
        <code>use &lt;nesne&gt; on &lt;hedef&gt;</code> &rarr; <code>unlock &lt;esik&gt;</code>.</p>

        <h2><code>/home</code> — gercek bir dosya sistemi</h2>
        <p>En fazla 24 dosya, dosya adi 32 karakter, icerik 4000 karakter. Hepsi tarayicinda
        saklanir.</p>
        <pre><code>touch notlar.txt
echo "bir sey" &gt; notlar.txt
echo "ekleme" &gt;&gt; notlar.txt
cat notlar.txt
rm notlar.txt</code></pre>

        <h2><code>/net</code> — ag kesif bulmacasi</h2>
        <p><code>cd net</code> ile girilir. Cevredeki cihazlari tarar, sifreli olanlari
        ipuclariyla acar, uykudakileri uyandirirsin.</p>
        <table class="command-table">
          <thead><tr><th>Komut</th><th>Ne yapar</th></tr></thead>
          <tbody>
            <tr><td><code>nmap</code></td><td>Cevredeki cihazlari tarar</td></tr>
            <tr><td><code>connect &lt;ip&gt;</code></td><td>Cihaza baglanir</td></tr>
            <tr><td><code>pass &lt;deneme&gt;</code></td><td>Sifre dener</td></tr>
            <tr><td><code>hint</code></td><td>O dugumun ipucu</td></tr>
            <tr><td><code>wake &lt;mac&gt;</code></td><td>Kapali cihazi uyandirir</td></tr>
            <tr><td><code>download &lt;dosya&gt;</code></td><td>Kasadaki odulu indirir</td></tr>
            <tr><td><code>disconnect</code></td><td>Cihazdan cikar</td></tr>
          </tbody>
        </table>
        <p>Bagliyken <code>ls</code>, <code>cd</code> ve <code>cat</code> <strong>cihazin</strong>
        dosyalarini gosterir, senin <code>/home</code>'unu degil.</p>
        <p>Cihazlarin acik olmasi rastgele degil: zaman penceresine gore hesaplanir. Yani her
        tarama farkli gorunur ama adildir; kasa her zaman kapali baslar ve yalniz
        <code>wake</code> ile acilir.</p>

        <h2>Kabuk ozellikleri</h2>
        <p>Bu gercek bir kabuk. <code>shell</code> kilavuzu verir.</p>
        <pre><code>help | grep oyun          boru hatti
fortune | cowsay

echo "not" &gt; dosya.txt    yonlendirme
echo "ek" &gt;&gt; dosya.txt

export AD=deger           degisken
echo $AD
env
unset AD

history                   numarali gecmis
!42                       42 numarali komutu tekrar calistir

alias ll look             kisisel kisayol
unalias ll</code></pre>
        <p>Tanimladigin kisisel alias, sitenin kendi takma adlariyla cakissa bile
        <code>Enter</code>'da <strong>seninki</strong> once calisir.</p>

        <h2>Klavye kisayollari</h2>
        <pre><code>?  veya Ctrl+K   komut kabugunu ac
Esc              kapat
Tab              aktif oneriyi tamamla
↑ / ↓            komut gecmisi (oneri acikken: oneri sec)

Terminal kapaliyken sayfa kisayollari:
D dossier · L logic · T signal · B ash · F flow · M map · N notes · A access</code></pre>

        <h2>Terminal ici oyunlar</h2>
        <p><code>pipe</code> reaktor sogutma, <code>outrun</code> surus oyunu,
        <code>screen saver</code> ortak ekran koruyucu. Bu ucu acikken oneri listesi devre
        disi kalir ki oyun kontrolleriyle karismasin.</p>
      `
    }
  ];

  // articles.js bu global'i okur; yoksa okuma odasi eskisi gibi calisir.
  window.ConviviumGuideArticles = Object.freeze(articles.map(Object.freeze));
})();

/* =========================================================
   0. ORTAK DEĞİŞKENLER, AÇILIŞ EKRANI, YATAY HARİTA
   ========================================================= */
const azHareket = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const perde = document.getElementById("acilisPerdesi");
const acilisKuyrugu = [];
let yukleniyor = false;

// Açılış bitince çalışması gereken işleri sıraya koyar (hero animasyonu, sayaç vb.)
function acilisSonrasi(fn, gecikme = 100) {
    if (yukleniyor) acilisKuyrugu.push([fn, gecikme]);
    else setTimeout(fn, gecikme);
}

function acilisiBitir() {
    yukleniyor = false;
    document.body.classList.remove("yukleniyor");
    perde.classList.add("acik");
    acilisKuyrugu.forEach(([fn, gecikme]) => setTimeout(fn, 500 + gecikme));
    setTimeout(() => perde.remove(), 1400);
}

let acilisGorulduMu = false;
try { acilisGorulduMu = !!sessionStorage.getItem("acilisGosterildi"); } catch (e) {}

if (perde && !azHareket && !acilisGorulduMu) {
    yukleniyor = true;
    document.body.classList.add("yukleniyor");
    try { sessionStorage.setItem("acilisGosterildi", "1"); } catch (e) {}
    const yuzde = document.getElementById("acilisYuzde");
    const sure = 2200, bas = performance.now();
    (function adim(t) {
        const o = Math.min((t - bas) / sure, 1);
        const e = o < 0.5 ? 2 * o * o : 1 - Math.pow(-2 * o + 2, 2) / 2;
        yuzde.textContent = Math.round(e * 100);
        perde.style.setProperty("--yuzde", e.toFixed(3));
        if (o < 1) requestAnimationFrame(adim);
        else setTimeout(acilisiBitir, 350);
    })(bas);
} else if (perde) {
    perde.remove();
}

// Dünya haritası: dikey kaydırmayı yatay harekete çevirir
const harita = document.getElementById("harita");
const haritaSeridi = document.getElementById("haritaSeridi");
let haritaMesafe = 0;

function haritaOlc() {
    if (!harita) return;
    haritaMesafe = Math.max(0, haritaSeridi.scrollWidth - window.innerWidth);
    harita.style.height = (haritaMesafe + window.innerHeight) + "px";
}
function haritaGuncelle() {
    if (!harita) return;
    const p = Math.min(Math.max(-harita.getBoundingClientRect().top / (haritaMesafe || 1), 0), 1);
    haritaSeridi.style.transform = `translate3d(${-p * haritaMesafe}px, 0, 0)`;
    harita.style.setProperty("--harita-p", p.toFixed(4));
}
window.addEventListener("resize", () => { haritaOlc(); haritaGuncelle(); });
window.addEventListener("load", () => { haritaOlc(); haritaGuncelle(); });
haritaOlc();

/* =========================================================
   1. KARAKTER SAYFASI FONKSİYONLARI (Filtre, Arama, Tıklama)
   ========================================================= */
const dropdownlar = document.querySelectorAll(".ozel-dropdown");
dropdownlar.forEach(dropdown => {
    const secili = dropdown.querySelector(".dropdown-secili");
    const liste = dropdown.querySelector(".dropdown-liste");
    const secenekler = liste ? liste.querySelectorAll("li") : [];

    if (secili) {
        // Klavye ve ekran okuyucu desteği
        secili.setAttribute("tabindex", "0");
        secili.setAttribute("role", "button");
        secili.setAttribute("aria-haspopup", "listbox");
        secili.setAttribute("aria-expanded", "false");

        const ac = function (e) {
            e.stopPropagation();
            dropdownlar.forEach(d => { if (d !== dropdown) d.classList.remove("acik"); });
            const acik = dropdown.classList.toggle("acik");
            secili.setAttribute("aria-expanded", String(acik));
        };

        secili.addEventListener("click", ac);
        secili.addEventListener("keydown", function (e) {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ac(e); }
            if (e.key === "Escape") dropdown.classList.remove("acik");
        });
    }

    const sec = function (secenek) {
        secili.innerText = secenek.innerText;
        const deger = secenek.getAttribute("data-value");
        dropdown.classList.remove("acik");
        secili.setAttribute("aria-expanded", "false");
        secili.focus();
        if (dropdown.id === "odulDropdown") siralamayiUygula(deger, "odul");
        else if (dropdown.id === "isimDropdown") siralamayiUygula(deger, "isim");
    };

    secenekler.forEach(secenek => {
        secenek.setAttribute("tabindex", "0");
        secenek.setAttribute("role", "option");
        secenek.addEventListener("click", () => sec(secenek));
        secenek.addEventListener("keydown", function (e) {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); sec(secenek); }
        });
    });
});

document.addEventListener("click", function () {
    dropdownlar.forEach(dropdown => dropdown.classList.remove("acik"));
});

const kartGrid = document.getElementById("kartGrid");
function siralamayiUygula(secim, tur) {
    if (!kartGrid || !secim) return;
    const kartlar = Array.from(kartGrid.getElementsByClassName("wiki-kart"));

    kartlar.sort((a, b) => {
        if (tur === "odul") {
            const odulA = parseFloat(a.getAttribute("data-odul"));
            const odulB = parseFloat(b.getAttribute("data-odul"));
            return secim === "artan" ? odulA - odulB : odulB - odulA;
        } else if (tur === "isim") {
            const isimA = a.getAttribute("data-isim").toLocaleLowerCase("tr");
            const isimB = b.getAttribute("data-isim").toLocaleLowerCase("tr");
            return secim === "az" ? isimA.localeCompare(isimB, "tr") : isimB.localeCompare(isimA, "tr");
        }
    });

    kartlar.forEach((kart, index) => {
        kart.classList.remove("animasyon-ekle", "arama-efekti", "siralama-efekti");
        void kart.offsetWidth;
        kart.style.animationDelay = `${index * 0.05}s`;
        kart.classList.add("siralama-efekti");
        kartGrid.appendChild(kart);
    });
}

const aramaInput = document.getElementById("aramaInput");
if (aramaInput && kartGrid) {
    aramaInput.addEventListener("input", function () {
        const arananMetin = this.value.toLocaleLowerCase("tr").trim();
        const kartlar = kartGrid.getElementsByClassName("wiki-kart");

        Array.from(kartlar).forEach(kart => {
            const isim = kart.getAttribute("data-isim").toLocaleLowerCase("tr");
            if (isim.includes(arananMetin)) {
                kart.style.display = "block";
                kart.style.animationDelay = "0s";
                kart.classList.remove("animasyon-ekle", "arama-efekti", "siralama-efekti");
                void kart.offsetWidth;
                kart.classList.add("arama-efekti");
            } else {
                kart.style.display = "none";
            }
        });
    });
}

const butunKartlar = document.querySelectorAll(".wiki-kart");
butunKartlar.forEach(kart => {
    // Kartlar klavyeyle de açılabilsin (Tab ile odaklan, Enter ile aç)
    kart.setAttribute("tabindex", "0");
    kart.setAttribute("role", "link");

    const git = function () {
        const link = kart.getAttribute("data-link");
        if (link) {
            kart.style.borderColor = "#f1c40f";
            kart.style.zIndex = "50";
            document.body.classList.add("sayfa-cikis");
            setTimeout(() => { window.location.href = link; }, 400);
        }
    };

    kart.addEventListener("click", git);
    kart.addEventListener("keydown", function (e) {
        if (e.key === "Enter") git();
    });
});

// Geri tuşuyla dönüldüğünde sayfayı tekrar görünür yapar.
window.addEventListener("pageshow", function (e) {
    if (e.persisted) document.body.classList.remove("sayfa-cikis");
});

/* =========================================================
   2. ANA SAYFA AKICI (FLUID) TİPOGRAFİ ANİMASYONLARI
   ========================================================= */
const gozlemlenecekBolumler = document.querySelectorAll(".gizle-tetikleyici");

const scrollGozlemci = new IntersectionObserver((girdiler) => {
    girdiler.forEach(girdi => {
        if (girdi.isIntersecting && !yukleniyor) {
            girdi.target.classList.add("goster");
        }
    });
}, {
    threshold: 0.2
});

if (gozlemlenecekBolumler.length > 0) {
    gozlemlenecekBolumler.forEach(bolum => {
        scrollGozlemci.observe(bolum);
    });

    // Hero bölümü açılıştan sonra hemen animasyona başlasın
    acilisSonrasi(() => {
        gozlemlenecekBolumler[0].classList.add("goster");
    }, 100);
}

/* =========================================================
   3. EK CANLILIK: ilerleme, parallax, ışık, ilan afişi, geçişler
   ========================================================= */
const kok = document.documentElement;

const ilerleme = document.querySelector(".ilerleme-cubugu");
const devYazilar = document.querySelectorAll(".dev-transparan-yazi");
let kaydirmaBekliyor = false;

function kaydirmaGuncelle() {
    kaydirmaBekliyor = false;
    const yuk = kok.scrollHeight - window.innerHeight;
    if (ilerleme && yuk > 0) ilerleme.style.setProperty("--ilerleme", (window.scrollY / yuk).toFixed(4));
    document.body.classList.toggle("kaydirildi", window.scrollY > 80);
    haritaGuncelle();
    if (azHareket) return;
    devYazilar.forEach(yazi => {
        const r = yazi.getBoundingClientRect();
        const fark = (r.top + r.height / 2 - window.innerHeight / 2) * 0.12;
        yazi.style.transform = `translate3d(${fark}px, 0, 0)`;
    });
}
window.addEventListener("scroll", () => {
    if (!kaydirmaBekliyor) { kaydirmaBekliyor = true; requestAnimationFrame(kaydirmaGuncelle); }
}, { passive: true });
kaydirmaGuncelle();

// Fareyi izleyen ışık (arka plan efekti, imleç değil)
if (!azHareket) {
    window.addEventListener("pointermove", e => {
        kok.style.setProperty("--mx", e.clientX + "px");
        kok.style.setProperty("--my", e.clientY + "px");
    }, { passive: true });
}

// Arka plan parallax: fare hareket ettikçe katmanlar farklı hızlarda kayar
const parKatmanlar = document.querySelectorAll(".par-katman");
if (parKatmanlar.length && !azHareket && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    let hx = 0, hy = 0, cx = 0, cy = 0;   // hedef ve mevcut konum (-0.5 ile 0.5 arası)
    window.addEventListener("pointermove", e => {
        hx = e.clientX / window.innerWidth - 0.5;
        hy = e.clientY / window.innerHeight - 0.5;
    }, { passive: true });
    (function parDongu() {
        cx += (hx - cx) * 0.06;
        cy += (hy - cy) * 0.06;
        parKatmanlar.forEach(k => {
            const d = parseFloat(k.dataset.derinlik) || 0;
            k.style.transform = `translate3d(${(-cx * d * window.innerWidth).toFixed(1)}px, ${(-cy * d * window.innerHeight).toFixed(1)}px, 0)`;
        });
        requestAnimationFrame(parDongu);
    })();
}

// Eşkâl ilanı: fareye göre eğilme ve ödül sayacı
const poster = document.getElementById("wantedPoster");
if (poster && !azHareket) {
    poster.addEventListener("pointermove", e => {
        const r = poster.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        poster.style.setProperty("--egim-y", (x * 16) + "deg");
        poster.style.setProperty("--egim-x", (-y * 16) + "deg");
    });
    poster.addEventListener("pointerleave", () => {
        poster.style.setProperty("--egim-x", "0deg");
        poster.style.setProperty("--egim-y", "0deg");
    });
}

const odulSayac = document.getElementById("odulSayac");
if (odulSayac && !azHareket) {
    const hedef = Number(odulSayac.dataset.hedef);
    odulSayac.textContent = "0";
    acilisSonrasi(() => {
        const sure = 2200, bas = performance.now();
        (function adim(t) {
            const o = Math.min((t - bas) / sure, 1);
            odulSayac.textContent = Math.round(hedef * (1 - Math.pow(1 - o, 3))).toLocaleString("tr-TR");
            if (o < 1) requestAnimationFrame(adim);
            else odulSayac.parentElement.classList.add("tamam");
        })(bas);
    }, 900);
}

// Sayfalar arası geçiş: menü, logo ve butonlar da kart gibi yumuşak kapanır
document.querySelectorAll('a[href$=".html"]').forEach(a => {
    a.addEventListener("click", e => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || a.pathname === location.pathname) return;
        e.preventDefault();
        document.body.classList.add("sayfa-cikis");
        setTimeout(() => { window.location.href = a.href; }, 400);
    });
});

// Yumuşak kaydırma: yalnızca ana sayfada, fare tekerleği ile
if (document.querySelector(".asimetrik-kaydirma") && !azHareket && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    let hedefY = window.scrollY, mevcutY = window.scrollY;
    const sinirla = v => Math.max(0, Math.min(v, kok.scrollHeight - window.innerHeight));
    window.addEventListener("wheel", e => {
        if (e.ctrlKey) return;               // tarayıcı yakınlaştırma
        e.preventDefault();
        if (yukleniyor) return;              // açılış ekranı sürerken kaydırma kapalı
        hedefY = sinirla(hedefY + e.deltaY * (e.deltaMode === 1 ? 32 : 1));
    }, { passive: false });
    window.addEventListener("scroll", () => {
        if (Math.abs(window.scrollY - mevcutY) > 3) hedefY = mevcutY = window.scrollY;
    }, { passive: true });
    (function dongu() {
        mevcutY += (hedefY - mevcutY) * 0.09;
        if (Math.abs(hedefY - mevcutY) > 0.3) window.scrollTo(0, mevcutY);
        requestAnimationFrame(dongu);
    })();
}

// Nesneler kayan bandın üstüne binmesin: bandın çevresinde şeffaf şerit açar
const bantEl = document.querySelector(".kayan-bant-kapsayici");
const objeMaske = document.getElementById("objeMaske");
function bantMaskele() {
    if (!bantEl || !objeMaske) return;
    const r = bantEl.getBoundingClientRect();
    const W = window.innerWidth, H = window.innerHeight;
    const nx = Math.sin(15 * Math.PI / 180), ny = Math.cos(15 * Math.PI / 180);   // 165deg gradyan yönü
    const L = nx * W + ny * H;
    const p = L / 2 + ((r.left + r.width / 2 - W / 2) * nx + (r.top + r.height / 2 - H / 2) * ny);
    objeMaske.style.setProperty("--bp", p.toFixed(1) + "px");
    objeMaske.style.setProperty("--bt", (bantEl.offsetHeight / 2).toFixed(1) + "px");
}
bantMaskele();
window.addEventListener("resize", bantMaskele);
window.addEventListener("load", bantMaskele);

// Görseller ve kartlar: fareye göre 3D eğilme + ışık yansıması
if (!azHareket) {
    document.querySelectorAll(".egimli").forEach(el => {
        el.addEventListener("pointermove", e => {
            const r = el.getBoundingClientRect();
            const x = (e.clientX - r.left) / r.width - 0.5;
            const y = (e.clientY - r.top) / r.height - 0.5;
            el.style.setProperty("--egim-y", (x * 18) + "deg");
            el.style.setProperty("--egim-x", (-y * 18) + "deg");
            el.style.setProperty("--px", ((x + 0.5) * 100) + "%");
            el.style.setProperty("--py", ((y + 0.5) * 100) + "%");
        });
        el.addEventListener("pointerleave", () => {
            el.style.setProperty("--egim-x", "0deg");
            el.style.setProperty("--egim-y", "0deg");
        });
    });
}
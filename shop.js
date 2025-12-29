// --- 1. CONFIGURATION FIREBASE (STATISTIQUES) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, runTransaction } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCy6ZjGdS-BzFB7WJHGaVmvBeYI6eER_2I",
  authDomain: "em-area-stats.firebaseapp.com",
  projectId: "em-area-stats",
  storageBucket: "em-area-stats.firebasestorage.app",
  messagingSenderId: "758176416136",
  appId: "1:758176416136:web:8cb798eecb6d78e1953a3d"
};

// Initialisation
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// IDENTIFIANT UNIQUE DE LA BOUTIQUE (Change ça pour chaque nouvelle boutique !)
const SHOP_ID = "sandy_shop"; 

// --- COMPTEUR DE VUES (Automatique) ---
function trackVisit() {
    const visitRef = ref(db, 'shops/' + SHOP_ID + '/views');
    runTransaction(visitRef, (currentViews) => {
        return (currentViews || 0) + 1;
    }).then(() => console.log("Vue +1")).catch(console.error);
}
// On lance le compteur dès le chargement
trackVisit();


// --- 2. CODE DE LA BOUTIQUE (EXISTANT) ---

let shopData = {};
let products = [];
let currentProduct = null;
let selectedSize = null;
let selectedVariant = null;

// DÉMARRAGE
// Note: DOMContentLoaded n'est pas nécessaire avec type="module" car il est différé par défaut,
// mais on le garde pour la structure.
document.addEventListener('DOMContentLoaded', async () => {
    showShopSkeleton(); 
    try {
        await loadShopInfo();
        await loadProducts();
        initZoom();
    } catch (e) {
        console.error("Erreur chargement :", e);
    }
});

// GESTION NOTIFICATIONS (TOAST)
window.showToast = function(message, type = 'success') {
    let toast = document.getElementById("toast-notification");
    
    // Création dynamique du toast si absent (sécurité)
    if (!toast) {
        const tDiv = document.createElement('div');
        tDiv.id = 'toast-notification';
        tDiv.className = 'toast';
        tDiv.innerHTML = '<div class="toast-icon"></div><div class="toast-message"></div>';
        document.body.appendChild(tDiv);
        toast = tDiv;
    }

    const msgEl = toast.querySelector('.toast-message');
    const iconEl = toast.querySelector('.toast-icon');
    
    msgEl.textContent = message;
    
    if (type === 'error') {
        iconEl.textContent = '⚠️';
        toast.style.backgroundColor = "rgba(220, 53, 69, 0.95)";
    } else {
        iconEl.textContent = '✅';
        toast.style.backgroundColor = "rgba(30, 30, 30, 0.95)";
    }
    
    toast.className = "toast show";
    setTimeout(() => { 
        toast.className = toast.className.replace("show", ""); 
    }, 3000);
}

// SKELETON LOADER
function showShopSkeleton() {
    const header = document.getElementById('header-container');
    if(header) {
        header.innerHTML = `<div class="skeleton-header"><div class="sk-avatar"></div><div class="sk-line sk-w-50"></div><div class="sk-line sk-w-30"></div></div>`;
    }
    const grid = document.getElementById('catalog-container');
    if(grid) {
        grid.innerHTML = '';
        for(let i=0; i<4; i++) grid.innerHTML += `<div class="product-card" style="height:250px; pointer-events:none;"><div class="product-img skeleton" style="height:180px;"></div><div class="product-info"><div class="sk-line sk-w-50" style="margin-bottom:5px;"></div><div class="sk-line sk-w-30"></div></div></div>`;
    }
}

// CHARGER INFOS
async function loadShopInfo() {
    try {
        const res = await fetch('data/info.json');
        shopData = await res.json();
        
        document.title = shopData.name;
        const header = document.getElementById('header-container');
        
        let logoSrc = shopData.logo || 'https://via.placeholder.com/150';
        if(logoSrc.startsWith('/')) logoSrc = logoSrc.substring(1);

        // SEO
        const ogTitle = document.getElementById('og-title');
        if(ogTitle) ogTitle.content = shopData.name;

        header.innerHTML = `
            <img src="${logoSrc}" class="profile-img" onerror="this.src='https://via.placeholder.com/150'">
            <h1 class="profile-name">${shopData.name}</h1>
            <p class="profile-bio">${shopData.bio}</p>
            <div class="social-bar">
                ${shopData.socials.facebook ? `<a href="${shopData.socials.facebook}" class="social-btn"><i class="fab fa-facebook-f"></i></a>` : ''}
                ${shopData.socials.instagram ? `<a href="${shopData.socials.instagram}" class="social-btn"><i class="fab fa-instagram"></i></a>` : ''}
                ${shopData.socials.tiktok ? `<a href="${shopData.socials.tiktok}" class="social-btn"><i class="fab fa-tiktok"></i></a>` : ''}
                <a href="https://wa.me/${shopData.whatsapp_number}" class="social-btn whatsapp"><i class="fab fa-whatsapp"></i></a>
            </div>
        `;
    } catch(e) { console.error(e); }
}

// CHARGER PRODUITS
async function loadProducts() {
    try {
        const res = await fetch('data/produits.json');
        const data = await res.json();
        products = data.items ? data.items : data;

        generateCategoryFilters();
        renderGrid(products);
    } catch(e) { console.error(e); }
}

function renderGrid(items) {
    const grid = document.getElementById('catalog-container');
    if(!grid) return;
    grid.innerHTML = '';

    if(!items || items.length === 0) {
        grid.innerHTML = '<div style="padding:40px; text-align:center; grid-column:1/-1;">Aucun produit trouvé.</div>';
        return;
    }

    items.forEach(p => {
        const price = Number(p.prix).toLocaleString() + ' F';
        let imgPath = p.image || 'https://via.placeholder.com/300';
        if(imgPath.startsWith('/')) imgPath = imgPath.substring(1);

        let promoBadge = '';
        if(p.prix_original && p.prix_original > p.prix) {
            const percent = Math.round(((p.prix_original - p.prix) / p.prix_original) * 100);
            promoBadge = `<div class="card-promo-badge">-${percent}%</div>`;
        }
        const catBadge = p.category ? `<div class="product-cat">${p.category}</div>` : '';

        grid.innerHTML += `
            <div class="product-card" onclick="openProduct('${p.id}')">
                ${promoBadge}
                <img src="${imgPath}" class="product-img" onerror="this.src='https://via.placeholder.com/300'">
                <div class="product-info">
                    ${catBadge}
                    <div class="product-title">${p.nom}</div>
                    <div class="product-price">${price}</div>
                </div>
            </div>`;
    });
}

// FILTRES
function generateCategoryFilters() {
    const catContainer = document.getElementById('category-container');
    if(!catContainer) return;
    
    const categories = ['Tout'];
    products.forEach(p => { if(p.category && !categories.includes(p.category)) categories.push(p.category); });
    
    if(categories.length <= 1) { catContainer.style.display = 'none'; return; }

    catContainer.innerHTML = '';
    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'category-btn' + (cat === 'Tout' ? ' active' : '');
        btn.textContent = cat;
        btn.onclick = () => filterByCategory(cat, btn);
        catContainer.appendChild(btn);
    });
}

function filterByCategory(cat, btnElement) {
    document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
    btnElement.classList.add('active');
    if(cat === 'Tout') renderGrid(products);
    else renderGrid(products.filter(p => p.category === cat));
}

// OUVRIR PRODUIT (MODALE) (Fonctions attachées à window car type="module")
window.openProduct = function(id) {
    currentProduct = products.find(p => p.id == id);
    if(!currentProduct) return;

    let mainImg = currentProduct.image || 'https://via.placeholder.com/300';
    if(mainImg.startsWith('/')) mainImg = mainImg.substring(1);
    
    const imgEl = document.getElementById('m-img');
    if(imgEl) {
        imgEl.src = mainImg;
        imgEl.style.transform = "none";
    }

    const galleryBox = document.getElementById('m-gallery');
    if (galleryBox) {
        galleryBox.innerHTML = '';
        let variants = [];
        
        if(currentProduct.variants) {
            currentProduct.variants.forEach(v => {
                let path = v.img;
                if(path.startsWith('/')) path = path.substring(1);
                variants.push({ src: path, name: v.name });
            });
        } else if(currentProduct.gallery) {
            currentProduct.gallery.forEach((g, idx) => {
                let path = g.img;
                if(path.startsWith('/')) path = path.substring(1);
                variants.push({ src: path, name: '' });
            });
        }

        if(variants.length > 0) {
            variants.unshift({ src: mainImg, name: 'Principal' });
            variants.forEach((v, index) => {
                const activeClass = index === 0 ? 'active' : '';
                galleryBox.innerHTML += `
                    <div class="gallery-item ${activeClass}" onclick="selectVariant('${v.src}', '${v.name}', this)">
                        <img src="${v.src}" class="gallery-thumb">
                        <span class="gallery-label" style="font-size:0.6rem; color:#888;">${v.name}</span>
                    </div>`;
            });
        }
    }

    document.getElementById('m-title').textContent = currentProduct.nom;
    document.getElementById('m-desc').textContent = currentProduct.desc || "";
    
    const priceBox = document.getElementById('m-price-box');
    if(priceBox) {
        const price = Number(currentProduct.prix).toLocaleString() + ' F';
        if(currentProduct.prix_original && currentProduct.prix_original > currentProduct.prix) {
            const old = Number(currentProduct.prix_original).toLocaleString() + ' F';
            priceBox.innerHTML = `<span class="old-price">${old}</span> <span class="promo-price-heart">${price}</span>`;
        } else {
            priceBox.innerHTML = `<h3 style="color:#FF9F1C; margin:0;">${price}</h3>`;
        }
    }

    const sizeBox = document.getElementById('m-sizes-box');
    const sizeContainer = document.getElementById('m-sizes');
    selectedSize = null;

    if(sizeBox && sizeContainer) {
        if(currentProduct.sizes) {
            sizeBox.style.display = 'block';
            sizeContainer.innerHTML = '';
            const sizes = currentProduct.sizes.split(',').map(s => s.trim());
            sizes.forEach(s => {
                const btn = document.createElement('div');
                btn.className = 'size-btn';
                btn.textContent = s;
                btn.onclick = () => {
                    document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    selectedSize = s;
                };
                sizeContainer.appendChild(btn);
            });
        } else {
            sizeBox.style.display = 'none';
            selectedSize = "Unique";
        }
    }

    document.getElementById('order-form-box').style.display = 'none';
    document.getElementById('btn-show-form').style.display = 'block';
    
    const arrow = document.querySelector('.scroll-hint-down');
    if(arrow) arrow.style.display = 'block';

    const addr = document.getElementById('c-address');
    if(addr) { addr.style.display = 'none'; addr.value = ''; }
    
    document.querySelectorAll('input[name="delivery"]')[0].checked = true;
    
    const modal = document.getElementById('product-modal');
    if(modal) modal.classList.add('active');
};

window.selectVariant = function(src, name, el) {
    const imgEl = document.getElementById('m-img');
    if(imgEl) { imgEl.src = src; imgEl.style.transform = "none"; }
    selectedVariant = name !== 'Principal' ? name : null;
    document.querySelectorAll('.gallery-item').forEach(item => item.classList.remove('active'));
    if(el) el.classList.add('active');
};

window.closeModal = function() {
    const modal = document.getElementById('product-modal');
    if (modal) modal.classList.remove('active');
};

window.changeMainImage = function(src) { document.getElementById('m-img').src = src; };

// ZOOM LOUPE
function initZoom() {
    const box = document.querySelector('.modal-img-box');
    const img = document.getElementById('m-img');
    if(!box || !img) return;
    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    if(!isTouch) {
        box.addEventListener('mousemove', function(e) {
            const {left, top, width, height} = box.getBoundingClientRect();
            const x = (e.clientX - left) / width * 100;
            const y = (e.clientY - top) / height * 100;
            img.style.transformOrigin = `${x}% ${y}%`;
            img.style.transform = "scale(2)";
        });
        box.addEventListener('mouseleave', function() {
            img.style.transform = "scale(1)";
            setTimeout(() => { img.style.transformOrigin = "center center"; }, 300);
        });
    }
}

// FORMULAIRE & ACTIONS
const btnShow = document.getElementById('btn-show-form');
if(btnShow) {
    btnShow.addEventListener('click', function() {
        this.style.display = 'none';
        const form = document.getElementById('order-form-box');
        if(form) {
            form.style.display = 'block';
            form.scrollIntoView({behavior: 'smooth'});
        }
        const arrow = document.querySelector('.scroll-hint-down');
        if(arrow) arrow.style.display = 'none';
    });
}

window.toggleAddress = function(show) {
    const field = document.getElementById('c-address');
    if(field) { field.style.display = show ? 'block' : 'none'; field.required = show; }
};

window.openZoom = function(src) {
    const overlay = document.getElementById('zoom-view');
    const img = document.getElementById('zoom-img-target');
    if(overlay && img) { img.src = src; overlay.classList.add('active'); }
};
window.closeZoom = function() { document.getElementById('zoom-view').classList.remove('active'); };

window.openShareModal = function() { document.getElementById('share-modal').classList.add('active'); }
window.closeShareModal = function() { document.getElementById('share-modal').classList.remove('active'); }
window.shareTo = function(platform) {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`Regarde ${shopData.name || ''} !`);
    let link = '';
    if (platform === 'whatsapp') link = `https://wa.me/?text=${text}%20${url}`;
    else if (platform === 'facebook') link = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
    else { navigator.clipboard.writeText(window.location.href); window.showToast("Lien copié !"); closeShareModal(); return; }
    window.open(link, '_blank'); closeShareModal();
}

// ENVOI COMMANDE (AVEC TRACKING FIREBASE)
window.sendOrder = function() {
    const name = document.getElementById('c-name').value;
    const code = document.getElementById('c-code').value;
    const phone = document.getElementById('c-phone').value;
    const deliveryInput = document.querySelector('input[name="delivery"]:checked');
    const deliveryMode = deliveryInput ? deliveryInput.value : 'boutique';
    const address = document.getElementById('c-address').value;

    if(!name || !phone) return window.showToast("Nom et Téléphone obligatoires !", "error");
    if(currentProduct.sizes && (!selectedSize || selectedSize === "Unique")) return window.showToast("Veuillez choisir une taille !", "error");
    if(deliveryMode === 'livraison' && !address) return window.showToast("Adresse obligatoire !", "error");

    const fullPhone = code + phone;
    const deliveryText = deliveryMode === 'boutique' ? "🏪 Boutique" : `🛵 Livraison : ${address}`;
    const sizeText = currentProduct.sizes ? `📏 Taille : ${selectedSize}` : "";
    const variantText = selectedVariant ? `🎨 Variante : ${selectedVariant}` : "";

    const message = `
*NOUVELLE COMMANDE* 🛍️
---------------------------
🛒 *${currentProduct.nom}*
💰 ${currentProduct.prix} F
${sizeText}
${variantText}
---------------------------
👤 *CLIENT :*
Nom : ${name}
📞 ${fullPhone}
🚚 ${deliveryText}
---------------------------
_Merci de confirmer._`.trim();

    // --- TRACKING CLICK FIREBASE ---
    const clickRef = ref(db, 'shops/' + SHOP_ID + '/clicks');
    runTransaction(clickRef, (currentClicks) => {
        return (currentClicks || 0) + 1;
    });

    const url = `https://wa.me/${shopData.whatsapp_number}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    closeModal();
};

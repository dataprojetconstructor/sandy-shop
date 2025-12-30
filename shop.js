let shopData = {};
let products = [];
let currentProduct = null;
let selectedSize = null;
let selectedVariant = null;

// 1. DÉMARRAGE
document.addEventListener('DOMContentLoaded', async () => {
    checkShopTheme(); // Vérification du thème en premier
    showShopSkeleton(); 
    
    try {
        await loadShopInfo();
        await loadProducts();
        initZoom(); // Active la loupe pour PC
    } catch (e) {
        console.error("Erreur chargement :", e);
    }
});

// --- GESTION MODE SOMBRE ---
function checkShopTheme() {
    // 1. Priorité : Paramètre URL venant de EM AREA (ex: ?theme=dark)
    const urlParams = new URLSearchParams(window.location.search);
    const urlTheme = urlParams.get('theme');

    if (urlTheme === 'dark') {
        document.body.classList.add('dark-mode');
        localStorage.setItem('em_theme', 'dark');
    } else if (urlTheme === 'light') {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('em_theme', 'light');
    } 
    // 2. Sinon : Mémoire locale
    else if (localStorage.getItem('em_theme') === 'dark') {
        document.body.classList.add('dark-mode');
    }
}

// Fonction appelée par le bouton 🌓
window.toggleShopTheme = function() {
    document.body.classList.toggle('dark-mode');
    if (document.body.classList.contains('dark-mode')) {
        localStorage.setItem('em_theme', 'dark');
    } else {
        localStorage.setItem('em_theme', 'light');
    }
    if (navigator.vibrate) navigator.vibrate(50);
};

// --- GESTION NOTIFICATIONS (TOAST) ---
function showToast(message, type = 'success') {
    let toast = document.getElementById("toast-notification");
    
    // Création dynamique si absent
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
        iconEl.textContent = ' ';
        toast.style.backgroundColor = "rgba(30, 30, 30, 0.95)";
    }
    
    toast.className = "toast show";
    
    setTimeout(function(){ 
        toast.className = toast.className.replace("show", ""); 
        setTimeout(() => toast.style.backgroundColor = "", 300);
    }, 3000);
}

// --- SKELETON LOADER ---
function showShopSkeleton() {
    const header = document.getElementById('header-container');
    if(header) {
        header.innerHTML = `<div class="skeleton-header"><div class="sk-avatar"></div><div class="sk-line sk-w-50"></div><div class="sk-line sk-w-30"></div></div>`;
    }
    
    const grid = document.getElementById('catalog-container');
    if(grid) {
        grid.innerHTML = '';
        for(let i=0; i<4; i++) {
            grid.innerHTML += `<div class="product-card" style="height:250px; pointer-events:none;"><div class="product-img skeleton" style="height:180px;"></div><div class="product-info"><div class="sk-line sk-w-50" style="margin-bottom:5px;"></div><div class="sk-line sk-w-30"></div></div></div>`;
        }
    }
}

// 2. INFOS BOUTIQUE
async function loadShopInfo() {
    try {
        const res = await fetch('data/info.json');
        if(!res.ok) throw new Error("Info introuvable");
        shopData = await res.json();
        
        document.title = shopData.name;
        const header = document.getElementById('header-container');
        
        let logoSrc = shopData.logo || 'https://via.placeholder.com/150';
        if(logoSrc.startsWith('/')) logoSrc = logoSrc.substring(1);

        // SEO Dynamique
        const ogTitle = document.getElementById('og-title');
        const ogDesc = document.getElementById('og-desc');
        const ogImage = document.getElementById('og-image');
        const absoluteLogo = window.location.href.substring(0, window.location.href.lastIndexOf('/')) + '/' + logoSrc;

        if(ogTitle) ogTitle.content = shopData.name;
        if(ogDesc) ogDesc.content = shopData.bio;
        if(ogImage) ogImage.content = absoluteLogo;

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

// 3. PRODUITS
async function loadProducts() {
    try {
        const res = await fetch('data/produits.json');
        if(!res.ok) throw new Error("Produits introuvables");
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

// FILTRES CATÉGORIES
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

// 4. OUVRIR PRODUIT (MODALE SÉCURISÉE)
window.openProduct = function(id) {
    currentProduct = products.find(p => p.id == id);
    if(!currentProduct) return;

    // A. Image Principale
    let mainImg = currentProduct.image || 'https://via.placeholder.com/300';
    if(mainImg.startsWith('/')) mainImg = mainImg.substring(1);
    
    const imgEl = document.getElementById('m-img');
    if(imgEl) {
        imgEl.src = mainImg;
        imgEl.style.transform = "none";
    }

    // B. Galerie & Variantes (Sécurisé)
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
                variants.push({ src: path, name: `Vue ${idx+1}` });
            });
        }

        // On affiche la galerie seulement s'il y a des variantes ou si on veut répéter l'image principale
        if(variants.length > 0) {
            variants.unshift({ src: mainImg, name: 'Principal' });
            
            variants.forEach((v, index) => {
                const activeClass = index === 0 ? 'active' : '';
                galleryBox.innerHTML += `
                    <div class="gallery-item ${activeClass}" onclick="selectVariant('${v.src}', '${v.name}', this)">
                        <img src="${v.src}" class="gallery-thumb">
                        <span class="gallery-label">${v.name}</span>
                    </div>`;
            });
        }
    }

    // C. Textes
    const titleEl = document.getElementById('m-title');
    if(titleEl) titleEl.textContent = currentProduct.nom;
    
    const descEl = document.getElementById('m-desc');
    if(descEl) descEl.textContent = currentProduct.desc || "";
    
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

    // D. Tailles
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

    // E. Reset UI
    const formBox = document.getElementById('order-form-box');
    if(formBox) formBox.style.display = 'none';
    
    const btnShow = document.getElementById('btn-show-form');
    if(btnShow) btnShow.style.display = 'block';
    
    const arrow = document.querySelector('.scroll-hint-down');
    if(arrow) arrow.style.display = 'block';

    const addr = document.getElementById('c-address');
    if(addr) { addr.style.display = 'none'; addr.value = ''; }
    
    const radios = document.querySelectorAll('input[name="delivery"]');
    if(radios.length > 0) radios[0].checked = true;
    
    const modal = document.getElementById('product-modal');
    if(modal) modal.classList.add('active');
};

// SÉLECTION VARIANTE
window.selectVariant = function(src, name, el) {
    const imgEl = document.getElementById('m-img');
    if(imgEl) {
        imgEl.src = src;
        imgEl.style.transform = "none";
    }
    selectedVariant = name !== 'Principal' ? name : null;
    document.querySelectorAll('.gallery-item').forEach(item => item.classList.remove('active'));
    if(el) el.classList.add('active');
};

window.closeModal = function() {
    const modal = document.getElementById('product-modal');
    if (modal) modal.classList.remove('active');
};

window.changeMainImage = function(src) { document.getElementById('m-img').src = src; };

// 5. ZOOM LOUPE (PC)
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

// 6. FORMULAIRE & ACTIONS
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
    if(field) {
        field.style.display = show ? 'block' : 'none';
        field.required = show;
    }
};

// ZOOM PLEIN ÉCRAN
window.openZoom = function(src) {
    const overlay = document.getElementById('zoom-view');
    const img = document.getElementById('zoom-img-target');
    if(overlay && img) {
        img.src = src;
        overlay.classList.add('active');
    }
};
window.closeZoom = function() { 
    const overlay = document.getElementById('zoom-view');
    if(overlay) overlay.classList.remove('active');
};

// PARTAGE
window.openShareModal = function() { 
    const m = document.getElementById('share-modal');
    if(m) m.classList.add('active'); 
}
window.closeShareModal = function() { 
    const m = document.getElementById('share-modal');
    if(m) m.classList.remove('active'); 
}
window.shareTo = function(platform) {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`Regarde ${shopData.name || ''} !`);
    let link = '';

    if (platform === 'whatsapp') link = `https://wa.me/?text=${text}%20${url}`;
    else if (platform === 'facebook') link = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
    else {
        navigator.clipboard.writeText(window.location.href);
        showToast("Lien copié dans le presse-papier !");
        closeShareModal();
        return;
    }
    window.open(link, '_blank');
    closeShareModal();
}

// 7. ENVOI COMMANDE
window.sendOrder = function() {
    const name = document.getElementById('c-name').value;
    const code = document.getElementById('c-code').value;
    const phone = document.getElementById('c-phone').value;
    const deliveryInput = document.querySelector('input[name="delivery"]:checked');
    const deliveryMode = deliveryInput ? deliveryInput.value : 'boutique';
    const address = document.getElementById('c-address').value;

    if(!name || !phone) return showToast("Nom et Téléphone obligatoires !", "error");
    if(currentProduct.sizes && (!selectedSize || selectedSize === "Unique")) return showToast("Veuillez choisir une taille !", "error");
    if(deliveryMode === 'livraison' && !address) return showToast("Adresse obligatoire !", "error");

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

    const url = `https://wa.me/${shopData.whatsapp_number}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    closeModal();
};

let shopData = {};
let products = [];
let currentProduct = null;
let selectedSize = null;
let selectedVariant = null;

// 1. DÉMARRAGE
document.addEventListener('DOMContentLoaded', async () => {
    checkShopTheme();
    showShopSkeleton(); 
    
    try {
        await loadShopInfo();
        await loadProducts();
        initZoom();

        // Deep Link (Ouverture auto d'un produit)
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('id');
        if (productId && products.length > 0) {
            setTimeout(() => {
                const found = products.find(p => p.id == productId);
                if(found) {
                    openProduct(found.id);
                    const card = document.querySelectorAll('.product-card')[products.indexOf(found)];
                    if(card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 500);
        }
    } catch (e) { console.error("Erreur chargement :", e); }
});

// MODE SOMBRE
function checkShopTheme() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('theme') === 'dark' || localStorage.getItem('em_theme') === 'dark') {
        document.body.classList.add('dark-mode');
        localStorage.setItem('em_theme', 'dark');
    }
}

// TOASTS
function showToast(message, type = 'success') {
    let toast = document.getElementById("toast-notification");
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-notification';
        toast.className = 'toast';
        toast.innerHTML = '<div class="toast-icon"></div><div class="toast-message"></div>';
        document.body.appendChild(toast);
    }
    const msgEl = toast.querySelector('.toast-message');
    const iconEl = toast.querySelector('.toast-icon');
    msgEl.textContent = message;
    if (type === 'error') { iconEl.textContent = '⚠️'; toast.style.backgroundColor = "rgba(220, 53, 69, 0.95)"; } 
    else { iconEl.textContent = ' '; toast.style.backgroundColor = "rgba(30, 30, 30, 0.95)"; }
    toast.classList.add("show");
    setTimeout(() => { toast.classList.remove("show"); }, 3000);
}

// SKELETON
function showShopSkeleton() {
    const grid = document.getElementById('catalog-container');
    if(grid) { grid.innerHTML = ''; for(let i=0; i<4; i++) grid.innerHTML += `<div class="product-card" style="height:250px; pointer-events:none;"><div class="product-img skeleton" style="height:180px;"></div><div class="product-info"><div class="sk-line sk-w-50" style="margin-bottom:5px;"></div><div class="sk-line sk-w-30"></div></div></div>`; }
}

// CHARGEMENT DONNÉES
async function loadShopInfo() {
    const res = await fetch('data/info.json');
    shopData = await res.json();
    document.title = shopData.name;
    
    let logoSrc = shopData.logo || 'https://via.placeholder.com/150';
    if(logoSrc.startsWith('/')) logoSrc = logoSrc.substring(1);

    document.getElementById('header-container').innerHTML = `
        <img src="${logoSrc}" class="profile-img">
        <h1 class="profile-name">${shopData.name}</h1>
        <p class="profile-bio">${shopData.bio}</p>
        <div class="social-bar">
            ${shopData.socials?.facebook ? `<a href="${shopData.socials.facebook}" class="social-btn"><i class="fab fa-facebook-f"></i></a>` : ''}
            ${shopData.socials?.instagram ? `<a href="${shopData.socials.instagram}" class="social-btn"><i class="fab fa-instagram"></i></a>` : ''}
            <a href="https://wa.me/${shopData.whatsapp_number}" class="social-btn whatsapp"><i class="fab fa-whatsapp"></i></a>
        </div>`;
}

async function loadProducts() {
    const res = await fetch('data/produits.json');
    const data = await res.json();
    products = data.items || data;
    generateCategoryFilters();
    renderGrid(products);
}

function renderGrid(items) {
    const grid = document.getElementById('catalog-container');
    grid.innerHTML = '';
    if(!items.length) { grid.innerHTML = '<div style="padding:40px; text-align:center; grid-column:1/-1;">Aucun produit.</div>'; return; }

    items.forEach(p => {
        const price = Number(p.prix).toLocaleString() + ' F';
        let imgPath = p.image || 'https://via.placeholder.com/300';
        if(imgPath.startsWith('/')) imgPath = imgPath.substring(1);

        // BADGES INTELLIGENTS
        let badges = '';
        if(p.prix_original && p.prix_original > p.prix) {
            const percent = Math.round(((p.prix_original - p.prix) / p.prix_original) * 100);
            badges += `<div class="card-promo-badge">-${percent}%</div>`;
        }
        if(p.stock_status === 'order') {
            badges += `<div class="card-promo-badge" style="background:#3498db; right:auto; left:10px;">✈️ Commande</div>`;
        }
        if(p.wholesale_price) {
            badges += `<div class="card-promo-badge" style="background:#9b59b6; top:35px;">📦 Gros</div>`;
        }

        grid.innerHTML += `
            <div class="product-card" onclick="openProduct('${p.id}')">
                ${badges}
                <img src="${imgPath}" class="product-img" loading="lazy">
                <div class="product-info">
                    <div class="product-cat">${p.category || 'Divers'}</div>
                    <div class="product-title">${p.nom}</div>
                    <div class="product-price">${price}</div>
                </div>
            </div>`;
    });
}

// CATÉGORIES
function generateCategoryFilters() {
    const catContainer = document.getElementById('category-container');
    const categories = ['Tout', ...new Set(products.map(p => p.category).filter(Boolean))];
    if(categories.length <= 1) { catContainer.style.display = 'none'; return; }
    
    catContainer.innerHTML = '';
    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'category-btn' + (cat === 'Tout' ? ' active' : '');
        btn.textContent = cat;
        btn.onclick = () => {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderGrid(cat === 'Tout' ? products : products.filter(p => p.category === cat));
        };
        catContainer.appendChild(btn);
    });
}

// MODALE PRODUIT
window.openProduct = function(id) {
    currentProduct = products.find(p => p.id == id);
    if(!currentProduct) return;

    let mainImg = currentProduct.image || 'https://via.placeholder.com/300';
    if(mainImg.startsWith('/')) mainImg = mainImg.substring(1);
    
    document.getElementById('m-img').src = mainImg;
    document.getElementById('m-title').textContent = currentProduct.nom;
    document.getElementById('m-desc').innerText = currentProduct.desc || "Pas de description.";

    // PRIX & GROS
    const priceBox = document.getElementById('m-price-box');
    const price = Number(currentProduct.prix).toLocaleString() + ' F';
    let htmlPrice = `<h3 style="color:#FF9F1C; margin:0; font-size:1.4rem;">${price}</h3>`;
    
    if(currentProduct.prix_original > currentProduct.prix) {
        htmlPrice = `<span class="old-price">${Number(currentProduct.prix_original).toLocaleString()} F</span> ${htmlPrice}`;
    }
    if(currentProduct.wholesale_price) {
        htmlPrice += `<div style="font-size:0.8rem; color:#9b59b6; margin-top:5px;">📦 Prix de Gros : <b>${Number(currentProduct.wholesale_price).toLocaleString()} F</b> (Min ${currentProduct.min_qty} pcs)</div>`;
    }
    priceBox.innerHTML = htmlPrice;

    // GALERIE
    const galleryBox = document.getElementById('m-gallery');
    galleryBox.innerHTML = '';
    const variants = currentProduct.variants || [];
    if(variants.length > 0) {
        variants.unshift({ img: mainImg, name: 'Base' });
        variants.forEach(v => {
            let vImg = v.img.startsWith('/') ? v.img.substring(1) : v.img;
            galleryBox.innerHTML += `<div class="gallery-item" onclick="selectVariant('${vImg}', '${v.name}', this)"><img src="${vImg}" class="gallery-thumb"><span class="gallery-label">${v.name}</span></div>`;
        });
    }

    // TAILLES
    const sizeContainer = document.getElementById('m-sizes');
    const sizeBox = document.getElementById('m-sizes-box');
    if(currentProduct.sizes) {
        sizeBox.style.display = 'block';
        sizeContainer.innerHTML = '';
        currentProduct.sizes.split(',').forEach(s => {
            const btn = document.createElement('div');
            btn.className = 'size-btn';
            btn.textContent = s.trim();
            btn.onclick = function() {
                document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('selected'));
                this.classList.add('selected');
                selectedSize = this.textContent;
            }
            sizeContainer.appendChild(btn);
        });
    } else {
        sizeBox.style.display = 'none';
        selectedSize = "Unique";
    }

    // BOUTON NÉGOCIER
    const negoBtn = document.getElementById('btn-negotiate');
    if(currentProduct.negotiable) {
        negoBtn.style.display = 'block';
        negoBtn.onclick = () => {
            const msg = `Bonjour, je suis intéressé par *${currentProduct.nom}* (${price}). Est-ce que le prix est discutable ?`;
            window.open(`https://wa.me/${shopData.whatsapp_number}?text=${encodeURIComponent(msg)}`, '_blank');
        };
    } else {
        negoBtn.style.display = 'none';
    }

    // Reset Form
    document.getElementById('order-form-box').style.display = 'none';
    document.getElementById('btn-show-form').style.display = 'block';
    
    document.getElementById('product-modal').classList.add('active');
};

window.selectVariant = function(src, name, el) {
    document.getElementById('m-img').src = src;
    selectedVariant = name;
    document.querySelectorAll('.gallery-item').forEach(i => i.classList.remove('active'));
    el.classList.add('active');
};

window.closeModal = function() { document.getElementById('product-modal').classList.remove('active'); };

// COMMANDE
window.sendOrder = function() {
    const name = document.getElementById('c-name').value;
    const phone = document.getElementById('c-phone').value;
    const address = document.getElementById('c-address').value;
    const delivery = document.querySelector('input[name="delivery"]:checked').value;

    if(!name || !phone) return showToast("Nom et Téléphone requis", "error");
    if(delivery === 'livraison' && !address) return showToast("Adresse requise", "error");
    if(currentProduct.sizes && selectedSize === "Unique") return showToast("Choisissez une taille", "error");

    const msg = `
*NOUVELLE COMMANDE* 🛍️
---------------------------
Produit : *${currentProduct.nom}*
Prix : ${currentProduct.prix} F
Taille : ${selectedSize || 'N/A'}
Variante : ${selectedVariant || 'N/A'}
---------------------------
👤 Client : ${name}
📞 Tel : ${document.getElementById('c-code').value} ${phone}
🚚 Mode : ${delivery === 'boutique' ? 'Retrait Boutique' : 'Livraison (' + address + ')'}
---------------------------`.trim();

    window.open(`https://wa.me/${shopData.whatsapp_number}?text=${encodeURIComponent(msg)}`, '_blank');
};

// ZOOM & PARTAGE
window.openZoom = (src) => { document.getElementById('zoom-img-target').src = src; document.getElementById('zoom-view').classList.add('active'); };
window.closeZoom = () => document.getElementById('zoom-view').classList.remove('active');
window.openShareModal = () => document.getElementById('share-modal').classList.add('active');
window.closeShareModal = () => document.getElementById('share-modal').classList.remove('active');

// STATUS WHATSAPP (VIRAL)
window.shareToStatus = function() {
    const text = `Regardez ce que j'ai trouvé ! 😍\n*${currentProduct.nom}*\nÀ seulement ${currentProduct.prix} F chez ${shopData.name}.\n\nCliquez ici 👇\n${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
}

// AUTRES BTNS
document.getElementById('btn-show-form').onclick = function() {
    this.style.display = 'none';
    document.getElementById('order-form-box').style.display = 'block';
};
window.toggleAddress = (show) => { document.getElementById('c-address').style.display = show ? 'block' : 'none'; };
function initZoom() { /* Zoom simple déjà géré par openZoom */ }

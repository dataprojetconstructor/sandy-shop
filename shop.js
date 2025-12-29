let shopData = {};
let products = [];
let currentProduct = null;
let selectedSize = null;
let selectedVariant = null; // Pour la couleur

document.addEventListener('DOMContentLoaded', async () => {
    showShopSkeleton(); 
    await loadShopInfo();
    await loadProducts();
    initZoom(); // Initialise la loupe sur PC
});

// --- SKELETON ---
function showShopSkeleton() {
    const header = document.getElementById('header-container');
    header.innerHTML = `<div class="skeleton-header"><div class="sk-avatar"></div><div class="sk-line sk-w-50"></div><div class="sk-line sk-w-30"></div></div>`;
    const grid = document.getElementById('catalog-container');
    grid.innerHTML = '';
    for(let i=0; i<4; i++) grid.innerHTML += `<div class="product-card" style="height:250px; pointer-events:none;"><div class="product-img skeleton" style="height:180px;"></div><div class="product-info"><div class="sk-line sk-w-50" style="margin-bottom:5px;"></div><div class="sk-line sk-w-30"></div></div></div>`;
}

// --- INFO ---
async function loadShopInfo() {
    try {
        const res = await fetch('data/info.json');
        if(!res.ok) throw new Error("Info introuvable");
        shopData = await res.json();
        
        document.title = shopData.name;
        const header = document.getElementById('header-container');
        
        let logoSrc = shopData.logo || 'https://via.placeholder.com/150';
        if(logoSrc.startsWith('/')) logoSrc = logoSrc.substring(1);

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

// --- PRODUITS ---
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
    grid.innerHTML = '';

    if(items.length === 0) {
        grid.innerHTML = '<div style="padding:40px; text-align:center; grid-column:1/-1;">Aucun produit.</div>';
        return;
    }

    items.forEach(p => {
        const price = Number(p.prix).toLocaleString() + ' F';
        
        let imgPath = p.image || 'https://via.placeholder.com/300';
        if(imgPath.startsWith('/')) imgPath = imgPath.substring(1);

        // NOUVEAU : Affichage Catégorie sur la carte
        const categoryHTML = p.category ? `<div class="product-cat">${p.category}</div>` : '';

        let promoBadge = '';
        if(p.prix_original && p.prix_original > p.prix) {
            const percent = Math.round(((p.prix_original - p.prix) / p.prix_original) * 100);
            promoBadge = `<div class="card-promo-badge">-${percent}%</div>`;
        }

        grid.innerHTML += `
            <div class="product-card" onclick="openProduct('${p.id}')">
                ${promoBadge}
                <img src="${imgPath}" class="product-img" onerror="this.src='https://via.placeholder.com/300'">
                <div class="product-info">
                    ${categoryHTML} <!-- Catégorie ici -->
                    <div class="product-title">${p.nom}</div>
                    <div class="product-price">${price}</div>
                </div>
            </div>`;
    });
}

function generateCategoryFilters() {
    const catContainer = document.getElementById('category-container');
    if(!catContainer) return;
    const categories = ['Tout'];
    products.forEach(p => { if(p.category && !categories.includes(p.category)) categories.push(p.category); });
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

// --- OUVERTURE PRODUIT & VARIANTES ---
window.openProduct = function(id) {
    currentProduct = products.find(p => p.id == id);
    if(!currentProduct) return;

    // A. Image Principale
    let mainImg = currentProduct.image || 'https://via.placeholder.com/300';
    if(mainImg.startsWith('/')) mainImg = mainImg.substring(1);
    document.getElementById('m-img').src = mainImg;
    
    // Reset Zoom
    document.getElementById('m-img').style.transform = "none";

    // B. Variantes (Couleurs + Images)
    const variantBox = document.getElementById('m-variants');
    variantBox.innerHTML = '';
    selectedVariant = null; // Reset

    // On combine l'image principale comme "Option 1" et les variantes ensuite
    let variants = [];
    
    // Si on a des variantes configurées (nouveau système)
    if(currentProduct.variants) {
        currentProduct.variants.forEach(v => {
            let path = v.img;
            if(path.startsWith('/')) path = path.substring(1);
            variants.push({ name: v.name, img: path });
        });
    } 
    // Sinon on utilise l'ancienne "gallery" comme des variantes sans nom
    else if(currentProduct.gallery) {
        currentProduct.gallery.forEach((g, idx) => {
            let path = g.img;
            if(path.startsWith('/')) path = path.substring(1);
            variants.push({ name: `Vue ${idx+1}`, img: path });
        });
    }

    // Affichage des miniatures/variantes
    if(variants.length > 0) {
        // Ajout image principale au début si pas dedans
        variants.unshift({ name: "Principal", img: mainImg });
        
        variants.forEach(v => {
            variantBox.innerHTML += `
                <div class="variant-option" onclick="selectVariant('${v.img}', '${v.name}', this)">
                    <img src="${v.img}" class="variant-img">
                    <span class="variant-label">${v.name}</span>
                </div>
            `;
        });
    }

    // C. Infos
    document.getElementById('m-title').textContent = currentProduct.nom;
    document.getElementById('m-desc').textContent = currentProduct.desc || "";
    
    const priceBox = document.getElementById('m-price-box');
    const price = Number(currentProduct.prix).toLocaleString() + ' F';
    
    if(currentProduct.prix_original && currentProduct.prix_original > currentProduct.prix) {
        const old = Number(currentProduct.prix_original).toLocaleString() + ' F';
        priceBox.innerHTML = `<span class="old-price">${old}</span> <span class="promo-price-heart">${price}</span>`;
    } else {
        priceBox.innerHTML = `<h3 style="color:#FF9F1C; margin:0;">${price}</h3>`;
    }

    // D. Tailles
    const sizeBox = document.getElementById('m-sizes-box');
    const sizeContainer = document.getElementById('m-sizes');
    selectedSize = null;

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

    // E. Reset UI
    document.getElementById('order-form-box').style.display = 'none';
    document.getElementById('btn-show-form').style.display = 'block';
    const arrow = document.querySelector('.scroll-hint-down');
    if(arrow) arrow.style.display = 'block';
    document.getElementById('c-address').style.display = 'none';
    document.querySelectorAll('input[name="delivery"]')[0].checked = true;
    
    document.getElementById('product-modal').classList.add('modal-active');
};

// Fonction changement variante
window.selectVariant = function(src, name, el) {
    document.getElementById('m-img').src = src;
    selectedVariant = name;
    
    // Visuel actif
    document.querySelectorAll('.variant-option').forEach(v => v.classList.remove('active'));
    el.classList.add('active');
};

window.closeModal = function() {
    const modal = document.getElementById('product-modal');
    if (modal) modal.classList.remove('modal-active');
};

// --- LOGIQUE ZOOM LOUPE (PC) ---
function initZoom() {
    const box = document.querySelector('.modal-img-box');
    const img = document.getElementById('m-img');

    // Détection Mobile (Pas de souris) -> On utilise le click (déjà géré par onclick="openZoom")
    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    if(!isTouch) {
        // Désactiver le click pour ouvrir l'overlay sur PC, on utilise la loupe
        img.onclick = null; 
        
        box.addEventListener('mousemove', function(e) {
            const {left, top, width, height} = box.getBoundingClientRect();
            const x = (e.clientX - left) / width * 100;
            const y = (e.clientY - top) / height * 100;
            
            img.style.transformOrigin = `${x}% ${y}%`;
            img.style.transform = "scale(2)"; // Grossissement x2
        });

        box.addEventListener('mouseleave', function() {
            img.style.transform = "scale(1)"; // Reset
            setTimeout(() => { img.style.transformOrigin = "center center"; }, 300);
        });
    } else {
        // Sur mobile, on garde le onclick HTML pour le plein écran
        img.onclick = () => openZoom(img.src);
    }
}

// --- RESTE (Formulaire, Partage, etc.) ---
const btnShow = document.getElementById('btn-show-form');
if(btnShow) {
    btnShow.addEventListener('click', function() {
        this.style.display = 'none';
        document.getElementById('order-form-box').style.display = 'block';
        const arrow = document.querySelector('.scroll-hint-down');
        if(arrow) arrow.style.display = 'none';
        document.getElementById('order-form-box').scrollIntoView({behavior: 'smooth'});
    });
}

window.toggleAddress = function(show) {
    const field = document.getElementById('c-address');
    if(show) { field.style.display = 'block'; field.required = true; } 
    else { field.style.display = 'none'; field.required = false; }
};

window.openZoom = function(src) {
    const zoomOverlay = document.getElementById('zoom-view');
    const zoomImg = document.getElementById('zoom-img-target');
    if(zoomOverlay && zoomImg) { zoomImg.src = src; zoomOverlay.classList.add('active'); }
};
window.closeZoom = function() { document.getElementById('zoom-view').classList.remove('active'); };

window.openShareModal = function() { document.getElementById('share-modal').classList.add('modal-active'); }
window.closeShareModal = function() { document.getElementById('share-modal').classList.remove('modal-active'); }
window.shareTo = function(platform) {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`Regarde ${shopData.name} !`);
    let link = '';
    if (platform === 'whatsapp') link = `https://wa.me/?text=${text}%20${url}`;
    else if (platform === 'facebook') link = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
    else { navigator.clipboard.writeText(window.location.href); alert("Copié !"); closeShareModal(); return; }
    window.open(link, '_blank'); closeShareModal();
}

window.sendOrder = function() {
    const name = document.getElementById('c-name').value;
    const code = document.getElementById('c-code').value;
    const phone = document.getElementById('c-phone').value;
    const deliveryMode = document.querySelector('input[name="delivery"]:checked').value;
    const address = document.getElementById('c-address').value;

    if(!name || !phone) return alert("Nom et Téléphone obligatoires.");
    if(currentProduct.sizes && (!selectedSize || selectedSize === "Unique")) return alert("Veuillez choisir une taille.");
    if(deliveryMode === 'livraison' && !address) return alert("Adresse obligatoire.");

    const fullPhone = code + phone;
    const deliveryText = deliveryMode === 'boutique' ? "🏪 Boutique" : `🛵 Livraison : ${address}`;
    const sizeText = currentProduct.sizes ? `📏 Taille : ${selectedSize}` : "";
    const variantText = selectedVariant ? `🎨 Couleur : ${selectedVariant}` : "";

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

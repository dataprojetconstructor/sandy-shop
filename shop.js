let shopData = {};
let products = [];
let currentProduct = null;
let selectedSize = null;

// 1. DÉMARRAGE
document.addEventListener('DOMContentLoaded', async () => {
    showShopSkeleton(); // Affiche l'animation de chargement
    await loadShopInfo();
    await loadProducts();
});

// --- SKELETON LOADER ---
function showShopSkeleton() {
    // Skeleton Header
    const header = document.getElementById('header-container');
    header.innerHTML = `
        <div class="skeleton-header">
            <div class="sk-avatar"></div>
            <div class="sk-line sk-w-50"></div>
            <div class="sk-line sk-w-30"></div>
        </div>`;

    // Skeleton Catalogue
    const grid = document.getElementById('catalog-container');
    grid.innerHTML = '';
    for(let i=0; i<4; i++) {
        grid.innerHTML += `
            <div class="product-card" style="height:250px; pointer-events:none;">
                <div class="product-img skeleton" style="height:180px;"></div>
                <div class="product-info">
                    <div class="sk-line sk-w-50" style="margin-bottom:5px;"></div>
                    <div class="sk-line sk-w-30"></div>
                </div>
            </div>`;
    }
}

// 2. CHARGER INFOS BOUTIQUE
async function loadShopInfo() {
    try {
        const res = await fetch('data/info.json');
        if(!res.ok) throw new Error("Info introuvable");
        shopData = await res.json();
        
        document.title = shopData.name;
        const header = document.getElementById('header-container');
        
        // SEO Dynamique
        let cleanLogo = shopData.logo || '';
        if(cleanLogo.startsWith('/')) cleanLogo = cleanLogo.substring(1);
        const absoluteLogo = window.location.href.substring(0, window.location.href.lastIndexOf('/')) + '/' + cleanLogo;
        
        const ogTitle = document.getElementById('og-title');
        const ogDesc = document.getElementById('og-desc');
        const ogImage = document.getElementById('og-image');
        
        if(ogTitle) ogTitle.content = shopData.name;
        if(ogDesc) ogDesc.content = shopData.bio;
        if(ogImage) ogImage.content = absoluteLogo;

        // Affichage Header
        header.innerHTML = `
            <img src="${cleanLogo}" class="profile-img" onerror="this.src='https://via.placeholder.com/150'">
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

// 3. CHARGER PRODUITS
async function loadProducts() {
    try {
        const res = await fetch('data/produits.json');
        if(!res.ok) throw new Error("Produits introuvables");
        const data = await res.json();
        products = data.items ? data.items : data;

        // Générer les filtres
        generateCategoryFilters();

        // Afficher tout par défaut
        renderGrid(products);

    } catch(e) { console.error(e); }
}

// --- RENDU GRILLE (Avec Badge Promo) ---
function renderGrid(items) {
    const grid = document.getElementById('catalog-container');
    grid.innerHTML = '';

    if(items.length === 0) {
        grid.innerHTML = '<div style="padding:40px; text-align:center; grid-column:1/-1;">Aucun produit trouvé.</div>';
        return;
    }

    items.forEach(p => {
        const price = Number(p.prix).toLocaleString() + ' F';
        
        let imgPath = p.image || 'https://via.placeholder.com/300';
        if(imgPath.startsWith('/')) imgPath = imgPath.substring(1);

        // Badge Promo
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
                    <div class="product-title">${p.nom}</div>
                    <div class="product-price">${price}</div>
                </div>
            </div>
        `;
    });
}

// --- FILTRES CATÉGORIES ---
function generateCategoryFilters() {
    const catContainer = document.getElementById('category-container');
    if(!catContainer) return;

    const categories = ['Tout'];
    products.forEach(p => {
        if(p.category && !categories.includes(p.category)) {
            categories.push(p.category);
        }
    });

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

// 4. OUVRIR PRODUIT (MODALE)
window.openProduct = function(id) {
    currentProduct = products.find(p => p.id == id);
    if(!currentProduct) return;

    // A. Images & Galerie
    let mainImg = currentProduct.image || 'https://via.placeholder.com/300';
    if(mainImg.startsWith('/')) mainImg = mainImg.substring(1);
    document.getElementById('m-img').src = mainImg;

    const galleryBox = document.getElementById('m-gallery');
    galleryBox.innerHTML = '';
    
    let images = [mainImg];
    if(currentProduct.gallery) {
        currentProduct.gallery.forEach(g => {
            let path = g.img;
            if(path.startsWith('/')) path = path.substring(1);
            images.push(path);
        });
    }

    if(images.length > 1) {
        images.forEach(src => {
            galleryBox.innerHTML += `<img src="${src}" class="gallery-thumb" onclick="changeMainImage('${src}')">`;
        });
    }

    // B. Infos & Prix Promo
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

    // C. Tailles
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

    // D. Reset UI
    document.getElementById('order-form-box').style.display = 'none';
    document.getElementById('btn-show-form').style.display = 'block';
    
    const arrow = document.querySelector('.scroll-hint-down');
    if(arrow) arrow.style.display = 'block';

    document.getElementById('c-address').style.display = 'none';
    document.getElementById('c-address').value = '';
    document.querySelectorAll('input[name="delivery"]')[0].checked = true;
    
    document.getElementById('product-modal').classList.add('modal-active');
};

window.closeModal = function() {
    const modal = document.getElementById('product-modal');
    if (modal) modal.classList.remove('modal-active');
};

window.changeMainImage = function(src) {
    document.getElementById('m-img').src = src;
};

// 5. INTERACTIONS FORMULAIRE
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

// 6. GESTION ZOOM
window.openZoom = function(src) {
    const zoomOverlay = document.getElementById('zoom-view');
    const zoomImg = document.getElementById('zoom-img-target');
    if(zoomOverlay && zoomImg) {
        zoomImg.src = src;
        zoomOverlay.classList.add('active');
    }
};

window.closeZoom = function() {
    const zoomOverlay = document.getElementById('zoom-view');
    if(zoomOverlay) zoomOverlay.classList.remove('active');
};

// 7. GESTION PARTAGE
window.openShareModal = function() {
    document.getElementById('share-modal').classList.add('modal-active');
}

window.closeShareModal = function() {
    document.getElementById('share-modal').classList.remove('modal-active');
}

window.shareTo = function(platform) {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`Regarde la boutique ${shopData.name || 'Top'} sur EM AREA ! 🛍️`);
    let link = '';

    if (platform === 'whatsapp') link = `https://wa.me/?text=${text}%20${url}`;
    else if (platform === 'facebook') link = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
    else {
        navigator.clipboard.writeText(window.location.href).then(() => alert("Lien copié !"));
        closeShareModal();
        return;
    }
    if (link) window.open(link, '_blank');
    closeShareModal();
}

// 8. ENVOI COMMANDE
window.sendOrder = function() {
    const name = document.getElementById('c-name').value;
    const code = document.getElementById('c-code').value;
    const phone = document.getElementById('c-phone').value;
    const deliveryMode = document.querySelector('input[name="delivery"]:checked').value;
    const address = document.getElementById('c-address').value;

    if(!name || !phone) return alert("Nom et Téléphone obligatoires.");
    if(currentProduct.sizes && (!selectedSize || selectedSize === "Unique")) return alert("Veuillez choisir une taille.");
    if(deliveryMode === 'livraison' && !address) return alert("Adresse obligatoire pour la livraison.");

    const fullPhone = code + phone;
    const deliveryText = deliveryMode === 'boutique' ? "🏪 Récupération Boutique" : `🛵 Livraison : ${address}`;
    const sizeText = currentProduct.sizes ? `📏 Taille : ${selectedSize}` : "";

    const message = `
*NOUVELLE COMMANDE* 🛍️
---------------------------
🛒 *${currentProduct.nom}*
💰 ${currentProduct.prix} F
${sizeText}
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

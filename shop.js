let shopData = {};
let products = [];
let currentProduct = null;
let selectedSize = null;
let selectedVariant = null;

// 1. DÉMARRAGE
document.addEventListener('DOMContentLoaded', async () => {
    showShopSkeleton(); 
    
    // On lance les chargements
    try {
        await loadShopInfo();
        await loadProducts();
        initZoom(); // Active la loupe une fois tout chargé
    } catch (error) {
        console.error("Erreur critique :", error);
        alert("Une erreur est survenue lors du chargement de la boutique. Vérifiez la console (F12).");
    }
});

// --- SKELETON LOADER ---
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

// 2. CHARGER INFOS BOUTIQUE
async function loadShopInfo() {
    try {
        const res = await fetch('data/info.json');
        if(!res.ok) throw new Error("Impossible de lire data/info.json");
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
    } catch(e) { 
        console.error(e);
        document.getElementById('header-container').innerHTML = '<p style="text-align:center; color:red;">Erreur chargement infos boutique.</p>';
    }
}

// 3. CHARGER PRODUITS
async function loadProducts() {
    try {
        const res = await fetch('data/produits.json');
        if(!res.ok) throw new Error("Impossible de lire data/produits.json");
        const data = await res.json();
        products = data.items ? data.items : data;

        generateCategoryFilters();
        renderGrid(products);
    } catch(e) { 
        console.error(e);
        document.getElementById('catalog-container').innerHTML = '<p style="text-align:center; color:red;">Erreur chargement produits.</p>';
    }
}

// Rendu Grille
function renderGrid(items) {
    const grid = document.getElementById('catalog-container');
    grid.innerHTML = '';

    if(!items || items.length === 0) {
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

        // Badge Catégorie
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

// Filtres
function generateCategoryFilters() {
    const catContainer = document.getElementById('category-container');
    if(!catContainer) return;
    
    const categories = ['Tout'];
    products.forEach(p => { 
        if(p.category && !categories.includes(p.category)) categories.push(p.category); 
    });
    
    if(categories.length <= 1) { // Si pas de catégorie, on cache la barre
        catContainer.style.display = 'none';
        return;
    }

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

// 4. OUVRIR PRODUIT
window.openProduct = function(id) {
    currentProduct = products.find(p => p.id == id);
    if(!currentProduct) return;

    // A. Image Principale
    let mainImg = currentProduct.image || 'https://via.placeholder.com/300';
    if(mainImg.startsWith('/')) mainImg = mainImg.substring(1);
    
    const imgEl = document.getElementById('m-img');
    imgEl.src = mainImg;
    imgEl.style.transform = "none"; // Reset zoom loupe

    // B. Variantes / Galerie
    const variantBox = document.getElementById('m-variants'); // Conteneur dans la modale
    
    // On doit s'assurer que ce conteneur existe dans le HTML, sinon on utilise m-gallery
    const galleryBox = document.getElementById('m-gallery'); 
    
    // On vide les deux pour être sûr
    if(variantBox) variantBox.innerHTML = '';
    if(galleryBox) galleryBox.innerHTML = '';

    // Logique Variantes (Priorité)
    let variants = [];
    if(currentProduct.variants) {
        currentProduct.variants.forEach(v => {
            let path = v.img;
            if(path.startsWith('/')) path = path.substring(1);
            variants.push({ name: v.name, img: path });
        });
    } else if(currentProduct.gallery) {
        // Fallback Galerie simple
        currentProduct.gallery.forEach((g, idx) => {
            let path = g.img;
            if(path.startsWith('/')) path = path.substring(1);
            variants.push({ name: `Vue ${idx+1}`, img: path });
        });
    }

    // Affichage des miniatures (Dans m-gallery par défaut)
    if(variants.length > 0) {
        // Ajout principal
        variants.unshift({ name: "Principal", img: mainImg });
        
        variants.forEach(v => {
            galleryBox.innerHTML += `
                <div class="variant-option" onclick="selectVariant('${v.img}', '${v.name}', this)">
                    <img src="${v.img}" class="variant-img">
                    <span class="variant-label" style="display:block; font-size:0.6rem; text-align:center;">${v.name}</span>
                </div>`;
        });
    }

    // C. Textes
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
    
    // OUVRE LA MODALE
    const modal = document.getElementById('product-modal');
    if(modal) modal.classList.add('active');
};

// Sélection Variante
window.selectVariant = function(src, name, el) {
    document.getElementById('m-img').src = src;
    selectedVariant = name;
    document.querySelectorAll('.variant-option').forEach(v => v.classList.remove('active')); // Retire active partout
    // Ajoute active sur le parent de l'image cliquée
    if(el) el.classList.add('active'); 
    else if(event && event.currentTarget) event.currentTarget.classList.add('active');
};

window.closeModal = function() {
    const modal = document.getElementById('product-modal');
    if (modal) modal.classList.remove('active');
};

window.changeMainImage = function(src) {
    document.getElementById('m-img').src = src;
};

// 5. ZOOM LOUPE (PC ONLY)
function initZoom() {
    const box = document.querySelector('.modal-img-box');
    const img = document.getElementById('m-img');

    if(!box || !img) return;

    // Détection tactile
    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    if(!isTouch) {
        // Sur PC : Effet Loupe
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
    // Sur Mobile : Le click "openZoom" dans le HTML gère le plein écran
}

// 6. FORMULAIRE & ACTIONS
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

// Zoom Plein Écran
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

// Partage
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
    const text = encodeURIComponent(`Regarde la boutique ${shopData.name || ''} !`);
    let link = '';

    if (platform === 'whatsapp') link = `https://wa.me/?text=${text}%20${url}`;
    else if (platform === 'facebook') link = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
    else {
        navigator.clipboard.writeText(window.location.href);
        alert("Lien copié !");
        closeShareModal();
        return;
    }
    window.open(link, '_blank');
    closeShareModal();
}

// Commande
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

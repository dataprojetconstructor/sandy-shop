let shopData = {};
let products = [];
let currentProduct = null;
let selectedSize = null;

// 1. DÉMARRAGE
document.addEventListener('DOMContentLoaded', async () => {
    await loadShopInfo();
    await loadProducts();
});

// 2. CHARGER INFOS BOUTIQUE
async function loadShopInfo() {
    try {
        const res = await fetch('data/info.json');
        if(!res.ok) throw new Error("Info introuvable");
        shopData = await res.json();
        
        const header = document.getElementById('header-container');
        document.title = shopData.name;
        
        // Nettoyage Slash Logo
        let logoSrc = shopData.logo || 'https://via.placeholder.com/150';
        if(logoSrc.startsWith('/')) logoSrc = logoSrc.substring(1);

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

// 3. CHARGER PRODUITS
async function loadProducts() {
    try {
        const res = await fetch('data/produits.json');
        if(!res.ok) throw new Error("Produits introuvables");
        const data = await res.json();
        products = data.items ? data.items : data;

        const grid = document.getElementById('catalog-container');
        grid.innerHTML = '';

        if(products.length === 0) {
            grid.innerHTML = '<div style="padding:20px; text-align:center;">Aucun produit.</div>';
            return;
        }

        products.forEach(p => {
            const price = Number(p.prix).toLocaleString() + ' F';
            
            // Nettoyage Slash Image
            let imgPath = p.image || 'https://via.placeholder.com/300';
            if(imgPath.startsWith('/')) imgPath = imgPath.substring(1);

            grid.innerHTML += `
                <div class="product-card" onclick="openProduct('${p.id}')">
                    <img src="${imgPath}" class="product-img" onerror="this.src='https://via.placeholder.com/300'">
                    <div class="product-info">
                        <div class="product-title">${p.nom}</div>
                        <div class="product-price">${price}</div>
                    </div>
                </div>
            `;
        });
    } catch(e) { console.error(e); }
}

// 4. OUVRIR PRODUIT (MODALE)
window.openProduct = function(id) {
    currentProduct = products.find(p => p.id == id);
    if(!currentProduct) return;

    // A. Image Principale
    let mainImg = currentProduct.image || 'https://via.placeholder.com/300';
    if(mainImg.startsWith('/')) mainImg = mainImg.substring(1);
    document.getElementById('m-img').src = mainImg;

    // B. Galerie
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

    // C. Infos & Prix
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

    // E. Reset UI (Formulaire caché, Bouton visible, Flèche visible)
    document.getElementById('order-form-box').style.display = 'none';
    document.getElementById('btn-show-form').style.display = 'block';
    
    const arrow = document.querySelector('.scroll-hint-down');
    if(arrow) arrow.style.display = 'block'; // On remontre la flèche

    // Reset Livraison
    document.getElementById('c-address').style.display = 'none';
    document.getElementById('c-address').value = '';
    const radios = document.querySelectorAll('input[name="delivery"]');
    if(radios.length > 0) radios[0].checked = true;
    
    document.getElementById('product-modal').classList.add('modal-active');
};

window.closeModal = function() {
    document.getElementById('product-modal').classList.remove('modal-active');
};

window.changeMainImage = function(src) {
    document.getElementById('m-img').src = src;
};

// 5. GESTION DU BOUTON COMMANDER
const btnShow = document.getElementById('btn-show-form');
if(btnShow) {
    btnShow.addEventListener('click', function() {
        this.style.display = 'none';
        document.getElementById('order-form-box').style.display = 'block';
        
        // Cache la flèche quand on commence à commander
        const arrow = document.querySelector('.scroll-hint-down');
        if(arrow) arrow.style.display = 'none';
        
        // Scroll doux vers le formulaire
        document.getElementById('order-form-box').scrollIntoView({behavior: 'smooth'});
    });
}

// 6. GESTION LIVRAISON
window.toggleAddress = function(show) {
    const field = document.getElementById('c-address');
    if(show) {
        field.style.display = 'block';
        field.required = true;
    } else {
        field.style.display = 'none';
        field.required = false;
    }
};

// 7. GESTION ZOOM (Plein Écran)
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

// 8. ENVOI COMMANDE
window.sendOrder = function() {
    const name = document.getElementById('c-name').value;
    const code = document.getElementById('c-code').value;
    const phone = document.getElementById('c-phone').value;
    const deliveryMode = document.querySelector('input[name="delivery"]:checked').value;
    const address = document.getElementById('c-address').value;

    if(!name || !phone) return alert("Nom et Téléphone obligatoires.");
    
    if(currentProduct.sizes && (!selectedSize || selectedSize === "Unique")) {
        return alert("Veuillez choisir une taille.");
    }

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

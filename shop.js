/* ======================================================= */
/* MOTEUR BOUTIQUE V3.0 (STABILISÉ & SANS ERREUR)          */
/* ======================================================= */

let shopData = {};
let products = [];
let currentProduct = null;
let selectedSize = null;
let selectedVariant = null;

// 1. INITIALISATION
document.addEventListener('DOMContentLoaded', async () => {
    checkShopTheme();
    showShopSkeleton(); 
    
    try {
        await loadShopInfo();
        await loadProducts();
        initZoom(); // Active le zoom sur l'image principale

        // Deep Link (Ouverture auto via URL ?id=...)
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('id');
        
        if (productId && products.length > 0) {
            // Petit délai pour laisser le temps au DOM de se stabiliser
            setTimeout(() => {
                const found = products.find(p => p.id == productId);
                if(found) {
                    openProduct(found.id);
                    // Scroll vers le produit dans la grille
                    const card = document.querySelectorAll('.product-card')[products.indexOf(found)];
                    if(card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 500);
        }

    } catch (e) { console.error("Erreur chargement boutique :", e); }
});

// 2. GESTION DU THÈME (SOMBE / CLAIR)
function checkShopTheme() {
    const urlParams = new URLSearchParams(window.location.search);
    const savedTheme = localStorage.getItem('em_theme');
    
    if (urlParams.get('theme') === 'dark' || savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        localStorage.setItem('em_theme', 'dark');
        
        // Patch JS pour forcer la couleur de la description si le CSS ne suffit pas
        const descBox = document.getElementById('desc-box');
        if(descBox) {
            descBox.style.backgroundColor = '#2c2c2c';
            descBox.style.color = '#ccc';
        }
    }
}

// 3. AFFICHAGE (SKELETON & DONNÉES)
function showShopSkeleton() {
    const grid = document.getElementById('catalog-container');
    if(grid) { 
        grid.innerHTML = ''; 
        for(let i=0; i<4; i++) {
            grid.innerHTML += `<div class="product-card" style="height:250px; pointer-events:none;"><div class="product-img skeleton" style="height:180px;"></div><div class="product-info"><div class="sk-line sk-w-50" style="margin-bottom:5px;"></div><div class="sk-line sk-w-30"></div></div></div>`; 
        }
    }
}

async function loadShopInfo() {
    try {
        const res = await fetch('data/info.json');
        if(!res.ok) throw new Error("Fichier info.json introuvable");
        shopData = await res.json();
        document.title = shopData.name;
        
        let logoSrc = shopData.logo || 'https://via.placeholder.com/150';
        // Correction chemin relatif
        if(logoSrc.startsWith('/')) logoSrc = logoSrc.substring(1);

        const header = document.getElementById('header-container');
        if(header) {
            header.innerHTML = `
                <img src="${logoSrc}" class="profile-img" onerror="this.src='https://via.placeholder.com/150'">
                <h1 class="profile-name">${shopData.name}</h1>
                <p class="profile-bio">${shopData.bio}</p>
                <div class="social-bar">
                    ${shopData.socials?.facebook ? `<a href="${shopData.socials.facebook}" class="social-btn"><i class="fab fa-facebook-f"></i></a>` : ''}
                    ${shopData.socials?.instagram ? `<a href="${shopData.socials.instagram}" class="social-btn"><i class="fab fa-instagram"></i></a>` : ''}
                    ${shopData.socials?.tiktok ? `<a href="${shopData.socials.tiktok}" class="social-btn"><i class="fab fa-tiktok"></i></a>` : ''}
                    <a href="https://wa.me/${shopData.whatsapp_number}" class="social-btn whatsapp"><i class="fab fa-whatsapp"></i></a>
                </div>`;
        }
    } catch(e) { console.error(e); }
}

async function loadProducts() {
    try {
        const res = await fetch('data/produits.json');
        if(!res.ok) throw new Error("Fichier produits.json introuvable");
        const data = await res.json();
        products = data.items || data;
        generateCategoryFilters();
        renderGrid(products);
    } catch(e) { console.error(e); }
}

function renderGrid(items) {
    const grid = document.getElementById('catalog-container');
    if(!grid) return;
    grid.innerHTML = '';
    
    if(!items || items.length === 0) { 
        grid.innerHTML = '<div style="padding:40px; text-align:center; grid-column:1/-1; color:#999;">Aucun produit disponible.</div>'; 
        return; 
    }

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
                <img src="${imgPath}" class="product-img" loading="lazy" onerror="this.src='https://via.placeholder.com/300'">
                <div class="product-info">
                    <div class="product-cat">${p.category || 'Divers'}</div>
                    <div class="product-title">${p.nom}</div>
                    <div class="product-price">${price}</div>
                </div>
            </div>`;
    });
}

function generateCategoryFilters() {
    const catContainer = document.getElementById('category-container');
    if(!catContainer) return;
    
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

// 4. MODALE PRODUIT (COEUR DU SYSTÈME)
window.openProduct = function(id) {
    currentProduct = products.find(p => p.id == id);
    if(!currentProduct) return;

    // Reset des sélections
    selectedSize = null;
    selectedVariant = null;

    let mainImg = currentProduct.image || 'https://via.placeholder.com/300';
    if(mainImg.startsWith('/')) mainImg = mainImg.substring(1);
    
    // A. Mise à jour Image & Texte
    const imgEl = document.getElementById('m-img');
    if(imgEl) {
        imgEl.src = mainImg;
        imgEl.style.transform = "scale(1)"; // Reset Zoom
    }
    
    const titleEl = document.getElementById('m-title');
    if(titleEl) titleEl.textContent = currentProduct.nom;
    
    const descEl = document.getElementById('m-desc');
    if(descEl) descEl.innerText = currentProduct.desc || "Aucune description.";

    // B. Mise à jour Prix
    const priceBox = document.getElementById('m-price-box');
    if(priceBox) {
        const price = Number(currentProduct.prix).toLocaleString() + ' F';
        let htmlPrice = `<h3 style="color:#FF9F1C; margin:0; font-size:1.4rem;">${price}</h3>`;
        
        if(currentProduct.prix_original > currentProduct.prix) {
            htmlPrice = `<span class="old-price">${Number(currentProduct.prix_original).toLocaleString()} F</span> ${htmlPrice}`;
        }
        if(currentProduct.wholesale_price) {
            htmlPrice += `<div style="font-size:0.8rem; color:#9b59b6; margin-top:5px;">📦 Prix de Gros : <b>${Number(currentProduct.wholesale_price).toLocaleString()} F</b> (Min ${currentProduct.min_qty || 5} pcs)</div>`;
        }
        priceBox.innerHTML = htmlPrice;
    }

    // C. Galerie (AVEC RESET ANTI-DUPLICATION)
    const galleryBox = document.getElementById('m-gallery');
    if(galleryBox) {
        galleryBox.innerHTML = ''; // <--- TRÈS IMPORTANT : VIDE LA BOÎTE
        
        const variants = currentProduct.variants || [];
        // Si on a des variantes ou juste une image principale, on construit la galerie
        if(variants.length > 0 || mainImg) {
            // On ajoute l'image principale en premier
            const allImages = [{ img: mainImg, name: 'Base' }, ...variants];
            
            allImages.forEach((v, idx) => {
                let vImg = v.img;
                if(vImg && vImg.startsWith('/')) vImg = vImg.substring(1);
                if(!vImg) return;

                const activeClass = idx === 0 ? 'active' : '';
                galleryBox.innerHTML += `
                    <div class="gallery-item ${activeClass}" onclick="selectVariant('${vImg}', '${v.name || ''}', this)">
                        <img src="${vImg}" class="gallery-thumb">
                    </div>`;
            });
        }
    }

    // D. Tailles
    const sizeContainer = document.getElementById('m-sizes');
    const sizeBox = document.getElementById('m-sizes-box');
    if(sizeContainer && sizeBox) {
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
    }

    // E. Bouton Négocier (SÉCURISÉ)
    const negoBtn = document.getElementById('btn-negotiate');
    if(negoBtn) {
        if(currentProduct.negotiable) {
            negoBtn.style.display = 'flex';
            negoBtn.onclick = () => {
                const msg = `Bonjour, je suis intéressé par *${currentProduct.nom}*. Est-ce que le prix est discutable ?`;
                window.open(`https://wa.me/${shopData.whatsapp_number}?text=${encodeURIComponent(msg)}`, '_blank');
            };
        } else {
            negoBtn.style.display = 'none';
        }
    }

    // F. Reset Formulaire Commande
    const formBox = document.getElementById('order-form-box');
    const btnShow = document.getElementById('btn-show-form');
    if(formBox) formBox.style.display = 'none';
    if(btnShow) btnShow.style.display = 'block';
    
    // G. Affichage Modale
    const modal = document.getElementById('product-modal');
    if(modal) modal.classList.add('active');
};

// 5. FONCTIONS INTERNES MODALE
window.selectVariant = function(src, name, el) {
    const imgEl = document.getElementById('m-img');
    if(imgEl) {
        imgEl.src = src;
        imgEl.style.transform = "scale(1)"; // Reset zoom au changement
    }
    selectedVariant = name;
    
    // Gestion classe active
    document.querySelectorAll('.gallery-item').forEach(i => i.classList.remove('active'));
    if(el) el.classList.add('active');
};

window.closeModal = function() { 
    const modal = document.getElementById('product-modal');
    if(modal) modal.classList.remove('active'); 
};

// 6. ZOOM IMAGE (Logique PC)
function initZoom() {
    const box = document.querySelector('.modal-img-box');
    const img = document.getElementById('m-img');
    if(!box || !img) return;

    // Active seulement si pas tactile (PC)
    if (!('ontouchstart' in window)) {
        box.addEventListener('mousemove', function(e) {
            const {left, top, width, height} = box.getBoundingClientRect();
            const x = (e.clientX - left) / width * 100;
            const y = (e.clientY - top) / height * 100;
            
            img.style.transformOrigin = `${x}% ${y}%`;
            img.style.transform = "scale(2)"; // Zoom x2
        });

        box.addEventListener('mouseleave', function() {
            img.style.transform = "scale(1)";
            setTimeout(() => { img.style.transformOrigin = "center center"; }, 300);
        });
    }
}

// 7. ENVOI COMMANDE
window.sendOrder = function() {
    const name = document.getElementById('c-name').value;
    const phone = document.getElementById('c-phone').value;
    const address = document.getElementById('c-address').value;
    
    // Récupération sécurisée du bouton radio
    const deliveryRadio = document.querySelector('input[name="delivery"]:checked');
    const delivery = deliveryRadio ? deliveryRadio.value : 'boutique';

    // Validation
    if(!name || !phone) return showToast("Nom et Téléphone requis", "error");
    if(delivery === 'livraison' && !address) return showToast("Adresse requise pour la livraison", "error");
    if(currentProduct.sizes && (!selectedSize || selectedSize === "Unique")) {
        // Si le produit a des tailles mais aucune sélectionnée
        if(currentProduct.sizes.length > 0 && currentProduct.sizes !== "") {
             return showToast("Veuillez choisir une taille", "error");
        }
    }

    const fullPhone = document.getElementById('c-code').value + " " + phone;
    const sizeInfo = (selectedSize && selectedSize !== "Unique") ? `📏 Taille : ${selectedSize}\n` : "";
    const varInfo = (selectedVariant && selectedVariant !== "Base") ? `🎨 Variante : ${selectedVariant}\n` : "";

    const msg = `
*NOUVELLE COMMANDE* 🛍️
---------------------------
🛒 *${currentProduct.nom}*
💰 ${Number(currentProduct.prix).toLocaleString()} F
${sizeInfo}${varInfo}---------------------------
👤 *CLIENT :*
Nom : ${name}
📞 ${fullPhone}
🚚 Mode : ${delivery === 'boutique' ? 'Retrait Boutique' : 'Livraison (' + address + ')'}
---------------------------
_Merci de confirmer la disponibilité._`.trim();

    const url = `https://wa.me/${shopData.whatsapp_number}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
    closeModal();
};

// 8. UTILITAIRES (Toast, Share, Zoom Mobile)
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
    
    if (type === 'error') { 
        iconEl.textContent = '⚠️'; 
        toast.style.backgroundColor = "rgba(220, 53, 69, 0.95)"; 
    } else { 
        iconEl.textContent = '✅'; 
        toast.style.backgroundColor = "rgba(30, 30, 30, 0.95)"; 
    }
    
    toast.classList.add("show");
    setTimeout(() => { toast.classList.remove("show"); }, 3000);
}

window.openZoom = (src) => { 
    const el = document.getElementById('zoom-img-target');
    const view = document.getElementById('zoom-view');
    if(el && view) { el.src = src; view.classList.add('active'); }
};
window.closeZoom = () => {
    const view = document.getElementById('zoom-view');
    if(view) view.classList.remove('active');
};

window.openShareModal = () => document.getElementById('share-modal').classList.add('active');
window.closeShareModal = () => document.getElementById('share-modal').classList.remove('active');

window.shareTo = function(platform) {
    const url = encodeURIComponent(window.location.href);
    let link = '';
    if (platform === 'whatsapp') link = `https://wa.me/?text=${url}`;
    else if (platform === 'facebook') link = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
    else { navigator.clipboard.writeText(window.location.href); showToast("Lien copié !"); closeShareModal(); return; }
    window.open(link, '_blank'); closeShareModal();
}

// Gestion bascule formulaire
const btnShow = document.getElementById('btn-show-form');
if(btnShow) {
    btnShow.onclick = function() {
        this.style.display = 'none';
        const form = document.getElementById('order-form-box');
        if(form) form.style.display = 'block';
    };
}

window.toggleAddress = (show) => { 
    const addr = document.getElementById('c-address');
    if(addr) addr.style.display = show ? 'block' : 'none'; 
};

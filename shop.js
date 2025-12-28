let shopData = {};
let products = [];
let currentProduct = null;
let selectedSize = null; // Stocke la taille choisie

document.addEventListener('DOMContentLoaded', async () => {
    await loadShopInfo();
    await loadProducts();
});

// ... (loadShopInfo et loadProducts restent identiques au code précédent) ...
// Pour gagner de la place, je mets juste la fonction qui change : openProduct et sendOrder

// 1. GESTION AFFICHAGE ADRESSE
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

// 2. OUVRIR LE PRODUIT (Mise à jour complète)
window.openProduct = function(id) {
    currentProduct = products.find(p => p.id == id);
    if(!currentProduct) return;

    // A. Gestion Image Principale (Nettoyage slash)
    let mainImg = currentProduct.image || 'https://via.placeholder.com/300';
    if(mainImg.startsWith('/')) mainImg = mainImg.substring(1);
    
    const imgEl = document.getElementById('m-img');
    imgEl.src = mainImg;

    // B. Gestion Galerie (Plusieurs photos)
    const galleryBox = document.getElementById('m-gallery');
    galleryBox.innerHTML = ''; // Reset
    
    // On ajoute l'image principale en 1er
    let imagesList = [mainImg];
    // Si on a d'autres images dans la liste 'gallery'
    if(currentProduct.gallery) {
        currentProduct.gallery.forEach(g => {
            let path = g.img; // Sveltia met l'image dans un objet {img: "..."}
            if(path.startsWith('/')) path = path.substring(1);
            imagesList.push(path);
        });
    }

    // Création des miniatures
    if(imagesList.length > 1) {
        imagesList.forEach(src => {
            galleryBox.innerHTML += `<img src="${src}" class="gallery-thumb" onclick="changeMainImage('${src}')">`;
        });
    }

    // C. Gestion Prix (Promo ?)
    const priceBox = document.getElementById('m-price-box');
    const price = Number(currentProduct.prix).toLocaleString() + ' F';
    
    if(currentProduct.prix_original && currentProduct.prix_original > currentProduct.prix) {
        const oldPrice = Number(currentProduct.prix_original).toLocaleString() + ' F';
        priceBox.innerHTML = `
            <span class="old-price">${oldPrice}</span>
            <span class="promo-price-heart">${price}</span>
        `;
    } else {
        priceBox.innerHTML = `<h3 style="color:#FF9F1C; margin:0;">${price}</h3>`;
    }

    // D. Infos texte
    document.getElementById('m-title').textContent = currentProduct.nom;
    document.getElementById('m-desc').textContent = currentProduct.desc || "";

    // E. Gestion Tailles
    const sizeBox = document.getElementById('m-sizes-box');
    const sizeContainer = document.getElementById('m-sizes');
    selectedSize = null; // Reset choix

    if(currentProduct.sizes) {
        sizeBox.style.display = 'block';
        sizeContainer.innerHTML = '';
        // Sépare "S, M, L" en tableau ["S", "M", "L"]
        const sizes = currentProduct.sizes.split(',').map(s => s.trim());
        
        sizes.forEach(s => {
            const btn = document.createElement('div');
            btn.className = 'size-btn';
            btn.textContent = s;
            btn.onclick = () => {
                // Retire la classe 'selected' de tous les autres
                document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                selectedSize = s;
            };
            sizeContainer.appendChild(btn);
        });
    } else {
        sizeBox.style.display = 'none';
        selectedSize = "Unique"; // Taille par défaut
    }

    // F. Reset Formulaire
    document.getElementById('order-form-box').style.display = 'none';
    document.getElementById('btn-show-form').style.display = 'block';
    document.getElementById('c-address').style.display = 'none'; // Caché par défaut (Mode boutique)
    document.querySelectorAll('input[name="delivery"]')[0].checked = true; // Remet sur Boutique

    document.getElementById('product-modal').classList.add('modal-active');
};

// Fonction pour changer l'image principale au clic
window.changeMainImage = function(src) {
    document.getElementById('m-img').src = src;
};

// 3. ENVOI COMMANDE (Mise à jour)
window.sendOrder = function() {
    const name = document.getElementById('c-name').value;
    const code = document.getElementById('c-code').value;
    const phone = document.getElementById('c-phone').value;
    
    // Vérification Livraison
    const deliveryMode = document.querySelector('input[name="delivery"]:checked').value;
    const address = document.getElementById('c-address').value;

    if(!name || !phone) return alert("Nom et Téléphone obligatoires.");
    
    // Vérification Taille (Si le produit a des tailles)
    if(currentProduct.sizes && (!selectedSize || selectedSize === "Unique")) {
        return alert("Veuillez sélectionner une taille !");
    }

    if(deliveryMode === 'livraison' && !address) return alert("Veuillez indiquer le lieu de livraison.");

    // Construction du message
    const fullPhone = code + phone;
    const deliveryText = deliveryMode === 'boutique' ? "🏪 Récupération en Boutique" : `🛵 Livraison à : ${address}`;
    const sizeText = currentProduct.sizes ? `📏 Taille : ${selectedSize}` : "";

    const message = `
*NOUVELLE COMMANDE* 🛍️
---------------------------
🛒 *${currentProduct.nom}*
💰 Prix : ${currentProduct.prix} F
${sizeText}
---------------------------
👤 *CLIENT :*
Nom : ${name}
📞 Tel : ${fullPhone}
🚚 Mode : ${deliveryText}
---------------------------
_Merci de confirmer._
    `.trim();

    const url = `https://wa.me/${shopData.whatsapp_number}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    
    closeModal();
};

// ... (loadShopInfo et loadProducts doivent être inclus, je ne les ai pas remis pour la clarté) ...
// Si tu veux le code COMPLET dis le moi.

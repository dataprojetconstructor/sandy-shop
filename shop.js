let shopData = {};
let products = [];
let currentProduct = null;

// 1. Initialisation
document.addEventListener('DOMContentLoaded', async () => {
    await loadShopInfo();
    await loadProducts();
});

// 2. Charger Infos Boutique
async function loadShopInfo() {
    try {
        const res = await fetch('data/info.json');
        shopData = await res.json();
        
        // Remplir le Header
        const header = document.getElementById('header-container');
        document.title = shopData.name; // Titre de l'onglet
        
        header.innerHTML = `
            <img src="${shopData.logo}" class="profile-img">
            <h1 class="profile-name">${shopData.name}</h1>
            <p class="profile-bio">${shopData.bio}</p>
            <div class="social-bar">
                <a href="${shopData.socials.facebook}" class="social-btn"><i class="fab fa-facebook-f"></i></a>
                <a href="${shopData.socials.instagram}" class="social-btn"><i class="fab fa-instagram"></i></a>
                <a href="${shopData.socials.tiktok}" class="social-btn"><i class="fab fa-tiktok"></i></a>
                <a href="https://wa.me/${shopData.whatsapp_number}" class="social-btn" style="background:#25D366; color:white;"><i class="fab fa-whatsapp"></i></a>
            </div>
        `;
    } catch(e) { console.error("Erreur Info", e); }
}

// 3. Charger Produits
async function loadProducts() {
    try {
        const res = await fetch('data/produits.json'); // Le même format que pour EM AREA
        const data = await res.json();
        products = data.items ? data.items : data;

        const grid = document.getElementById('catalog-container');
        grid.innerHTML = '';

        products.forEach(p => {
            grid.innerHTML += `
                <div class="product-thumb" onclick="openProduct(${p.id})">
                    <img src="${p.image}" loading="lazy">
                </div>
            `;
        });
    } catch(e) { console.error("Erreur Produits", e); }
}

// 4. Ouvrir Modale Produit
window.openProduct = function(id) {
    currentProduct = products.find(p => p.id == id);
    if(!currentProduct) return;

    // Remplir les infos
    document.getElementById('m-img').src = currentProduct.image;
    document.getElementById('m-title').textContent = currentProduct.nom;
    document.getElementById('m-price').textContent = Number(currentProduct.prix).toLocaleString() + ' F';
    document.getElementById('m-desc').textContent = currentProduct.desc || "Pas de description.";
    
    // Reset Formulaire
    document.getElementById('order-form-box').style.display = 'none';
    document.getElementById('btn-show-form').style.display = 'block';

    // Afficher Modale
    document.getElementById('product-modal').classList.add('modal-active');
};

window.closeModal = function() {
    document.getElementById('product-modal').classList.remove('modal-active');
};

// Afficher le formulaire quand on clique sur "Commander"
document.getElementById('btn-show-form').addEventListener('click', function() {
    this.style.display = 'none'; // Cache ce bouton
    document.getElementById('order-form-box').style.display = 'block'; // Affiche le formulaire
});

// 5. Envoyer Commande WhatsApp
window.sendOrder = function() {
    // Récupérer les infos client
    const name = document.getElementById('c-name').value;
    const phone = document.getElementById('c-phone').value;
    const social = document.getElementById('c-social').value;
    const address = document.getElementById('c-address').value;

    if(!name || !phone) return alert("Veuillez mettre votre nom et téléphone.");

    // Construire le message Facture
    const message = `
*NOUVELLE COMMANDE* 🛍️
---------------------------
🛒 *Produit :* ${currentProduct.nom}
💰 *Prix :* ${currentProduct.prix} F
---------------------------
👤 *CLIENT :*
Nom : ${name}
Tel : ${phone}
${social ? 'Réseau : ' + social : ''}
📍 *Livraison :* ${address}
---------------------------
_Merci de confirmer la disponibilité._
    `.trim();

    // Ouvrir WhatsApp
    const url = `https://wa.me/${shopData.whatsapp_number}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    
    closeModal();
};

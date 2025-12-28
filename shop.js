let shopData = {};
let products = [];
let currentProduct = null;

// 1. Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', async () => {
    await loadShopInfo();
    await loadProducts();
});

// 2. Charger les Infos de la Boutique (info.json)
async function loadShopInfo() {
    try {
        const res = await fetch('data/info.json');
        if(!res.ok) throw new Error("Fichier info.json introuvable");
        shopData = await res.json();
        
        // Mise à jour du titre et du header
        const header = document.getElementById('header-container');
        document.title = shopData.name;
        
        // Gestion image logo
        let logoSrc = shopData.logo ? shopData.logo : 'https://via.placeholder.com/150?text=Logo';
        if(logoSrc.startsWith('/')) logoSrc = logoSrc.substring(1); // Nettoyage slash

        header.innerHTML = `
            <img src="${logoSrc}" class="profile-img" onerror="this.src='https://via.placeholder.com/150?text=Logo'">
            <h1 class="profile-name">${shopData.name}</h1>
            <p class="profile-bio">${shopData.bio}</p>
            
            <div class="social-bar">
                ${shopData.socials.facebook ? `<a href="${shopData.socials.facebook}" class="social-btn"><i class="fab fa-facebook-f"></i></a>` : ''}
                ${shopData.socials.instagram ? `<a href="${shopData.socials.instagram}" class="social-btn"><i class="fab fa-instagram"></i></a>` : ''}
                ${shopData.socials.tiktok ? `<a href="${shopData.socials.tiktok}" class="social-btn"><i class="fab fa-tiktok"></i></a>` : ''}
                <a href="https://wa.me/${shopData.whatsapp_number}" class="social-btn whatsapp"><i class="fab fa-whatsapp"></i></a>
            </div>
        `;
    } catch(e) { console.error("Erreur Info:", e); }
}

// 3. Charger les Produits (produits.json)
async function loadProducts() {
    try {
        const res = await fetch('data/produits.json');
        if(!res.ok) throw new Error("Fichier produits.json introuvable");
        const data = await res.json();
        
        // Gestion des formats Sveltia (parfois {items: []} parfois juste [])
        products = data.items ? data.items : data;

        const grid = document.getElementById('catalog-container');
        grid.innerHTML = '';

        if(products.length === 0) {
            grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:20px;">Aucun produit disponible.</div>';
            return;
        }

        products.forEach(p => {
            const price = Number(p.prix).toLocaleString() + ' F';
            
            // --- PROTECTION ANTI-BUG IMAGE ---
            // Si l'image commence par un slash (ex: /assets/...), on l'enlève.
            let imagePath = p.image ? p.image : 'https://via.placeholder.com/300?text=Produit';
            if (imagePath.startsWith('/')) {
                imagePath = imagePath.substring(1); 
            }
            // ---------------------------------

            grid.innerHTML += `
                <div class="product-card" onclick="openProduct('${p.id}')">
                    <img src="${imagePath}" class="product-img" onerror="this.src='https://via.placeholder.com/300?text=Image+Cassée'">
                    <div class="product-info">
                        <div class="product-title">${p.nom}</div>
                        <div class="product-price">${price}</div>
                    </div>
                </div>
            `;
        });
    } catch(e) { console.error("Erreur Produits:", e); }
}

// 4. Ouvrir la Modale Produit
window.openProduct = function(id) {
    currentProduct = products.find(p => p.id == id);
    if(!currentProduct) return;

    // --- PROTECTION ANTI-BUG IMAGE (Aussi ici) ---
    let imagePath = currentProduct.image || 'https://via.placeholder.com/300';
    if (imagePath.startsWith('/')) {
        imagePath = imagePath.substring(1);
    }
    // --------------------------------------------

    document.getElementById('m-img').src = imagePath;
    document.getElementById('m-title').textContent = currentProduct.nom;
    document.getElementById('m-price').textContent = Number(currentProduct.prix).toLocaleString() + ' F';
    document.getElementById('m-desc').textContent = currentProduct.desc || "Aucune description.";
    
    // Réinitialiser l'état du formulaire
    document.getElementById('order-form-box').style.display = 'none';
    document.getElementById('btn-show-form').style.display = 'block';

    // Afficher la modale
    document.getElementById('product-modal').classList.add('modal-active');
};

window.closeModal = function() {
    document.getElementById('product-modal').classList.remove('modal-active');
};

// Gestion du bouton "Commander" dans la modale
const btnShow = document.getElementById('btn-show-form');
if(btnShow) {
    btnShow.addEventListener('click', function() {
        this.style.display = 'none'; // Cache le bouton
        document.getElementById('order-form-box').style.display = 'block'; // Affiche le formulaire
    });
}

// 5. Envoyer la Commande sur WhatsApp
window.sendOrder = function() {
    const name = document.getElementById('c-name').value;
    const phone = document.getElementById('c-phone').value;
    const address = document.getElementById('c-address').value;

    if(!name || !phone) return alert("Nom et Téléphone obligatoires pour la livraison.");

    const message = `
*NOUVELLE COMMANDE* 🛍️
---------------------------
🛒 *Produit :* ${currentProduct.nom}
💰 *Prix :* ${currentProduct.prix} F
---------------------------
👤 *CLIENT :*
Nom : ${name}
📞 Tel : ${phone}
📍 Lieu : ${address}
---------------------------
_Merci de confirmer la disponibilité._
    `.trim();

    const url = `https://wa.me/${shopData.whatsapp_number}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    
    closeModal();
};

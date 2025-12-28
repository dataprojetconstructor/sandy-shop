let shopData = {};
let products = [];
let currentProduct = null;

document.addEventListener('DOMContentLoaded', async () => {
    await loadShopInfo();
    await loadProducts();
});

// 1. INFO BOUTIQUE
async function loadShopInfo() {
    try {
        const res = await fetch('data/info.json');
        shopData = await res.json();
        
        const header = document.getElementById('header-container');
        document.title = shopData.name;
        
        // Sécurité Image (Placeholder si logo cassé)
        const logoSrc = shopData.logo ? shopData.logo : 'https://via.placeholder.com/150?text=Boutique';

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
    } catch(e) { console.error(e); }
}

// 2. PRODUITS
async function loadProducts() {
    try {
        const res = await fetch('data/produits.json');
        const data = await res.json();
        products = data.items ? data.items : data;

        const grid = document.getElementById('catalog-container');
        grid.innerHTML = '';

        products.forEach(p => {
            const price = Number(p.prix).toLocaleString() + ' F';
            // Image par défaut si manquante
            const imgSrc = p.image ? p.image : 'https://via.placeholder.com/300?text=Produit';

            grid.innerHTML += `
                <div class="product-card" onclick="openProduct('${p.id}')">
                    <img src="${imgSrc}" class="product-img" onerror="this.src='https://via.placeholder.com/300?text=Image+Cassée'">
                    <div class="product-info">
                        <div class="product-title">${p.nom}</div>
                        <div class="product-price">${price}</div>
                    </div>
                </div>
            `;
        });
    } catch(e) { console.error(e); }
}

// 3. MODALE
window.openProduct = function(id) {
    currentProduct = products.find(p => p.id == id);
    if(!currentProduct) return;

    document.getElementById('m-img').src = currentProduct.image || 'https://via.placeholder.com/300';
    document.getElementById('m-title').textContent = currentProduct.nom;
    document.getElementById('m-price').textContent = Number(currentProduct.prix).toLocaleString() + ' F';
    document.getElementById('m-desc').textContent = currentProduct.desc || "Aucune description.";
    
    // Reset Form
    document.getElementById('order-form-box').style.display = 'none';
    document.getElementById('btn-show-form').style.display = 'block';

    document.getElementById('product-modal').classList.add('modal-active');
};

window.closeModal = function() {
    document.getElementById('product-modal').classList.remove('modal-active');
};

document.getElementById('btn-show-form').addEventListener('click', function() {
    this.style.display = 'none';
    document.getElementById('order-form-box').style.display = 'block';
});

// 4. COMMANDE WHATSAPP
window.sendOrder = function() {
    const name = document.getElementById('c-name').value;
    const phone = document.getElementById('c-phone').value;
    const address = document.getElementById('c-address').value;

    if(!name || !phone) return alert("Nom et Téléphone obligatoires.");

    const message = `
*COMMANDE BOUTIQUE* 🛍️
---------------------------
🛒 *${currentProduct.nom}*
💰 Prix : ${currentProduct.prix} F
---------------------------
👤 *Client :* ${name}
📞 *Tel :* ${phone}
📍 *Lieu :* ${address}
`.trim();

    const url = `https://wa.me/${shopData.whatsapp_number}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    closeModal();
};

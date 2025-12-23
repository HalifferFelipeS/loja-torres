// script.js
import { getProducts } from './modules/product.js';
import { incrementClicks } from './modules/adminStats.js';

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Carrega produtos
  const products = await getProducts();
  
  // 2. Renderiza os sliders horizontais
  renderProductSliders(products);
  
  // 3. Preenche a barra lateral (Isso estava faltando!)
  initializeSidebar(products);
  
  // 4. Inicializa busca
  initializeSearch(products);

  // 5. Configura cliques (Botão e Modal)
  setupGlobalClicks(products);
});

// --- RENDERIZAÇÃO EM SLIDERS (CARROSSEL) ---
function renderProductSliders(products) {
  const productList = document.getElementById('product-list');
  productList.innerHTML = '';

  // Agrupa produtos
  const groupedProducts = {};
  products.forEach(product => {
    const groupName = product.group || product.group_name || 'Geral';
    if (!groupedProducts[groupName]) groupedProducts[groupName] = [];
    groupedProducts[groupName].push(product);
  });

  // Cria seção para cada grupo
  Object.entries(groupedProducts).forEach(([group, groupProducts]) => {
    const groupSection = document.createElement('div');
    groupSection.className = 'product-group';
    groupSection.id = `group-${group.replace(/\s+/g, '-').toLowerCase()}`; // ID para ancora
    
    groupSection.innerHTML = `
        <div class="group-header">
            <h2 class="group-title">${group}</h2>
        </div>
    `;

    const sliderContainer = document.createElement('div');
    sliderContainer.className = 'slider-container';

    // Setinhas de navegação
    const prevBtn = document.createElement('button');
    prevBtn.className = 'slider-btn prev';
    prevBtn.innerHTML = '&#10094;';
    
    const nextBtn = document.createElement('button');
    nextBtn.className = 'slider-btn next';
    nextBtn.innerHTML = '&#10095;';

    const gridDiv = document.createElement('div');
    gridDiv.className = 'products-grid';

    // Ação das setas
    prevBtn.onclick = () => gridDiv.scrollBy({ left: -300, behavior: 'smooth' });
    nextBtn.onclick = () => gridDiv.scrollBy({ left: 300, behavior: 'smooth' });

    // Cria Cards
    groupProducts.forEach(product => {
      const card = document.createElement('div');
      card.className = 'product-card';
      
      const images = product.images && product.images.length ? product.images : ['https://via.placeholder.com/150'];
      const mainImage = images[0];

      card.innerHTML = `
        <div class="product-carousel" data-id="${product.id}">
             <img src="${mainImage}" alt="${product.name}" style="max-height:100%; max-width:100%;">
        </div>
        <div class="product-info">
          <h3>${product.name}</h3>
          <p class="price">R$ ${parseFloat(product.price).toFixed(2)}</p>
          <button class="buy-button" data-id="${product.id}">Solicitar Produto</button>
        </div>
      `;
      gridDiv.appendChild(card);
    });

    if (groupProducts.length > 4) {
        sliderContainer.appendChild(prevBtn);
        sliderContainer.appendChild(nextBtn);
    }
    sliderContainer.appendChild(gridDiv);
    groupSection.appendChild(sliderContainer);
    productList.appendChild(groupSection);
  });
}

// --- BARRA LATERAL (SIDEBAR) ---
function initializeSidebar(products) {
    const sidebarGroups = document.getElementById('sidebar-groups');
    if(!sidebarGroups) return;

    // Pega lista única de grupos
    const groups = Array.from(new Set(products.map(p => p.group || p.group_name))).filter(Boolean);
    
    // Cria os links
    sidebarGroups.innerHTML = groups.map(g => `
        <a href="#" class="sidebar-group-item" data-target="group-${g.replace(/\s+/g, '-').toLowerCase()}">
            ${g}
        </a>
    `).join('');

    // Clique para rolar até a categoria
    sidebarGroups.querySelectorAll('.sidebar-group-item').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = e.target.getAttribute('data-target');
            const element = document.getElementById(targetId);
            if(element) {
                // Rola com compensação do header fixo
                const headerOffset = 90;
                const elementPosition = element.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                window.scrollTo({ top: offsetPosition, behavior: "smooth" });
            }
        });
    });
}

// --- SEARCH ---
function initializeSearch(allProducts) {
    const searchInput = document.getElementById('search-input');
    
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        if(!term) {
            renderProductSliders(allProducts); // Restaura tudo
            return;
        }
        
        const filtered = allProducts.filter(p => 
            p.name.toLowerCase().includes(term) || 
            (p.description && p.description.toLowerCase().includes(term))
        );
        renderProductSliders(filtered);
    });
}

// --- CLIQUES GLOBAIS (MODAL E WHATSAPP) ---
function setupGlobalClicks(products) {
    const productList = document.getElementById('product-list');
    
    // Injeta o HTML do Modal na página se não existir
    if (!document.getElementById('product-modal')) {
        const modalHTML = `
        <div id="product-modal" class="modal">
            <div class="modal-content">
                <button class="modal-close">&times;</button>
                <div class="modal-carousel">
                    <img class="modal-image" src="">
                </div>
                <div class="modal-details">
                    </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    const modal = document.getElementById('product-modal');
    const modalImg = modal.querySelector('.modal-image');
    const modalDetails = modal.querySelector('.modal-details');
    const closeModal = modal.querySelector('.modal-close');

    // Fechar modal
    closeModal.onclick = () => modal.style.display = 'none';
    modal.onclick = (e) => { if(e.target === modal) modal.style.display = 'none'; }

    // Delegação de eventos
    productList.addEventListener('click', (e) => {
        const target = e.target;
        
        // 1. CLIQUE NO BOTÃO "SOLICITAR PRODUTO"
        if (target.classList.contains('buy-button')) {
            const id = target.getAttribute('data-id');
            const product = products.find(p => String(p.id) === String(id));
            if(product) redirectToWhatsApp(product);
        }

        // 2. CLIQUE NA IMAGEM (ABRIR MODAL)
        const carouselClick = target.closest('.product-carousel');
        if (carouselClick) {
            const id = carouselClick.getAttribute('data-id');
            const product = products.find(p => String(p.id) === String(id));
            
            if(product) {
                // Preenche Modal
                const imgUrl = (product.images && product.images.length) ? product.images[0] : 'https://via.placeholder.com/150';
                modalImg.src = imgUrl;
                
                modalDetails.innerHTML = `
                    <h3>${product.name}</h3>
                    <p class="price">R$ ${parseFloat(product.price).toFixed(2)}</p>
                    <p>${product.description || 'Sem descrição.'}</p>
                    <button class="buy-button" onclick="window.open('https://wa.me/554832428800?text=Tenho interesse em ${encodeURIComponent(product.name)}', '_blank')">
                        Pedir no WhatsApp
                    </button>
                `;
                modal.style.display = 'flex';
                incrementClicks();
            }
        }
    });
}

function redirectToWhatsApp(product) {
  const message = encodeURIComponent(`Olá, vi no site e tenho interesse em: ${product.name} (R$ ${product.price.toFixed(2)})`);
  const whatsappNumber = '554832428800'; 
  window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
}
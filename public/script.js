import { getProducts } from './modules/product.js';
import { incrementClicks } from './modules/adminStats.js';

document.addEventListener('DOMContentLoaded', async () => {
  const products = await getProducts();
  
  renderProductSliders(products);
  initializeSidebar(products);
  initializeSearch(products);
  setupGlobalClicks(products);
  
  // --- SEGREDO DO ADMIN ---
  setupAdminSecret();
});

// FUNÇÃO MÁGICA: 3 Cliques para mostrar admin
function setupAdminSecret() {
    const brandTitle = document.getElementById('brand-title-trigger');
    const adminBtn = document.getElementById('admin-secret-btn');
    let clicks = 0;
    let timer;

    if(brandTitle && adminBtn) {
        brandTitle.addEventListener('click', () => {
            clicks++;
            
            // Se passar 1 segundo sem clicar, reseta a contagem
            clearTimeout(timer);
            timer = setTimeout(() => { clicks = 0; }, 1000);

            if(clicks === 3) {
                // Revela o botão
                adminBtn.classList.add('revealed');
                alert('Modo Administrador Revelado!');
                clicks = 0;
            }
        });
    }
}

function renderProductSliders(products) {
  const productList = document.getElementById('product-list');
  productList.innerHTML = '';

  const groupedProducts = {};
  products.forEach(product => {
    const groupName = product.group || product.group_name || 'Geral';
    if (!groupedProducts[groupName]) groupedProducts[groupName] = [];
    groupedProducts[groupName].push(product);
  });

  Object.entries(groupedProducts).forEach(([group, groupProducts]) => {
    // Cria um ID limpo para o grupo (sem espaços, minúsculo)
    const groupId = `group-${group.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;

    const groupSection = document.createElement('div');
    groupSection.className = 'product-group';
    groupSection.id = groupId; // Importante para o scroll da sidebar
    
    groupSection.innerHTML = `
        <div class="group-header">
            <h2 class="group-title">${group}</h2>
        </div>
    `;

    const sliderContainer = document.createElement('div');
    sliderContainer.className = 'slider-container';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'slider-btn prev';
    prevBtn.innerHTML = '&#10094;';
    
    const nextBtn = document.createElement('button');
    nextBtn.className = 'slider-btn next';
    nextBtn.innerHTML = '&#10095;';

    const gridDiv = document.createElement('div');
    gridDiv.className = 'products-grid';

    prevBtn.onclick = () => gridDiv.scrollBy({ left: -300, behavior: 'smooth' });
    nextBtn.onclick = () => gridDiv.scrollBy({ left: 300, behavior: 'smooth' });

    groupProducts.forEach(product => {
      const card = document.createElement('div');
      card.className = 'product-card';
      
      const images = product.images && product.images.length ? product.images : ['https://via.placeholder.com/150'];
      const mainImage = images[0];

      card.innerHTML = `
        <div class="product-carousel" data-id="${product.id}">
             <img src="${mainImage}" alt="${product.name}">
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

  // Inicia o observador de scroll APÓS renderizar os produtos
  setupScrollObserver();
}

// --- SIDEBAR COM FILTRO E SCROLL ---
function initializeSidebar(products) {
    const sidebarGroups = document.getElementById('sidebar-groups');
    const filterInput = document.getElementById('sidebar-search-input');
    
    if(!sidebarGroups) return;

    // Grupos únicos
    const groups = Array.from(new Set(products.map(p => p.group || p.group_name))).filter(Boolean);
    
    // Renderiza lista
    const renderList = () => {
        sidebarGroups.innerHTML = groups.map(g => {
            const groupId = `group-${g.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;
            return `<a href="#" class="sidebar-group-item" data-target="${groupId}">${g}</a>`;
        }).join('');
        
        // Reconecta eventos de clique
        addSidebarClickEvents();
    };
    renderList();

    // Lógica de Filtro da Sidebar
    if(filterInput) {
        filterInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const items = sidebarGroups.querySelectorAll('.sidebar-group-item');
            
            items.forEach(item => {
                const text = item.textContent.toLowerCase();
                if(text.includes(term)) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    }
}

function addSidebarClickEvents() {
    document.querySelectorAll('.sidebar-group-item').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = e.target.getAttribute('data-target');
            const element = document.getElementById(targetId);
            if(element) {
                const headerOffset = 90;
                const elementPosition = element.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                window.scrollTo({ top: offsetPosition, behavior: "smooth" });
            }
        });
    });
}

// --- OBSERVER (Deixa amarelo na sidebar quando rola a tela) ---
function setupScrollObserver() {
    const observerOptions = {
        root: null,
        rootMargin: '-20% 0px -60% 0px', // Área ativa no meio da tela
        threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Remove active de todos
                document.querySelectorAll('.sidebar-group-item.active').forEach(el => el.classList.remove('active'));
                
                // Pega o ID da seção visível
                const sectionId = entry.target.id;
                
                // Acha o link correspondente na sidebar e marca
                const activeLink = document.querySelector(`.sidebar-group-item[data-target="${sectionId}"]`);
                if(activeLink) activeLink.classList.add('active');
            }
        });
    }, observerOptions);

    // Observa todas as seções de grupo criadas
    document.querySelectorAll('.product-group').forEach(section => observer.observe(section));
}

function initializeSearch(allProducts) {
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        if(!term) {
            renderProductSliders(allProducts);
            return;
        }
        const filtered = allProducts.filter(p => 
            p.name.toLowerCase().includes(term) || 
            (p.description && p.description.toLowerCase().includes(term))
        );
        renderProductSliders(filtered);
    });
}

function setupGlobalClicks(products) {
    const productList = document.getElementById('product-list');
    
    if (!document.getElementById('product-modal')) {
        const modalHTML = `
        <div id="product-modal" class="modal">
            <div class="modal-content">
                <button class="modal-close">&times;</button>
                <div class="modal-carousel"><img class="modal-image" src=""></div>
                <div class="modal-details"></div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    const modal = document.getElementById('product-modal');
    const modalImg = modal.querySelector('.modal-image');
    const modalDetails = modal.querySelector('.modal-details');
    const closeModal = modal.querySelector('.modal-close');

    closeModal.onclick = () => modal.style.display = 'none';
    modal.onclick = (e) => { if(e.target === modal) modal.style.display = 'none'; }

    productList.addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('buy-button')) {
            const id = target.getAttribute('data-id');
            const product = products.find(p => String(p.id) === String(id));
            if(product) redirectToWhatsApp(product);
        }

        const carouselClick = target.closest('.product-carousel');
        if (carouselClick) {
            const id = carouselClick.getAttribute('data-id');
            const product = products.find(p => String(p.id) === String(id));
            if(product) {
                const imgUrl = (product.images && product.images.length) ? product.images[0] : 'https://via.placeholder.com/150';
                modalImg.src = imgUrl;
                modalDetails.innerHTML = `
                    <h3>${product.name}</h3>
                    <p class="price">R$ ${parseFloat(product.price).toFixed(2)}</p>
                    <p>${product.description || 'Sem descrição.'}</p>
                    <button class="buy-button" onclick="window.open('https://wa.me/554832428800?text=Interesse em ${encodeURIComponent(product.name)}', '_blank')">Pedir no WhatsApp</button>
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
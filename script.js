// script.js
import { getProducts, renderProducts as renderModule, getGroups } from './modules/product.js';
import { incrementClicks, incrementViews } from './modules/adminStats.js';

document.addEventListener('DOMContentLoaded', async () => {
  const products = await getProducts(); // Assume async se estiver usando DB
  
  // Renderiza usando a nova lógica de slider
  renderProductSliders(products);
  
  initializeSearch(products);
  initializeSidebar(products);

  const productList = document.getElementById('product-list');

  productList.addEventListener('click', event => {
    if (event.target.classList.contains('buy-button')) {
      const productId = event.target.getAttribute('data-id');
      const product = products.find(p => String(p.id) === String(productId));
      if (product) {
          redirectToWhatsApp(product);
          incrementClicks();
      }
    }
  });
});

// NOVA FUNÇÃO: Renderiza Carrosséis por Categoria
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
    // Container Principal do Grupo
    const groupSection = document.createElement('div');
    groupSection.className = 'product-group';
    
    // Cabeçalho do Grupo
    groupSection.innerHTML = `
        <div class="group-header">
            <h2 class="group-title">${group}</h2>
        </div>
    `;

    // Wrapper do Slider
    const sliderContainer = document.createElement('div');
    sliderContainer.className = 'slider-container';

    // Botão Anterior
    const prevBtn = document.createElement('button');
    prevBtn.className = 'slider-btn prev';
    prevBtn.innerHTML = '&#10094;'; // Seta Esquerda
    prevBtn.onclick = () => scrollSlider(gridDiv, -300);

    // Botão Próximo
    const nextBtn = document.createElement('button');
    nextBtn.className = 'slider-btn next';
    nextBtn.innerHTML = '&#10095;'; // Seta Direita
    nextBtn.onclick = () => scrollSlider(gridDiv, 300);

    // Grid de Produtos (Scrollável)
    const gridDiv = document.createElement('div');
    gridDiv.className = 'products-grid';

    // Criação dos Cards
    groupProducts.forEach(product => {
      const card = document.createElement('div');
      card.className = 'product-card';
      
      // Imagem (Ainda é um carrossel interno se tiver varias fotos)
      const carouselHTML = createCarouselHTML(product);
      
      card.innerHTML = `
        ${carouselHTML}
        <div class="product-info">
          <p class="description">${product.description || ''}</p>
          <h3>${product.name}</h3>
          <p class="price">${parseFloat(product.price).toFixed(2)}</p>
          <button class="buy-button" data-id="${product.id}">Adicionar ao Carrinho</button>
        </div>
      `;
      gridDiv.appendChild(card);
      // Inicializa carrossel de imagens interno do card
      initializeCardCarousel(card, product.images.length);
    });

    // Monta a estrutura
    if (groupProducts.length > 4) { // Só adiciona setas se tiver muitos produtos
        sliderContainer.appendChild(prevBtn);
        sliderContainer.appendChild(nextBtn);
    }
    sliderContainer.appendChild(gridDiv);
    groupSection.appendChild(sliderContainer);
    productList.appendChild(groupSection);
  });
}

function scrollSlider(element, amount) {
    element.scrollBy({ left: amount, behavior: 'smooth' });
}

// Funções auxiliares mantidas (Carrossel de imagens interno)
function createCarouselHTML(product) {
    // Se não tiver imagem, usa placeholder
    const images = product.images && product.images.length ? product.images : ['https://via.placeholder.com/150'];
    
    return `
    <div class="product-carousel" data-product-id="${product.id}">
      <div class="carousel-images" style="width: ${images.length * 100}%">
        ${images.map(url => `
          <img src="${url}" alt="${product.name}" style="width: ${100 / images.length}%">
        `).join('')}
      </div>
      ${images.length > 1 ? '<button class="carousel-button prev" style="left:5px">&lt;</button><button class="carousel-button next" style="right:5px">&gt;</button>' : ''}
    </div>`;
}

function initializeCardCarousel(card, count) {
    if(count <= 1) return;
    const carousel = card.querySelector('.carousel-images');
    const prev = card.querySelector('.carousel-button.prev');
    const next = card.querySelector('.carousel-button.next');
    let idx = 0;
    
    const update = () => carousel.style.transform = `translateX(-${idx * (100/count)}%)`;
    
    if(prev) prev.onclick = (e) => { e.stopPropagation(); idx = (idx - 1 + count) % count; update(); };
    if(next) next.onclick = (e) => { e.stopPropagation(); idx = (idx + 1) % count; update(); };
}

// ... Mantenha suas funções de initializeSearch e initializeSidebar aqui ...
// Apenas lembre de remover a importação duplicada e usar o renderProductSliders na busca também

function initializeSearch(allProducts) {
    const searchInput = document.getElementById('search-input');
    const suggestionsList = document.getElementById('search-suggestions');
    // ... (sua lógica de busca existente)
    
    searchInput.addEventListener('input', () => {
        // ... lógica de filtro
        // IMPORTANTE: Ao filtrar, chame renderProductSliders(filtered) em vez de renderProducts
    });
}

function initializeSidebar(allProducts) {
    // ... (sua lógica de sidebar existente)
    // Mantenha o sidebarGroups.innerHTML preenchendo a lista vertical
}

function redirectToWhatsApp(product) {
  const message = encodeURIComponent(`Olá, vi no site e tenho interesse em: ${product.name} (R$ ${product.price.toFixed(2)})`);
  const whatsappNumber = '554832428800'; // Sem +
  window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
}
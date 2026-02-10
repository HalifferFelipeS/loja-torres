// Busca produtos da Vercel API (Banco de Dados)
export async function getProducts() {
  try {
    // MUDANÇA AQUI: para /api/products
    const res = await fetch('/api/products');
    if (!res.ok) throw new Error('Falha ao buscar produtos');
    return await res.json();
  } catch (e) {
    console.error(e);
    return [];
  }
}

export async function getGroups() {
  const products = await getProducts();
  const groups = new Set(products.map(p => p.group));
  return Array.from(groups);
}

// Renderiza na tela (HTML)
export function renderProducts(products) {
  const productList = document.getElementById('product-list');
  if (!productList) return;

  productList.innerHTML = '';

  const groupedProducts = {};
  products.forEach(product => {
    // Ajuste para pegar group ou group_name dependendo de como vem do banco
    const gName = product.group || product.group_name || 'Geral';
    if (!groupedProducts[gName]) groupedProducts[gName] = [];
    groupedProducts[gName].push(product);
  });

  Object.entries(groupedProducts).forEach(([group, groupProducts]) => {
    const groupSection = document.createElement('div');
    groupSection.className = 'product-group';
    groupSection.innerHTML = `<div class="group-header"><h2 class="group-title">${group}</h2></div>`;

    // Container para o slider funcionar
    const sliderContainer = document.createElement('div');
    sliderContainer.className = 'slider-container';

    const productsGrid = document.createElement('div');
    productsGrid.className = 'products-grid';

    groupProducts.forEach(product => {
      const card = document.createElement('div');
      card.className = 'product-card';
      const carousel = createCarousel(product);
      
      card.innerHTML = `
        ${carousel}
        <div class="product-info">
          <h3>${product.name}</h3>
          <p class="price">R$ ${parseFloat(product.price).toFixed(2)}</p>
          <button class="buy-button" data-id="${product.id}">Solicitar Produto</button>
        </div>
      `;

      productsGrid.appendChild(card);
      initializeCarousel(card, product.images ? product.images.length : 0);
    });

    sliderContainer.appendChild(productsGrid);
    groupSection.appendChild(sliderContainer);
    productList.appendChild(groupSection);
  });
}

// Funções auxiliares visuais e Carrossel
function createCarousel(product) {
  if (!product.images || !product.images.length) {
       // Imagem padrão se não houver
       return `<div class="product-carousel" data-product-id="${product.id}"><img src="https://via.placeholder.com/150" alt="${product.name}"></div>`;
  }
  
  return `
    <div class="product-carousel" data-product-id="${product.id}">
      <div class="carousel-images" style="width: ${product.images.length * 100}%">
        ${product.images.map(url => `
          <img src="${url}" alt="${product.name}" style="width: ${100 / product.images.length}%">
        `).join('')}
      </div>
      ${product.images.length > 1 ? `
        <button class="slider-btn prev" style="left:5px">&lt;</button>
        <button class="slider-btn next" style="right:5px">&gt;</button>
      ` : ''}
    </div>
  `;
}

function initializeCarousel(cardElement, imageCount) {
  if (imageCount <= 1) return;
  const carousel = cardElement.querySelector('.carousel-images');
  const prevBtn = cardElement.querySelector('.slider-btn.prev');
  const nextBtn = cardElement.querySelector('.slider-btn.next');
  let currentIndex = 0;

  function update() {
    carousel.style.transform = `translateX(-${currentIndex * (100 / imageCount)}%)`;
  }
  // Use stopPropagation para clicar na seta não abrir o modal
  prevBtn?.addEventListener('click', (e) => { e.stopPropagation(); currentIndex = (currentIndex - 1 + imageCount) % imageCount; update(); });
  nextBtn?.addEventListener('click', (e) => { e.stopPropagation(); currentIndex = (currentIndex + 1) % imageCount; update(); });
}
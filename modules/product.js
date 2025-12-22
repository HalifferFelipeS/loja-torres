// Busca produtos do Netlify Functions (Banco de Dados)
export async function getProducts() {
  try {
    const res = await fetch('/.netlify/functions/products');
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
    const gName = product.group || 'Geral';
    if (!groupedProducts[gName]) groupedProducts[gName] = [];
    groupedProducts[gName].push(product);
  });

  Object.entries(groupedProducts).forEach(([group, groupProducts]) => {
    const groupSection = document.createElement('div');
    groupSection.className = 'product-group';
    groupSection.innerHTML = `<h2 class="group-title">${group}</h2>`;

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
          <p class="description">${product.description}</p>
          <button class="buy-button" data-id="${product.id}">Comprar pelo WhatsApp</button>
        </div>
      `;

      productsGrid.appendChild(card);
      initializeCarousel(card, product.images.length);
    });

    groupSection.appendChild(productsGrid);
    productList.appendChild(groupSection);
  });

  // Modal de Detalhes
  if (!document.getElementById('product-modal')) {
    const modalHTML = `
      <div id="product-modal" class="modal">
        <div class="modal-content">
          <span class="close-modal modal-close">×</span>
          <div class="modal-carousel">
            <img class="modal-image" src="" alt="Detalhe">
            <button class="carousel-button prev">&lt;</button>
            <button class="carousel-button next">&gt;</button>
          </div>
          <div class="modal-details"></div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }
  setupImageClickHandlers(products);
}

// Funções auxiliares visuais
function createCarousel(product) {
  if (!product.images || !product.images.length) return '';
  return `
    <div class="product-carousel" data-product-id="${product.id}">
      <div class="carousel-images" style="width: ${product.images.length * 100}%">
        ${product.images.map(url => `
          <img src="${url}" alt="${product.name}" style="width: ${100 / product.images.length}%">
        `).join('')}
      </div>
      ${product.images.length > 1 ? `
        <button class="carousel-button prev">&lt;</button>
        <button class="carousel-button next">&gt;</button>
      ` : ''}
    </div>
  `;
}

function initializeCarousel(cardElement, imageCount) {
  if (imageCount <= 1) return;
  const carousel = cardElement.querySelector('.carousel-images');
  const prevBtn = cardElement.querySelector('.carousel-button.prev');
  const nextBtn = cardElement.querySelector('.carousel-button.next');
  let currentIndex = 0;

  function update() {
    carousel.style.transform = `translateX(-${currentIndex * (100 / imageCount)}%)`;
  }
  prevBtn?.addEventListener('click', (e) => { e.stopPropagation(); currentIndex = (currentIndex - 1 + imageCount) % imageCount; update(); });
  nextBtn?.addEventListener('click', (e) => { e.stopPropagation(); currentIndex = (currentIndex + 1) % imageCount; update(); });
}

function setupImageClickHandlers(allProducts) {
    const modal = document.getElementById('product-modal');
    if(!modal) return;
    
    // Configuração do Modal (simplificada para brevidade, usa lógica padrão)
    const closeBtns = modal.querySelectorAll('.close-modal, .modal-close');
    closeBtns.forEach(btn => btn.addEventListener('click', () => modal.style.display = 'none'));
    
    window.onclick = (e) => { if (e.target == modal) modal.style.display = 'none'; };

    document.querySelectorAll('.product-carousel').forEach(carousel => {
        carousel.addEventListener('click', () => {
            const id = carousel.getAttribute('data-product-id');
            const product = allProducts.find(p => String(p.id) === String(id));
            if(product) {
                const details = modal.querySelector('.modal-details');
                const img = modal.querySelector('.modal-image');
                img.src = product.images[0];
                details.innerHTML = `<h3>${product.name}</h3><p>R$ ${product.price.toFixed(2)}</p><p>${product.description}</p>`;
                modal.style.display = 'flex';
            }
        });
    });
}
import { getProducts } from './modules/product.js';
import { incrementClicks } from './modules/adminStats.js';

document.addEventListener('DOMContentLoaded', async () => {
  const products = await getProducts();
  
  renderProductSliders(products);
  initializeSidebar(products);
  initializeSearch(products);
  setupGlobalClicks(products);
  setupAdminSecret();
});

// --- RENDERIZA OS SLIDERS DA PÁGINA PRINCIPAL ---
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
    const groupId = `group-${group.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;

    const groupSection = document.createElement('div');
    groupSection.className = 'product-group';
    groupSection.id = groupId;
    
    groupSection.innerHTML = `
        <div class="group-header">
            <h2 class="group-title">${group}</h2>
        </div>
    `;

    const sliderContainer = document.createElement('div');
    sliderContainer.className = 'slider-container';

    // Setas do grupo de produtos
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
      
      // Lógica do Carrossel Pequeno (Card)
      const images = product.images && product.images.length ? product.images : ['https://via.placeholder.com/150'];
      const hasMultiple = images.length > 1;
      
      let imagesHTML = `<div class="carousel-images" style="width: ${images.length * 100}%;">`;
      images.forEach(img => {
          imagesHTML += `<img src="${img}" alt="${product.name}" style="width: ${100/images.length}%">`;
      });
      imagesHTML += `</div>`;

      // Setas internas do cartão
      let controlsHTML = '';
      if(hasMultiple) {
          controlsHTML = `
            <div class="slider-btn prev" data-action="prev" style="left: 5px;">&lt;</div>
            <div class="slider-btn next" data-action="next" style="right: 5px;">&gt;</div>
          `;
      }

      card.innerHTML = `
        <div class="product-carousel" data-id="${product.id}" data-total="${images.length}">
             ${imagesHTML}
             ${controlsHTML}
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

  setupScrollObserver();
  setupCardCarouselEvents(); // Ativa as setas dos cartões
}

// --- CONTROLE DOS CARROSSEIS PEQUENOS (CARDS) ---
function setupCardCarouselEvents() {
    document.querySelectorAll('.product-carousel').forEach(carousel => {
        const track = carousel.querySelector('.carousel-images');
        const total = parseInt(carousel.getAttribute('data-total'));
        let current = 0;

        carousel.querySelectorAll('.slider-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Não abre o modal
                const action = btn.getAttribute('data-action');
                
                if(action === 'next') current = (current + 1) % total;
                else current = (current - 1 + total) % total;
                
                track.style.transform = `translateX(-${current * (100 / total)}%)`;
            });
        });
    });
}

// --- MODAL COM CARROSSEL GRANDE ---
function setupGlobalClicks(products) {
    // Cria o HTML do modal se não existir
    if (!document.getElementById('product-modal')) {
        const modalHTML = `
        <div id="product-modal" class="modal">
            <div class="modal-content">
                <button class="modal-close">&times;</button>
                <div class="modal-carousel">
                    <button class="modal-btn prev hidden">&lt;</button>
                    <img class="modal-image" src="">
                    <button class="modal-btn next hidden">&gt;</button>
                </div>
                <div class="modal-details"></div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    const modal = document.getElementById('product-modal');
    const modalImg = modal.querySelector('.modal-image');
    const modalDetails = modal.querySelector('.modal-details');
    const prevBtn = modal.querySelector('.modal-btn.prev');
    const nextBtn = modal.querySelector('.modal-btn.next');
    
    // Variáveis de estado do modal
    let currentModalImages = [];
    let currentModalIndex = 0;

    // Fechar modal
    modal.querySelector('.modal-close').onclick = () => modal.style.display = 'none';
    modal.onclick = (e) => { if(e.target === modal) modal.style.display = 'none'; }

    // Função para atualizar imagem do modal
    const updateModalImage = () => {
        modalImg.src = currentModalImages[currentModalIndex];
    };

    // Cliques nas setas do modal
    prevBtn.onclick = () => {
        currentModalIndex = (currentModalIndex - 1 + currentModalImages.length) % currentModalImages.length;
        updateModalImage();
    };
    nextBtn.onclick = () => {
        currentModalIndex = (currentModalIndex + 1) % currentModalImages.length;
        updateModalImage();
    };

    // Clique Global (Delegação de Eventos)
    document.getElementById('product-list').addEventListener('click', (e) => {
        const target = e.target;
        
        // Botão de WhatsApp
        if (target.classList.contains('buy-button')) {
            const id = target.getAttribute('data-id');
            const product = products.find(p => String(p.id) === String(id));
            if(product) redirectToWhatsApp(product);
            return;
        }

        // Clique na imagem (abre modal)
        const carouselClick = target.closest('.product-carousel');
        if (carouselClick && !target.classList.contains('slider-btn')) {
            const id = carouselClick.getAttribute('data-id');
            const product = products.find(p => String(p.id) === String(id));
            
            if(product) {
                // Configura as imagens
                currentModalImages = (product.images && product.images.length) ? product.images : ['https://via.placeholder.com/150'];
                currentModalIndex = 0;
                
                // Mostra/Esconde setas dependendo da qtd
                if(currentModalImages.length > 1) {
                    prevBtn.classList.remove('hidden');
                    nextBtn.classList.remove('hidden');
                } else {
                    prevBtn.classList.add('hidden');
                    nextBtn.classList.add('hidden');
                }

                updateModalImage();
                
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
  window.open(`https://wa.me/554832428800?text=${message}`, '_blank');
}

// --- SIDEBAR E OUTROS ---
function initializeSidebar(products) {
    const sidebarGroups = document.getElementById('sidebar-groups');
    const filterInput = document.getElementById('sidebar-search-input');
    if(!sidebarGroups) return;
    const groups = Array.from(new Set(products.map(p => p.group || p.group_name))).filter(Boolean);
    sidebarGroups.innerHTML = groups.map(g => {
        const groupId = `group-${g.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;
        return `<a href="#" class="sidebar-group-item" data-target="${groupId}">${g}</a>`;
    }).join('');
    
    document.querySelectorAll('.sidebar-group-item').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = e.target.getAttribute('data-target');
            const element = document.getElementById(targetId);
            if(element) {
                const offsetPosition = element.getBoundingClientRect().top + window.pageYOffset - 90;
                window.scrollTo({ top: offsetPosition, behavior: "smooth" });
            }
        });
    });

    if(filterInput) {
        filterInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            sidebarGroups.querySelectorAll('.sidebar-group-item').forEach(item => {
                item.style.display = item.textContent.toLowerCase().includes(term) ? 'block' : 'none';
            });
        });
    }
}

function setupScrollObserver() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                document.querySelectorAll('.sidebar-group-item.active').forEach(el => el.classList.remove('active'));
                const activeLink = document.querySelector(`.sidebar-group-item[data-target="${entry.target.id}"]`);
                if(activeLink) activeLink.classList.add('active');
            }
        });
    }, { rootMargin: '-20% 0px -60% 0px' });
    document.querySelectorAll('.product-group').forEach(section => observer.observe(section));
}

function initializeSearch(allProducts) {
    document.getElementById('search-input').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        if(!term) { renderProductSliders(allProducts); return; }
        const filtered = allProducts.filter(p => p.name.toLowerCase().includes(term));
        renderProductSliders(filtered);
    });
}

function setupAdminSecret() {
    const brandTitle = document.getElementById('brand-title-trigger');
    const adminBtn = document.getElementById('admin-secret-btn');
    let clicks = 0; let timer;
    if(brandTitle && adminBtn) {
        brandTitle.addEventListener('click', () => {
            clicks++;
            clearTimeout(timer);
            timer = setTimeout(() => { clicks = 0; }, 1000);
            if(clicks === 3) {
                adminBtn.classList.add('revealed');
                alert('Modo Administrador Revelado!');
                clicks = 0;
            }
        });
    }
}

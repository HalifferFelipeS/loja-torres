import { getProducts } from './modules/product.js';
import { incrementClicks, incrementViews } from './modules/adminStats.js';

document.addEventListener('DOMContentLoaded', async () => {
  const products = await getProducts();
  
  // Conta uma visualização de página assim que carrega
  incrementViews();

  renderProductSliders(products);
  initializeSidebar(products);
  initializeSearch(products);
  setupGlobalClicks(products);
  setupAdminSecret();
});

function renderProductSliders(products) {
  const productList = document.getElementById('product-list');
  productList.innerHTML = '';

  const groupedProducts = {};
  products.forEach(product => {
    const groupName = product.group || product.group_name || 'Geral';
    if (!groupedProducts[groupName]) groupedProducts[groupName] = [];
    groupedProducts[groupName].push(product);
  });

  const sortedGroups = Object.keys(groupedProducts).sort((a, b) => a.localeCompare(b));

  sortedGroups.forEach(group => {
    const groupProducts = groupedProducts[group];
    const groupId = `group-${group.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;

    const groupSection = document.createElement('div');
    groupSection.className = 'product-group';
    groupSection.id = groupId;
    
    groupSection.innerHTML = `<div class="group-header"><h2 class="group-title">${group}</h2></div>`;

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
      const hasMultiple = images.length > 1;
      
      let imagesHTML = `<div class="carousel-images" style="width: ${images.length * 100}%;">`;
      images.forEach(img => {
          imagesHTML += `<img src="${img}" alt="${product.name}" style="width: ${100/images.length}%">`;
      });
      imagesHTML += `</div>`;

      let controlsHTML = '';
      if(hasMultiple) {
          controlsHTML = `
            <div class="slider-btn prev" data-action="prev" style="left: 5px;">&lt;</div>
            <div class="slider-btn next" data-action="next" style="right: 5px;">&gt;</div>
          `;
      }

      const priceVal = parseFloat(product.price);
      let priceHTML = (priceVal > 0) ? `<p class="price">R$ ${priceVal.toFixed(2)}</p>` : `<p class="price" style="visibility:hidden">.</p>`;

      card.innerHTML = `
        <div class="product-carousel" data-id="${product.id}" data-total="${images.length}">
             ${imagesHTML}
             ${controlsHTML}
        </div>
        <div class="product-info">
          <h3>${product.name}</h3>
          ${priceHTML}
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
  setupCardCarouselEvents();
}

function setupCardCarouselEvents() {
    document.querySelectorAll('.product-carousel').forEach(carousel => {
        const track = carousel.querySelector('.carousel-images');
        const total = parseInt(carousel.getAttribute('data-total'));
        let current = 0;
        carousel.querySelectorAll('.slider-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.getAttribute('data-action');
                if(action === 'next') current = (current + 1) % total;
                else current = (current - 1 + total) % total;
                track.style.transform = `translateX(-${current * (100 / total)}%)`;
            });
        });
    });
}

function setupGlobalClicks(products) {
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
    
    let currentModalImages = [];
    let currentModalIndex = 0;

    modal.querySelector('.modal-close').onclick = () => modal.style.display = 'none';
    modal.onclick = (e) => { if(e.target === modal) modal.style.display = 'none'; }

    const updateModalImage = () => {
        modalImg.src = currentModalImages[currentModalIndex];
    };

    prevBtn.onclick = () => {
        currentModalIndex = (currentModalIndex - 1 + currentModalImages.length) % currentModalImages.length;
        updateModalImage();
    };
    nextBtn.onclick = () => {
        currentModalIndex = (currentModalIndex + 1) % currentModalImages.length;
        updateModalImage();
    };

    document.getElementById('product-list').addEventListener('click', (e) => {
        const target = e.target;
        
        // 1. CLIQUE NA LISTA PRINCIPAL
        if (target.classList.contains('buy-button')) {
            const id = target.getAttribute('data-id');
            const product = products.find(p => String(p.id) === String(id));
            if(product) redirectToWhatsApp(product);
            return;
        }

        // 2. ABRIR MODAL
        const carouselClick = target.closest('.product-carousel');
        if (carouselClick && !target.classList.contains('slider-btn')) {
            const id = carouselClick.getAttribute('data-id');
            const product = products.find(p => String(p.id) === String(id));
            
            if(product) {
                currentModalImages = (product.images && product.images.length) ? product.images : ['https://via.placeholder.com/150'];
                currentModalIndex = 0;
                
                if(currentModalImages.length > 1) {
                    prevBtn.classList.remove('hidden');
                    nextBtn.classList.remove('hidden');
                } else {
                    prevBtn.classList.add('hidden');
                    nextBtn.classList.add('hidden');
                }
                updateModalImage();
                
                const priceVal = parseFloat(product.price);
                const priceText = (priceVal > 0) ? `R$ ${priceVal.toFixed(2)}` : '';

                // GERA O BOTÃO COM ID PARA ADICIONAR O EVENTO DEPOIS
                modalDetails.innerHTML = `
                    <h3>${product.name}</h3>
                    <p class="price">${priceText}</p>
                    <p>${product.description || 'Sem descrição.'}</p>
                    <button id="modal-whatsapp-btn" class="buy-button">Pedir no WhatsApp</button>
                `;
                
                // 3. CLIQUE DENTRO DO MODAL
                document.getElementById('modal-whatsapp-btn').onclick = () => {
                    redirectToWhatsApp(product);
                };
                
                modal.style.display = 'flex';
                // (Opcional: se quiser contar 'abertura de modal' como view, chame incrementViews() aqui também)
            }
        }
    });
}

// FUNÇÃO CORRIGIDA: AGORA CONTA O CLIQUE
function redirectToWhatsApp(product) {
  incrementClicks(); // <--- O CONTADOR ESTÁ AQUI
  
  const priceVal = parseFloat(product.price);
  const priceMsg = (priceVal > 0) ? `(R$ ${priceVal.toFixed(2)})` : '(Preço a consultar)';
  const message = encodeURIComponent(`Olá, vi no site e tenho interesse em: ${product.name} ${priceMsg}`);
  
  window.open(`https://wa.me/554832428800?text=${message}`, '_blank');
}

// ... Restante das funções (initializeSidebar, etc) iguais ao anterior ...
function initializeSidebar(products) {
    const sidebarGroups = document.getElementById('sidebar-groups');
    const filterInput = document.getElementById('sidebar-search-input');
    if(!sidebarGroups) return;

    let groups = Array.from(new Set(products.map(p => p.group || p.group_name))).filter(Boolean);
    groups.sort((a, b) => a.localeCompare(b));

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
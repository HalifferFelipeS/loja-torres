import { getProducts, renderProducts, getGroups } from './modules/product.js';
import { incrementClicks, incrementViews } from './modules/adminStats.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Carrega produtos do Banco de Dados
  const products = await getProducts();
  renderProducts(products);
  
  // Inicializa barra lateral e pesquisa
  await initializeSidebar();
  initializeSearch(products);

  const productList = document.getElementById('product-list');

  // Evento de Clique (Comprar)
  productList.addEventListener('click', event => {
    if (event.target.classList.contains('buy-button')) {
      const productId = event.target.getAttribute('data-id');
      const product = products.find(p => String(p.id) === String(productId));
      if(product) {
          redirectToWhatsApp(product);
          incrementClicks(); // Salva no banco
      }
    }
  });

  // Evento de Visualização (Simples)
  productList.addEventListener('mouseover', event => {
    if (event.target.closest('.product-card')) {
       // incrementViews(); // Descomente para ativar contagem de views
    }
  });
});

function initializeSearch(allProducts) {
  const searchInput = document.getElementById('search-input');
  const filterSelect = document.getElementById('filter-select');
  const suggestionsList = document.getElementById('search-suggestions');

  if(!searchInput) return;

  // Preenche filtro
  const groups = new Set(allProducts.map(p => p.group));
  filterSelect.innerHTML = '<option value="">Todos os grupos</option>';
  groups.forEach(g => { if(g) filterSelect.innerHTML += `<option value="${g}">${g}</option>`; });

  function doSearch() {
      const term = searchInput.value.toLowerCase();
      const group = filterSelect.value;
      
      const filtered = allProducts.filter(p => {
          const mGroup = !group || p.group === group;
          const mTerm = p.name.toLowerCase().includes(term) || p.description.toLowerCase().includes(term);
          return mGroup && mTerm;
      });
      
      renderProducts(filtered);
  }

  searchInput.addEventListener('input', doSearch);
  filterSelect.addEventListener('change', doSearch);
}

async function initializeSidebar() {
  const sidebarGroups = document.getElementById('sidebar-groups');
  if(!sidebarGroups) return;
  
  const groups = await getGroups();
  sidebarGroups.innerHTML = groups.map(g => `
    <a href="#" class="sidebar-group-item" data-group="${g}">${g}</a>
  `).join('');
  
  sidebarGroups.addEventListener('click', (e) => {
      const item = e.target.closest('.sidebar-group-item');
      if(item) {
          e.preventDefault();
          const groupTitle = Array.from(document.querySelectorAll('.group-title'))
              .find(el => el.textContent === item.dataset.group);
          if(groupTitle) groupTitle.scrollIntoView({behavior: 'smooth'});
      }
  });
}

function redirectToWhatsApp(product) {
  const message = encodeURIComponent(`Olá, tenho interesse em: ${product.name} (R$ ${product.price.toFixed(2)})`);
  window.open(`https://wa.me/554832428800?text=${message}`, '_blank');
}
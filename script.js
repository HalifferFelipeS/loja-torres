// script.js
import { getProducts, renderProducts } from './modules/product.js';
import { incrementClicks, incrementViews } from './modules/adminStats.js';

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Carrega produtos do Banco de Dados (espera chegar)
  const products = await getProducts();
  
  // 2. Renderiza na tela
  renderProducts(products);
  
  // 3. Inicializa as funcionalidades passando os produtos já carregados
  initializeSearch(products);
  initializeSidebar(products);

  // --- Eventos de Clique nos Produtos ---
  const productList = document.getElementById('product-list');

  productList.addEventListener('click', event => {
    if (event.target.classList.contains('buy-button')) {
      const productId = event.target.getAttribute('data-id');
      // Comparação flexível (string vs number) para garantir que ache o ID
      const product = products.find(p => String(p.id) === String(productId));
      if (product) {
          redirectToWhatsApp(product);
          incrementClicks();
      }
    }
  });

  productList.addEventListener('mouseover', event => {
    if (event.target.closest('.product-card')) {
      // incrementViews(); // Opcional: descomente para contar visualizações
    }
  });
});

function initializeSearch(allProducts) {
  const searchContainer = document.getElementById('search-container');
  const searchInput = document.getElementById('search-input');
  const suggestionsList = document.getElementById('search-suggestions');
  const filterSelect = document.getElementById('filter-select');
  
  if(!searchInput) return;

  // Extrai grupos únicos dos produtos
  const groups = new Set(allProducts.map(p => p.group || p.group_name)); // Suporta ambas nomenclaturas
  
  // Preenche o filtro principal
  filterSelect.innerHTML = '<option value="">Todos os grupos</option>';
  groups.forEach(group => {
    if (group) {
      filterSelect.innerHTML += `<option value="${group}">${group}</option>`;
    }
  });

  let currentSuggestions = [];

  function fuzzyMatch(str, pattern) {
    if(!str) return false;
    pattern = pattern.toLowerCase();
    str = str.toLowerCase();
    let patternIdx = 0;
    let strIdx = 0;
    while (patternIdx < pattern.length && strIdx < str.length) {
      if (pattern[patternIdx] === str[strIdx]) patternIdx++;
      strIdx++;
    }
    return patternIdx === pattern.length;
  }

  function updateSuggestions() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedGroup = filterSelect.value;
    
    // Filtra produtos
    const filtered = allProducts.filter(product => {
        const pGroup = product.group || product.group_name;
        const matchesGroup = !selectedGroup || pGroup === selectedGroup;
        const matchesSearch = !searchTerm || (
            fuzzyMatch(product.name, searchTerm) || 
            fuzzyMatch(product.description, searchTerm)
        );
        return matchesGroup && matchesSearch;
    });

    // Atualiza a grade de produtos na tela
    renderProducts(filtered);

    // Lógica das sugestões (dropdown)
    if (!searchTerm) {
      suggestionsList.style.display = 'none';
      return;
    }

    currentSuggestions = filtered.slice(0, 5);

    if (currentSuggestions.length > 0) {
      suggestionsList.innerHTML = currentSuggestions
        .map((product, index) => `
          <li class="suggestion-item" data-index="${index}">
            <div class="suggestion-content">
              <img src="${product.images && product.images[0] ? product.images[0] : 'https://via.placeholder.com/50'}" alt="${product.name}" class="suggestion-image">
              <div class="suggestion-text">
                <span class="suggestion-name">${product.name}</span>
                <span class="suggestion-group">${product.group || product.group_name}</span>
              </div>
            </div>
          </li>
        `)
        .join('');
      suggestionsList.style.display = 'block';
    } else {
      suggestionsList.style.display = 'none';
    }
  }

  searchInput.addEventListener('input', updateSuggestions);
  filterSelect.addEventListener('change', updateSuggestions);

  suggestionsList.addEventListener('click', (e) => {
    const item = e.target.closest('.suggestion-item');
    if (item) {
      const index = parseInt(item.dataset.index);
      const product = currentSuggestions[index];
      searchInput.value = product.name;
      suggestionsList.style.display = 'none';
      renderProducts([product]);
    }
  });

  document.addEventListener('click', (e) => {
    if (!searchContainer.contains(e.target)) {
      suggestionsList.style.display = 'none';
    }
  });
}

// --- LÓGICA DA SIDEBAR CORRIGIDA ---
function initializeSidebar(allProducts) {
  const sidebarGroups = document.getElementById('sidebar-groups');
  const sidebarFilter = document.getElementById('sidebar-filter-select');
  const sidebarSearch = document.getElementById('sidebar-search-input');
  
  if(!sidebarGroups || !allProducts) return;

  // 1. Extrai grupos (usando os produtos já carregados)
  const groups = Array.from(new Set(allProducts.map(p => p.group || p.group_name))).filter(Boolean);

  // 2. Preenche o select da Sidebar
  if(sidebarFilter) {
      sidebarFilter.innerHTML = '<option value="">Todos os grupos</option>';
      groups.forEach(g => {
        sidebarFilter.innerHTML += `<option value="${g}">${g}</option>`;
      });
  }

  // 3. Preenche a Lista de Links da Sidebar
  sidebarGroups.innerHTML = groups.map(g => `
    <a href="#" class="sidebar-group-item" data-group="${g}">${g}</a>
  `).join('');

  // 4. Clique no grupo -> Rola até a seção
  sidebarGroups.addEventListener('click', (e) => {
    const item = e.target.closest('.sidebar-group-item');
    if (!item) return;
    e.preventDefault();
    const groupName = item.dataset.group;
    
    // Procura o título do grupo na página
    const headers = Array.from(document.querySelectorAll('.group-title'));
    const header = headers.find(h => h.textContent.trim() === groupName);
    
    if (header) {
        // Rola com um desconto para não ficar escondido atrás do header fixo
        const headerOffset = 100;
        const elementPosition = header.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      
        window.scrollTo({
            top: offsetPosition,
            behavior: "smooth"
        });
    }
  });

  // 5. Sincronia: Sidebar -> Pesquisa Principal
  // Quando digita na sidebar, joga o valor para o input principal e dispara o evento
  if(sidebarSearch) {
      sidebarSearch.addEventListener('input', () => {
        const mainInput = document.getElementById('search-input');
        if (mainInput) {
          mainInput.value = sidebarSearch.value;
          mainInput.dispatchEvent(new Event('input'));
        }
      });
  }

  if(sidebarFilter) {
      sidebarFilter.addEventListener('change', () => {
        const mainFilter = document.getElementById('filter-select');
        if (mainFilter) {
          mainFilter.value = sidebarFilter.value;
          mainFilter.dispatchEvent(new Event('change'));
        }
      });
  }

  // 6. Intersection Observer (Sublinhado Amarelo ao Rolar)
  // Observa as seções de grupo para marcar qual está visível
  const observerOptions = {
    root: null,
    rootMargin: '-20% 0px -60% 0px', // Área ativa no meio da tela
    threshold: 0
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const groupTitle = entry.target.querySelector('.group-title');
        const groupName = groupTitle?.textContent?.trim();
        
        if (groupName) {
          // Remove active de todos
          document.querySelectorAll('.sidebar-group-item.active').forEach(el => el.classList.remove('active'));
          
          // Adiciona active no correspondente (usando aspas duplas escapadas para evitar erro com espaços)
          const match = document.querySelector(`.sidebar-group-item[data-group="${groupName}"]`);
          if (match) match.classList.add('active');
        }
      }
    });
  }, observerOptions);

  // Começa a observar todas as seções de produto criadas
  setTimeout(() => {
      document.querySelectorAll('.product-group').forEach(section => observer.observe(section));
  }, 500); // Pequeno delay para garantir que o renderProducts terminou
}

function redirectToWhatsApp(product) {
  const message = encodeURIComponent(`Olá, estou interessado no produto: ${product.name} por R$ ${product.price.toFixed(2)}`);
  const whatsappNumber = '+554832428800';
  const url = `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${message}`;
  window.open(url, '_blank');
}
import { getProducts, addProductToDB, deleteProductFromDB, calculateProfit } from './modules/adminProducts.js';
import { getInteractionStats } from './modules/adminStats.js';

document.addEventListener('DOMContentLoaded', () => {
    let editingProduct = null;
    let allProducts = [];
    let currentPage = 1;
    const itemsPerPage = 15;
    let searchTerm = "";

    const loginSection = document.getElementById('login-section');
    const registerSection = document.getElementById('register-section');
    const dashboard = document.getElementById('admin-dashboard');
    const logoutBtn = document.getElementById('logout-button');
    const loginForm = document.getElementById('admin-login-form');
    const registerForm = document.getElementById('admin-register-form');
    
    // Navegação
    document.getElementById('show-register')?.addEventListener('click', (e) => {
        e.preventDefault(); loginSection.classList.add('hidden'); registerSection.classList.remove('hidden');
    });
    document.getElementById('show-login')?.addEventListener('click', (e) => {
        e.preventDefault(); registerSection.classList.add('hidden'); loginSection.classList.remove('hidden');
    });
    document.getElementById('logout-button')?.addEventListener('click', (e) => {
        e.preventDefault(); localStorage.removeItem('adminLoggedIn'); window.location.reload();
    });

    checkLoginStatus();

    // --- LOGIN ---
    if(loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('admin-username').value;
            const password = document.getElementById('admin-password').value;
            const btn = loginForm.querySelector('button');
            btn.innerText = "Verificando..."; btn.disabled = true;
            try {
                const res = await fetch('/api/auth', { method: 'POST', body: JSON.stringify({ action: 'login', email, password }) });
                const data = await res.json().catch(() => ({}));
                if (res.ok && data.success) { localStorage.setItem('adminLoggedIn', 'true'); checkLoginStatus(); }
                else { 
                    if(email === 'admin@torres.com' && password === 'admin123') { localStorage.setItem('adminLoggedIn', 'true'); checkLoginStatus(); }
                    else { alert(data.error || 'Dados incorretos.'); }
                }
            } catch(e) { console.error(e); alert('Erro de conexão.'); } 
            finally { btn.innerText = "Entrar"; btn.disabled = false; }
        });
    }

    // --- REGISTRO ---
    if(registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('register-admin-email').value;
            const password = document.getElementById('register-admin-password').value;
            const confirm = document.getElementById('register-admin-password-confirm').value;
            if(password !== confirm) return alert('Senhas não batem.');
            const btn = registerForm.querySelector('button');
            btn.innerText = "Criando..."; btn.disabled = true;
            try {
                const res = await fetch('/api/auth', { method: 'POST', body: JSON.stringify({ action: 'register', email, password }) });
                const data = await res.json();
                if(res.ok) { alert('Admin criado!'); registerSection.classList.add('hidden'); loginSection.classList.remove('hidden'); }
                else { alert('Erro: ' + (data.error || 'Falha ao cadastrar.')); }
            } catch(e) { alert('Erro de conexão.'); }
            finally { btn.innerText = "Registrar e Entrar"; btn.disabled = false; }
        });
    }

    function checkLoginStatus() {
        const isLogged = localStorage.getItem('adminLoggedIn') === 'true';
        if(isLogged) {
            loginSection.classList.add('hidden'); registerSection.classList.add('hidden');
            dashboard.classList.remove('hidden'); logoutBtn.classList.remove('hidden');
            loadDashboardData();
        } else {
            loginSection.classList.remove('hidden'); dashboard.classList.add('hidden');
            logoutBtn.classList.add('hidden');
        }
    }

    async function loadDashboardData() {
        const products = await getProducts();
        allProducts = products.sort((a, b) => {
            const groupA = (a.group || a.group_name || '').toLowerCase();
            const groupB = (b.group || b.group_name || '').toLowerCase();
            if (groupA < groupB) return -1;
            if (groupA > groupB) return 1;
            return a.name.localeCompare(b.name);
        });

        filterAndRenderTable();
        updateStats();
        setupProductForm();
        updateGroupSelect(allProducts);
        setupSearchAndPagination();
    }

    function setupSearchAndPagination() {
        const searchInput = document.getElementById('admin-search-input');
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');

        searchInput.addEventListener('input', (e) => {
            searchTerm = e.target.value.toLowerCase();
            currentPage = 1;
            filterAndRenderTable();
        });
        prevBtn.addEventListener('click', () => { if (currentPage > 1) { currentPage--; filterAndRenderTable(); } });
        nextBtn.addEventListener('click', () => { currentPage++; filterAndRenderTable(); });
    }

    function filterAndRenderTable() {
        const filtered = allProducts.filter(p => {
            const name = p.name.toLowerCase();
            const group = (p.group || p.group_name || '').toLowerCase();
            return name.includes(searchTerm) || group.includes(searchTerm);
        });
        const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
        if (currentPage > totalPages) currentPage = totalPages;
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const visibleItems = filtered.slice(start, end);

        const tbody = document.querySelector('#product-table tbody');
        tbody.innerHTML = visibleItems.map(p => `
            <tr>
                <td title="${p.group || '-'}">${p.group || p.group_name || '-'}</td>
                <td title="${p.name}">${p.name}</td>
                <td>R$ ${parseFloat(p.price).toFixed(2)}</td>
                <td>
                   <button class="action-btn btn-edit" data-id="${p.id}">Editar</button>
                   <button class="action-btn btn-delete" data-id="${p.id}">Excluir</button>
                </td>
            </tr>
        `).join('');

        document.getElementById('page-info').innerText = `Página ${currentPage} de ${totalPages}`;
        document.getElementById('prev-page').disabled = currentPage === 1;
        document.getElementById('next-page').disabled = currentPage === totalPages;
        attachTableEvents(visibleItems);
    }

    function attachTableEvents(currentItems) {
        const tbody = document.querySelector('#product-table tbody');
        tbody.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if(confirm('Apagar produto?')) {
                    await deleteProductFromDB(e.target.dataset.id);
                    loadDashboardData();
                }
            });
        });
        tbody.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                const product = currentItems.find(p => String(p.id) === String(id));
                if(product) fillFormForEdit(product);
            });
        });
    }

    function fillFormForEdit(product) {
        editingProduct = product;
        document.getElementById('product-name').value = product.name;
        document.getElementById('product-price').value = product.price;
        document.getElementById('product-description').value = product.description;
        
        const select = document.getElementById('product-group');
        const groupName = product.group || product.group_name;
        select.value = groupName;
        if(select.value !== groupName) document.getElementById('new-group').value = groupName;

        const previewDiv = document.getElementById('image-preview');
        previewDiv.innerHTML = '';
        
        if(product.images && product.images.length) {
            product.images.forEach((url, index) => {
                addThumbnailToPreview(url, index + 1);
            });
        }
        
        // Valida logo de cara para garantir que está tudo certo
        validateOrder();

        const formBtn = document.querySelector('#product-form button[type="submit"]');
        formBtn.innerText = "Salvar Alterações (Modo Edição)";
        formBtn.style.backgroundColor = "#F59E0B"; 
        document.getElementById('product-form').scrollIntoView({ behavior: 'smooth' });
    }

    // --- FUNÇÃO DE VALIDAÇÃO DE NÚMEROS REPETIDOS ---
    function validateOrder() {
        const inputs = document.querySelectorAll('.order-input');
        const saveBtn = document.querySelector('#product-form button[type="submit"]');
        
        // 1. Coleta os valores
        const values = {};
        let hasDuplicates = false;

        inputs.forEach(input => {
            const val = input.value;
            if(values[val]) {
                values[val]++;
                hasDuplicates = true;
            } else {
                values[val] = 1;
            }
        });

        // 2. Marca os erros (bordas vermelhas)
        inputs.forEach(input => {
            if(values[input.value] > 1) {
                input.classList.add('input-error');
            } else {
                input.classList.remove('input-error');
            }
        });

        // 3. Bloqueia ou libera o botão
        if(hasDuplicates) {
            saveBtn.disabled = true;
            saveBtn.innerText = "Números Duplicados! Corrija para Salvar.";
            saveBtn.style.backgroundColor = "#ff4444";
        } else {
            saveBtn.disabled = false;
            // Restaura o texto original
            if (editingProduct) {
                saveBtn.innerText = "Salvar Alterações (Modo Edição)";
                saveBtn.style.backgroundColor = "#F59E0B";
            } else {
                saveBtn.innerText = "Salvar Produto";
                saveBtn.style.backgroundColor = ""; // Cor padrão do CSS
            }
        }
    }

    function addThumbnailToPreview(base64Url, orderNumber) {
        const previewDiv = document.getElementById('image-preview');
        const itemDiv = document.createElement('div');
        itemDiv.className = 'preview-item';
        
        const imgBox = document.createElement('div');
        imgBox.className = 'preview-image-box';
        imgBox.style.backgroundImage = `url('${base64Url}')`;
        itemDiv.setAttribute('data-url', base64Url);

        const label = document.createElement('span');
        label.className = 'order-label';
        label.innerText = 'Ordem';

        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'order-input';
        input.value = orderNumber || (previewDiv.children.length + 1);
        
        // --- ESCUTA MUDANÇAS PARA VALIDAR NA HORA ---
        input.addEventListener('input', validateOrder);
        input.addEventListener('keyup', validateOrder);

        const removeBtn = document.createElement('div');
        removeBtn.className = 'remove-btn';
        removeBtn.innerHTML = '×';
        removeBtn.onclick = function(e) {
            itemDiv.remove();
            validateOrder(); // Revalida ao remover
        };

        itemDiv.appendChild(imgBox);
        itemDiv.appendChild(label);
        itemDiv.appendChild(input);
        itemDiv.appendChild(removeBtn);
        previewDiv.appendChild(itemDiv);
    }

    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    const MAX_WIDTH = 800; const MAX_HEIGHT = 800;
                    let width = img.width; let height = img.height;
                    if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } } 
                    else { if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; } }
                    canvas.width = width; canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.7));
                };
            };
            reader.onerror = error => reject(error);
        });
    }

    function setupProductForm() {
        const form = document.querySelector('#product-form form');
        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);

        const imageInput = newForm.querySelector('#product-images');
        
        imageInput.addEventListener('change', function() {
            const currentCount = document.getElementById('image-preview').children.length;
            Array.from(this.files).forEach(async (file, i) => {
                const base64 = await fileToBase64(file);
                addThumbnailToPreview(base64, currentCount + i + 1);
            });
            this.value = ''; 
        });

        newForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = newForm.querySelector('button');
            const originalText = btn.innerText;
            btn.innerText = "Processando..."; btn.disabled = true;

            try {
                const name = document.getElementById('product-name').value;
                const priceVal = document.getElementById('product-price').value;
                const price = priceVal === "" ? 0 : parseFloat(priceVal);
                const desc = document.getElementById('product-description').value;
                const group = document.getElementById('new-group').value || document.getElementById('product-group').value || 'Geral';
                
                const previewItems = Array.from(document.querySelectorAll('.preview-item'));
                
                const itemsWithOrder = previewItems.map(item => {
                    return {
                        url: item.getAttribute('data-url'),
                        order: parseInt(item.querySelector('.order-input').value) || 999
                    };
                });

                itemsWithOrder.sort((a, b) => a.order - b.order);
                const images = itemsWithOrder.map(item => item.url);

                const id = editingProduct ? editingProduct.id : Date.now().toString();
                const newProd = { id, name, price, description: desc, group, images };
                
                await addProductToDB(newProd);
                
                alert('Salvo com sucesso!');
                newForm.reset();
                document.getElementById('image-preview').innerHTML = '';
                editingProduct = null;
                btn.innerText = "Salvar Produto";
                btn.style.backgroundColor = "";
                loadDashboardData();
            } catch(e) {
                alert('Erro: ' + e.message);
                btn.innerText = originalText;
            } finally {
                btn.disabled = false;
                validateOrder(); // Re-checa o botão
            }
        });
    }

    function updateGroupSelect(products) {
        let groups = Array.from(new Set(products.map(p => p.group || p.group_name))).filter(Boolean);
        groups.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
        const select = document.getElementById('product-group');
        select.innerHTML = '<option value="">Selecione...</option>';
        groups.forEach(g => { select.innerHTML += `<option value="${g}">${g}</option>`; });
    }

    async function updateStats() {
        const stats = await getInteractionStats();
        const profit = await calculateProfit();
        document.getElementById('total-clicks').innerText = stats.clicks || 0;
        document.getElementById('total-views').innerText = stats.views || 0;
        document.getElementById('profit-display').innerText = `R$ ${profit.toFixed(2)}`;
    }
});

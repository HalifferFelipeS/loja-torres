import { getProducts, addProductToDB, deleteProductFromDB, calculateProfit } from './modules/adminProducts.js';
import { getInteractionStats } from './modules/adminStats.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTOS ---
    const loginForm = document.getElementById('admin-login-form');
    const registerForm = document.getElementById('admin-register-form');
    const loginSection = document.getElementById('login-section');
    const registerSection = document.getElementById('register-section');
    const dashboard = document.getElementById('admin-dashboard');
    const showRegisterBtn = document.getElementById('show-register');
    const showLoginBtn = document.getElementById('show-login');
    const logoutBtn = document.getElementById('logout-button');
    
    // Elementos internos que precisam aparecer
    const productForm = document.getElementById('product-form');
    const statsSection = document.querySelector('.dashboard-stats');
    const productListSection = document.querySelector('.product-list');

    checkLoginStatus();

    // --- NAVEGAÇÃO ---
    if(showRegisterBtn) showRegisterBtn.addEventListener('click', (e) => { e.preventDefault(); loginSection.classList.add('hidden'); registerSection.classList.remove('hidden'); });
    if(showLoginBtn) showLoginBtn.addEventListener('click', (e) => { e.preventDefault(); registerSection.classList.add('hidden'); loginSection.classList.remove('hidden'); });
    
    if(logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('adminLoggedIn');
            window.location.reload();
        });
    }

    // --- LOGIN (CONECTADO AO BANCO) ---
    if(loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('admin-username').value;
            const password = document.getElementById('admin-password').value;
            const btn = loginForm.querySelector('button');
            const originalText = btn.innerText;
            
            btn.innerText = "Entrando..."; btn.disabled = true;

            try {
                // Tenta conectar no Banco de Dados
                const res = await fetch('/.netlify/functions/auth', {
                    method: 'POST',
                    body: JSON.stringify({ action: 'login', email, password })
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        localStorage.setItem('adminLoggedIn', 'true');
                        checkLoginStatus();
                    } else {
                        alert('Dados incorretos.');
                    }
                } else {
                    // MODO DE EMERGÊNCIA (Caso o banco falhe, deixa entrar com a senha mestra)
                    if (email === 'halifferfromao@gmail.com' && password === '915273fefe') {
                        alert('Aviso: Entrando em modo offline (Banco desconectado).');
                        localStorage.setItem('adminLoggedIn', 'true');
                        checkLoginStatus();
                    } else {
                        alert('Erro ao conectar com o servidor.');
                    }
                }
            } catch (err) {
                // Erro de rede? Tenta emergência
                if (email === 'halifferfromao@gmail.com' && password === '915273fefe') {
                    localStorage.setItem('adminLoggedIn', 'true');
                    checkLoginStatus();
                } else {
                    alert('Erro de conexão.');
                }
            } finally {
                btn.innerText = originalText; btn.disabled = false;
            }
        });
    }

    // --- CADASTRO (CONECTADO AO BANCO) ---
    if(registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('register-admin-email').value;
            const password = document.getElementById('register-admin-password').value;
            const confirm = document.getElementById('register-admin-password-confirm').value;

            if (password !== confirm) return alert('Senhas não conferem');

            const btn = registerForm.querySelector('button');
            btn.innerText = "Criando..."; btn.disabled = true;

            try {
                const res = await fetch('/.netlify/functions/auth', {
                    method: 'POST',
                    body: JSON.stringify({ action: 'register', email, password })
                });

                if (res.ok) {
                    alert('Admin criado! Faça login.');
                    registerSection.classList.add('hidden');
                    loginSection.classList.remove('hidden');
                } else {
                    alert('Erro: Talvez o email já exista.');
                }
            } catch (e) {
                alert('Erro de conexão.');
            } finally {
                btn.innerText = "Registrar"; btn.disabled = false;
            }
        });
    }

    // --- PAINEL ---
    function checkLoginStatus() {
        if(localStorage.getItem('adminLoggedIn') === 'true') {
            if(loginSection) loginSection.classList.add('hidden');
            if(registerSection) registerSection.classList.add('hidden');
            
            if(dashboard) dashboard.classList.remove('hidden');
            if(logoutBtn) logoutBtn.classList.remove('hidden');
            
            // Força exibir os itens internos
            if(productForm) productForm.classList.remove('hidden');
            if(statsSection) statsSection.classList.remove('hidden');
            if(productListSection) productListSection.classList.remove('hidden');
            
            loadDashboardData();
        } else {
            if(loginSection) loginSection.classList.remove('hidden');
            if(dashboard) dashboard.classList.add('hidden');
            if(logoutBtn) logoutBtn.classList.add('hidden');
        }
    }

    async function loadDashboardData() {
        const products = await getProducts();
        renderTable(products);
        updateGroupSelect(products); // Atualiza grupos
        
        const profit = await calculateProfit();
        const profitEl = document.getElementById('profit-display');
        if(profitEl) profitEl.innerText = `R$ ${profit.toFixed(2)}`;

        const stats = await getInteractionStats();
        const clicks = document.getElementById('total-clicks');
        const views = document.getElementById('total-views');
        if(clicks) clicks.innerText = stats.clicks || 0;
        if(views) views.innerText = stats.views || 0;
        
        setupProductForm();
    }

    function renderTable(products) {
        const tbody = document.querySelector('#product-table tbody');
        if(!tbody) return;
        tbody.innerHTML = products.map(p => `
            <tr>
                <td>${p.id}</td>
                <td>${p.group || p.group_name || '-'}</td>
                <td>${p.name}</td>
                <td>R$ ${parseFloat(p.price).toFixed(2)}</td>
                <td><button class="delete-button" data-id="${p.id}">Excluir</button></td>
            </tr>
        `).join('');

        tbody.querySelectorAll('.delete-button').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if(confirm('Excluir?')) {
                    await deleteProductFromDB(e.target.dataset.id);
                    loadDashboardData();
                }
            });
        });
    }
    
    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    function setupProductForm() {
        const form = document.querySelector('#product-form form');
        if(!form) return;
        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);
        
        // Atualiza select ao carregar form
        getProducts().then(updateGroupSelect);

        newForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = newForm.querySelector('button');
            btn.innerText = "Salvando..."; btn.disabled = true;

            try {
                const name = document.getElementById('product-name').value;
                const price = parseFloat(document.getElementById('product-price').value);
                const desc = document.getElementById('product-description').value;
                const group = document.getElementById('new-group').value || document.getElementById('product-group').value || 'Geral';
                
                const imageInput = document.getElementById('product-images');
                let images = [];
                if (imageInput.files.length > 0) {
                    const promises = Array.from(imageInput.files).map(fileToBase64);
                    images = await Promise.all(promises);
                } else {
                    images = ['https://via.placeholder.com/150'];
                }

                const newProd = { id: Date.now().toString(), name, price, description: desc, group, images };
                await addProductToDB(newProd);
                
                alert('Produto Salvo!');
                newForm.reset();
                document.getElementById('image-preview').innerHTML = '';
                loadDashboardData();
            } catch (error) {
                alert('Erro: ' + error.message);
            } finally {
                btn.innerText = "Adicionar Produto"; btn.disabled = false;
            }
        });
    }

    function updateGroupSelect(products) {
        // Se products não for passado, ignora ou busca (já buscamos em loadDashboardData)
        if(!products) return; 
        const groups = new Set(products.map(p => p.group || p.group_name));
        const select = document.getElementById('product-group');
        if(select) {
            select.innerHTML = '<option value="">Selecione um grupo existente</option>';
            groups.forEach(g => { if(g) select.innerHTML += `<option value="${g}">${g}</option>`; });
        }
    }
});
import { getProducts, addProductToDB, deleteProductFromDB, calculateProfit } from './modules/adminProducts.js';
import { getInteractionStats } from './modules/adminStats.js';

document.addEventListener('DOMContentLoaded', () => {
    // Elementos
    const loginForm = document.getElementById('admin-login-form');
    const registerForm = document.getElementById('admin-register-form');
    const loginSection = document.getElementById('login-section');
    const registerSection = document.getElementById('register-section');
    const dashboard = document.getElementById('admin-dashboard');
    const showRegisterBtn = document.getElementById('show-register');
    const showLoginBtn = document.getElementById('show-login');
    const logoutBtn = document.getElementById('logout-button');
    
    // Itens internos do painel
    const productForm = document.getElementById('product-form');
    const statsSection = document.querySelector('.dashboard-stats');
    const productListSection = document.querySelector('.product-list');

    // Inicializa
    checkLoginStatus();

    // --- Navegação ---
    if(showRegisterBtn) showRegisterBtn.addEventListener('click', (e) => { e.preventDefault(); loginSection.classList.add('hidden'); registerSection.classList.remove('hidden'); });
    if(showLoginBtn) showLoginBtn.addEventListener('click', (e) => { e.preventDefault(); registerSection.classList.add('hidden'); loginSection.classList.remove('hidden'); });
    if(logoutBtn) logoutBtn.addEventListener('click', (e) => { e.preventDefault(); localStorage.removeItem('adminLoggedIn'); window.location.reload(); });

    // --- Login ---
    if(loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('admin-username').value;
            const password = document.getElementById('admin-password').value;
            const btn = loginForm.querySelector('button');
            const originalText = btn.innerText;
            btn.innerText = "Entrando..."; btn.disabled = true;

            try {
                const res = await fetch('/.netlify/functions/auth', {
                    method: 'POST',
                    body: JSON.stringify({ action: 'login', email, password })
                });
                
                if(res.ok) {
                    const data = await res.json();
                    if(data.success) {
                        localStorage.setItem('adminLoggedIn', 'true');
                        checkLoginStatus();
                    } else { alert('Dados incorretos.'); }
                } else {
                    // Fallback para emergência
                    if(email === 'halifferfromao@gmail.com' && password === '915273fefe') {
                        alert('Modo Offline Ativado.');
                        localStorage.setItem('adminLoggedIn', 'true');
                        checkLoginStatus();
                    } else { alert('Erro no servidor ao logar.'); }
                }
            } catch(err) {
                if(email === 'halifferfromao@gmail.com' && password === '915273fefe') {
                    localStorage.setItem('adminLoggedIn', 'true');
                    checkLoginStatus();
                } else { alert('Erro de conexão.'); }
            }
            btn.innerText = originalText; btn.disabled = false;
        });
    }

    // --- Cadastro de Admin ---
    if(registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('register-admin-email').value;
            const password = document.getElementById('register-admin-password').value;
            const confirm = document.getElementById('register-admin-password-confirm').value;

            if(password !== confirm) return alert('Senhas não conferem');

            const res = await fetch('/.netlify/functions/auth', {
                method: 'POST',
                body: JSON.stringify({ action: 'register', email, password })
            });
            if(res.ok) {
                alert('Cadastrado! Faça login.');
                registerSection.classList.add('hidden');
                loginSection.classList.remove('hidden');
            } else { alert('Erro ao cadastrar.'); }
        });
    }

    // --- Dashboard ---
    function checkLoginStatus() {
        if(localStorage.getItem('adminLoggedIn') === 'true') {
            if(loginSection) loginSection.classList.add('hidden');
            if(registerSection) registerSection.classList.add('hidden');
            if(dashboard) dashboard.classList.remove('hidden');
            if(logoutBtn) logoutBtn.classList.remove('hidden');
            
            // Força exibir conteúdo interno
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
        
        const profit = await calculateProfit();
        const profitEl = document.getElementById('profit-display');
        if(profitEl) profitEl.innerText = `R$ ${profit.toFixed(2)}`;

        const stats = await getInteractionStats();
        const clicksEl = document.getElementById('total-clicks');
        const viewsEl = document.getElementById('total-views');
        if(clicksEl) clicksEl.innerText = stats.clicks || 0;
        if(viewsEl) viewsEl.innerText = stats.views || 0;
        
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
                <td>R$ ${p.price.toFixed(2)}</td>
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

    // FUNÇÃO QUE CONVERTE IMAGEM PARA TEXTO (BASE64)
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
        updateGroupSelect();

        newForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = newForm.querySelector('button');
            const oldText = btn.innerText;
            btn.innerText = "Salvando..."; btn.disabled = true;

            try {
                const name = document.getElementById('product-name').value;
                const price = parseFloat(document.getElementById('product-price').value);
                const desc = document.getElementById('product-description').value;
                const group = document.getElementById('new-group').value || document.getElementById('product-group').value || 'Geral';
                
                // Processamento das Imagens Reais
                const imageInput = document.getElementById('product-images');
                let images = [];
                
                if (imageInput.files.length > 0) {
                    // Converte todos os arquivos selecionados
                    const promises = Array.from(imageInput.files).map(fileToBase64);
                    images = await Promise.all(promises);
                } else {
                    // Se não escolher imagem, usa placeholder
                    images = ['https://via.placeholder.com/150'];
                }

                const newProd = {
                    id: Date.now().toString(),
                    name,
                    price,
                    description: desc,
                    group,
                    images
                };

                // Enviando para o Banco
                await addProductToDB(newProd);
                
                alert('Produto Salvo com Sucesso!');
                newForm.reset();
                document.getElementById('image-preview').innerHTML = ''; // Limpa preview se tiver
                loadDashboardData();
                
            } catch (error) {
                console.error(error);
                // Mostra o erro real na tela para sabermos o que é
                alert('Erro ao salvar: ' + error.message);
            } finally {
                btn.innerText = oldText; btn.disabled = false;
            }
        });
    }

    async function updateGroupSelect() {
        const products = await getProducts();
        const groups = new Set(products.map(p => p.group || p.group_name));
        const select = document.getElementById('product-group');
        if(select) {
            select.innerHTML = '<option value="">Selecione...</option>';
            groups.forEach(g => { if(g) select.innerHTML += `<option value="${g}">${g}</option>`; });
        }
    }
});
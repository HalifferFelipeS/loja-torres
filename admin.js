import { getProducts, addProductToDB, deleteProductFromDB, calculateProfit } from './modules/adminProducts.js';
import { getInteractionStats } from './modules/adminStats.js';

document.addEventListener('DOMContentLoaded', () => {
    // Elementos
    const loginSection = document.getElementById('login-section');
    const registerSection = document.getElementById('register-section');
    const dashboard = document.getElementById('admin-dashboard');
    const logoutBtn = document.getElementById('logout-button');
    const loginForm = document.getElementById('admin-login-form');
    const registerForm = document.getElementById('admin-register-form');
    
    // Links de navegação
    document.getElementById('show-register')?.addEventListener('click', (e) => {
        e.preventDefault();
        loginSection.classList.add('hidden');
        registerSection.classList.remove('hidden');
    });

    document.getElementById('show-login')?.addEventListener('click', (e) => {
        e.preventDefault();
        registerSection.classList.add('hidden');
        loginSection.classList.remove('hidden');
    });

    document.getElementById('logout-button')?.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('adminLoggedIn');
        window.location.reload();
    });

    // --- VERIFICAÇÃO INICIAL ---
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
                // Tenta conectar no Banco
                const res = await fetch('/api/auth', {
                    method: 'POST',
                    body: JSON.stringify({ action: 'login', email, password })
                });

                if (res.ok) {
                    const data = await res.json();
                    if(data.success) {
                        localStorage.setItem('adminLoggedIn', 'true');
                        checkLoginStatus();
                    } else { alert('Acesso Negado.'); }
                } else {
                    // Fallback para emergência
                    if(email === 'halifferfromao@gmail.com' && password === '915273fefe') {
                        localStorage.setItem('adminLoggedIn', 'true');
                        checkLoginStatus();
                    } else { alert('Erro de conexão.'); }
                }
            } catch(e) {
                if(email === 'halifferfromao@gmail.com' && password === '915273fefe') {
                    localStorage.setItem('adminLoggedIn', 'true');
                    checkLoginStatus();
                } else { alert('Erro de rede.'); }
            } finally {
                btn.innerText = "Entrar"; btn.disabled = false;
            }
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

            const res = await fetch('/.netlify/functions/auth', {
                method: 'POST',
                body: JSON.stringify({ action: 'register', email, password })
            });

            if(res.ok) {
                alert('Admin criado!');
                registerSection.classList.add('hidden');
                loginSection.classList.remove('hidden');
            } else { alert('Erro ao criar admin.'); }
        });
    }

    // --- CONTROLE DE TELA ---
    function checkLoginStatus() {
        const isLogged = localStorage.getItem('adminLoggedIn') === 'true';

        if(isLogged) {
            // Esconde Login e Mostra Dashboard
            loginSection.classList.add('hidden');
            registerSection.classList.add('hidden');
            dashboard.classList.remove('hidden');
            logoutBtn.classList.remove('hidden');
            
            // Carrega dados
            loadDashboardData();
        } else {
            // Mostra Login e Esconde Dashboard
            loginSection.classList.remove('hidden');
            dashboard.classList.add('hidden');
            logoutBtn.classList.add('hidden');
        }
    }

    // --- CARREGAR DADOS ---
    async function loadDashboardData() {
        const products = await getProducts();
        renderTable(products);
        updateStats();
        setupProductForm();
        updateGroupSelect(products);
    }

    function renderTable(products) {
        const tbody = document.querySelector('#product-table tbody');
        tbody.innerHTML = products.map(p => `
            <tr>
                <td>${p.group || '-'}</td>
                <td>${p.name}</td>
                <td>R$ ${parseFloat(p.price).toFixed(2)}</td>
                <td>
                   <button class="action-btn btn-delete" data-id="${p.id}">Excluir</button>
                </td>
            </tr>
        `).join('');

        tbody.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if(confirm('Apagar produto?')) {
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
        // Clone para limpar eventos antigos
        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);

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
                if(imageInput.files.length > 0) {
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
            } catch(e) {
                alert('Erro ao salvar: ' + e.message);
            } finally {
                btn.innerText = "Salvar Produto"; btn.disabled = false;
            }
        });
    }

    function updateGroupSelect(products) {
        const groups = new Set(products.map(p => p.group || p.group_name));
        const select = document.getElementById('product-group');
        select.innerHTML = '<option value="">Selecione...</option>';
        groups.forEach(g => { if(g) select.innerHTML += `<option value="${g}">${g}</option>`; });
    }

    async function updateStats() {
        const stats = await getInteractionStats();
        const profit = await calculateProfit();
        
        document.getElementById('total-clicks').innerText = stats.clicks || 0;
        document.getElementById('total-views').innerText = stats.views || 0;
        document.getElementById('profit-display').innerText = `R$ ${profit.toFixed(2)}`;
    }
});
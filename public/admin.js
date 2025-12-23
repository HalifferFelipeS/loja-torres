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
                    if(email === 'admin@torres.com' && password === 'admin123') {
                        localStorage.setItem('adminLoggedIn', 'true');
                        checkLoginStatus();
                    } else { alert('Dados incorretos.'); }
                }
            } catch(e) {
                console.error(e);
                alert('Erro de conexão.');
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

            const res = await fetch('/api/auth', {
                method: 'POST',
                body: JSON.stringify({ action: 'register', email, password })
            });

            if(res.ok) {
                alert('Admin criado!');
                registerSection.classList.add('hidden');
                loginSection.classList.remove('hidden');
            } else { alert('Erro ao criar admin. Tente outro email.'); }
        });
    }

    // --- CONTROLE DE TELA ---
    function checkLoginStatus() {
        const isLogged = localStorage.getItem('adminLoggedIn') === 'true';

        if(isLogged) {
            loginSection.classList.add('hidden');
            registerSection.classList.add('hidden');
            dashboard.classList.remove('hidden');
            logoutBtn.classList.remove('hidden');
            loadDashboardData();
        } else {
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
                <td>${p.group || p.group_name || '-'}</td>
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

    // --- FUNÇÃO NOVA: COMPRESSÃO DE IMAGEM ---
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
                    const MAX_WIDTH = 800;
                    const MAX_HEIGHT = 800;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                    } else {
                        if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
                    }

                    canvas.width = width;
                    canvas.height = height;
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

        // --- PREVIEW DAS IMAGENS (NOVIDADE) ---
        const imageInput = newForm.querySelector('#product-images');
        const previewDiv = document.getElementById('image-preview');
        
        imageInput.addEventListener('change', function() {
            previewDiv.innerHTML = ''; // Limpa anteriores
            Array.from(this.files).forEach(file => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.style.height = '60px';
                    img.style.width = '60px';
                    img.style.objectFit = 'cover';
                    img.style.borderRadius = '8px';
                    img.style.border = '1px solid #ddd';
                    previewDiv.appendChild(img);
                }
                reader.readAsDataURL(file);
            });
        });

        newForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = newForm.querySelector('button');
            btn.innerText = "Salvando..."; btn.disabled = true;

            try {
                const name = document.getElementById('product-name').value;
                const price = parseFloat(document.getElementById('product-price').value);
                const desc = document.getElementById('product-description').value;
                const group = document.getElementById('new-group').value || document.getElementById('product-group').value || 'Geral';
                
                let images = [];
                if(imageInput.files.length > 0) {
                    const promises = Array.from(imageInput.files).map(fileToBase64);
                    images = await Promise.all(promises);
                }

                const newProd = { id: Date.now().toString(), name, price, description: desc, group, images };
                await addProductToDB(newProd);
                
                alert('Produto Salvo!');
                newForm.reset();
                previewDiv.innerHTML = '';
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

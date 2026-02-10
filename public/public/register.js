import { getClients, saveClients, confirmClient } from './modules/clientAuth.js';

document.addEventListener('DOMContentLoaded', () => {
  const registerForm = document.getElementById('client-register-form');
  const registerSection = document.getElementById('register-section');
  const confirmationSection = document.getElementById('confirmation-section');

  // Handle registration
  registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    if (password !== confirmPassword) {
      alert('As senhas não coincidem.');
      return;
    }
    
    let clients = getClients();
    if (clients.find(c => c.email === email)) {
      alert('Email já cadastrado.');
      return;
    }
    
    const newClient = {
      id: Date.now(),
      email,
      password,
      cart: [],
      confirmed: false,
      confirmationCode: Math.random().toString(36).substr(2, 6)
    };
    
    clients.push(newClient);
    saveClients(clients);
    
    // Show confirmation section
    document.getElementById('confirm-email').textContent = email;
    document.getElementById('confirmation-code').value = '';
    registerSection.classList.add('hidden');
    confirmationSection.classList.remove('hidden');
  });

  // Handle confirmation code
  document.getElementById('confirm-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('confirm-email').textContent;
    const code = document.getElementById('confirmation-code').value;
    const clients = getClients();
    const client = clients.find(c => c.email === email);
    
    if (client && code === client.confirmationCode) {
      confirmClient(email);
      alert('Cadastro confirmado! Agora você pode fazer login.');
      window.location.href = 'login.html';
    } else {
      alert('Código de confirmação inválido.');
    }
  });
});
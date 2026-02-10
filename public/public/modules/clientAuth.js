// modules/clientAuth.js
export function getClients() {
  const clients = localStorage.getItem('clients');
  return clients ? JSON.parse(clients) : [];
}

export function saveClients(clients) {
  localStorage.setItem('clients', JSON.stringify(clients));
}

export function getCurrentClient() {
  const client = localStorage.getItem('currentClient');
  return client ? JSON.parse(client) : null;
}

export function saveCurrentClient(client) {
  localStorage.setItem('currentClient', JSON.stringify(client));
}

export function confirmClient(email) {
  let clients = getClients();
  clients = clients.map(client => {
    if (client.email === email) {
      return { ...client, confirmed: true };
    }
    return client;
  });
  saveClients(clients);
}

export function logoutClient() {
  localStorage.removeItem('currentClient');
}

export function addToCart(productId) {
  const client = getCurrentClient();
  if (!client) return false;
  
  const product = getProducts().find(p => p.id === productId);
  if (!product) return false;
  
  client.cart.push(product);
  saveCurrentClient(client);
  
  const clients = getClients();
  const clientIndex = clients.findIndex(c => c.id === client.id);
  clients[clientIndex] = client;
  saveClients(clients);
  
  return true;
}

export function removeFromCart(productId) {
  const client = getCurrentClient();
  if (!client) return false;
  
  client.cart = client.cart.filter(item => item.id !== productId);
  saveCurrentClient(client);
  
  const clients = getClients();
  const clientIndex = clients.findIndex(c => c.id === client.id);
  clients[clientIndex] = client;
  saveClients(clients);
  
  return true;
}
import { getProducts as fetchProducts } from './product.js';

export async function getProducts() {
  return await fetchProducts();
}

export async function addProductToDB(product) {
  const res = await fetch('/.netlify/functions/products', {
    method: 'POST',
    body: JSON.stringify(product),
    headers: { 'Content-Type': 'application/json' }
  });

  if (!res.ok) {
      const text = await res.text();
      let errorMsg = res.statusText;
      try {
          const json = JSON.parse(text);
          if (json.error) errorMsg = json.error;
      } catch (e) {
          if (text) errorMsg = text;
      }
      throw new Error(`${res.status} - ${errorMsg}`);
  }
  return await res.json(); 
}

export async function deleteProductFromDB(id) {
  const res = await fetch('/.netlify/functions/products', {
    method: 'DELETE',
    body: JSON.stringify({ id }),
    headers: { 'Content-Type': 'application/json' }
  });
  if(!res.ok) throw new Error('Erro ao deletar produto');
}

export async function calculateProfit() {
  const products = await fetchProducts();
  return products.reduce((acc, p) => acc + (parseFloat(p.price) || 0), 0);
}
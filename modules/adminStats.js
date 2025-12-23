export async function getInteractionStats() {
  try {
    // MUDANÇA AQUI: para /api/stats
    const res = await fetch('/api/stats');
    return await res.json();
  } catch (e) {
    return { clicks: 0, views: 0 };
  }
}

export async function incrementClicks() {
  fetch('/api/stats', { method: 'POST', body: JSON.stringify({ type: 'click' }) }).catch(console.error);
}

export async function incrementViews() {
  fetch('/api/stats', { method: 'POST', body: JSON.stringify({ type: 'view' }) }).catch(console.error);
}
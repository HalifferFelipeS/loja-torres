export async function getInteractionStats() {
  try {
    const res = await fetch('/.netlify/functions/stats');
    return await res.json();
  } catch (e) {
    return { clicks: 0, views: 0 };
  }
}

export async function incrementClicks() {
  fetch('/.netlify/functions/stats', { method: 'POST', body: JSON.stringify({ type: 'click' }) }).catch(console.error);
}

export async function incrementViews() {
  fetch('/.netlify/functions/stats', { method: 'POST', body: JSON.stringify({ type: 'view' }) }).catch(console.error);
}
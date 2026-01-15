// Envia o contador para o servidor
export async function incrementClicks() {
    try {
        await fetch('/api/stats', {
            method: 'POST',
            body: JSON.stringify({ type: 'click' })
        });
    } catch (e) {
        console.error("Erro ao contar clique", e);
    }
}

export async function incrementViews() {
    try {
        await fetch('/api/stats', {
            method: 'POST',
            body: JSON.stringify({ type: 'view' })
        });
    } catch (e) {
        console.error("Erro ao contar view", e);
    }
}

export async function getInteractionStats() {
    try {
        const res = await fetch('/api/stats');
        if (!res.ok) return { clicks: 0, views: 0 };
        return await res.json();
    } catch (e) {
        return { clicks: 0, views: 0 };
    }
}
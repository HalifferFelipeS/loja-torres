const { neon } = require('@neondatabase/serverless');

module.exports = async (req, res) => {
    // 1. CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    // 2. Conexão
    if (!process.env.DATABASE_URL) {
        return res.status(500).json({ error: "Banco não conectado" });
    }
    const sql = neon(process.env.DATABASE_URL);

    try {
        // GARANTIA: Cria a tabela e a linha inicial (id=1) se não existirem
        await sql`CREATE TABLE IF NOT EXISTS stats (
            id SERIAL PRIMARY KEY,
            clicks INT DEFAULT 0,
            views INT DEFAULT 0
        )`;
        
        // Insere a linha inicial (se já existir, não faz nada)
        await sql`INSERT INTO stats (id, clicks, views) VALUES (1, 0, 0) ON CONFLICT (id) DO NOTHING`;

        // --- GET: Retorna os números ---
        if (req.method === 'GET') {
            const result = await sql`SELECT * FROM stats WHERE id = 1`;
            return res.status(200).json(result[0]);
        }

        // --- POST: Incrementa ---
        if (req.method === 'POST') {
            let body = req.body;
            if (typeof body === 'string') {
                try { body = JSON.parse(body); } catch(e) {}
            }

            if (body.type === 'click') {
                await sql`UPDATE stats SET clicks = clicks + 1 WHERE id = 1`;
            } else if (body.type === 'view') {
                await sql`UPDATE stats SET views = views + 1 WHERE id = 1`;
            }
            
            return res.status(200).json({ success: true });
        }

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }

    return res.status(405).json({ error: "Método não permitido" });
};
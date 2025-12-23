const { neon } = require('@neondatabase/serverless');

module.exports = async (req, res) => {
    const sql = neon(process.env.DATABASE_URL);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        if (req.method === 'GET') {
            // Tenta pegar estatísticas, se der erro (tabela não existe), retorna zero
            try {
                const rows = await sql`SELECT * FROM stats WHERE id = 1`;
                return res.status(200).json(rows[0] || { clicks: 0, views: 0 });
            } catch (e) {
                return res.status(200).json({ clicks: 0, views: 0 });
            }
        }

        if (req.method === 'POST') {
            const { type } = req.body;
            
            // Garante que a tabela existe (Opcional: Idealmente crie a tabela no Console do Neon)
            // Insere linha 1 se não existir
            await sql`INSERT INTO stats (id, clicks, views) VALUES (1, 0, 0) ON CONFLICT (id) DO NOTHING`;
            
            if (type === 'click') await sql`UPDATE stats SET clicks = clicks + 1 WHERE id = 1`;
            if (type === 'view') await sql`UPDATE stats SET views = views + 1 WHERE id = 1`;
            
            return res.status(200).send("OK");
        }
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
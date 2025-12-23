const { neon } = require('@neondatabase/serverless');

module.exports = async (req, res) => {
    // 1. CORS (Permitir conexão do site)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Resposta rápida para o navegador (Preflight)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 2. Conexão Segura
    if (!process.env.DATABASE_URL) {
        return res.status(500).json({ error: "Conexão com Banco não configurada" });
    }
    const sql = neon(process.env.DATABASE_URL);

    // 3. TRATAMENTO DE DADOS (A CORREÇÃO MÁGICA)
    let body = req.body;
    if (typeof body === 'string') {
        try {
            body = JSON.parse(body);
        } catch (e) {
            // Se falhar, segue o baile (pode ser um GET sem corpo)
        }
    }

    try {
        // --- LEITURA (GET) ---
        if (req.method === 'GET') {
            const rows = await sql`SELECT * FROM products`;
            
            const products = rows.map(p => ({
                id: p.id,
                name: p.name,
                price: parseFloat(p.price),
                description: p.description,
                group: p.group_name, // Nota: no banco é group_name
                images: p.images ? (typeof p.images === 'string' ? JSON.parse(p.images) : p.images) : []
            }));
            
            return res.status(200).json(products);
        }

        // --- CRIAÇÃO (POST) ---
        if (req.method === 'POST') {
            if (!body) return res.status(400).json({ error: "Nenhum dado enviado" });

            // Garante que imagens seja uma string JSON válida para o banco
            const imagesArray = body.images || [];
            const imagesString = JSON.stringify(imagesArray);
            
            // Garante que group não seja nulo
            const groupName = body.group || 'Geral';

            await sql`
                INSERT INTO products (id, name, price, description, group_name, images)
                VALUES (${String(body.id)}, ${body.name}, ${body.price}, ${body.description}, ${groupName}, ${imagesString})
            `;
            return res.status(200).json({ message: "Salvo com sucesso" });
        }

        // --- EXCLUSÃO (DELETE) ---
        if (req.method === 'DELETE') {
            if (!body || !body.id) return res.status(400).json({ error: "ID necessário" });
            
            await sql`DELETE FROM products WHERE id = ${String(body.id)}`;
            return res.status(200).json({ message: "Deletado" });
        }

    } catch (error) {
        console.error("Erro API Products:", error);
        return res.status(500).json({ error: error.message });
    }
    
    return res.status(405).json({ error: "Método não permitido" });
};

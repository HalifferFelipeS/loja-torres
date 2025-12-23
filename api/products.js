const { neon } = require('@neondatabase/serverless');

module.exports = async (req, res) => {
    const sql = neon(process.env.DATABASE_URL);

    // Headers de CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        // LEITURA (GET)
        if (req.method === 'GET') {
            const rows = await sql`SELECT * FROM products`;
            
            const products = rows.map(p => ({
                id: p.id,
                name: p.name,
                price: parseFloat(p.price),
                description: p.description,
                group: p.group_name, 
                images: p.images ? JSON.parse(p.images) : []
            }));
            
            return res.status(200).json(products);
        }

        // CRIAÇÃO (POST)
        if (req.method === 'POST') {
            const data = req.body; // Vercel já faz o parse se o Content-Type for JSON
            const imagesString = JSON.stringify(data.images || []);
            
            await sql`
                INSERT INTO products (id, name, price, description, group_name, images)
                VALUES (${String(data.id)}, ${data.name}, ${data.price}, ${data.description}, ${data.group}, ${imagesString})
            `;
            return res.status(200).json({ message: "Salvo com sucesso" });
        }

        // EXCLUSÃO (DELETE)
        if (req.method === 'DELETE') {
            const { id } = req.body;
            await sql`DELETE FROM products WHERE id = ${String(id)}`;
            return res.status(200).json({ message: "Deletado" });
        }

    } catch (error) {
        console.error("Erro no DB:", error);
        return res.status(500).json({ error: error.message });
    }
    
    return res.status(405).json({ error: "Método não permitido" });
};
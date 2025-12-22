const { neon } = require('@neondatabase/serverless');

exports.handler = async (event) => {
    // Conecta ao banco usando a variável que você configurou no painel
    const sql = neon(process.env.DATABASE_URL);
    
    // Headers para permitir que seu site acesse a função
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    try {
        // LEITURA (GET)
        if (event.httpMethod === 'GET') {
            const rows = await sql`SELECT * FROM products`;
            
            // Tratamento de dados (converte preço para número e imagens de texto para array)
            const products = rows.map(p => ({
                id: p.id,
                name: p.name,
                price: parseFloat(p.price),
                description: p.description,
                group: p.group_name, 
                images: p.images ? JSON.parse(p.images) : []
            }));
            
            return { statusCode: 200, headers, body: JSON.stringify(products) };
        }

        // CRIAÇÃO (POST)
        if (event.httpMethod === 'POST') {
            const data = JSON.parse(event.body);
            // Salva as imagens como uma string JSON no banco
            const imagesString = JSON.stringify(data.images || []);
            
            await sql`
                INSERT INTO products (id, name, price, description, group_name, images)
                VALUES (${String(data.id)}, ${data.name}, ${data.price}, ${data.description}, ${data.group}, ${imagesString})
            `;
            return { statusCode: 200, headers, body: JSON.stringify({ message: "Salvo com sucesso" }) };
        }

        // EXCLUSÃO (DELETE)
        if (event.httpMethod === 'DELETE') {
            const { id } = JSON.parse(event.body);
            await sql`DELETE FROM products WHERE id = ${String(id)}`;
            return { statusCode: 200, headers, body: JSON.stringify({ message: "Deletado" }) };
        }

    } catch (error) {
        console.error("Erro no DB:", error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
    
    return { statusCode: 400, headers, body: "Método não suportado" };
};
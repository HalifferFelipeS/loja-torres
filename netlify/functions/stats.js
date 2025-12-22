const { neon } = require('@neondatabase/serverless');

exports.handler = async (event) => {
    const sql = neon(process.env.DATABASE_URL);
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    try {
        if (event.httpMethod === 'GET') {
            const rows = await sql`SELECT * FROM stats WHERE id = 1`;
            // Se não existir tabela stats, retorna zero
            return { statusCode: 200, headers, body: JSON.stringify(rows[0] || { clicks: 0, views: 0 }) };
        }

        if (event.httpMethod === 'POST') {
            const { type } = JSON.parse(event.body);
            // Garante que a linha ID 1 existe antes de atualizar
            await sql`INSERT INTO stats (id, clicks, views) VALUES (1, 0, 0) ON CONFLICT (id) DO NOTHING`;
            
            if (type === 'click') await sql`UPDATE stats SET clicks = clicks + 1 WHERE id = 1`;
            if (type === 'view') await sql`UPDATE stats SET views = views + 1 WHERE id = 1`;
            
            return { statusCode: 200, headers, body: "OK" };
        }
    } catch (error) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
};
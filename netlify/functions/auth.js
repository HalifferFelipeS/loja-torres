const { neon } = require('@neondatabase/serverless');

exports.handler = async (event) => {
    const sql = neon(process.env.DATABASE_URL);
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'POST') {
        try {
            const { email, password, action } = JSON.parse(event.body);

            // REGISTRAR NOVO ADMIN
            if (action === 'register') {
                const existing = await sql`SELECT email FROM admins WHERE email = ${email}`;
                if (existing.length > 0) {
                    return { statusCode: 400, headers, body: JSON.stringify({ error: "Admin já existe" }) };
                }
                await sql`INSERT INTO admins (email, password) VALUES (${email}, ${password})`;
                return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
            }

            // LOGIN
            if (action === 'login') {
                const users = await sql`SELECT * FROM admins WHERE email = ${email} AND password = ${password}`;
                if (users.length > 0) {
                    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
                } else {
                    return { statusCode: 401, headers, body: JSON.stringify({ error: "Dados inválidos" }) };
                }
            }
        } catch (error) {
            return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
        }
    }
    
    return { statusCode: 400, headers, body: "Método não suportado" };
};
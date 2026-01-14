const { neon } = require('@neondatabase/serverless');

module.exports = async (req, res) => {
    // Conexão com o banco
    const sql = neon(process.env.DATABASE_URL);

    // Permitir que o frontend converse com o backend (CORS)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Responde ao "preflight" do navegador
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method === 'POST') {
        try {
            // Na Vercel, req.body já vem pronto (se for JSON)
            const { email, password, action } = req.body;

            // REGISTRAR NOVO ADMIN
            if (action === 'register') {
                const existing = await sql`SELECT email FROM admins WHERE email = ${email}`;
                if (existing.length > 0) {
                    return res.status(400).json({ error: "Admin já existe" });
                }
                await sql`INSERT INTO admins (email, password) VALUES (${email}, ${password})`;
                return res.status(200).json({ success: true });
            }

            // LOGIN
            if (action === 'login') {
                const users = await sql`SELECT * FROM admins WHERE email = ${email} AND password = ${password}`;
                if (users.length > 0) {
                    return res.status(200).json({ success: true });
                } else {
                    return res.status(401).json({ error: "Dados inválidos" });
                }
            }
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    
    return res.status(405).json({ error: "Método não permitido" });
};
const { neon } = require('@neondatabase/serverless');

module.exports = async (req, res) => {
    // 1. Configurações de Segurança (CORS)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') return res.status(200).end();

    // 2. Conexão com o Banco
    if (!process.env.DATABASE_URL) {
        return res.status(500).json({ error: "DATABASE_URL não configurada na Vercel" });
    }
    const sql = neon(process.env.DATABASE_URL);

    // 3. Lê os dados enviados
    let body = req.body;
    if (typeof body === 'string') {
        try {
            body = JSON.parse(body);
        } catch (e) {
            return res.status(400).json({ error: "JSON inválido" });
        }
    }

    const { email, password, action } = body || {};

    try {
        if (req.method === 'POST') {
            
            // --- CORREÇÃO AUTOMÁTICA: Cria a tabela se ela não existir ---
            await sql`CREATE TABLE IF NOT EXISTS admins (
                id SERIAL PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL
            )`;

            // --- LOGIN ---
            if (action === 'login') {
                const users = await sql`SELECT * FROM admins WHERE email = ${email} AND password = ${password}`;
                
                if (users.length > 0) {
                    return res.status(200).json({ success: true });
                } else {
                    return res.status(401).json({ error: "Email ou senha incorretos" });
                }
            }

            // --- REGISTRO (CRIAR NOVO ADMIN) ---
            if (action === 'register') {
                // Verifica se já existe
                const existing = await sql`SELECT email FROM admins WHERE email = ${email}`;
                if (existing.length > 0) {
                    return res.status(400).json({ error: "Este email já está cadastrado como admin." });
                }

                // Cria novo
                await sql`INSERT INTO admins (email, password) VALUES (${email}, ${password})`;
                return res.status(200).json({ success: true, message: "Administrador criado com sucesso!" });
            }
            
            return res.status(400).json({ error: "Ação inválida" });
        }
    } catch (error) {
        console.error("Erro API Auth:", error);
        return res.status(500).json({ error: "Erro no servidor: " + error.message });
    }
    
    return res.status(405).json({ error: "Método não permitido" });
};
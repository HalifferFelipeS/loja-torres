const { neon } = require('@neondatabase/serverless');

module.exports = async (req, res) => {
    // 1. Configura CORS para permitir que o frontend fale com o backend
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Responde rápido se for apenas uma verificação do navegador (OPTIONS)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 2. Conecta no Banco
    if (!process.env.DATABASE_URL) {
        return res.status(500).json({ error: "DATABASE_URL não configurada na Vercel" });
    }
    const sql = neon(process.env.DATABASE_URL);

    // 3. Processa os dados (A CORREÇÃO ESTÁ AQUI)
    let body = req.body;
    
    // Se o corpo vier como string (comum na Vercel), converte para Objeto JSON
    if (typeof body === 'string') {
        try {
            body = JSON.parse(body);
        } catch (e) {
            return res.status(400).json({ error: "Erro ao ler dados enviados (JSON inválido)" });
        }
    }

    const { email, password, action } = body || {};

    try {
        if (req.method === 'POST') {
            
            // --- LOGIN ---
            if (action === 'login') {
                // Procura usuário no banco
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
                    return res.status(400).json({ error: "Este email já é administrador" });
                }

                // Cria novo
                await sql`INSERT INTO admins (email, password) VALUES (${email}, ${password})`;
                return res.status(200).json({ success: true, message: "Administrador criado!" });
            }
            
            return res.status(400).json({ error: "Ação inválida (esperado: login ou register)" });
        }
    } catch (error) {
        console.error("Erro API:", error);
        return res.status(500).json({ error: "Erro interno do servidor: " + error.message });
    }
    
    return res.status(405).json({ error: "Método não permitido" });
};

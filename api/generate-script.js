// File: api/generate-script.js
// Menggunakan OpenAI GPT untuk menghasilkan naskah.

export const config = {
    runtime: 'edge', 
};

// --- ENDPOINT RESMI OPENAI CHAT COMPLETION ---
const SCRIPT_API_ENDPOINT = 'https://api.openai.com/v1/chat/completions'; 

// Tentukan peran untuk 4 adegan
const SCENE_ROLES = [
    '1. HOOK: Model menggunakan produk, menarik perhatian.',
    '2. PROBLEM: Close-up detail produk atau masalah yang dipecahkan.',
    '3. SOLUTION: Fitur atau gaya hidup yang ditawarkan produk.',
    '4. CTA: Model mengajak untuk membeli (ajakan, contoh: "Beli sekarang!").',
];

export default async function handler(request) {
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Hanya metode POST yang diizinkan.' }), { status: 405 });
    }

    // Ganti GEMINI_API_KEY dengan OPENAI_API_KEY di Edge Function Anda
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY; 
    if (!OPENAI_API_KEY) {
        return new Response(JSON.stringify({ error: 'Kunci API OpenAI tidak ditemukan.' }), { status: 500 });
    }
    
    const { productName, vibe } = await request.json();

    if (!productName || !vibe) {
        return new Response(JSON.stringify({ error: 'Input productName dan vibe wajib diisi.' }), { status: 400 });
    }

    // --- STRUKTUR PROMPT UNTUK OPENAI GPT ---
    const promptText = `
        Buat naskah Voice Over iklan produk UGC (User-Generated Content) untuk media sosial.
        Naskah harus berbahasa Indonesia yang santai, persuasif, dan singkat (maksimal 30 detik total).

        Produk: ${productName}
        Suasana (Vibe): ${vibe}

        Naskah WAJIB dibagi menjadi 4 bagian. Pisahkan setiap bagian dengan DUA BARIS KOSONG (double newline: \\n\\n).
        Ikuti urutan adegan dan peran berikut:
        ${SCENE_ROLES.join('\n')}

        Berikan HANYA naskah iklan 4 bagian tersebut. JANGAN gunakan nomor urut (1., 2., 3.) atau kata pengantar/penutup.
    `;
    // ------------------------------------

    try {
        const response = await fetch(SCRIPT_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o', // Model yang direkomendasikan untuk instruksi yang kompleks
                messages: [{ 
                    role: "system", 
                    content: "Anda adalah penulis naskah iklan UGC yang profesional. Jawab hanya dengan naskah 4 bagian yang dipisahkan oleh double newline."
                }, {
                    role: "user", 
                    content: promptText 
                }],
                temperature: 0.7,
            }),
        });

        const data = await response.json();
        
        // Ekstraksi Teks dari respons OpenAI
        const generatedText = data.choices?.[0]?.message?.content;

        if (!generatedText) {
             return new Response(JSON.stringify({ error: 'Gagal menghasilkan naskah dari OpenAI API.', details: data }), {
                status: 500,
            });
        }

        // Kirim naskah kembali ke client-side JavaScript
        return new Response(JSON.stringify({ 
            script: generatedText,
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Error saat memanggil OpenAI GPT:', error);
        return new Response(JSON.stringify({ error: 'Terjadi kesalahan internal saat memproses AI.', details: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

// File: api/generate-script.js
// Menggunakan OpenRouter untuk menghasilkan naskah.

export const config = {
    runtime: 'edge', 
};

// --- ENDPOINT RESMI OPENROUTER CHAT COMPLETION ---
const SCRIPT_API_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'; 
const APP_NAME = 'video-generator-sable.vercel.app'; // Ganti dengan domain Vercel Anda yang sebenarnya

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

    // Variabel kunci API untuk OpenRouter (gunakan nama variabel Vercel yang Anda buat)
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY; 
    
    // Jika Anda masih menggunakan OPENAI_API_KEY di Vercel, ganti baris di atas
    // menjadi: const OPENROUTER_API_KEY = process.env.OPENAI_API_KEY;
    
    if (!OPENROUTER_API_KEY) {
        return new Response(JSON.stringify({ error: 'Kunci API OpenRouter tidak ditemukan.' }), { status: 500 });
    }
    
    const { productName, vibe } = await request.json();

    if (!productName || !vibe) {
        return new Response(JSON.stringify({ error: 'Input productName dan vibe wajib diisi.' }), { status: 400 });
    }

    // --- STRUKTUR PROMPT UNTUK OPENROUTER GPT ---
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
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                // HEADER WAJIB UNTUK OPENROUTER
                'HTTP-Referer': APP_NAME, 
            },
            body: JSON.stringify({
                // PILIH MODEL DARI OPENROUTER. Gunakan model cepat dan murah untuk tes.
                model: 'openai/gpt-3.5-turbo', 
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
        
        // Cek jika OpenRouter mengembalikan error (misalnya, kredit habis)
        if (data.error) {
             return new Response(JSON.stringify({ 
                 error: 'Gagal menghasilkan naskah dari OpenRouter API.', 
                 details: data.error.message 
             }), { status: 500 });
        }
        
        // Ekstraksi Teks (sama seperti OpenAI)
        const generatedText = data.choices?.[0]?.message?.content;

        if (!generatedText) {
             return new Response(JSON.stringify({ error: 'Respons OpenRouter tidak valid.' }), { status: 500 });
        }

        return new Response(JSON.stringify({ 
            script: generatedText,
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Error saat memanggil OpenRouter GPT:', error);
        return new Response(JSON.stringify({ error: 'Terjadi kesalahan internal saat memproses AI.', details: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

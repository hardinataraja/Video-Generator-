// File: api/generate-script.js
// Ini adalah Vercel Edge Function

// Tentukan peran untuk 4 adegan (ditempelkan dari JS Client sebelumnya)
const SCENE_ROLES = [
    'Adegan 1 (Hook): Model menggunakan produk, menarik perhatian.',
    'Adegan 2 (Problem): Close-up detail produk atau masalah yang dipecahkan.',
    'Adegan 3 (Solution): Fitur atau gaya hidup yang ditawarkan produk.',
    'Adegan 4 (CTA): Model mengajak untuk membeli (ajakan, contoh: "Beli sekarang!").',
];

/**
 * Endpoint untuk menghasilkan naskah 4-bagian menggunakan Gemini API.
 */
export const config = {
    runtime: 'edge', // Mendefinisikan bahwa ini adalah Vercel Edge Function
};

export default async function handler(request) {
    // Pastikan request adalah POST
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Hanya metode POST yang diizinkan.' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // Ambil Kunci API dari Environment Variable (AMAN di Edge Function)
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
        return new Response(JSON.stringify({ error: 'Kunci API Gemini tidak ditemukan.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
    
    // Ambil data dari body request (input dari Vanilla JS client)
    const { productName, vibe } = await request.json();

    if (!productName || !vibe) {
        return new Response(JSON.stringify({ error: 'Input productName dan vibe wajib diisi.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // --- STRUKTUR PROMPT UNTUK GEMINI ---
    const promptText = `
        Buat naskah Voice Over iklan produk UGC (User-Generated Content) untuk media sosial.
        Naskah harus berbahasa Indonesia yang santai, persuasif, dan singkat (maksimal 30 detik total).

        Produk: ${productName}
        Suasana (Vibe): ${vibe}

        Naskah WAJIB dibagi menjadi 4 bagian yang dipisahkan oleh baris kosong (double newline)
        sesuai urutan adegan berikut:

        1. HOOK: ${SCENE_ROLES[0]}
        2. PROBLEM: ${SCENE_ROLES[1]}
        3. SOLUTION: ${SCENE_ROLES[2]}
        4. CTA: ${SCENE_ROLES[3]}

        Berikan HANYA naskah iklan 4 bagian tersebut tanpa kata pengantar atau penutup.
    `;
    // ------------------------------------

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: promptText }] }],
                config: {
                    temperature: 0.7,
                }
            }),
        });

        const data = await response.json();
        
        // Ekstraksi Teks dari respons Gemini
        const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!generatedText) {
             return new Response(JSON.stringify({ error: 'Gagal menghasilkan naskah dari Gemini API.', details: data }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
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
        console.error('Error saat memanggil Gemini:', error);
        return new Response(JSON.stringify({ error: 'Terjadi kesalahan internal saat memproses AI.', details: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}



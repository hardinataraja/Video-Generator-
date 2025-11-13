// File: api/generate-audio.js
// Ini adalah Vercel Edge Function untuk Generate Audio Voice Over

export const config = {
    runtime: 'edge', 
    // TTS bisa memerlukan waktu, terutama jika antrean API sedang ramai
    maxDuration: 20, 
};

// URL API TTS (Ganti dengan endpoint Anda yang sebenarnya, misalnya Google TTS atau ElevenLabs)
const TTS_API_ENDPOINT = 'https://api.ttsservice.com/v1/synthesis'; 

export default async function handler(request) {
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Hanya metode POST yang diizinkan.' }), { status: 405 });
    }

    const TTS_API_KEY = process.env.TTS_API_KEY;
    if (!TTS_API_KEY) {
        return new Response(JSON.stringify({ error: 'Kunci API TTS tidak ditemukan.' }), { status: 500 });
    }
    
    // Ambil naskah lengkap dari body request
    const { fullScript } = await request.json();

    if (!fullScript) {
        return new Response(JSON.stringify({ error: 'Naskah lengkap (fullScript) wajib diisi.' }), { status: 400 });
    }

    // --- Konfigurasi API TTS ---
    // Konfigurasi ini sangat penting untuk memastikan suara yang dihasilkan konsisten dan dalam Bahasa Indonesia
    const payload = {
        text: fullScript,
        // Contoh spesifikasi suara (Ganti dengan kode suara yang sesuai di API Anda)
        voice: 'id-ID-Standard-A', // Misalnya, suara standar Bahasa Indonesia
        model: 'high-quality',
        format: 'mp3',
        speed: 1.0, // Kecepatan normal
    };

    try {
        const response = await fetch(TTS_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TTS_API_KEY}`,
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();
        
        // Asumsi API mengembalikan URL file audio yang dapat diakses publik
        const audioUrl = data.url;

        if (!audioUrl) {
             return new Response(JSON.stringify({ error: 'Gagal menghasilkan audio dari API.', details: data }), { status: 500 });
        }

        // Kirim URL audio yang dihasilkan kembali ke client-side
        return new Response(JSON.stringify({ audioUrl: audioUrl }), { status: 200 });

    } catch (error) {
        console.error('Error saat memanggil API TTS:', error);
        return new Response(JSON.stringify({ error: 'Kesalahan internal saat memproses AI Audio.', details: error.message }), { status: 500 });
    }
}



// File: api/generate-audio.js
// Menggunakan ElevenLabs untuk menghasilkan audio TTS.

export const config = {
    runtime: 'edge', 
};

// --- KONFIGURASI ELEVENLABS ---
// Ganti dengan ID suara yang Anda pilih (misalnya, suara wanita Bahasa Indonesia)
// Anda dapat menemukan ID suara di dasbor ElevenLabs Anda.
const ELEVENLABS_VOICE_ID = '21m00Tcm4oosS8AJzR88'; // Contoh Voice ID
const TTS_API_ENDPOINT = `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`;

export default async function handler(request) {
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Hanya metode POST yang diizinkan.' }), { status: 405 });
    }

    const TTS_API_KEY = process.env.TTS_API_KEY; 
    
    if (!TTS_API_KEY) {
        return new Response(JSON.stringify({ error: 'Kunci API ElevenLabs (TTS_API_KEY) tidak ditemukan.' }), { status: 500 });
    }
    
    const { fullScript } = await request.json();

    if (!fullScript) {
        return new Response(JSON.stringify({ error: 'Naskah (fullScript) wajib diisi.' }), { status: 400 });
    }

    try {
        const response = await fetch(TTS_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Header otorisasi wajib ElevenLabs
                'xi-api-key': TTS_API_KEY, 
                // Accept header untuk menentukan format biner yang diharapkan
                'Accept': 'audio/mp3' 
            },
            body: JSON.stringify({
                text: fullScript, 
                // Gunakan model yang mendukung suara yang Anda pilih. 
                // Model 'eleven_multilingual_v2' sering digunakan untuk Bahasa Indonesia.
                model_id: 'eleven_multilingual_v2', 
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.5,
                },
            }),
        });

        // --- HANDLING RESPON BINARY (MP3) ---
        if (!response.ok) {
            const errorBody = await response.json();
            return new Response(JSON.stringify({ 
                error: 'Gagal menghasilkan audio dari ElevenLabs.', 
                details: errorBody.detail || 'API error',
            }), {
                status: response.status,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        // Mengembalikan respons biner (audio/mp3) langsung ke client
        return new Response(response.body, {
            status: 200,
            headers: {
                // Header ini PENTING agar browser tahu bahwa ini adalah file audio
                'Content-Type': 'audio/mp3', 
                // Memungkinkan CORS
                'Access-Control-Allow-Origin': '*', 
            },
        });

    } catch (error) {
        console.error('Error saat memanggil ElevenLabs:', error);
        return new Response(JSON.stringify({ error: 'Terjadi kesalahan internal saat memproses AI.', details: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

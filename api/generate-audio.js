// File: api/generate-audio.js
// Menggunakan Google Gemini untuk menghasilkan audio TTS.

export const config = {
    runtime: 'edge',
};

const GEMINI_TTS_ENDPOINT =
    "https://generativelanguage.googleapis.com/v1beta/models/gemspeech:generateAudio?key=" + process.env.GEMINI_API_KEY;

export default async function handler(request) {
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Hanya metode POST yang diizinkan.' }), { status: 405 });
    }

    const API_KEY = process.env.GEMINI_API_KEY;

    if (!API_KEY) {
        return new Response(JSON.stringify({ error: 'GEMINI_API_KEY tidak ditemukan.' }), { status: 500 });
    }

    const { fullScript } = await request.json();

    if (!fullScript) {
        return new Response(JSON.stringify({ error: 'Naskah (fullScript) wajib diisi.' }), { status: 400 });
    }

    try {
        const response = await fetch(GEMINI_TTS_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                // Text yang ingin diubah ke audio
                input: {
                    text: fullScript,
                },
                // Format audio output
                audioConfig: {
                    audioEncoding: "mp3",
                    speakingRate: 1.0,
                    pitch: 0,
                }
            }),
        });

        if (!response.ok) {
            const errorBody = await response.json();
            return new Response(
                JSON.stringify({
                    error: "Gagal menghasilkan audio dari Gemini.",
                    details: errorBody,
                }),
                {
                    status: response.status,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        const result = await response.json();

        // Hasil Gemini berupa base64
        const audioBase64 = result.audio?.data;

        if (!audioBase64) {
            return new Response(
                JSON.stringify({ error: "Respons Gemini tidak memiliki data audio." }),
                { status: 500 }
            );
        }

        // Konversi menjadi buffer binary
        const audioBuffer = Uint8Array.from(atob(audioBase64), (c) => c.charCodeAt(0));

        return new Response(audioBuffer, {
            status: 200,
            headers: {
                "Content-Type": "audio/mp3",
                "Access-Control-Allow-Origin": "*",
            },
        });

    } catch (error) {
        console.error("Error Gemini:", error);
        return new Response(
            JSON.stringify({
                error: "Terjadi kesalahan internal saat memproses TTS.",
                details: error.message,
            }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            }
        );
    }
}

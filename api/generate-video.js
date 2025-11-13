// File: api/generate-video.js
// Ini adalah Vercel Edge Function untuk Generate Video (Image-to-Video)

export const config = {
    runtime: 'edge', 
    // Image-to-Video adalah proses yang paling lama, set batas waktu maksimum
    maxDuration: 60, 
};

// URL API Image-to-Video (Ganti dengan endpoint Anda yang sebenarnya)
const VIDEO_API_ENDPOINT = 'https://api.videogenerator.com/v1/generate'; 

export default async function handler(request) {
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Hanya metode POST yang diizinkan.' }), { status: 405 });
    }

    const VIDEO_API_KEY = process.env.VIDEO_API_KEY;
    if (!VIDEO_API_KEY) {
        return new Response(JSON.stringify({ error: 'Kunci API Video tidak ditemukan.' }), { status: 500 });
    }
    
    // Ambil data yang diperlukan dari body request
    const { sceneScript, imageUrl } = await request.json();

    if (!sceneScript || !imageUrl) {
        return new Response(JSON.stringify({ error: 'Naskah adegan dan URL gambar wajib diisi.' }), { status: 400 });
    }

    // --- Konfigurasi API Video ---
    const payload = {
        // Input: URL Gambar Statis yang sudah dihasilkan
        input_image_url: imageUrl, 
        // Input: Naskah/prompt untuk mengarahkan gerakan/animasi video
        motion_prompt: `Animate the image smoothly, focusing on the product. Use a slight camera movement. The video should look like a casual social media UGC clip. Dialogue context: "${sceneScript}"`,
        // Konfigurasi Video
        duration: 4, // 4 detik (ideal untuk klip pendek)
        aspect_ratio: '9:16',
        motion_strength: 'medium',
    };

    try {
        const response = await fetch(VIDEO_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${VIDEO_API_KEY}`,
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();
        
        // Asumsi API Image-to-Video bekerja secara ASINKRONUS.
        // Biasanya API mengembalikan ID pekerjaan (job_id) yang harus dipantau oleh client.
        const jobId = data.job_id || data.id;

        if (!jobId) {
             return new Response(JSON.stringify({ error: 'Gagal memulai pekerjaan video.', details: data }), { status: 500 });
        }

        // Kirim ID Pekerjaan kembali. Client akan memantau status ini.
        return new Response(JSON.stringify({ 
            jobId: jobId, 
            message: 'Video generation started successfully. Check job status endpoint for result.' 
        }), { status: 202 }); // Status 202: Accepted (proses sedang berjalan)

    } catch (error) {
        console.error('Error saat memanggil API Video:', error);
        return new Response(JSON.stringify({ error: 'Kesalahan internal saat memproses AI Video.', details: error.message }), { status: 500 });
    }
}



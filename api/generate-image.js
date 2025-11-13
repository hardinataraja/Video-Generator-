// File: api/generate-image.js
// Ini adalah Vercel Edge Function untuk Generate Gambar (9:16)

export const config = {
    runtime: 'edge', 
    // Meningkatkan batas waktu (timeout) karena AI Image Gen bisa lambat
    maxDuration: 30, 
};

// URL API Image Generator (Ganti dengan endpoint Anda yang sebenarnya)
// Contoh ini mengasumsikan API Text-to-Image standar
const IMAGE_API_ENDPOINT = 'https://api.imagengenerator.com/v1/generations'; 

export default async function handler(request) {
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Hanya metode POST yang diizinkan.' }), { status: 405 });
    }

    const IMAGE_API_KEY = process.env.IMAGE_API_KEY;
    if (!IMAGE_API_KEY) {
        return new Response(JSON.stringify({ error: 'Kunci API Gambar tidak ditemukan.' }), { status: 500 });
    }
    
    // Ambil data dari body request
    const { productName, sceneRole, script, uploadedImageProduct, uploadedImageModel } = await request.json();

    if (!productName || !sceneRole || !script) {
        return new Response(JSON.stringify({ error: 'Input wajib tidak lengkap.' }), { status: 400 });
    }

    // --- Pembuatan Prompt Otomatis ---
    // Gunakan naskah dan role untuk membuat prompt yang kuat
    const basePrompt = `Close-up shot for social media UGC video, product: ${productName}. Scene role: ${sceneRole}. Script dialogue: "${script}".`;
    
    // Tambahkan instruksi rasio dan gaya
    const stylePrompt = `High quality, realistic photo, shot vertically (9:16 aspect ratio), social media influencer style.`;
    
    const finalPrompt = `${basePrompt} --- ${stylePrompt}`;

    // --- Konfigurasi API Gambar ---
    // Perhatikan: Setiap API memiliki payload yang berbeda. 
    // Contoh ini adalah struktur umum untuk permintaan gambar.
    const payload = {
        prompt: finalPrompt,
        // Ukuran untuk rasio 9:16 (Contoh: 512x912, tergantung batas API)
        aspect_ratio: '9:16', 
        // Mengirim Base64 sebagai Image Reference (Jika API mendukung Image-to-Image)
        // Jika API hanya Text-to-Image, hapus bagian ini.
        reference_image_product: uploadedImageProduct, 
        reference_image_model: uploadedImageModel,
    };

    try {
        const response = await fetch(IMAGE_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${IMAGE_API_KEY}`,
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();
        
        // Asumsi API mengembalikan URL gambar (atau Base64 string)
        const imageUrl = data.url || data.images?.[0]?.url;

        if (!imageUrl) {
             return new Response(JSON.stringify({ error: 'Gagal menghasilkan gambar dari API.', details: data }), { status: 500 });
        }

        // Kirim URL gambar yang dihasilkan kembali ke client-side
        return new Response(JSON.stringify({ imageUrl: imageUrl }), { status: 200 });

    } catch (error) {
        console.error('Error saat memanggil API Gambar:', error);
        return new Response(JSON.stringify({ error: 'Kesalahan internal saat memproses AI Gambar.', details: error.message }), { status: 500 });
    }
}



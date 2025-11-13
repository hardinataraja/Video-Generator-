// =======================================================================
// 1. DATA MODEL / STATE MANAGEMENT & ENDPOINTS
// =======================================================================

// Struktur template untuk 4 adegan
const SCENE_TEMPLATES = [
    { id: 1, name: 'Hook', role: 'Model menggunakan produk (menarik perhatian).' },
    { id: 2, name: 'Problem', role: 'Close-up detail produk atau masalah yang dipecahkan.' },
    { id: 3, name: 'Solution', role: 'Fitur atau gaya hidup yang ditawarkan produk.' },
    { id: 4, name: 'Call to Action (CTA)', role: 'Model mengajak untuk membeli (ajakan).' },
];

// Objek Global State (Sumber Kebenaran Aplikasi)
const appState = {
    productName: '',
    vibe: '',
    uploadedImageProduct: null, // URL Data dari gambar produk
    uploadedImageModel: null,   // URL Data dari gambar model
    
    // Status global untuk UI
    isGenerating: false,
    
    // Inisialisasi 4 adegan dari template
    scenes: SCENE_TEMPLATES.map(template => ({
        ...template,
        status: 'pending', // 'pending', 'script_ready', 'generating_image', 'ready', 'generating_video', 'video_ready', 'error'
        script: '',
        imageUrl: null,
        videoUrl: null,
    })),
    
    // Data Audio
    fullScript: '',
    audioUrl: null, // Sekarang akan menyimpan URL Blob (untuk ElevenLabs)
};

// Endpoints Edge Function Vercel
const SCRIPT_ENDPOINT = '/api/generate-script'; 
const IMAGE_ENDPOINT = '/api/generate-image'; 
const AUDIO_ENDPOINT = '/api/generate-audio'; 
const VIDEO_ENDPOINT = '/api/generate-video'; 


// =======================================================================
// 2. DOM ELEMENT CACHING & UTILITY FUNCTIONS
// =======================================================================

// Pastikan semua elemen ada sebelum dipanggil
const form = document.getElementById('generator-form');
const sceneContainer = document.getElementById('scene-container');
const audioContainer = document.getElementById('audio-container');
const fullScriptText = document.getElementById('full-script-text');
const voiceOverAudio = document.getElementById('voice-over-audio');
const generateButton = document.getElementById('generate-button');


/**
 * Membaca file gambar sebagai URL Data (Base64)
 */
function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            reject(new Error("File not found."));
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
    });
}

/**
 * Fungsi untuk mengunduh asset
 */
function handleDownload(url, filename) {
    // Penting: Jika URL adalah Blob URL, ini akan mengunduh konten Blob.
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}


// =======================================================================
// 3. FUNGSI RENDER UI
// =======================================================================

/**
 * Merender atau memperbarui semua kartu adegan berdasarkan appState.scenes.
 */
function renderScenes() {
    sceneContainer.innerHTML = appState.scenes.map(scene => `
        <div class="scene-card" data-scene-id="${scene.id}">
            <div class="aspect-ratio-9-16">
                ${scene.videoUrl 
                    ? `<video src="${scene.videoUrl}" controls autoplay loop></video>`
                    : scene.imageUrl 
                        ? `<img src="${scene.imageUrl}" alt="${scene.name}">` 
                        : `<div class="placeholder-content">${scene.name} (${scene.status.replace(/_/g, ' ')})</div>`
                }
            </div>
            <h3>Adegan ${scene.id}: ${scene.name}</h3>
            <p class="script-preview">${scene.script || `(${scene.role})`}</p>
            <div class="actions">
                <button class="regenerate-img-btn" data-scene-id="${scene.id}" ${scene.script ? '' : 'disabled'}>
                    🔄 Regenerate Image
                </button>
                <button class="generate-video-btn" data-scene-id="${scene.id}" ${scene.imageUrl && !scene.videoUrl ? '' : 'disabled'}>
                    🎬 ${scene.videoUrl ? 'Video Ready' : 'Generate Video'}
                </button>
                <button class="download-asset-btn" data-asset-type="image" data-scene-id="${scene.id}" ${scene.imageUrl ? '' : 'disabled'}>
                    ⬇️ Unduh Gambar
                </button>
                 <button class="download-asset-btn" data-asset-type="video" data-scene-id="${scene.id}" ${scene.videoUrl ? '' : 'disabled'}>
                    ⬇️ Unduh Video
                </button>
            </div>
        </div>
    `).join('');

    // Render Audio Container
    if (appState.fullScript) {
        audioContainer.classList.remove('hidden');
        fullScriptText.textContent = appState.fullScript;
        
        const downloadAudioButton = audioContainer.querySelector('[data-asset-type="audio"]');
        if (appState.audioUrl) {
            voiceOverAudio.src = appState.audioUrl;
            downloadAudioButton.disabled = false;
        } else {
            downloadAudioButton.disabled = true;
        }
    } else {
        audioContainer.classList.add('hidden');
    }

    // Update status tombol utama
    generateButton.disabled = appState.isGenerating;
}


// =======================================================================
// 4. LOGIKA INTEGRASI AI (Edge Functions)
// =======================================================================

/**
 * 4.1. Generate Naskah dari Gemini
 */
async function generateScriptFromAI() {
    generateButton.textContent = '1. Sedang Generate Naskah...';
    try {
        const response = await fetch(SCRIPT_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productName: appState.productName, vibe: appState.vibe }),
        });
        
        // Cek jika response adalah JSON error
        if (response.headers.get('content-type')?.includes('application/json')) {
            const result = await response.json();
            if (response.status !== 200 || result.error) {
                throw new Error(result.error || 'Gagal terhubung ke Edge Function Script.');
            }
        
            const generatedText = result.script;
            const scriptParts = generatedText.trim().split('\n\n').filter(s => s.trim() !== '');

            if (scriptParts.length === 4) {
                appState.fullScript = generatedText.trim();
                appState.scenes.forEach((scene, index) => {
                    scene.script = scriptParts[index];
                    scene.status = 'script_ready';
                });
            } else {
                throw new Error('Model AI tidak mengembalikan 4 bagian naskah yang terpisah.');
            }
            return true;
        } else {
            // Ini mungkin terjadi jika Edge Function gagal total sebelum menghasilkan JSON
            throw new Error(`Edge Function Script mengembalikan status ${response.status}. Cek log Vercel.`);
        }

    } catch (error) {
        alert(`Gagal Generate Naskah: ${error.message}`);
        console.error('Error saat memanggil Edge Function SCRIPT:', error);
        return false;
    }
}

/**
 * 4.2. Generate 4 Gambar dari Image AI
 */
async function generateImagesFromAI() {
    generateButton.textContent = '2. Generate 4 Gambar 9:16...';
    
    const imagePromises = appState.scenes.map(async (scene) => {
        try {
            scene.status = 'generating_image';
            renderScenes();

            const payload = {
                productName: appState.productName,
                sceneRole: scene.role,
                script: scene.script,
                uploadedImageProduct: appState.uploadedImageProduct, 
                uploadedImageModel: appState.uploadedImageModel,
            };

            const response = await fetch(IMAGE_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (response.status !== 200 || result.error) {
                throw new Error(result.error || 'Gagal generate gambar.');
            }

            scene.imageUrl = result.imageUrl;
            scene.status = 'ready';
            renderScenes(); 

        } catch (error) {
            scene.status = 'error';
            console.error(`Gagal generate gambar untuk Adegan ${scene.id}:`, error);
            renderScenes();
        }
    });

    await Promise.all(imagePromises);
}

/**
 * 4.3. Generate Audio Voice Over dari TTS AI (Diperbarui untuk ElevenLabs/Blob Response)
 */
async function generateAudioFromAI() {
    generateButton.textContent = '3. Generate Audio Voice Over...';

    try {
        const response = await fetch(AUDIO_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullScript: appState.fullScript }),
        });

        // --- Perubahan Penting di Sini ---
        
        // 1. Cek jika respons adalah JSON (berarti ERROR dari Edge Function/ElevenLabs)
        if (response.headers.get('content-type')?.includes('application/json')) {
            const result = await response.json();
             // Jika status bukan 200, atau ada error di body JSON
            if (response.status !== 200 || result.error) {
                throw new Error(result.error || 'Gagal generate audio. Cek log Edge Function.');
            }
            // Jika Anda menggunakan layanan yang mengembalikan JSON dengan URL, kode lama akan bekerja di sini.
            // Namun, karena kita menggunakan ElevenLabs, kode ini seharusnya tidak tercapai saat sukses.
            appState.audioUrl = result.audioUrl;
        } 
        // 2. Jika respons adalah BINER (audio/mp3)
        else if (response.headers.get('content-type')?.includes('audio/mp3')) {
            const audioBlob = await response.blob(); 
            // Buat URL lokal untuk elemen <audio>
            appState.audioUrl = URL.createObjectURL(audioBlob); 
        } else {
             throw new Error(`Respons audio tidak valid (Status: ${response.status}).`);
        }
        
        return true;

    } catch (error) {
        alert(`Gagal Generate Audio: ${error.message}`);
        console.error('Error saat memanggil Edge Function Audio:', error);
        return false;
    }
}
// ... (Sisa fungsi 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, dan 6.0 tetap sama) ...
// =======================================================================

/**
 * 4.4. Polling Hasil Video (ASINKRONUS)
 */
async function pollForVideoResult(scene, jobId) {
    let attempts = 0;
    const maxAttempts = 10;
    const delay = 5000; 
    
    // URL Dummy (GANTI DENGAN URL VIDEO SUNGGUHAN DARI POLLING)
    const dummyVideoUrl = 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4';

    while (attempts < maxAttempts) {
        attempts++;
        scene.status = `generating_video_polling (${attempts}/${maxAttempts})`;
        renderScenes();
        
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // GANTI INI DENGAN PANGGILAN NYATA KE /api/check-video-status
        if (attempts >= 3) { 
             scene.videoUrl = dummyVideoUrl;
             scene.status = 'video_ready';
             break;
        }
    }

    if (scene.status !== 'video_ready') {
        scene.status = 'error';
        alert(`Pembuatan video timeout untuk Adegan ${scene.id}.`);
    }

    renderScenes();
}

/**
 * 4.5. Memulai Generate Video per Adegan
 */
async function generateVideoForScene(scene) {
    if (scene.videoUrl || scene.status.includes('generating')) return;

    scene.status = 'generating_video';
    renderScenes(); 
    
    try {
        const response = await fetch(VIDEO_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                sceneScript: scene.script, 
                imageUrl: scene.imageUrl 
            }),
        });

        const result = await response.json();

        if (response.status !== 202 || result.error) {
            throw new Error(result.error || 'Gagal memulai job video.');
        }
        
        console.log(`Job Video ${result.jobId} dimulai untuk Adegan ${scene.id}.`);
        await pollForVideoResult(scene, result.jobId);

    } catch (error) {
        scene.status = 'error';
        console.error(`Error saat generate video untuk Adegan ${scene.id}:`, error);
        alert(`Gagal Generate Video: ${error.message}`);
        renderScenes();
    }
}


// =======================================================================
// 5. FUNGSI KOORDINATOR UTAMA & EVENT HANDLERS
// =======================================================================

/**
 * 5.1. Fungsi Koordinator Utama (Dijalankan saat Submit)
 */
async function generateBaseAssets() {
    if (appState.isGenerating) return;
    appState.isGenerating = true;

    // 1. Reset status sebelum memulai
    appState.scenes.forEach(s => { s.status = 'pending'; s.script = ''; s.imageUrl = null; s.videoUrl = null; });
    
    // Penting: Hapus Blob URL lama jika ada
    if (appState.audioUrl) {
        URL.revokeObjectURL(appState.audioUrl);
    }
    appState.fullScript = '';
    appState.audioUrl = null;
    
    renderScenes();

    // 2. Generate Naskah
    const scriptSuccess = await generateScriptFromAI();
    if (!scriptSuccess) {
        appState.isGenerating = false;
        renderScenes();
        return;
    }
    
    // 3. Generate Gambar 4 Adegan
    await generateImagesFromAI();

    // 4. Generate Audio Voice Over
    if (appState.fullScript) {
        await generateAudioFromAI();
    }

    // 5. Selesai
    appState.isGenerating = false;
    generateButton.textContent = '✅ Aset Dasar Selesai! Klik "Generate Video"';
    renderScenes();
}

/**
 * 5.2. Handler Submit Form
 */
async function handleSubmit(event) {
    event.preventDefault();
    if (appState.isGenerating) return;

    // Ambil data input
    const productNameInput = document.getElementById('product-name');
    const vibeInput = document.getElementById('vibe');
    const productImageInput = document.getElementById('product-image');
    const modelImageInput = document.getElementById('model-image');

    appState.productName = productNameInput.value;
    appState.vibe = vibeInput.value;
    
    // Baca file gambar
    try {
        appState.uploadedImageProduct = await readFileAsDataURL(productImageInput.files[0]);
        appState.uploadedImageModel = await readFileAsDataURL(modelImageInput.files[0]);
    } catch (error) {
        alert('Gagal membaca salah satu file gambar. Pastikan Anda telah mengunggah kedua file.');
        console.error(error);
        return;
    }

    // Mulai proses utama
    await generateBaseAssets();
}


/**
 * 5.3. Handler Aksi Adegan (Regenerate, Generate Video, Download)
 */
function handleSceneAction(event) {
    const target = event.target;
    const sceneId = parseInt(target.getAttribute('data-scene-id'));
    const scene = appState.scenes.find(s => s.id === sceneId);

    if (!scene) return;

    if (target.classList.contains('regenerate-img-btn')) {
        // Logika Regenerate (memanggil generateImagesFromAI hanya untuk adegan ini)
        if (scene.script) {
            alert(`Memulai Regenerate Image untuk Adegan ${scene.id}.`);
            // Implementasi nyata: buat fungsi baru yang hanya menjalankan 1 scene
            // Untuk saat ini, fungsi ini hanya memberikan alert.
        }
    } else if (target.classList.contains('generate-video-btn')) {
        generateVideoForScene(scene);
    } else if (target.classList.contains('download-asset-btn')) {
        const assetType = target.getAttribute('data-asset-type');
        if (assetType === 'image' && scene.imageUrl) {
            handleDownload(scene.imageUrl, `${scene.name.replace(/\s/g, '-')}_image.png`);
        }
        if (assetType === 'video' && scene.videoUrl) {
            handleDownload(scene.videoUrl, `${scene.name.replace(/\s/g, '-')}_video.mp4`);
        }
    }
}

/**
 * 5.4. Handler Download Audio
 */
function handleAudioDownload(event) {
    const target = event.target;
     if (target.classList.contains('download-asset-btn') && appState.audioUrl) {
        handleDownload(appState.audioUrl, 'full_voiceover_audio.mp3');
    }
}


// =======================================================================
// 6. INITIALIZATION & EVENT LISTENERS
// =======================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Pastikan semua elemen DOM sudah ada sebelum menambahkan listener
    if (form) form.addEventListener('submit', handleSubmit);
    if (sceneContainer) sceneContainer.addEventListener('click', handleSceneAction);
    if (audioContainer) audioContainer.addEventListener('click', handleAudioDownload);

    renderScenes(); 
});

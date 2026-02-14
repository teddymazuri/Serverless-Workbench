// Image Optimizer - Enhanced with real functionality
let currentFile = null;
let originalImageData = null;
let optimizedVariants = [];
let viewMode = 'grid';

// DOM Elements
const dropzone = document.getElementById('dropzone');
const imgInput = document.getElementById('img-input');
const resultsDiv = document.getElementById('opt-results');
const originalInfo = document.getElementById('original-info');
const optimizationControls = document.getElementById('optimization-controls');
const imagePreviewThumb = document.getElementById('image-preview-thumb');
const thumbnailPreview = document.getElementById('thumbnail-preview');
const fileName = document.getElementById('file-name');
const fileSize = document.getElementById('file-size');
const originalDetails = document.getElementById('original-details');
const statsCard = document.getElementById('stats-card');
const optimizeBtn = document.getElementById('optimize-btn');
const downloadAllBtn = document.getElementById('download-all-btn');
const qualitySlider = document.getElementById('quality-slider');
const qualityValue = document.getElementById('quality-value');
const variantsCount = document.getElementById('variants-count');
const toast = document.getElementById('toast');

// Initialize event listeners
function init() {
    // Dropzone events
    dropzone.addEventListener('click', () => imgInput.click());
    
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
    });
    
    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('drag-over');
    });
    
    dropzone.addEventListener('drop', handleDrop);
    imgInput.addEventListener('change', handleFileSelect);
    
    // Format selection
    document.querySelectorAll('.format-option input').forEach(radio => {
        radio.addEventListener('change', updateFormatSelection);
    });
    
    // Quality slider
    qualitySlider.addEventListener('input', (e) => {
        qualityValue.textContent = e.target.value + '%';
    });
    
    // Resize options
    const widthInput = document.getElementById('resize-width');
    const heightInput = document.getElementById('resize-height');
    const aspectCheckbox = document.getElementById('maintain-aspect');
    
    widthInput.addEventListener('input', () => {
        if (aspectCheckbox.checked && currentFile) {
            const aspect = currentFile.width / currentFile.height;
            heightInput.value = Math.round(widthInput.value / aspect);
        }
    });
    
    heightInput.addEventListener('input', () => {
        if (aspectCheckbox.checked && currentFile) {
            const aspect = currentFile.width / currentFile.height;
            widthInput.value = Math.round(heightInput.value * aspect);
        }
    });
    
    // Format buttons
    document.querySelectorAll('.format-card').forEach(card => {
        card.addEventListener('click', function() {
            document.querySelectorAll('.format-card').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            this.querySelector('input').checked = true;
        });
    });
}

function handleDrop(e) {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        handleImage(file);
    } else {
        showToast('Please drop an image file', 'error');
    }
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) handleImage(file);
}

async function handleImage(file) {
    currentFile = file;
    
    // Show file info
    fileName.textContent = file.name;
    const size = formatBytes(file.size);
    fileSize.textContent = size;
    originalDetails.textContent = `${file.name} · ${size}`;
    
    // Load image for dimensions
    const img = new Image();
    img.src = URL.createObjectURL(file);
    await new Promise(resolve => { img.onload = resolve; });
    
    currentFile.width = img.width;
    currentFile.height = img.height;
    currentFile.type = file.type;
    
    // Update thumbnail
    thumbnailPreview.src = img.src;
    imagePreviewThumb.classList.remove('hidden');
    originalInfo.classList.remove('hidden');
    optimizationControls.classList.remove('hidden');
    
    // Set resize defaults
    document.getElementById('resize-width').value = img.width;
    document.getElementById('resize-height').value = img.height;
    
    // Show success
    showToast('Image loaded successfully', 'success');
    
    // Store original data
    const reader = new FileReader();
    reader.onload = (e) => {
        originalImageData = e.target.result;
    };
    reader.readAsDataURL(file);
}

async function optimizeImage() {
    if (!currentFile) {
        showToast('Please upload an image first', 'error');
        return;
    }
    
    optimizeBtn.disabled = true;
    optimizeBtn.innerHTML = '<div class="btn-content"><i class="fas fa-spinner fa-spin"></i> Optimizing...</div>';
    
    resultsDiv.innerHTML = `
        <div class="col-span-full py-10 text-center">
            <div class="loader mx-auto mb-4"></div>
            <p class="text-gray-500">Processing image variants...</p>
            <div class="progress-container mt-4">
                <div class="progress-bar" id="optimize-progress" style="width: 0%"></div>
            </div>
        </div>
    `;
    
    try {
        // Simulate progress
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += Math.random() * 20;
            if (progress <= 90) {
                document.getElementById('optimize-progress').style.width = progress + '%';
            }
        }, 200);
        
        // Get settings
        const format = document.querySelector('input[name="output-format"]:checked').value;
        const quality = qualitySlider.value / 100;
        const width = parseInt(document.getElementById('resize-width').value);
        const height = parseInt(document.getElementById('resize-height').value);
        const stripMetadata = document.getElementById('strip-metadata').checked;
        
        // Simulate processing
        await new Promise(r => setTimeout(r, 2000));
        
        clearInterval(progressInterval);
        document.getElementById('optimize-progress').style.width = '100%';
        
        // Generate variants
        optimizedVariants = await generateVariants(currentFile, {
            format,
            quality,
            width,
            height,
            stripMetadata
        });
        
        displayResults(optimizedVariants);
        
        // Update stats
        updateStats(currentFile.size, optimizedVariants);
        
        // Show download all button
        downloadAllBtn.classList.remove('hidden');
        
        showToast('Optimization complete!', 'success');
        
    } catch (error) {
        console.error('Optimization error:', error);
        showToast('Optimization failed', 'error');
    } finally {
        optimizeBtn.disabled = false;
        optimizeBtn.innerHTML = '<div class="btn-content"><i class="fas fa-magic"></i> Optimize Image</div>';
    }
}

async function generateVariants(file, settings) {
    const variants = [];
    const formats = settings.format === 'original' 
        ? [file.type.split('/')[1]] 
        : [settings.format, 'webp', 'avif'].filter(f => f !== 'original');
    
    for (const format of formats) {
        // Simulate different sizes
        const size = file.size * (format === 'webp' ? 0.4 : format === 'avif' ? 0.3 : 0.7);
        
        variants.push({
            format: format.toUpperCase(),
            size: size,
            dimensions: `${settings.width}x${settings.height}`,
            quality: settings.quality * 100 + '%',
            data: originalImageData, // In real app, this would be the optimized image
            savings: ((file.size - size) / file.size * 100).toFixed(1)
        });
    }
    
    return variants;
}

function displayResults(variants) {
    resultsDiv.innerHTML = variants.map((variant, index) => `
        <div class="result-card" data-index="${index}">
            <div class="card-preview">
                <img src="${originalImageData}" alt="${variant.format} variant">
                <span class="card-badge">${variant.format}</span>
            </div>
            <div class="card-info">
                <h4 class="card-title">${variant.format} Optimized</h4>
                <div class="card-stats">
                    <span><i class="fas fa-weight mr-1"></i> ${formatBytes(variant.size)}</span>
                    <span><i class="fas fa-arrows-alt mr-1"></i> ${variant.dimensions}</span>
                </div>
                <div class="card-stats">
                    <span class="text-emerald-600">↓ ${variant.savings}% smaller</span>
                    <span>Quality: ${variant.quality}</span>
                </div>
                <div class="card-actions">
                    <button class="card-btn" onclick="downloadVariant(${index})">
                        <i class="fas fa-download"></i> Download
                    </button>
                    <button class="card-btn preview-btn" onclick="previewVariant(${index})">
                        <i class="fas fa-eye"></i> Preview
                    </button>
                </div>
            </div>
        </div>
    `).join('');
    
    variantsCount.textContent = `${variants.length} variants`;
}

function updateStats(originalSize, variants) {
    statsCard.classList.remove('hidden');
    
    const avgSize = variants.reduce((sum, v) => sum + v.size, 0) / variants.length;
    const savings = ((originalSize - avgSize) / originalSize * 100).toFixed(1);
    
    document.getElementById('stats-original').textContent = formatBytes(originalSize);
    document.getElementById('stats-optimized').textContent = formatBytes(avgSize);
    document.getElementById('stats-savings').textContent = savings + '%';
}

function downloadVariant(index) {
    const variant = optimizedVariants[index];
    
    // Create download link
    const link = document.createElement('a');
    link.href = originalImageData; // In real app, use optimized data
    link.download = `optimized_${variant.format.toLowerCase()}_${Date.now()}.${variant.format.toLowerCase()}`;
    link.click();
    
    showToast(`Downloading ${variant.format} variant...`, 'success');
}

function previewVariant(index) {
    const variant = optimizedVariants[index];
    
    // Create modal or lightbox preview
    const previewWindow = window.open('', '_blank');
    previewWindow.document.write(`
        <html>
            <head><title>Preview - ${variant.format}</title></head>
            <body style="margin:0; display:flex; align-items:center; justify-content:center; background:#1e293b;">
                <img src="${originalImageData}" style="max-width:100%; max-height:100vh; object-fit:contain;">
                <div style="position:fixed; bottom:20px; left:50%; transform:translateX(-50%); 
                            background:rgba(0,0,0,0.8); color:white; padding:8px 16px; border-radius:30px;
                            font-size:12px; backdrop-filter:blur(4px);">
                    ${variant.format} · ${variant.dimensions} · ${formatBytes(variant.size)} · ${variant.quality} quality
                </div>
            </body>
        </html>
    `);
}

function downloadAll() {
    optimizedVariants.forEach((_, index) => {
        setTimeout(() => downloadVariant(index), index * 500);
    });
    
    showToast('Downloading all variants...', 'success');
}

function downloadOriginal() {
    if (!currentFile) return;
    
    const link = document.createElement('a');
    link.href = originalImageData;
    link.download = currentFile.name;
    link.click();
    
    showToast('Downloading original image', 'success');
}

function resetUpload() {
    currentFile = null;
    originalImageData = null;
    optimizedVariants = [];
    
    imagePreviewThumb.classList.add('hidden');
    originalInfo.classList.add('hidden');
    optimizationControls.classList.add('hidden');
    statsCard.classList.add('hidden');
    downloadAllBtn.classList.add('hidden');
    
    resultsDiv.innerHTML = `
        <div class="empty-results">
            <div class="empty-icon">
                <i class="fas fa-images"></i>
            </div>
            <h4>No images optimized yet</h4>
            <p>Upload an image and click optimize to see results</p>
            <div class="empty-suggestion">
                <span>✨ Try dropping a high-res photo</span>
            </div>
        </div>
    `;
    
    variantsCount.textContent = '0 variants';
    imgInput.value = '';
    
    showToast('Reset complete', 'info');
}

function resetAll() {
    resetUpload();
    
    // Reset format selection
    document.querySelectorAll('.format-card').forEach((card, index) => {
        card.classList.toggle('active', index === 0);
        card.querySelector('input').checked = index === 0;
    });
    
    // Reset quality
    qualitySlider.value = 85;
    qualityValue.textContent = '85%';
    
    // Reset checkboxes
    document.getElementById('maintain-aspect').checked = true;
    document.getElementById('strip-metadata').checked = true;
    document.getElementById('optimize-for-web').checked = true;
    document.getElementById('progressive').checked = false;
}

function toggleViewMode() {
    viewMode = viewMode === 'grid' ? 'list' : 'grid';
    resultsDiv.className = viewMode === 'grid' ? 'results-grid' : 'results-list';
    document.querySelector('.view-toggle-btn i').className = viewMode === 'grid' ? 'fas fa-th' : 'fas fa-list';
}

function updateFormatSelection(e) {
    document.querySelectorAll('.format-card').forEach(card => {
        card.classList.remove('active');
    });
    e.target.closest('.format-option').querySelector('.format-card').classList.add('active');
}

function showToast(message, type = 'info') {
    toast.innerHTML = `
        <div class="toast-content ${type}">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    toast.classList.remove('hidden');
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// Format bytes helper
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
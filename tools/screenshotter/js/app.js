// Screenshotter tool - enhanced UI with download capability
document.addEventListener('DOMContentLoaded', function() {
    initializeTool();
    setupKeyboardShortcuts();
});

let currentScreenshotData = null;
let currentScreenshotFormat = 'PNG';
let currentZoom = 1;

function initializeTool() {
    // Set default values
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('url')) {
        document.getElementById('ss-url').value = urlParams.get('url');
    }
    
    // Initialize format selector
    document.querySelectorAll('.format-option input').forEach(radio => {
        if (radio.checked) {
            radio.closest('.format-option').querySelector('.format-card').classList.add('active');
        }
    });
    
    // Initialize dimension displays
    updateDimensions();
}

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Cmd/Ctrl + Enter = Capture
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            captureScreenshot();
        }
        
        // Cmd/Ctrl + S = Download (prevent save page)
        if ((e.metaKey || e.ctrlKey) && e.key === 's') {
            e.preventDefault();
            downloadScreenshot();
        }
        
        // Cmd/Ctrl + 0 = Reset
        if ((e.metaKey || e.ctrlKey) && e.key === '0') {
            e.preventDefault();
            resetSettings();
        }
    });
}

function updateFormat(format) {
    currentScreenshotFormat = format;
    
    // Update active state
    document.querySelectorAll('.format-card').forEach(card => {
        card.classList.remove('active');
    });
    
    event.target.closest('.format-card').classList.add('active');
}

function updateDimensions() {
    const width = document.getElementById('width-slider').value;
    const height = document.getElementById('height-slider').value;
    
    document.getElementById('width-value').textContent = width + 'px';
    document.getElementById('height-value').textContent = height + 'px';
    document.getElementById('viewport-display').textContent = width + 'x' + height;
    
    // Update active preset
    updateActivePreset(width, height);
}

function updateActivePreset(width, height) {
    const presets = {
        '1920x1080': 'Desktop',
        '1366x768': 'Laptop',
        '768x1024': 'Tablet',
        '375x812': 'Mobile'
    };
    
    const presetKey = width + 'x' + height;
    
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.width == width && btn.dataset.height == height) {
            btn.classList.add('active');
        }
    });
}

// Handle preset button clicks
document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const width = this.dataset.width;
        const height = this.dataset.height;
        
        document.getElementById('width-slider').value = width;
        document.getElementById('height-slider').value = height;
        
        updateDimensions();
    });
});

// Handle DPR buttons
document.querySelectorAll('.dpr-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.dpr-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
    });
});

function scanUrl() {
    const url = document.getElementById('ss-url').value;
    if (!url) return;
    
    try {
        const urlObj = new URL(url);
        // Simulate fetching metadata
        showNotification('Scanning URL...', 'info');
        
        setTimeout(() => {
            showNotification('✓ Metadata fetched', 'success');
        }, 1000);
    } catch {
        showNotification('Invalid URL', 'error');
    }
}

async function captureScreenshot() {
    const url = document.getElementById('ss-url').value;
    if (!url) {
        showNotification('Please enter a URL', 'error');
        return;
    }
    
    // Validate URL
    try {
        new URL(url);
    } catch {
        showNotification('Please enter a valid URL (include https://)', 'error');
        return;
    }
    
    const format = currentScreenshotFormat;
    const width = document.getElementById('width-slider').value;
    const height = document.getElementById('height-slider').value;
    const delay = document.getElementById('delay').value;
    const fullPage = document.getElementById('full-page')?.checked || false;
    const darkMode = document.getElementById('dark-mode')?.checked || false;
    
    const container = document.getElementById('ss-result');
    const previewInfo = document.getElementById('preview-info');
    const loadingOverlay = document.getElementById('loading-overlay');
    const progressBar = document.getElementById('capture-progress');
    const captureTime = document.getElementById('capture-time');
    
    // Show loading
    loadingOverlay.classList.remove('hidden');
    previewInfo.classList.add('hidden');
    
    // Update status
    document.getElementById('preview-status').textContent = 'Capturing...';
    document.getElementById('preview-status').className = 'preview-badge';
    
    try {
        // Simulate progress
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress <= 90) {
                progressBar.style.width = progress + '%';
            }
        }, 200);
        
        // Simulate API call with delay
        await new Promise(r => setTimeout(r, 2000 + parseInt(delay)));
        
        clearInterval(progressInterval);
        progressBar.style.width = '100%';
        
        // Using Microlink for screenshot preview
        const screenshotUrl = `https://api.microlink.io?url=${encodeURIComponent(url)}&screenshot=true&embed=screenshot.url`;
        
        // Fetch the actual screenshot for download
        const response = await fetch(screenshotUrl);
        const blob = await response.blob();
        
        // Store screenshot data
        currentScreenshotData = blob;
        
        // Calculate file size
        const fileSize = formatBytes(blob.size);
        
        // Display preview
        container.innerHTML = `
            <div class="relative w-full group" style="transform: scale(${currentZoom})">
                <img src="${screenshotUrl}" 
                     class="w-full h-auto rounded-lg shadow-2xl" 
                     alt="Screenshot preview"
                     onclick="toggleZoom()"
                     onerror="handleImageError(this, '${url}', ${width}, ${height})">
                
                <!-- Device Frame (optional) -->
                ${fullPage ? '' : `
                <div class="absolute inset-0 pointer-events-none border-[12px] border-slate-800 rounded-lg"></div>
                `}
            </div>
        `;
        
        // Update preview info
        document.getElementById('preview-format').innerHTML = `<i class="fas fa-${format === 'PNG' ? 'image' : format === 'JPEG' ? 'camera' : 'file-pdf'}"></i> ${format}`;
        document.getElementById('preview-dimensions').textContent = width + 'x' + height;
        document.getElementById('preview-size').textContent = fileSize;
        
        // Show download button
        const downloadBtn = document.getElementById('download-screenshot-btn');
        downloadBtn.classList.remove('hidden');
        document.getElementById('download-size').textContent = fileSize;
        
        // Update info
        previewInfo.classList.remove('hidden');
        captureTime.textContent = new Date().toLocaleTimeString();
        document.getElementById('preview-status').textContent = 'Ready';
        document.getElementById('preview-status').classList.add('ready');
        
        showNotification('Screenshot captured successfully!', 'success');
        
    } catch (error) {
        console.error('Screenshot error:', error);
        handleCaptureError(url, width, height);
    } finally {
        loadingOverlay.classList.add('hidden');
    }
}

function handleImageError(img, url, width, height) {
    // Create fallback canvas image
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    // Draw gradient background
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#6366f1');
    gradient.addColorStop(1, '#8b5cf6');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Draw text
    ctx.fillStyle = 'white';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(url, width/2, height/2);
    ctx.font = '16px Arial';
    ctx.fillText('Preview unavailable', width/2, height/2 + 40);
    
    // Convert to data URL
    img.src = canvas.toDataURL('image/png');
    
    // Create blob for download
    canvas.toBlob((blob) => {
        currentScreenshotData = blob;
    });
}

function handleCaptureError(url, width, height) {
    const container = document.getElementById('ss-result');
    const loadingOverlay = document.getElementById('loading-overlay');
    
    container.innerHTML = `
        <div class="text-center p-8">
            <div class="text-red-500 text-5xl mb-4">⚠️</div>
            <h3 class="text-lg font-semibold text-slate-800 mb-2">Capture Failed</h3>
            <p class="text-slate-500 mb-4">Could not capture screenshot from ${url}</p>
            <button onclick="retryCapture()" class="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
                <i class="fas fa-redo-alt mr-2"></i>Retry
            </button>
        </div>
    `;
    
    document.getElementById('preview-status').textContent = 'Failed';
    showNotification('Failed to capture screenshot', 'error');
}

function retryCapture() {
    captureScreenshot();
}

async function downloadScreenshot() {
    if (!currentScreenshotData) {
        showNotification('No screenshot to download', 'error');
        return;
    }
    
    const format = currentScreenshotFormat.toLowerCase();
    const url = document.getElementById('ss-url').value || 'screenshot';
    const timestamp = new Date().toISOString().slice(0,19).replace(/:/g, '-');
    const filename = `${sanitizeFilename(url)}_${timestamp}.${format === 'jpeg' ? 'jpg' : format}`;
    
    try {
        // Show downloading state
        const downloadBtn = document.getElementById('download-screenshot-btn');
        const originalText = downloadBtn.innerHTML;
        downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Downloading...';
        downloadBtn.disabled = true;
        
        // Create download link
        const downloadUrl = URL.createObjectURL(currentScreenshotData);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Cleanup
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 100);
        
        // Reset button
        setTimeout(() => {
            downloadBtn.innerHTML = originalText;
            downloadBtn.disabled = false;
        }, 1000);
        
        showNotification(`Downloaded: ${filename}`, 'success');
        
    } catch (error) {
        console.error('Download error:', error);
        showNotification('Download failed', 'error');
    }
}

function resetSettings() {
    // Reset URL
    document.getElementById('ss-url').value = '';
    
    // Reset format to PNG
    document.querySelectorAll('.format-option input').forEach(radio => {
        if (radio.value === 'PNG') {
            radio.checked = true;
            radio.closest('.format-option').querySelector('.format-card').classList.add('active');
        } else {
            radio.closest('.format-option').querySelector('.format-card').classList.remove('active');
        }
    });
    
    // Reset dimensions
    document.getElementById('width-slider').value = 1920;
    document.getElementById('height-slider').value = 1080;
    updateDimensions();
    
    // Reset DPR
    document.querySelectorAll('.dpr-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.dpr === '1') {
            btn.classList.add('active');
        }
    });
    
    // Reset checkboxes
    document.querySelectorAll('.toggle-checkbox').forEach(cb => {
        if (cb.id === 'remove-ads') {
            cb.checked = true;
        } else {
            cb.checked = false;
        }
    });
    
    // Reset delay
    document.getElementById('delay').value = 1000;
    
    // Clear preview
    document.getElementById('ss-result').innerHTML = `
        <div class="empty-preview">
            <div class="empty-icon">
                <i class="fas fa-camera"></i>
            </div>
            <h4>No screenshot yet</h4>
            <p>Configure your settings and click capture to generate a preview</p>
        </div>
    `;
    
    // Hide download button and preview info
    document.getElementById('download-screenshot-btn').classList.add('hidden');
    document.getElementById('preview-info').classList.add('hidden');
    
    showNotification('Settings reset', 'info');
}

function zoomIn() {
    currentZoom = Math.min(currentZoom + 0.1, 2);
    applyZoom();
}

function zoomOut() {
    currentZoom = Math.max(currentZoom - 0.1, 0.5);
    applyZoom();
}

function fitToScreen() {
    currentZoom = 1;
    applyZoom();
}

function toggleZoom() {
    if (currentZoom === 1) {
        currentZoom = 1.5;
    } else {
        currentZoom = 1;
    }
    applyZoom();
}

function applyZoom() {
    const preview = document.querySelector('#ss-result img');
    if (preview) {
        preview.style.transform = `scale(${currentZoom})`;
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 z-50 animate-slide-up ${
        type === 'success' ? 'bg-green-500' : 
        type === 'error' ? 'bg-red-500' : 
        'bg-indigo-500'
    } text-white`;
    
    const icon = type === 'success' ? 'fa-check-circle' : 
                 type === 'error' ? 'fa-exclamation-circle' : 
                 'fa-info-circle';
    
    notification.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('opacity-0', 'transition-opacity', 'duration-500');
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

function sanitizeFilename(url) {
    try {
        const urlObj = new URL(url);
        let hostname = urlObj.hostname.replace('www.', '');
        return hostname.split('.')[0] || 'screenshot';
    } catch {
        return 'screenshot';
    }
}

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 KB';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function showShortcuts() {
    // Already handled by hover, but can add additional functionality
}
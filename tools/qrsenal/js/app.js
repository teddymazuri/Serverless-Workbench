// QRsenal Application
document.addEventListener('DOMContentLoaded', function() {
    initializeTool();
});

// State management
let currentMode = 'generate';
let qrcodeObj = null;
let html5QrCode = null;
let isScanning = false;

// DOM Elements
const qrInput = document.getElementById('qr-input');
const qrColor = document.getElementById('qr-color');
const qrError = document.getElementById('qr-error');
const qrContainer = document.getElementById('qrcode');
const qrPlaceholder = document.getElementById('qr-placeholder');
const downloadBtn = document.getElementById('download-qr');
const generatorControls = document.getElementById('generator-controls');
const scannerControls = document.getElementById('scanner-controls');
const generatePreview = document.getElementById('generate-preview');
const scanPreview = document.getElementById('scan-preview');
const generateActions = document.getElementById('generate-actions');
const scanActions = document.getElementById('scan-actions');
const modeBadge = document.getElementById('mode-badge');
const scanResultCard = document.getElementById('scan-result-card');
const scanResult = document.getElementById('scan-result');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');

function initializeTool() {
    // Set default active states
    updateQR();
    
    // Color preset listeners
    document.querySelectorAll('.color-preset').forEach(btn => {
        btn.addEventListener('click', function() {
            const color = this.dataset.color;
            qrColor.value = color;
            
            document.querySelectorAll('.color-preset').forEach(b => {
                b.classList.remove('active');
            });
            this.classList.add('active');
            
            updateQR();
        });
    });
    
    // Size radio listeners
    document.querySelectorAll('input[name="size"]').forEach(radio => {
        radio.addEventListener('change', updateQR);
    });
    
    // Input listeners
    qrInput.addEventListener('input', updateQR);
    qrColor.addEventListener('input', function() {
        document.querySelectorAll('.color-preset').forEach(b => {
            b.classList.remove('active');
        });
        updateQR();
    });
    qrError.addEventListener('change', updateQR);
    
    // Download button - FIXED for mobile
    downloadBtn.addEventListener('click', downloadQR);
    
    // Scanner restart
    document.getElementById('restart-scanner').addEventListener('click', restartScanner);
    
    // Copy scan button
    document.getElementById('copy-scan-btn').addEventListener('click', copyScanResult);
    
    // Set first color preset as active
    document.querySelector('.color-preset').classList.add('active');
}

// Mode switching
function switchMode(mode) {
    currentMode = mode;
    
    // Update UI
    if (mode === 'generate') {
        generatorControls.classList.remove('hidden');
        scannerControls.classList.add('hidden');
        generatePreview.classList.remove('hidden');
        scanPreview.classList.add('hidden');
        generateActions.classList.remove('hidden');
        scanActions.classList.add('hidden');
        modeBadge.textContent = 'Generate Mode';
        
        // Stop scanner if running
        stopScanner();
    } else {
        generatorControls.classList.add('hidden');
        scannerControls.classList.remove('hidden');
        generatePreview.classList.add('hidden');
        scanPreview.classList.remove('hidden');
        generateActions.classList.add('hidden');
        scanActions.classList.remove('hidden');
        modeBadge.textContent = 'Scan Mode';
        
        // Start scanner
        startScanner();
    }
    
    // Update active tab
    document.querySelectorAll('.format-card').forEach((card, index) => {
        if ((mode === 'generate' && index === 0) || (mode === 'scan' && index === 1)) {
            card.classList.add('active');
        } else {
            card.classList.remove('active');
        }
    });
}

// QR Generation
function updateQR() {
    const text = qrInput.value.trim();
    const size = document.querySelector('input[name="size"]:checked')?.value || '256';
    const color = qrColor.value;
    const errorLevel = qrError.value;
    
    // Clear previous QR
    qrContainer.innerHTML = "";
    
    if (text === "") {
        qrPlaceholder.classList.remove('hidden');
        return;
    }
    
    qrPlaceholder.classList.add('hidden');
    
    // Map error correction level to QRCode.js format
    const errorMap = {
        'L': QRCode.CorrectLevel.L,
        'M': QRCode.CorrectLevel.M,
        'Q': QRCode.CorrectLevel.Q,
        'H': QRCode.CorrectLevel.H
    };
    
    qrcodeObj = new QRCode(qrContainer, {
        text: text,
        width: parseInt(size),
        height: parseInt(size),
        colorDark: color,
        colorLight: "#ffffff",
        correctLevel: errorMap[errorLevel]
    });
}

// FIXED: Download QR Code as PNG with proper handling for mobile
function downloadQR() {
    const qrImage = qrContainer.querySelector('img, canvas');
    if (!qrImage) {
        showToast('Generate a QR code first', 'error');
        return;
    }

    let imageData;
    
    // Handle both img elements (from qrcodejs) and canvas (fallback)
    if (qrImage.tagName === 'IMG') {
        imageData = qrImage.src;
    } else if (qrImage.tagName === 'CANVAS') {
        imageData = qrImage.toDataURL('image/png');
    } else {
        showToast('QR code format not supported', 'error');
        return;
    }

    // Convert data URL to blob for proper file download
    fetch(imageData)
        .then(res => res.blob())
        .then(blob => {
            // Create filename with timestamp
            const filename = `qrsenal-${Date.now()}.png`;
            
            // For mobile devices, use a different approach if needed
            if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
                // Mobile download - use Blob URL
                const blobUrl = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = filename;
                
                // Required for some mobile browsers
                link.style.display = 'none';
                document.body.appendChild(link);
                
                // Trigger download
                link.click();
                
                // Cleanup
                setTimeout(() => {
                    document.body.removeChild(link);
                    URL.revokeObjectURL(blobUrl);
                }, 100);
            } else {
                // Desktop download
                const link = document.createElement('a');
                link.download = filename;
                link.href = URL.createObjectURL(blob);
                link.click();
                URL.revokeObjectURL(link.href);
            }
            
            showToast('QR code downloaded', 'success');
        })
        .catch(error => {
            console.error('Download error:', error);
            
            // Fallback method for older browsers
            try {
                const link = document.createElement('a');
                link.download = `qrsenal-${Date.now()}.png`;
                link.href = imageData;
                link.click();
                showToast('QR code downloaded', 'success');
            } catch (fallbackError) {
                showToast('Download failed - try long-pressing the image', 'error');
            }
        });
}

// Template insertion
function insertTemplate(type) {
    const templates = {
        'url': 'https://example.com',
        'phone': '+1234567890',
        'email': 'hello@example.com',
        'text': 'Hello, world!'
    };
    
    qrInput.value = templates[type];
    updateQR();
    showToast(`${type.toUpperCase()} template inserted`, 'info');
    
    // Switch to generate mode if in scan mode
    if (currentMode === 'scan') {
        switchMode('generate');
    }
}

// Scanner functions
function startScanner() {
    if (isScanning) return;
    
    html5QrCode = new Html5Qrcode("reader");
    const config = { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
    };

    html5QrCode.start(
        { facingMode: "environment" }, 
        config, 
        onScanSuccess,
        onScanError
    ).then(() => {
        isScanning = true;
        document.getElementById('scanner-status-text').textContent = 'Camera active - point at a QR code';
        document.getElementById('scanner-status-indicator').className = 'w-3 h-3 bg-emerald-500 rounded-full animate-pulse';
    }).catch(err => {
        console.error("Camera access failed", err);
        document.getElementById('scanner-status-text').textContent = 'Camera access failed - check permissions';
        document.getElementById('scanner-status-indicator').className = 'w-3 h-3 bg-rose-500 rounded-full';
        showToast('Camera access failed', 'error');
    });
}

function stopScanner() {
    if (html5QrCode && isScanning) {
        html5QrCode.stop().then(() => {
            html5QrCode.clear();
            isScanning = false;
        }).catch(err => {
            console.error("Error stopping scanner", err);
        });
    }
}

function restartScanner() {
    stopScanner();
    setTimeout(() => {
        startScanner();
        scanResultCard.classList.add('hidden');
    }, 500);
}

function onScanSuccess(decodedText, decodedResult) {
    // Show result
    scanResult.textContent = decodedText;
    scanResultCard.classList.remove('hidden');
    
    // Haptic feedback
    if (window.navigator.vibrate) {
        window.navigator.vibrate(100);
    }
    
    showToast('QR code scanned!', 'success');
    
    // Optional: auto-stop after scan (uncomment if desired)
    // stopScanner();
}

function onScanError(error) {
    // Silent fail - most errors are just "no QR found"
}

function copyScanResult() {
    const text = scanResult.textContent;
    if (!text) {
        showToast('No content to copy', 'error');
        return;
    }
    
    navigator.clipboard.writeText(text).then(() => {
        showToast('Copied to clipboard!', 'success');
    }).catch(() => {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('Copied to clipboard!', 'success');
    });
}

function useAsInput() {
    const text = scanResult.textContent;
    if (text) {
        switchMode('generate');
        qrInput.value = text;
        updateQR();
        showToast('Content transferred to generator', 'info');
    }
}

// Toast notification
function showToast(message, type = 'info') {
    toastMessage.textContent = message;
    
    // Set icon based on type
    const icon = toast.querySelector('i');
    icon.className = 'fas ' + (
        type === 'success' ? 'fa-check-circle' :
        type === 'error' ? 'fa-exclamation-circle' :
        'fa-info-circle'
    );
    
    // Change background color based on type
    toast.className = toast.className.replace(/bg-\w+-\d+/g, '');
    if (type === 'success') {
        toast.classList.add('bg-emerald-600');
    } else if (type === 'error') {
        toast.classList.add('bg-rose-600');
    } else {
        toast.classList.add('bg-slate-800');
    }
    
    // Show toast
    toast.classList.remove('opacity-0');
    
    setTimeout(() => {
        toast.classList.add('opacity-0');
    }, 2000);
}

// Make functions global for onclick handlers
window.switchMode = switchMode;
window.insertTemplate = insertTemplate;
window.updateQR = updateQR;
window.copyScanResult = copyScanResult;
window.useAsInput = useAsInput;

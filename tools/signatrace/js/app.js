// SignaTrace Application
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const canvas = document.getElementById('sigCanvas');
    const container = document.getElementById('canvas-container');
    const ctx = canvas.getContext('2d');
    
    // Controls
    const penColor = document.getElementById('penColor');
    const penSize = document.getElementById('penSize');
    const clearBtn = document.getElementById('clearBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const copyBtn = document.getElementById('copyBtn');
    const showBaseline = document.getElementById('showBaseline');
    const baseline = document.getElementById('baseline');
    
    // Display elements
    const penSizeDisplay = document.getElementById('pen-size-display');
    const penPreview = document.getElementById('pen-preview');
    const drawingStatus = document.getElementById('drawing-status');
    const drawingIndicator = document.getElementById('drawing-indicator');
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');

    // State
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    let undoStack = [];
    let redoStack = [];

    // Initialize canvas
    function resizeCanvas() {
        const rect = container.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        
        // Restore context properties
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.strokeStyle = penColor.value;
        ctx.lineWidth = penSize.value;
        
        // Redraw from undo stack if exists
        if (undoStack.length > 0) {
            const img = new Image();
            img.src = undoStack[undoStack.length - 1];
            img.onload = () => {
                ctx.drawImage(img, 0, 0);
            };
        }
    }

    // Initial resize
    resizeCanvas();

    // Window resize handler
    window.addEventListener('resize', () => {
        resizeCanvas();
    });

    // Drawing functions
    function startDrawing(e) {
        e.preventDefault();
        isDrawing = true;
        [lastX, lastY] = getCoordinates(e);
        
        // Update UI
        drawingStatus.textContent = 'Drawing...';
        drawingIndicator.style.opacity = '1';
        
        // Begin path
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
    }

    function draw(e) {
        e.preventDefault();
        if (!isDrawing) return;
        
        const [x, y] = getCoordinates(e);
        
        ctx.strokeStyle = penColor.value;
        ctx.lineWidth = penSize.value;
        
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.stroke();
        
        lastX = x;
        lastY = y;
    }

    function stopDrawing() {
        if (isDrawing) {
            isDrawing = false;
            
            // Save to undo stack
            saveState();
            
            // Update UI
            drawingStatus.textContent = 'Ready';
            drawingIndicator.style.opacity = '0';
        }
    }

    function getCoordinates(e) {
        const rect = canvas.getBoundingClientRect();
        let clientX, clientY;

        if (e.touches && e.touches[0]) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        // Constrain coordinates to canvas bounds
        let x = Math.max(0, Math.min(clientX - rect.left, canvas.width));
        let y = Math.max(0, Math.min(clientY - rect.top, canvas.height));

        return [x, y];
    }

    // Save canvas state for undo
    function saveState() {
        const state = canvas.toDataURL();
        undoStack.push(state);
        redoStack = []; // Clear redo stack
    }

    // Undo function
    function undo() {
        if (undoStack.length > 1) {
            const current = undoStack.pop();
            redoStack.push(current);
            
            const previous = undoStack[undoStack.length - 1];
            const img = new Image();
            img.src = previous;
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
            };
            
            showToast('Undo', 'info');
        } else if (undoStack.length === 1) {
            // Clear completely
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            undoStack = [];
            showToast('Cleared', 'info');
        }
    }

    // Clear canvas
    function clearCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        undoStack = [];
        redoStack = [];
        saveState(); // Save empty state
        showToast('Canvas cleared', 'success');
    }

    // Download as PNG
    function downloadPNG() {
        // Check if canvas is empty
        const pixelData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const isEmpty = !pixelData.some(value => value !== 0);
        
        if (isEmpty) {
            showToast('Draw something first!', 'error');
            return;
        }

        // Create download link
        const dataURL = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `signature-${new Date().toISOString().slice(0,10)}.png`;
        link.href = dataURL;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast('Downloading signature...', 'success');
    }

    // Copy to clipboard
    async function copyToClipboard() {
        // Check if canvas is empty
        const pixelData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const isEmpty = !pixelData.some(value => value !== 0);
        
        if (isEmpty) {
            showToast('Draw something first!', 'error');
            return;
        }

        try {
            // Convert canvas to blob
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            
            // Copy to clipboard
            await navigator.clipboard.write([
                new ClipboardItem({
                    'image/png': blob
                })
            ]);
            
            showToast('Signature copied to clipboard!', 'success');
        } catch (err) {
            console.error('Copy failed:', err);
            showToast('Failed to copy', 'error');
        }
    }

    // Show toast notification
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

    // Update pen preview
    function updatePenPreview(size) {
        penPreview.style.width = size + 'px';
        penPreview.style.height = size + 'px';
    }

    // Event Listeners
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    // Touch events
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);
    canvas.addEventListener('touchcancel', stopDrawing);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + Z for undo
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            e.preventDefault();
            undo();
        }
        
        // Delete key to clear
        if (e.key === 'Delete' || e.key === 'd') {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                clearCanvas();
            }
        }
    });

    // Pen color change
    penColor.addEventListener('input', (e) => {
        ctx.strokeStyle = e.target.value;
    });

    // Color presets
    document.querySelectorAll('.color-preset').forEach(btn => {
        btn.addEventListener('click', function() {
            const color = this.dataset.color;
            penColor.value = color;
            ctx.strokeStyle = color;
            
            // Update active state
            document.querySelectorAll('.color-preset').forEach(b => {
                b.classList.remove('active');
            });
            this.classList.add('active');
        });
    });

    // Pen size change
    penSize.addEventListener('input', (e) => {
        const size = e.target.value;
        ctx.lineWidth = size;
        penSizeDisplay.textContent = size + 'px';
        updatePenPreview(size);
    });

    // Toggle baseline
    showBaseline.addEventListener('change', (e) => {
        if (e.target.checked) {
            baseline.classList.remove('hidden');
        } else {
            baseline.classList.add('hidden');
        }
    });

    // Buttons
    clearBtn.addEventListener('click', clearCanvas);
    downloadBtn.addEventListener('click', downloadPNG);
    copyBtn.addEventListener('click', copyToClipboard);

    // Initialize
    saveState(); // Save initial empty state
    updatePenPreview(penSize.value);
    
    // Set first color preset as active
    document.querySelector('.color-preset').classList.add('active');

    // Prevent context menu on canvas
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
});
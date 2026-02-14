// PDF Stitcher - Enhanced with modern UI and functionality
let pdfFiles = [];
let pdfDocuments = [];
let currentPreviewIndex = -1;
let viewMode = 'list';

// DOM Elements
const pdfInput = document.getElementById('pdf-input');
const pdfList = document.getElementById('pdf-list');
const stitchBtn = document.getElementById('stitch-btn');
const fileCount = document.getElementById('file-count');
const totalPages = document.getElementById('total-pages');
const totalSize = document.getElementById('total-size');
const dropzone = document.getElementById('dropzone');
const queueFooter = document.getElementById('queue-footer');
const queueCount = document.getElementById('queue-count');
const footerFileCount = document.getElementById('footer-file-count');
const footerPageCount = document.getElementById('footer-page-count');
const previewPanel = document.getElementById('preview-panel');
const toast = document.getElementById('toast');
const progressContainer = document.getElementById('progress-container');
const mergeProgress = document.getElementById('merge-progress');

// Initialize
function init() {
    // Dropzone events
    dropzone.addEventListener('click', () => pdfInput.click());
    
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
    });
    
    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('drag-over');
    });
    
    dropzone.addEventListener('drop', handleDrop);
    pdfInput.addEventListener('change', handleFileSelect);
    
    // Page position buttons
    document.querySelectorAll('.position-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.position-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Toggle page position container
    const addPagesCheckbox = document.getElementById('add-pages');
    const pagePositionContainer = document.getElementById('page-position-container');
    
    addPagesCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) {
            pagePositionContainer.style.display = 'block';
        } else {
            pagePositionContainer.style.display = 'none';
        }
    });
    
    // Compression slider
    const compressionSlider = document.getElementById('compression-slider');
    const compressionValue = document.getElementById('compression-value');
    
    compressionSlider.addEventListener('input', (e) => {
        const values = ['none', 'medium', 'high'];
        compressionValue.textContent = values[e.target.value];
    });
}

function handleDrop(e) {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    
    const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
    
    if (files.length === 0) {
        showToast('Please drop PDF files only', 'error');
        return;
    }
    
    processFiles(files);
}

function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    processFiles(files);
}

async function processFiles(files) {
    let added = 0;
    let failed = 0;
    
    showToast(`Processing ${files.length} file(s)...`, 'info');
    
    for (let file of files) {
        try {
            const bytes = await file.arrayBuffer();
            const pdfDoc = await PDFLib.PDFDocument.load(bytes);
            
            pdfFiles.push({
                id: Date.now() + Math.random(),
                name: file.name,
                size: file.size,
                bytes: bytes,
                pageCount: pdfDoc.getPageCount(),
                added: new Date().toLocaleTimeString()
            });
            
            pdfDocuments.push(pdfDoc);
            added++;
        } catch (error) {
            console.error('Error loading PDF:', error);
            failed++;
        }
    }
    
    renderPdfList();
    updateStats();
    
    if (failed > 0) {
        showToast(`Added ${added} file(s), ${failed} failed`, 'error');
    } else {
        showToast(`Successfully added ${added} file(s)`, 'success');
    }
}

function renderPdfList() {
    if (pdfFiles.length === 0) {
        pdfList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <i class="fas fa-file-pdf"></i>
                </div>
                <h4>No documents in queue</h4>
                <p>Add PDF files to start merging</p>
                <button onclick="document.getElementById('pdf-input').click()" class="empty-state-btn">
                    <i class="fas fa-plus-circle mr-2"></i>
                    Browse Files
                </button>
                <div class="empty-state-hint">
                    <span>💡 You can select multiple files at once</span>
                </div>
            </div>
        `;
        queueFooter.classList.add('hidden');
        return;
    }
    
    pdfList.innerHTML = pdfFiles.map((file, index) => `
        <div class="file-item" draggable="true" data-index="${index}" ondragstart="dragStart(event)" ondragover="dragOver(event)" ondrop="drop(${index})" ondragend="dragEnd(event)">
            <div class="file-item-header">
                <div class="file-icon pdf">
                    <i class="fas fa-file-pdf"></i>
                </div>
                <div class="file-info">
                    <div class="file-name">${file.name}</div>
                    <div class="file-meta">
                        <span><i class="far fa-file"></i> ${file.pageCount} page${file.pageCount !== 1 ? 's' : ''}</span>
                        <span><i class="fas fa-weight"></i> ${formatBytes(file.size)}</span>
                        <span><i class="far fa-clock"></i> ${file.added}</span>
                    </div>
                </div>
                <div class="file-actions">
                    <button class="file-action-btn" onclick="previewFile(${index})" title="Preview">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="file-action-btn" onclick="moveUp(${index})" ${index === 0 ? 'disabled' : ''} title="Move up">
                        <i class="fas fa-chevron-up"></i>
                    </button>
                    <button class="file-action-btn" onclick="moveDown(${index})" ${index === pdfFiles.length - 1 ? 'disabled' : ''} title="Move down">
                        <i class="fas fa-chevron-down"></i>
                    </button>
                    <button class="file-action-btn delete" onclick="removePdf(${index})" title="Remove">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
    
    queueFooter.classList.remove('hidden');
    queueCount.textContent = `${pdfFiles.length} item${pdfFiles.length !== 1 ? 's' : ''}`;
}

// Drag and drop reordering
let dragStartIndex;

function dragStart(e) {
    dragStartIndex = parseInt(e.target.closest('.file-item').dataset.index);
    e.dataTransfer.setData('text/plain', '');
    e.target.closest('.file-item').classList.add('dragging');
}

function dragOver(e) {
    e.preventDefault();
    const fileItem = e.target.closest('.file-item');
    if (fileItem) {
        fileItem.style.borderTop = '2px solid #8b5cf6';
    }
}

function drop(targetIndex) {
    e.preventDefault();
    const fileItem = e.target.closest('.file-item');
    if (fileItem) {
        fileItem.style.borderTop = '';
    }
    
    if (dragStartIndex !== targetIndex) {
        // Reorder files
        const [movedFile] = pdfFiles.splice(dragStartIndex, 1);
        pdfFiles.splice(targetIndex, 0, movedFile);
        
        // Reorder documents
        const [movedDoc] = pdfDocuments.splice(dragStartIndex, 1);
        pdfDocuments.splice(targetIndex, 0, movedDoc);
        
        renderPdfList();
        showToast('Documents reordered', 'info');
    }
}

function dragEnd(e) {
    e.target.closest('.file-item')?.classList.remove('dragging');
    document.querySelectorAll('.file-item').forEach(item => {
        item.style.borderTop = '';
    });
}

function moveUp(index) {
    if (index > 0) {
        [pdfFiles[index - 1], pdfFiles[index]] = [pdfFiles[index], pdfFiles[index - 1]];
        [pdfDocuments[index - 1], pdfDocuments[index]] = [pdfDocuments[index], pdfDocuments[index - 1]];
        renderPdfList();
        showToast('Document moved up', 'info');
    }
}

function moveDown(index) {
    if (index < pdfFiles.length - 1) {
        [pdfFiles[index + 1], pdfFiles[index]] = [pdfFiles[index], pdfFiles[index + 1]];
        [pdfDocuments[index + 1], pdfDocuments[index]] = [pdfDocuments[index], pdfDocuments[index + 1]];
        renderPdfList();
        showToast('Document moved down', 'info');
    }
}

function removePdf(index) {
    const fileName = pdfFiles[index].name;
    pdfFiles.splice(index, 1);
    pdfDocuments.splice(index, 1);
    renderPdfList();
    updateStats();
    showToast(`Removed "${fileName}"`, 'info');
    
    if (currentPreviewIndex === index) {
        closePreview();
    }
}

function clearAll() {
    if (pdfFiles.length === 0) return;
    
    pdfFiles = [];
    pdfDocuments = [];
    renderPdfList();
    updateStats();
    closePreview();
    showToast('Queue cleared', 'info');
}

function previewFile(index) {
    const file = pdfFiles[index];
    currentPreviewIndex = index;
    
    document.getElementById('preview-filename').textContent = file.name;
    document.getElementById('preview-pages').textContent = file.pageCount;
    document.getElementById('preview-size').textContent = formatBytes(file.size);
    
    previewPanel.classList.remove('hidden');
}

function closePreview() {
    previewPanel.classList.add('hidden');
    currentPreviewIndex = -1;
}

function updateStats() {
    const count = pdfFiles.length;
    const pages = pdfFiles.reduce((acc, f) => acc + f.pageCount, 0);
    const size = pdfFiles.reduce((acc, f) => acc + f.size, 0);
    
    fileCount.textContent = count;
    totalPages.textContent = pages;
    totalSize.textContent = formatBytes(size);
    
    footerFileCount.textContent = `${count} file${count !== 1 ? 's' : ''}`;
    footerPageCount.textContent = `${pages} page${pages !== 1 ? 's' : ''}`;
    
    stitchBtn.disabled = count < 2;
}

async function stitchPDFs() {
    if (pdfFiles.length < 2) {
        showToast('Please add at least 2 PDF files to merge', 'error');
        return;
    }

    stitchBtn.disabled = true;
    stitchBtn.innerHTML = '<div class="btn-content"><i class="fas fa-spinner fa-spin"></i> Merging...</div>';
    
    progressContainer.classList.remove('hidden');
    mergeProgress.style.width = '0%';
    
    try {
        const { PDFDocument, rgb } = PDFLib;
        const mergedPdf = await PDFDocument.create();
        
        let progress = 0;
        const progressStep = 100 / pdfFiles.length;
        
        for (let i = 0; i < pdfFiles.length; i++) {
            const fileObj = pdfFiles[i];
            const donorPdf = await PDFDocument.load(fileObj.bytes);
            const pages = await mergedPdf.copyPages(donorPdf, donorPdf.getPageIndices());
            
            pages.forEach(page => mergedPdf.addPage(page));
            
            progress += progressStep;
            mergeProgress.style.width = `${Math.min(progress, 100)}%`;
            
            await new Promise(r => setTimeout(r, 100)); // Smooth animation
        }

        // Add page numbers if enabled
        if (document.getElementById('add-pages').checked) {
            const pages = mergedPdf.getPages();
            const position = document.querySelector('.position-btn.active')?.dataset.position || 'bottom-center';
            
            pages.forEach((page, i) => {
                let x, y;
                const pageWidth = page.getWidth();
                const pageHeight = page.getHeight();
                
                switch(position) {
                    case 'bottom-center':
                        x = pageWidth / 2 - 30;
                        y = 20;
                        break;
                    case 'top-center':
                        x = pageWidth / 2 - 30;
                        y = pageHeight - 30;
                        break;
                    case 'bottom-right':
                        x = pageWidth - 80;
                        y = 20;
                        break;
                }
                
                page.drawText(`${i + 1} / ${pages.length}`, {
                    x,
                    y,
                    size: 10,
                    color: rgb(0.4, 0.4, 0.4)
                });
            });
        }

        const pdfBytes = await mergedPdf.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `merged_${new Date().toISOString().slice(0,10)}_${Date.now()}.pdf`;
        link.click();
        
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        showToast('PDF merged successfully!', 'success');
        
    } catch (err) {
        console.error(err);
        showToast('Error merging PDFs. Check console for details.', 'error');
    } finally {
        stitchBtn.disabled = pdfFiles.length < 2;
        stitchBtn.innerHTML = '<span class="btn-content"><i class="fas fa-layer-group"></i> Merge Documents</span>';
        
        setTimeout(() => {
            progressContainer.classList.add('hidden');
            mergeProgress.style.width = '0%';
        }, 1000);
    }
}

function toggleViewMode() {
    viewMode = viewMode === 'list' ? 'grid' : 'list';
    const container = document.getElementById('pdf-list');
    
    if (viewMode === 'grid') {
        container.style.display = 'grid';
        container.style.gridTemplateColumns = 'repeat(2, 1fr)';
        container.style.gap = '12px';
    } else {
        container.style.display = 'block';
        container.style.gridTemplateColumns = 'none';
    }
    
    document.querySelector('.view-toggle-btn i').className = 
        viewMode === 'list' ? 'fas fa-list' : 'fas fa-th-large';
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

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
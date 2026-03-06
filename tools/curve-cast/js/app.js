// Simple, working CurveCast application
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const svg = document.getElementById('main-svg');
    const previewPath = document.getElementById('preview-path');
    const ghostPath = document.getElementById('ghost-path');
    const controlsGroup = document.getElementById('controls-group');
    const outputDiv = document.getElementById('svg-output');
    const pointCountSpan = document.getElementById('point-count');
    const pathClosedSpan = document.getElementById('path-closed');
    const coordDisplay = document.getElementById('coord-display');
    
    // State
    let points = [];
    let isDrawing = false;
    let isClosed = false;
    let activePoint = null;
    let pathColor = '#1e1b4b';
    let strokeWidth = 3.5;
    let pathStyle = 'solid';
    let snapToGrid = true;
    let gridSize = 25;
    let showHandles = true;

    // Initialize
    updateUI();

    // Event Listeners
    svg.addEventListener('mousedown', handleMouseDown);
    svg.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    svg.addEventListener('mousemove', function(e) {
        const rect = svg.getBoundingClientRect();
        const x = Math.round(e.clientX - rect.left);
        const y = Math.round(e.clientY - rect.top);
        coordDisplay.textContent = `${x}, ${y}`;
        coordDisplay.style.display = 'block';
    });
    
    svg.addEventListener('mouseleave', function() {
        coordDisplay.style.display = 'none';
    });

    // Button Listeners
    document.getElementById('new-path-btn').addEventListener('click', resetCanvas);
    document.getElementById('close-path-btn').addEventListener('click', closePath);
    document.getElementById('reset-canvas-btn').addEventListener('click', resetCanvas);
    document.getElementById('copy-svg-btn').addEventListener('click', copySVG);
    document.getElementById('export-svg-btn').addEventListener('click', exportSVG);
    
    document.getElementById('style-solid').addEventListener('click', function() {
        pathStyle = 'solid';
        updatePathStyle();
        updateStyleButtons('solid');
    });
    
    document.getElementById('style-dashed').addEventListener('click', function() {
        pathStyle = 'dashed';
        updatePathStyle();
        updateStyleButtons('dashed');
    });
    
    document.getElementById('style-dotted').addEventListener('click', function() {
        pathStyle = 'dotted';
        updatePathStyle();
        updateStyleButtons('dotted');
    });
    
    document.getElementById('stroke-width').addEventListener('input', function(e) {
        strokeWidth = parseFloat(e.target.value);
        document.getElementById('stroke-width-display').textContent = strokeWidth + 'px';
        updatePathStyle();
    });
    
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.color-btn').forEach(b => {
                b.classList.remove('border-indigo-600');
                b.classList.add('border-transparent');
            });
            this.classList.remove('border-transparent');
            this.classList.add('border-indigo-600');
            pathColor = this.dataset.color;
            updatePathStyle();
        });
    });
    
    document.getElementById('snap-to-grid').addEventListener('change', function(e) {
        snapToGrid = e.target.checked;
    });
    
    document.getElementById('grid-size').addEventListener('input', function(e) {
        gridSize = parseInt(e.target.value);
        document.getElementById('grid-size-display').textContent = gridSize + 'px';
        
        // Update grid pattern
        const pattern = document.querySelector('pattern');
        if (pattern) {
            pattern.setAttribute('width', gridSize);
            pattern.setAttribute('height', gridSize);
        }
    });
    
    document.getElementById('toggle-handles-btn').addEventListener('click', function() {
        showHandles = !showHandles;
        updateUI();
    });

    // Helper Functions
    function updateStyleButtons(active) {
        document.querySelectorAll('.style-btn').forEach(btn => {
            btn.classList.remove('bg-indigo-100', 'text-indigo-700', 'border-indigo-300');
            btn.classList.add('bg-slate-100', 'text-slate-700', 'border-transparent');
        });
        
        if (active === 'solid') {
            const btn = document.getElementById('style-solid');
            btn.classList.remove('bg-slate-100', 'text-slate-700');
            btn.classList.add('bg-indigo-100', 'text-indigo-700', 'border-indigo-300');
        } else if (active === 'dashed') {
            const btn = document.getElementById('style-dashed');
            btn.classList.remove('bg-slate-100', 'text-slate-700');
            btn.classList.add('bg-indigo-100', 'text-indigo-700', 'border-indigo-300');
        } else if (active === 'dotted') {
            const btn = document.getElementById('style-dotted');
            btn.classList.remove('bg-slate-100', 'text-slate-700');
            btn.classList.add('bg-indigo-100', 'text-indigo-700', 'border-indigo-300');
        }
    }

    function handleMouseDown(e) {
        if (isClosed) return;

        const rect = svg.getBoundingClientRect();
        let x = Math.round(e.clientX - rect.left);
        let y = Math.round(e.clientY - rect.top);

        // Snap to grid
        if (snapToGrid) {
            x = Math.round(x / gridSize) * gridSize;
            y = Math.round(y / gridSize) * gridSize;
        }

        // Check for closing path
        if (points.length > 2) {
            const first = points[0];
            const dist = Math.hypot(first.x - x, first.y - y);
            if (dist < 15) {
                closePath();
                return;
            }
        }

        // Add new point
        isDrawing = true;
        activePoint = { x, y, cp1x: x, cp1y: y, cp2x: x, cp2y: y };
        points.push(activePoint);
        updateUI();
    }

    function handleMouseMove(e) {
        const rect = svg.getBoundingClientRect();
        let x = Math.round(e.clientX - rect.left);
        let y = Math.round(e.clientY - rect.top);

        if (isDrawing && activePoint) {
            // Update curve handle
            activePoint.cp2x = x;
            activePoint.cp2y = y;
            activePoint.cp1x = activePoint.x - (x - activePoint.x);
            activePoint.cp1y = activePoint.y - (y - activePoint.y);
            updateUI();
        } else if (!isClosed && points.length > 0) {
            // Show ghost line
            const last = points[points.length - 1];
            ghostPath.setAttribute('d', `M ${last.x} ${last.y} L ${x} ${y}`);
        }
    }

    function handleMouseUp() {
        isDrawing = false;
        activePoint = null;
    }

    function closePath() {
        if (points.length > 2) {
            isClosed = true;
            ghostPath.setAttribute('d', '');
            updateUI();
        }
    }

    function generatePathData() {
        if (points.length === 0) return "";
        
        let d = `M ${points[0].x} ${points[0].y}`;
        
        for (let i = 1; i < points.length; i++) {
            const p = points[i];
            const prev = points[i - 1];
            d += ` C ${prev.cp2x} ${prev.cp2y}, ${p.cp1x} ${p.cp1y}, ${p.x} ${p.y}`;
        }

        if (isClosed && points.length > 1) {
            const first = points[0];
            const last = points[points.length - 1];
            d += ` C ${last.cp2x} ${last.cp2y}, ${first.cp1x} ${first.cp1y}, ${first.x} ${first.y} Z`;
        }

        return d;
    }

    function updatePathStyle() {
        let dashArray = 'none';
        if (pathStyle === 'dashed') dashArray = '8,6';
        if (pathStyle === 'dotted') dashArray = '2,4';
        
        previewPath.setAttribute('stroke', pathColor);
        previewPath.setAttribute('stroke-width', strokeWidth);
        previewPath.setAttribute('stroke-dasharray', dashArray);
    }

    function updateUI() {
        const d = generatePathData();
        previewPath.setAttribute('d', d);
        outputDiv.textContent = d || 'M 0 0';
        pointCountSpan.textContent = points.length;
        pathClosedSpan.textContent = isClosed ? 'Closed' : 'Open';
        pathClosedSpan.className = isClosed ? 'text-lg font-bold text-emerald-600' : 'text-lg font-bold text-indigo-600';

        // Redraw controls
        controlsGroup.innerHTML = '';

        points.forEach((p, i) => {
            // Anchor point
            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute('cx', p.x);
            circle.setAttribute('cy', p.y);
            circle.setAttribute('r', 5);
            circle.classList.add('anchor-point');
            controlsGroup.appendChild(circle);

            // Control handles
            if (showHandles && (p.cp1x !== p.x || p.cp1y !== p.y)) {
                drawControl(p.x, p.y, p.cp1x, p.cp1y);
                drawControl(p.x, p.y, p.cp2x, p.cp2y);
            }
        });

        updatePathStyle();
    }

    function drawControl(x1, y1, x2, y2) {
        // Control line
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        line.classList.add('control-line');
        controlsGroup.appendChild(line);

        // Control point
        const cp = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        cp.setAttribute('cx', x2);
        cp.setAttribute('cy', y2);
        cp.setAttribute('r', 4);
        cp.classList.add('control-point');
        controlsGroup.appendChild(cp);
    }

    function resetCanvas() {
        points = [];
        isClosed = false;
        ghostPath.setAttribute('d', '');
        updateUI();
    }

    function copySVG() {
        const d = generatePathData();
        navigator.clipboard.writeText(d).then(() => {
            const btn = document.getElementById('copy-svg-btn');
            const original = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check mr-2"></i>Copied!';
            setTimeout(() => {
                btn.innerHTML = '<i class="fas fa-copy mr-2"></i>Copy';
            }, 1500);
        });
    }

    function exportSVG() {
        const d = generatePathData();
        if (!d) return;
        
        const svgContent = `<svg width="800" height="600" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
    <path d="${d}" stroke="${pathColor}" stroke-width="${strokeWidth}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
        
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `curve-${Date.now()}.svg`;
        a.click();
        URL.revokeObjectURL(url);
    }
});
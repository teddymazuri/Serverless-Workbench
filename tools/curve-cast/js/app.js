// CurveCast Application
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const svg = document.getElementById('main-svg');
    const previewPath = document.getElementById('preview-path');
    const ghostPath = document.getElementById('ghost-path');
    const controlsGroup = document.getElementById('controls-group');
    const outputDiv = document.getElementById('svg-output');
    const pointCountSpan = document.getElementById('point-count');
    const pathClosedSpan = document.getElementById('path-closed');
    const resetBtn = document.getElementById('reset-studio');
    const copyBtn = document.getElementById('copy-svg');

    // State
    let points = [];
    let isDrawing = false;
    let isClosed = false;
    let activePoint = null;

    // Helper function to update UI
    function updateUI() {
        const d = generatePathData();
        previewPath.setAttribute('d', d);
        outputDiv.textContent = d || 'M 0 0';

        pointCountSpan.textContent = points.length;
        pathClosedSpan.textContent = isClosed ? 'Closed' : 'Open';
        pathClosedSpan.className = 'metric-value ' + (isClosed ? 'status-closed' : 'status-open');

        // Redraw handles & anchors
        controlsGroup.innerHTML = '';

        points.forEach((p, i) => {
            // Draw anchor point
            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute('cx', p.x);
            circle.setAttribute('cy', p.y);
            circle.setAttribute('r', 5);
            circle.classList.add('anchor-point');
            controlsGroup.appendChild(circle);

            // Draw control handles if extended
            if (p.cp1x !== p.x || p.cp1y !== p.y) {
                drawControl(p.x, p.y, p.cp1x, p.cp1y);
                drawControl(p.x, p.y, p.cp2x, p.cp2y);
            }
        });
    }

    // Draw control handle (line and point)
    function drawControl(x1, y1, x2, y2) {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        line.classList.add('control-line');
        controlsGroup.appendChild(line);

        const cp = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        cp.setAttribute('cx', x2);
        cp.setAttribute('cy', y2);
        cp.setAttribute('r', 3.5);
        cp.classList.add('control-point');
        controlsGroup.appendChild(cp);
    }

    // Generate SVG path data string
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

    // Mouse event handlers
    function handleMouseDown(e) {
        if (isClosed) return;

        const rect = svg.getBoundingClientRect();
        const x = Math.round(e.clientX - rect.left);
        const y = Math.round(e.clientY - rect.top);

        // Check for closing path
        if (points.length > 2) {
            const first = points[0];
            const dist = Math.hypot(first.x - x, first.y - y);
            if (dist < 15) {
                isClosed = true;
                updateUI();
                return;
            }
        }

        // Start new point
        isDrawing = true;
        activePoint = {
            x: x, y: y,
            cp1x: x, cp1y: y,
            cp2x: x, cp2y: y
        };
        points.push(activePoint);
        updateUI();
    }

    function handleMouseMove(e) {
        const rect = svg.getBoundingClientRect();
        const x = Math.round(e.clientX - rect.left);
        const y = Math.round(e.clientY - rect.top);

        if (isDrawing && activePoint) {
            // Update control points for curve
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

    // Reset canvas
    function clearCanvas() {
        points = [];
        isClosed = false;
        ghostPath.setAttribute('d', '');
        updateUI();
    }

    // Copy SVG path to clipboard
    function copySVG() {
        const d = generatePathData();
        navigator.clipboard.writeText(d).then(() => {
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = '<span>✅</span> Copied!';
            setTimeout(() => {
                copyBtn.innerHTML = '<span>📋</span> Copy';
            }, 1500);
        }).catch(err => {
            console.error('Failed to copy:', err);
            showError('Failed to copy to clipboard');
        });
    }

    // Attach event listeners
    if (svg) {
        svg.addEventListener('mousedown', handleMouseDown);
        svg.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', clearCanvas);
    }

    if (copyBtn) {
        copyBtn.addEventListener('click', copySVG);
    }

    // Initialize
    updateUI();
});
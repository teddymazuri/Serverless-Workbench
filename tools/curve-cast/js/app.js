// Enhanced CurveCast application with Linear, Quadratic, and Cubic Bézier support
// Added Undo/Redo and Segment Deletion
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
    let activeHandle = null;
    let selectedSegment = null; // { startIndex: n, endIndex: n+1 }
    let pathColor = '#1e1b4b';
    let strokeWidth = 3.5;
    let pathStyle = 'solid';
    let snapToGrid = true;
    let gridSize = 25;
    let showHandles = true;
    let curveType = 'cubic';

    // Undo/Redo stacks
    let undoStack = [];
    let redoStack = [];

    // Initialize
    updateUI();
    saveState(); // Save initial empty state

    // Event Listeners
    svg.addEventListener('mousedown', handleMouseDown);
    svg.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    svg.addEventListener('mousemove', function(e) {
        const rect = svg.getBoundingClientRect();
        let x = Math.round(e.clientX - rect.left);
        let y = Math.round(e.clientY - rect.top);
        
        // Snap to grid if enabled
        if (snapToGrid) {
            x = Math.round(x / gridSize) * gridSize;
            y = Math.round(y / gridSize) * gridSize;
        }
        
        coordDisplay.textContent = `${x}, ${y}`;
        coordDisplay.style.display = 'block';
    });
    
    svg.addEventListener('mouseleave', function() {
        coordDisplay.style.display = 'none';
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Undo: Cmd/Ctrl + Z
        if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            undo();
        }
        
        // Redo: Cmd/Ctrl + Shift + Z or Cmd/Ctrl + Y
        if (((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'Z') || 
            ((e.metaKey || e.ctrlKey) && e.key === 'y')) {
            e.preventDefault();
            redo();
        }
        
        // Delete selected segment: Delete key
        if (e.key === 'Delete' || e.key === 'Del') {
            e.preventDefault();
            deleteSelectedSegment();
        }
        
        // Escape to clear selection
        if (e.key === 'Escape') {
            clearSelection();
        }
    });

    // Button Listeners
    document.getElementById('new-path-btn').addEventListener('click', resetCanvas);
    document.getElementById('close-path-btn').addEventListener('click', closePath);
    document.getElementById('reset-canvas-btn').addEventListener('click', resetCanvas);
    document.getElementById('copy-svg-btn').addEventListener('click', copySVG);
    document.getElementById('export-svg-btn').addEventListener('click', exportSVG);
    
    // Undo/Redo buttons
    document.getElementById('undo-btn').addEventListener('click', undo);
    document.getElementById('redo-btn').addEventListener('click', redo);
    
    // NEW: Delete segment button
    document.getElementById('delete-segment-btn').addEventListener('click', deleteSelectedSegment);
    
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
        saveState();
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
            saveState();
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

    // Curve type buttons
    document.getElementById('curve-linear').addEventListener('click', function() {
        curveType = 'linear';
        updateCurveTypeButtons('linear');
        resetCanvas();
    });
    
    document.getElementById('curve-quadratic').addEventListener('click', function() {
        curveType = 'quadratic';
        updateCurveTypeButtons('quadratic');
        resetCanvas();
    });
    
    document.getElementById('curve-cubic').addEventListener('click', function() {
        curveType = 'cubic';
        updateCurveTypeButtons('cubic');
        resetCanvas();
    });

    // Helper Functions
    function updateStyleButtons(active) {
        document.querySelectorAll('.style-btn').forEach(btn => {
            btn.classList.remove('bg-indigo-100', 'text-indigo-700', 'border-indigo-300');
            btn.classList.add('bg-slate-100', 'text-slate-700', 'border-transparent');
        });
        
        const btn = document.getElementById(`style-${active}`);
        if (btn) {
            btn.classList.remove('bg-slate-100', 'text-slate-700');
            btn.classList.add('bg-indigo-100', 'text-indigo-700', 'border-indigo-300');
        }
    }

    function updateCurveTypeButtons(active) {
        document.querySelectorAll('.curve-btn').forEach(btn => {
            btn.classList.remove('bg-indigo-100', 'text-indigo-700', 'border-indigo-300');
            btn.classList.add('bg-slate-100', 'text-slate-700', 'border-transparent');
        });
        
        const btn = document.getElementById(`curve-${active}`);
        if (btn) {
            btn.classList.remove('bg-slate-100', 'text-slate-700');
            btn.classList.add('bg-indigo-100', 'text-indigo-700', 'border-indigo-300');
        }
    }

    // Undo/Redo functions
    function saveState() {
        const state = {
            points: JSON.parse(JSON.stringify(points)),
            isClosed: isClosed,
            pathColor: pathColor,
            strokeWidth: strokeWidth,
            pathStyle: pathStyle,
            curveType: curveType
        };
        
        undoStack.push(state);
        redoStack = [];
        updateUndoRedoButtons();
    }

    function undo() {
        if (undoStack.length > 1) {
            const current = undoStack.pop();
            redoStack.push(current);
            
            const previous = undoStack[undoStack.length - 1];
            restoreState(previous);
            
            updateUI();
            updateUndoRedoButtons();
            showToast('Undo', 'info');
        } else if (undoStack.length === 1) {
            resetCanvas();
            redoStack.push(undoStack.pop());
            updateUndoRedoButtons();
        }
    }

    function redo() {
        if (redoStack.length > 0) {
            const state = redoStack.pop();
            undoStack.push(state);
            restoreState(state);
            updateUI();
            updateUndoRedoButtons();
            showToast('Redo', 'info');
        }
    }

    function restoreState(state) {
        points = JSON.parse(JSON.stringify(state.points));
        isClosed = state.isClosed;
        pathColor = state.pathColor;
        strokeWidth = state.strokeWidth;
        pathStyle = state.pathStyle;
        curveType = state.curveType;
        
        document.getElementById('stroke-width').value = strokeWidth;
        document.getElementById('stroke-width-display').textContent = strokeWidth + 'px';
        
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.classList.remove('border-indigo-600');
            btn.classList.add('border-transparent');
            if (btn.dataset.color === pathColor) {
                btn.classList.remove('border-transparent');
                btn.classList.add('border-indigo-600');
            }
        });
        
        updateStyleButtons(pathStyle);
        updateCurveTypeButtons(curveType);
        updatePathStyle();
    }

    function updateUndoRedoButtons() {
        const undoBtn = document.getElementById('undo-btn');
        const redoBtn = document.getElementById('redo-btn');
        
        undoBtn.disabled = undoStack.length <= 1;
        redoBtn.disabled = redoStack.length === 0;
        
        undoBtn.classList.toggle('opacity-50', undoStack.length <= 1);
        redoBtn.classList.toggle('opacity-50', redoStack.length === 0);
    }

    // NEW: Segment selection and deletion functions
    function getSegmentAtPosition(x, y) {
        const tolerance = 15;
        
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            
            // Check distance to line segment
            const dist = distanceToSegment(x, y, p1.x, p1.y, p2.x, p2.y);
            
            if (dist < tolerance) {
                return { startIndex: i, endIndex: i + 1 };
            }
        }
        
        // If path is closed, check last to first segment
        if (isClosed && points.length > 1) {
            const p1 = points[points.length - 1];
            const p2 = points[0];
            const dist = distanceToSegment(x, y, p1.x, p1.y, p2.x, p2.y);
            
            if (dist < tolerance) {
                return { startIndex: points.length - 1, endIndex: 0 };
            }
        }
        
        return null;
    }

    function distanceToSegment(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;
        
        const dot = A * C + B * D;
        const len_sq = C * C + D * D;
        let param = -1;
        
        if (len_sq !== 0) {
            param = dot / len_sq;
        }
        
        let xx, yy;
        
        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }
        
        const dx = px - xx;
        const dy = py - yy;
        
        return Math.sqrt(dx * dx + dy * dy);
    }

    function selectSegment(segment) {
        selectedSegment = segment;
        updateUI();
        document.getElementById('delete-segment-btn').disabled = false;
        showToast('Segment selected. Press Delete to remove.', 'info');
    }

    function clearSelection() {
        selectedSegment = null;
        updateUI();
        document.getElementById('delete-segment-btn').disabled = true;
    }

    function deleteSelectedSegment() {
        if (!selectedSegment || points.length < 2) return;
        
        const { startIndex, endIndex } = selectedSegment;
        
        // Handle different cases
        if (isClosed && points.length === 2) {
            // If only 2 points in closed path, delete both
            points = [];
            isClosed = false;
        } else if (isClosed && startIndex === points.length - 1 && endIndex === 0) {
            // Deleting the closing segment - just open the path
            isClosed = false;
        } else {
            // Remove the point at endIndex
            points.splice(endIndex, 1);
            
            // If we removed the last point and path was closed, open it
            if (isClosed && points.length < 3) {
                isClosed = false;
            }
        }
        
        saveState();
        clearSelection();
        updateUI();
        showToast('Segment deleted', 'success');
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

        // Check if clicking on a control point handle
        const handle = getHandleAtPosition(x, y);
        if (handle) {
            activeHandle = handle;
            isDrawing = true;
            clearSelection();
            return;
        }

        // Check if clicking on a segment (for selection)
        if (points.length > 1) {
            const segment = getSegmentAtPosition(x, y);
            if (segment) {
                selectSegment(segment);
                return;
            }
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

        clearSelection();

        // Add new point based on curve type
        const newPoint = createPoint(x, y);
        points.push(newPoint);
        activePoint = newPoint;
        isDrawing = true;
        saveState();
        updateUI();
    }

    function createPoint(x, y) {
        const point = { x, y };
        
        switch(curveType) {
            case 'linear':
                break;
            case 'quadratic':
                point.cp1x = x + 50;
                point.cp1y = y - 50;
                break;
            case 'cubic':
                point.cp1x = x + 50;
                point.cp1y = y - 50;
                point.cp2x = x + 100;
                point.cp2y = y;
                break;
        }
        
        return point;
    }

    function getHandleAtPosition(x, y) {
        const tolerance = 10;
        
        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            
            if (Math.hypot(p.x - x, p.y - y) < tolerance) {
                return { type: 'point', index: i };
            }
            
            if (curveType === 'quadratic' || curveType === 'cubic') {
                if (p.cp1x !== undefined && Math.hypot(p.cp1x - x, p.cp1y - y) < tolerance) {
                    return { type: 'cp1', index: i };
                }
            }
            
            if (curveType === 'cubic') {
                if (p.cp2x !== undefined && Math.hypot(p.cp2x - x, p.cp2y - y) < tolerance) {
                    return { type: 'cp2', index: i };
                }
            }
        }
        
        return null;
    }

    function handleMouseMove(e) {
        const rect = svg.getBoundingClientRect();
        let x = Math.round(e.clientX - rect.left);
        let y = Math.round(e.clientY - rect.top);

        if (snapToGrid) {
            x = Math.round(x / gridSize) * gridSize;
            y = Math.round(y / gridSize) * gridSize;
        }

        if (isDrawing && activeHandle) {
            const point = points[activeHandle.index];
            if (activeHandle.type === 'point') {
                point.x = x;
                point.y = y;
            } else if (activeHandle.type === 'cp1') {
                point.cp1x = x;
                point.cp1y = y;
            } else if (activeHandle.type === 'cp2') {
                point.cp2x = x;
                point.cp2y = y;
            }
            updateUI();
        } else if (isDrawing && activePoint) {
            if (curveType === 'quadratic') {
                activePoint.cp1x = x;
                activePoint.cp1y = y;
            } else if (curveType === 'cubic') {
                activePoint.cp2x = x;
                activePoint.cp2y = y;
                activePoint.cp1x = activePoint.x - (x - activePoint.x) * 0.5;
                activePoint.cp1y = activePoint.y - (y - activePoint.y) * 0.5;
            }
            updateUI();
        } else if (!isClosed && points.length > 0) {
            showGhostPath(x, y);
        }
    }

    function showGhostPath(x, y) {
        const last = points[points.length - 1];
        
        if (curveType === 'linear') {
            ghostPath.setAttribute('d', `M ${last.x} ${last.y} L ${x} ${y}`);
        } else if (curveType === 'quadratic') {
            const cp1x = last.cp1x || last.x + 50;
            const cp1y = last.cp1y || last.y - 50;
            ghostPath.setAttribute('d', `M ${last.x} ${last.y} Q ${cp1x} ${cp1y}, ${x} ${y}`);
        } else {
            const cp1x = last.cp1x || last.x + 50;
            const cp1y = last.cp1y || last.y - 50;
            const cp2x = last.cp2x || last.x + 100;
            const cp2y = last.cp2y || last.y;
            ghostPath.setAttribute('d', `M ${last.x} ${last.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x} ${y}`);
        }
    }

    function handleMouseUp() {
        if (isDrawing && (activeHandle || activePoint)) {
            saveState();
        }
        isDrawing = false;
        activePoint = null;
        activeHandle = null;
        ghostPath.setAttribute('d', '');
    }

    function closePath() {
        if (points.length > 2) {
            isClosed = true;
            ghostPath.setAttribute('d', '');
            saveState();
            updateUI();
        }
    }

    function generatePathData() {
        if (points.length === 0) return "";
        
        let d = `M ${points[0].x} ${points[0].y}`;
        
        for (let i = 1; i < points.length; i++) {
            const p = points[i];
            const prev = points[i - 1];
            
            if (curveType === 'linear') {
                d += ` L ${p.x} ${p.y}`;
            } else if (curveType === 'quadratic') {
                const cp1x = prev.cp1x || prev.x + 50;
                const cp1y = prev.cp1y || prev.y - 50;
                d += ` Q ${cp1x} ${cp1y}, ${p.x} ${p.y}`;
            } else {
                const cp1x = prev.cp1x || prev.x + 50;
                const cp1y = prev.cp1y || prev.y - 50;
                const cp2x = prev.cp2x || prev.x + 100;
                const cp2y = prev.cp2y || prev.y;
                d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p.x} ${p.y}`;
            }
        }

        if (isClosed && points.length > 1) {
            const first = points[0];
            const last = points[points.length - 1];
            
            if (curveType === 'linear') {
                d += ` L ${first.x} ${first.y} Z`;
            } else if (curveType === 'quadratic') {
                const cp1x = last.cp1x || last.x + 50;
                const cp1y = last.cp1y || last.y - 50;
                d += ` Q ${cp1x} ${cp1y}, ${first.x} ${first.y} Z`;
            } else {
                const cp1x = last.cp1x || last.x + 50;
                const cp1y = last.cp1y || last.y - 50;
                const cp2x = last.cp2x || last.x + 100;
                const cp2y = last.cp2y || last.y;
                d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${first.x} ${first.y} Z`;
            }
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
            circle.setAttribute('r', 6);
            circle.classList.add('anchor-point');
            circle.setAttribute('data-index', i);
            circle.setAttribute('data-type', 'point');
            controlsGroup.appendChild(circle);

            // Control handles based on curve type
            if (showHandles) {
                if (curveType === 'quadratic' && p.cp1x !== undefined) {
                    drawControl(p.x, p.y, p.cp1x, p.cp1y, 'cp1', i);
                }
                
                if (curveType === 'cubic') {
                    if (p.cp1x !== undefined) {
                        drawControl(p.x, p.y, p.cp1x, p.cp1y, 'cp1', i);
                    }
                    if (p.cp2x !== undefined) {
                        drawControl(p.x, p.y, p.cp2x, p.cp2y, 'cp2', i);
                    }
                }
            }
        });

        // Highlight selected segment
        if (selectedSegment) {
            highlightSelectedSegment();
        }

        updatePathStyle();
    }

    function highlightSelectedSegment() {
        const { startIndex, endIndex } = selectedSegment;
        
        if (startIndex < points.length && endIndex < points.length) {
            const p1 = points[startIndex];
            const p2 = points[endIndex];
            
            // Create a highlight line
            const highlight = document.createElementNS("http://www.w3.org/2000/svg", "line");
            highlight.setAttribute('x1', p1.x);
            highlight.setAttribute('y1', p1.y);
            highlight.setAttribute('x2', p2.x);
            highlight.setAttribute('y2', p2.y);
            highlight.setAttribute('stroke', '#fbbf24');
            highlight.setAttribute('stroke-width', strokeWidth + 4);
            highlight.setAttribute('stroke-opacity', '0.3');
            highlight.setAttribute('stroke-linecap', 'round');
            controlsGroup.appendChild(highlight);
        }
    }

    function drawControl(x1, y1, x2, y2, type, index) {
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
        cp.setAttribute('r', 5);
        cp.classList.add('control-point');
        cp.setAttribute('data-index', index);
        cp.setAttribute('data-type', type);
        
        if (type === 'cp1') {
            cp.setAttribute('fill', '#ec4899');
        } else {
            cp.setAttribute('fill', '#8b5cf6');
        }
        
        controlsGroup.appendChild(cp);
    }

    function resetCanvas() {
        points = [];
        isClosed = false;
        ghostPath.setAttribute('d', '');
        clearSelection();
        
        undoStack = [];
        redoStack = [];
        saveState();
        
        updateUI();
        updateUndoRedoButtons();
    }

    function copySVG() {
        const d = generatePathData();
        navigator.clipboard.writeText(d).then(() => {
            showToast('SVG path copied to clipboard!', 'success');
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
        a.download = `curve-${curveType}-${Date.now()}.svg`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('SVG exported successfully!', 'success');
    }

    function showToast(message, type = 'info') {
        let toast = document.getElementById('toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toast';
            toast.className = 'fixed bottom-4 right-4 bg-slate-800 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-300';
            document.body.appendChild(toast);
        }
        
        toast.textContent = message;
        toast.classList.remove('opacity-0');
        
        setTimeout(() => {
            toast.classList.add('opacity-0');
        }, 2000);
    }
});
// Shared navigation and utilities
document.addEventListener('DOMContentLoaded', function() {
    // Highlight current page in navigation
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('nav a');
    
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath.split('/').pop()) {
            link.classList.add('text-indigo-600', 'border-b-2', 'border-indigo-600');
        }
    });

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // Initialize tool slider
    initToolSlider();
    
    // Enable auto-play (optional - comment out if not wanted)
    enableAutoPlay(5000); // Auto-rotate every 5 seconds
});

// Utility functions shared across tools
function showLoader(container) {
    container.innerHTML = '<div class="loader mx-auto"></div>';
}

function showError(container, message) {
    container.innerHTML = `<div class="text-red-500 text-center p-4">⚠️ ${message}</div>`;
}

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Tool slider functionality
function initToolSlider() {
    const slider = document.getElementById('tools-slider');
    const scrollLeftBtn = document.getElementById('scroll-left');
    const scrollRightBtn = document.getElementById('scroll-right');
    const indicatorsContainer = document.getElementById('scroll-indicators');
    
    if (!slider) return;

    const cards = slider.querySelectorAll('.flex-none');
    const cardCount = cards.length;
    
    if (cardCount === 0) return;

    // Create scroll indicators
    function updateIndicators() {
        if (!indicatorsContainer) return;
        
        indicatorsContainer.innerHTML = '';
        for (let i = 0; i < cardCount; i++) {
            const dot = document.createElement('div');
            dot.className = 'scroll-indicator';
            dot.dataset.index = i;
            dot.addEventListener('click', () => {
                scrollToCard(i);
            });
            indicatorsContainer.appendChild(dot);
        }
        updateActiveIndicator();
    }

    // Scroll to specific card
    function scrollToCard(index) {
        if (index >= 0 && index < cards.length) {
            const card = cards[index];
            slider.scrollTo({
                left: card.offsetLeft - 32, // 32px offset for padding
                behavior: 'smooth'
            });
        }
    }

    // Update active indicator based on scroll position
    function updateActiveIndicator() {
        if (!indicatorsContainer) return;
        
        const scrollPosition = slider.scrollLeft;
        const cardWidth = cards[0]?.offsetWidth || 0;
        const gap = 24; // gap-6 = 1.5rem = 24px
        const totalCardWidth = cardWidth + gap;
        
        // Calculate which card is most visible
        let activeIndex = 0;
        let maxVisibleArea = 0;
        
        cards.forEach((card, index) => {
            const cardLeft = card.offsetLeft - 32; // Account for container padding
            const cardRight = cardLeft + cardWidth;
            const visibleLeft = Math.max(cardLeft, scrollPosition);
            const visibleRight = Math.min(cardRight, scrollPosition + slider.clientWidth);
            const visibleArea = Math.max(0, visibleRight - visibleLeft);
            
            if (visibleArea > maxVisibleArea) {
                maxVisibleArea = visibleArea;
                activeIndex = index;
            }
        });
        
        const indicators = indicatorsContainer.querySelectorAll('.scroll-indicator');
        indicators.forEach((indicator, i) => {
            if (i === activeIndex) {
                indicator.classList.add('active');
            } else {
                indicator.classList.remove('active');
            }
        });

        // Update button states
        if (scrollLeftBtn) {
            scrollLeftBtn.disabled = scrollPosition <= 10;
        }
        if (scrollRightBtn) {
            const maxScroll = slider.scrollWidth - slider.clientWidth;
            scrollRightBtn.disabled = scrollPosition >= maxScroll - 10;
        }

        // Return active index for auto-play
        return activeIndex;
    }

    // Scroll buttons
    if (scrollLeftBtn) {
        scrollLeftBtn.addEventListener('click', () => {
            const cardWidth = cards[0]?.offsetWidth || 0;
            slider.scrollBy({
                left: -(cardWidth + 24),
                behavior: 'smooth'
            });
        });
    }

    if (scrollRightBtn) {
        scrollRightBtn.addEventListener('click', () => {
            const cardWidth = cards[0]?.offsetWidth || 0;
            slider.scrollBy({
                left: cardWidth + 24,
                behavior: 'smooth'
            });
        });
    }

    // Throttled scroll event listener
    let scrollTimeout;
    slider.addEventListener('scroll', () => {
        if (scrollTimeout) {
            window.cancelAnimationFrame(scrollTimeout);
        }
        scrollTimeout = window.requestAnimationFrame(() => {
            updateActiveIndicator();
        });
    });

    // Initialize
    updateIndicators();
    
    // Update on window resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
        if (resizeTimeout) {
            clearTimeout(resizeTimeout);
        }
        resizeTimeout = setTimeout(() => {
            updateActiveIndicator();
        }, 150);
    });

    // Touch events for mobile
    let touchStartX = 0;
    let touchStartY = 0;
    
    slider.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    });

    slider.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const diffX = touchStartX - touchEndX;
        const diffY = Math.abs(touchStartY - touchEndY);
        
        // Only trigger if horizontal swipe and not vertical scrolling
        if (Math.abs(diffX) > 50 && diffY < 30) {
            if (diffX > 0) {
                // Swipe left - scroll right
                scrollRightBtn?.click();
            } else {
                // Swipe right - scroll left
                scrollLeftBtn?.click();
            }
        }
    });

    // Keyboard navigation
    slider.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            scrollLeftBtn?.click();
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            scrollRightBtn?.click();
        }
    });

    // Make slider focusable for keyboard
    slider.setAttribute('tabindex', '0');
    slider.setAttribute('role', 'region');
    slider.setAttribute('aria-label', 'Tools slider');

    // Add progress bar
    addSliderProgressBar();
}

// Add smooth progress bar for slider
function addSliderProgressBar() {
    const slider = document.getElementById('tools-slider');
    const toolsSection = document.getElementById('tools');
    
    if (!slider || !toolsSection) return;

    // Remove existing progress bar if any
    const existingBar = document.querySelector('.slider-progress-container');
    if (existingBar) {
        existingBar.remove();
    }

    const progressContainer = document.createElement('div');
    progressContainer.className = 'slider-progress-container w-full h-1 bg-gray-200 rounded-full mt-6 overflow-hidden';
    progressContainer.style.maxWidth = '300px';
    progressContainer.style.margin = '1.5rem auto 0';
    
    const progressBar = document.createElement('div');
    progressBar.className = 'h-full bg-indigo-600 rounded-full transition-all duration-300';
    progressBar.style.width = '0%';
    
    progressContainer.appendChild(progressBar);
    
    // Find the indicators container or add after it
    const indicatorsContainer = document.getElementById('scroll-indicators');
    if (indicatorsContainer) {
        indicatorsContainer.parentNode.insertBefore(progressContainer, indicatorsContainer.nextSibling);
    } else {
        toolsSection.appendChild(progressContainer);
    }
    
    // Update progress bar on scroll
    slider.addEventListener('scroll', () => {
        const scrollPercent = (slider.scrollLeft / (slider.scrollWidth - slider.clientWidth)) * 100;
        progressBar.style.width = (isNaN(scrollPercent) ? 0 : scrollPercent) + '%';
    });
}

// Auto-play slider functionality
function enableAutoPlay(interval = 5000) {
    const slider = document.getElementById('tools-slider');
    const scrollRightBtn = document.getElementById('scroll-right');
    const scrollLeftBtn = document.getElementById('scroll-left');
    const indicatorsContainer = document.getElementById('scroll-indicators');
    
    if (!slider || !scrollRightBtn || !scrollLeftBtn) return;
    
    let autoPlayInterval;
    let isPaused = false;
    let isReversing = false;
    let autoPlayDirection = 'right'; // 'right' or 'left'
    
    function startAutoPlay() {
        if (autoPlayInterval) clearInterval(autoPlayInterval);
        
        autoPlayInterval = setInterval(() => {
            if (!isPaused && !slider.matches(':hover')) {
                const cards = slider.querySelectorAll('.flex-none');
                if (cards.length === 0) return;
                
                // Get current active index
                const scrollPosition = slider.scrollLeft;
                const cardWidth = cards[0]?.offsetWidth || 0;
                const gap = 24;
                const totalCardWidth = cardWidth + gap;
                const maxScroll = slider.scrollWidth - slider.clientWidth;
                
                // Check if we're at the ends
                const atStart = scrollPosition <= 10;
                const atEnd = scrollPosition >= maxScroll - 10;
                
                // Change direction if at ends (ping-pong effect)
                if (atEnd) {
                    autoPlayDirection = 'left';
                } else if (atStart) {
                    autoPlayDirection = 'right';
                }
                
                // Scroll in current direction
                if (autoPlayDirection === 'right' && !scrollRightBtn.disabled) {
                    scrollRightBtn.click();
                } else if (autoPlayDirection === 'left' && !scrollLeftBtn.disabled) {
                    scrollLeftBtn.click();
                }
                
                // Update indicators
                const activeIndex = Math.round(scrollPosition / totalCardWidth);
                const indicators = indicatorsContainer?.querySelectorAll('.scroll-indicator');
                indicators?.forEach((indicator, i) => {
                    if (i === activeIndex) {
                        indicator.classList.add('active');
                    } else {
                        indicator.classList.remove('active');
                    }
                });
            }
        }, interval);
    }
    
    // Pause on hover/touch
    slider.addEventListener('mouseenter', () => { 
        isPaused = true; 
    });
    
    slider.addEventListener('mouseleave', () => { 
        isPaused = false; 
    });
    
    slider.addEventListener('touchstart', () => { 
        isPaused = true; 
    });
    
    slider.addEventListener('touchend', () => { 
        // Small delay before resuming auto-play after touch
        setTimeout(() => {
            if (!slider.matches(':hover')) {
                isPaused = false;
            }
        }, 3000);
    });
    
    // Pause when user interacts with navigation buttons
    scrollLeftBtn.addEventListener('click', () => {
        isPaused = true;
        setTimeout(() => {
            if (!slider.matches(':hover')) {
                isPaused = false;
            }
        }, 5000);
    });
    
    scrollRightBtn.addEventListener('click', () => {
        isPaused = true;
        setTimeout(() => {
            if (!slider.matches(':hover')) {
                isPaused = false;
            }
        }, 5000);
    });
    
    // Pause when clicking indicators
    if (indicatorsContainer) {
        indicatorsContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('scroll-indicator')) {
                isPaused = true;
                setTimeout(() => {
                    if (!slider.matches(':hover')) {
                        isPaused = false;
                    }
                }, 5000);
            }
        });
    }
    
    startAutoPlay();
    
    // Add pause/play button to header
    const toolsSection = document.getElementById('tools');
    const headerDiv = toolsSection?.querySelector('.flex.justify-between');
    
    if (headerDiv) {
        // Check if button already exists
        if (headerDiv.querySelector('.auto-play-btn')) return;
        
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'flex gap-2';
        
        const pausePlayBtn = document.createElement('button');
        pausePlayBtn.className = 'auto-play-btn p-2 rounded-full bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 transition';
        pausePlayBtn.innerHTML = '⏸️';
        pausePlayBtn.setAttribute('aria-label', 'Pause auto-play');
        pausePlayBtn.setAttribute('title', 'Pause auto-rotate');
        
        // Add reset button
        const resetBtn = document.createElement('button');
        resetBtn.className = 'auto-play-btn p-2 rounded-full bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 transition ml-2';
        resetBtn.innerHTML = '↺';
        resetBtn.setAttribute('aria-label', 'Reset to start');
        resetBtn.setAttribute('title', 'Scroll to first tool');
        
        pausePlayBtn.addEventListener('click', () => {
            isPaused = !isPaused;
            pausePlayBtn.innerHTML = isPaused ? '▶️' : '⏸️';
            pausePlayBtn.setAttribute('aria-label', isPaused ? 'Play auto-rotate' : 'Pause auto-rotate');
            pausePlayBtn.setAttribute('title', isPaused ? 'Resume auto-rotate' : 'Pause auto-rotate');
        });
        
        resetBtn.addEventListener('click', () => {
            slider.scrollTo({
                left: 0,
                behavior: 'smooth'
            });
            // Reset direction to right
            autoPlayDirection = 'right';
            // Briefly pause then resume
            isPaused = true;
            setTimeout(() => {
                if (!slider.matches(':hover')) {
                    isPaused = false;
                }
            }, 3000);
        });
        
        controlsDiv.appendChild(pausePlayBtn);
        controlsDiv.appendChild(resetBtn);
        headerDiv.appendChild(controlsDiv);
    }
}

// Optional: Add speed control for auto-play
function addSpeedControl() {
    const toolsSection = document.getElementById('tools');
    if (!toolsSection) return;
    
    const speedControl = document.createElement('div');
    speedControl.className = 'flex justify-center items-center gap-3 mt-4 text-sm';
    speedControl.innerHTML = `
        <span class="text-slate-500">Speed:</span>
        <button class="speed-btn text-xs px-2 py-1 rounded bg-slate-100 hover:bg-indigo-100 transition" data-speed="3000">Fast</button>
        <button class="speed-btn text-xs px-2 py-1 rounded bg-indigo-100 text-indigo-700 font-medium" data-speed="5000">Normal</button>
        <button class="speed-btn text-xs px-2 py-1 rounded bg-slate-100 hover:bg-indigo-100 transition" data-speed="8000">Slow</button>
    `;
    
    // Insert after progress bar
    const progressBar = document.querySelector('.slider-progress-container');
    if (progressBar) {
        progressBar.parentNode.insertBefore(speedControl, progressBar.nextSibling);
    }
    
    // Speed control functionality
    speedControl.querySelectorAll('.speed-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active state
            speedControl.querySelectorAll('.speed-btn').forEach(b => {
                b.classList.remove('bg-indigo-100', 'text-indigo-700', 'font-medium');
                b.classList.add('bg-slate-100');
            });
            btn.classList.remove('bg-slate-100');
            btn.classList.add('bg-indigo-100', 'text-indigo-700', 'font-medium');
            
            // Restart auto-play with new speed
            const speed = parseInt(btn.dataset.speed);
            
            // Remove existing auto-play and restart
            // Note: This requires the auto-play interval to be accessible
            // For simplicity, we'll dispatch a custom event
            window.dispatchEvent(new CustomEvent('auto-play-speed-change', { detail: { speed } }));
        });
    });
    
    return speedControl;
}

// Export for use in other modules if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        showLoader,
        showError,
        formatBytes,
        initToolSlider,
        enableAutoPlay
    };
}
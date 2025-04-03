document.addEventListener('DOMContentLoaded', function() {
    // Initialize animations
    initAnimations();
    
    // Initialize FAQ accordions on contact page
    initFaqAccordions();
    
    // Initialize dashboard charts if on dashboard page
    if (document.querySelector('.dashboard')) {
        initDashboardCharts();
    }
});

// Function to initialize animations
function initAnimations() {
    // Add animation classes to elements when they come into view
    const animateElements = document.querySelectorAll('.feature-card, .testimonial-card, .value-card, .stat-card');
    
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-fade-in');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.2 });
        
        animateElements.forEach(element => {
            observer.observe(element);
        });
    } else {
        // Fallback for browsers that don't support IntersectionObserver
        animateElements.forEach(element => {
            element.classList.add('animate-fade-in');
        });
    }
}

// Function to initialize FAQ accordions on contact page
function initFaqAccordions() {
    const faqQuestions = document.querySelectorAll('.faq-question');
    
    faqQuestions.forEach(question => {
        question.addEventListener('click', () => {
            const answer = question.nextElementSibling;
            
            // Toggle active class
            question.classList.toggle('active');
            
            // Toggle answer visibility
            if (question.classList.contains('active')) {
                answer.style.maxHeight = answer.scrollHeight + 'px';
            } else {
                answer.style.maxHeight = 0;
            }
        });
    });
}

// Function to initialize dashboard charts with simple animation
function initDashboardCharts() {
    // Simple animation for chart bars
    const chartBars = document.querySelectorAll('.chart-bar');
    
    chartBars.forEach(bar => {
        const height = bar.style.height;
        bar.style.height = 0;
        
        setTimeout(() => {
            bar.style.transition = 'height 1s ease-in-out';
            bar.style.height = height;
        }, 300);
    });
}

// Add CSS class for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    .animate-fade-in {
        animation: fadeIn 0.6s ease-out forwards;
    }
    
    .faq-answer {
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.3s ease;
    }
    
    .faq-question.active h3 {
        color: var(--secondary-color);
    }
    
    .faq-question::after {
        content: '+';
        position: absolute;
        right: 20px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 1.5rem;
        color: var(--gray-color);
        transition: transform 0.3s ease;
    }
    
    .faq-question.active::after {
        transform: translateY(-50%) rotate(45deg);
    }
    
    .chart-bar {
        transition: height 1s ease-in-out;
    }
`;

document.head.appendChild(style); 
/**
 * LLM AI Agents - Interactive Educational Demo
 * JavaScript for interactivity and animations
 */

// ============================================
// DOM Elements & State
// ============================================
const elements = {
    connectionLines: document.getElementById('connectionLines'),
    backToTop: document.getElementById('backToTop'),
    navLinks: document.querySelectorAll('.nav-link'),
    lessonCards: document.querySelectorAll('.lesson-card'),
    conceptCards: document.querySelectorAll('.concept-card'),
    demoCards: document.querySelectorAll('.demo-card')
};

let state = {
    currentSection: 'hero',
    mcpAnimating: false,
    hydeAnimating: false,
    taoAnimating: false,
    ragAnimating: false,
    dspyAnimating: false,
    multiagentAnimating: false,
    isDarkMode: true,
    completedLessons: new Set()
};

// Lesson details for modal
const lessonDetails = {
    '1': {
        title: 'LLM Base Inference',
        description: 'Learn the fundamentals of Large Language Model inference, including local and API-based approaches.',
        technologies: ['Mistral', 'GPU/CPU', 'API Integration'],
        outcomes: ['Understand LLM basics', 'Run local inference', 'Use cloud APIs']
    },
    '2': {
        title: 'Llama Inference',
        description: 'Dive into Llama models and learn how to work with different variants.',
        technologies: ['Llama', 'Hugging Face', 'Transformers'],
        outcomes: ['Load Llama models', 'Compare model variants', 'Understand trade-offs']
    },
    '3': {
        title: 'Simple Agent with LangChain',
        description: 'Build your first AI agent using LangChain framework.',
        technologies: ['LangChain', 'Agents', 'Tools'],
        outcomes: ['Create simple agents', 'Integrate tools', 'Handle conversations']
    },
    '3a': {
        title: 'MCP Emulation',
        description: 'Simulate the Model Context Protocol before diving into the real implementation.',
        technologies: ['MCP Concepts', 'Tool Wrapping', 'Function Calling'],
        outcomes: ['Understand MCP principles', 'Emulate MCP behavior', 'Prepare for Lesson 4']
    },
    '4': {
        title: 'MCP Tools',
        description: 'Implement real MCP tools with proper wrapping and function calling.',
        technologies: ['MCP', 'OpenAI', 'Tool Discovery'],
        outcomes: ['Use MCP server', 'Wrap tools properly', 'Handle tool results']
    },
    '5': {
        title: 'Memory & Guardrails',
        description: 'Add memory to agents and implement safety guardrails.',
        technologies: ['Conversation Memory', 'Content Safety', 'Validation'],
        outcomes: ['Maintain conversation context', 'Implement guardrails', 'Handle unsafe content']
    },
    '6': {
        title: 'Multi-Agent Systems',
        description: 'Coordinate multiple agents with critic and coordinator patterns.',
        technologies: ['Multi-Agent', 'Critic Pattern', 'Coordinator'],
        outcomes: ['Design multi-agent systems', 'Implement critic agents', 'Coordinate agent workflows']
    },
    '7': {
        title: 'Score Agent Answers',
        description: 'Automatically evaluate agent responses using scoring metrics.',
        technologies: ['Evaluation', 'Scoring', 'Metrics'],
        outcomes: ['Define evaluation criteria', 'Implement scoring', 'Compare agent performance']
    },
    '8': {
        title: 'RAG Techniques',
        description: 'Explore various Retrieval-Augmented Generation techniques.',
        technologies: ['RAG', 'Vector DB', 'Query Transformation'],
        outcomes: ['Implement naive RAG', 'Advanced RAG techniques', 'Query optimization']
    },
    '9': {
        title: 'DSPy Components',
        description: 'Use DSPy framework for programmatic LM pipelines.',
        technologies: ['DSPy', 'Program Synthesis', 'Optimization'],
        outcomes: ['Create DSPy pipelines', 'Optimize automatically', 'Execute programmatically']
    },
    '10': {
        title: 'TAO Techniques',
        description: 'Implement Think-Act-Observe loops for autonomous problem-solving.',
        technologies: ['TAO', 'ReAct', 'Iterative Reasoning'],
        outcomes: ['Design TAO loops', 'Implement reasoning cycles', 'Handle tool interactions']
    },
    '11': {
        title: 'Medical Claims Verdict',
        description: 'Build an agent graph to analyze and verify medical claims.',
        technologies: ['Agent Graph', 'Medical Domain', 'Claims Analysis'],
        outcomes: ['Design agent workflows', 'Analyze medical claims', 'Generate verdicts']
    },
    '12': {
        title: 'AI Fact-Checking',
        description: 'Implement AI-powered fact-checking for clinical requirements.',
        technologies: ['Fact-Checking', 'Clinical Domain', 'Verification'],
        outcomes: ['Verify clinical information', 'Implement fact-checking pipeline', 'Handle medical data']
    },
    '13': {
        title: 'HyDE for Clinical Guidelines',
        description: 'Use Hypothetical Document Embeddings with Russian clinical guidelines.',
        technologies: ['HyDE', 'Clinical Guidelines', 'Multilingual'],
        outcomes: ['Implement HyDE', 'Retrieve clinical guidelines', 'Handle Russian text']
    }
};

// ============================================
// Initialization
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initConnectionLines();
    initScrollEffects();
    initLessonCards();
    initThemeToggle();
    initModal();
    animateOnScroll();
    loadThemePreference();
});

// ============================================
// Navigation
// ============================================
function initNavigation() {
    // Smooth scroll for nav links
    elements.navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);
            
            if (targetSection) {
                const headerHeight = document.querySelector('.main-nav').offsetHeight;
                const targetPosition = targetSection.offsetTop - headerHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
                
                // Update active state
                elements.navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                state.currentSection = targetId;
            }
        });
    });
    
    // Update nav on scroll
    window.addEventListener('scroll', () => {
        updateNavOnScroll();
        toggleBackToTop();
        animateOnScroll();
    });
}

function updateNavOnScroll() {
    const scrollPosition = window.scrollY + 100;
    const sections = document.querySelectorAll('section[id]');
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;
        const sectionId = section.getAttribute('id');
        
        if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
            elements.navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${sectionId}`) {
                    link.classList.add('active');
                }
            });
        }
    });
}

function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

function toggleBackToTop() {
    if (window.scrollY > 500) {
        elements.backToTop.classList.add('visible');
    } else {
        elements.backToTop.classList.remove('visible');
    }
}

// ============================================
// Connection Lines Animation (Hero)
// ============================================
function initConnectionLines() {
    if (!elements.connectionLines) return;
    
    // Create connection lines between agent nodes
    const center = { x: 50, y: 50 };
    const nodes = [
        { id: 'mcp', x: 50, y: 10, radius: 8 },
        { id: 'memory', x: 10, y: 30, radius: 8 },
        { id: 'rag', x: 90, y: 30, radius: 8 },
        { id: 'hyde', x: 10, y: 70, radius: 8 },
        { id: 'tao', x: 90, y: 70, radius: 8 }
    ];
    
    // Draw lines from center to each node
    let html = '';
    nodes.forEach(node => {
        const angle = Math.atan2(node.y - center.y, node.x - center.x);
        const distance = Math.sqrt(Math.pow(node.x - center.x, 2) + Math.pow(node.y - center.y, 2));
        
        html += `<div class="connection-line" style="
            left: ${center.x}%;
            top: ${center.y}%;
            width: ${distance}%;
            height: 1px;
            transform: rotate(${angle * (180 / Math.PI)}deg) translateX(100%);
            transform-origin: 0 0;
            animation: drawLine 2s ease-out forwards;
            animation-delay: ${Math.random() * 0.5}s;
        "></div>`;
    });
    
    // Also draw lines between outer nodes
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            if (Math.random() > 0.5) continue; // Randomly skip some for visual appeal
            const node1 = nodes[i];
            const node2 = nodes[j];
            const dx = node2.x - node1.x;
            const dy = node2.y - node1.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);
            
            html += `<div class="connection-line" style="
                left: ${node1.x}%;
                top: ${node1.y}%;
                width: ${distance}%;
                height: 1px;
                transform: rotate(${angle * (180 / Math.PI)}deg);
                transform-origin: 0 0;
                animation: drawLine 2s ease-out forwards;
                animation-delay: ${1 + Math.random() * 0.5}s;
                opacity: 0.2;
            "></div>`;
        }
    }
    
    elements.connectionLines.innerHTML = html;
}

// Add CSS animation for lines
const lineStyle = document.createElement('style');
lineStyle.textContent = `
    @keyframes drawLine {
        from {
            width: 0%;
            opacity: 0;
        }
        to {
            width: 100%;
            opacity: 0.3;
        }
    }
    
    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
    }
    
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(30px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes typewriter {
        from { width: 0; }
        to { width: 100%; }
    }
    
    .animate-line { animation: drawLine 1s ease-out forwards; }
`;
document.head.appendChild(lineStyle);

// ============================================
// Scroll Effects
// ============================================
function initScrollEffects() {
    // Add animation classes to elements as they come into view
    const animatedElements = document.querySelectorAll('.lesson-card, .concept-card, .demo-card, .roadmap-level, .stat');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-fade-in');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });
    
    animatedElements.forEach(el => observer.observe(el));
}

function animateOnScroll() {
    const scrolled = window.pageYOffset;
    const parallaxElements = document.querySelectorAll('.hero-visual');
    
    parallaxElements.forEach(element => {
        const speed = 0.1;
        element.style.transform = `translateY(${scrolled * speed}px)`;
    });
}

// ============================================
// Theme Toggle
// ============================================
function initThemeToggle() {
    // Create theme toggle button
    const themeButton = document.createElement('button');
    themeButton.id = 'themeToggle';
    themeButton.className = 'theme-toggle';
    themeButton.innerHTML = state.isDarkMode ? '&#127774;' : '&#127773;';
    themeButton.title = state.isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode';
    
    // Add to header
    const header = document.querySelector('.header .container');
    if (header) {
        themeButton.style.cssText = `
            position: absolute;
            top: 1rem;
            right: 1rem;
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            color: var(--text-primary);
            width: 40px;
            height: 40px;
            border-radius: 50%;
            font-size: 1.2rem;
            cursor: pointer;
            transition: all var(--transition-normal);
            z-index: 100;
        `;
        header.appendChild(themeButton);
    }
    
    themeButton.addEventListener('click', toggleTheme);
}

function toggleTheme() {
    state.isDarkMode = !state.isDarkMode;
    localStorage.setItem('theme', state.isDarkMode ? 'dark' : 'light');
    applyTheme();
}

function loadThemePreference() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    state.isDarkMode = savedTheme === 'dark';
    applyTheme();
}

function applyTheme() {
    const root = document.documentElement;
    const themeButton = document.getElementById('themeToggle');
    
    if (state.isDarkMode) {
        // Already dark by default
        if (themeButton) {
            themeButton.innerHTML = '&#127774;';
            themeButton.title = 'Switch to Light Mode';
        }
    } else {
        // Light theme
        root.style.setProperty('--bg-color', '#f8fafc');
        root.style.setProperty('--bg-secondary', '#f1f5f9');
        root.style.setProperty('--bg-tertiary', '#e2e8f0');
        root.style.setProperty('--bg-card', '#ffffff');
        root.style.setProperty('--bg-card-hover', '#f8fafc');
        root.style.setProperty('--text-primary', '#0f172a');
        root.style.setProperty('--text-secondary', '#475569');
        root.style.setProperty('--text-muted', '#94a3b8');
        root.style.setProperty('--border-color', '#e2e8f0');
        root.style.setProperty('--border-light', '#cbd5e1');
        
        if (themeButton) {
            themeButton.innerHTML = '&#127773;';
            themeButton.title = 'Switch to Dark Mode';
        }
    }
}

// ============================================
// Modal
// ============================================
function initModal() {
    // Create modal container
    const modal = document.createElement('div');
    modal.id = 'lessonModal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <button class="modal-close" onclick="closeModal()">&times;</button>
            <div id="modalBody"></div>
        </div>
    `;
    
    // Add CSS for modal
    const modalStyle = document.createElement('style');
    modalStyle.textContent = `
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 10000;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(5px);
        }
        
        .modal.active {
            display: flex;
        }
        
        .modal-content {
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: 1rem;
            max-width: 600px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            position: relative;
            padding: 2rem;
            animation: fadeIn 0.3s ease-out;
        }
        
        .modal-close {
            position: absolute;
            top: 1rem;
            right: 1rem;
            background: none;
            border: none;
            color: var(--text-secondary);
            font-size: 2rem;
            cursor: pointer;
            padding: 0.5rem;
            transition: color var(--transition-fast);
        }
        
        .modal-close:hover {
            color: var(--danger-color);
        }
        
        .modal h2 {
            font-size: 1.5rem;
            margin-bottom: 1rem;
            color: var(--text-primary);
        }
        
        .modal .tag {
            display: inline-block;
            margin-right: 0.5rem;
            margin-bottom: 0.5rem;
        }
        
        .modal-section {
            margin-bottom: 1.5rem;
        }
        
        .modal-section h3 {
            font-size: 1rem;
            color: var(--text-primary);
            margin-bottom: 0.5rem;
        }
        
        .modal-section p,
        .modal-section ul {
            color: var(--text-secondary);
            font-size: 0.95rem;
            line-height: 1.6;
        }
        
        .modal-section ul {
            padding-left: 1.25rem;
        }
        
        .modal-section li {
            margin-bottom: 0.25rem;
        }
        
        .modal-actions {
            display: flex;
            gap: 1rem;
            margin-top: 1.5rem;
            justify-content: flex-end;
        }
        
        @media (max-width: 480px) {
            .modal-content {
                width: 95%;
                padding: 1.5rem 1rem;
            }
            
            .modal-close {
                top: 0.5rem;
                right: 0.5rem;
                font-size: 1.5rem;
            }
        }
    `;
    document.head.appendChild(modalStyle);
    document.body.appendChild(modal);
}

function openModal(content) {
    const modal = document.getElementById('lessonModal');
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = content;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('lessonModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

// Close modal on outside click
window.addEventListener('click', (e) => {
    const modal = document.getElementById('lessonModal');
    if (modal && e.target === modal) {
        closeModal();
    }
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
    }
});

// ============================================
// Lesson Cards
// ============================================
function initLessonCards() {
    const cards = document.querySelectorAll('.lesson-card');
    
    cards.forEach(card => {
        card.addEventListener('click', (e) => {
            // Don't open modal if clicking on interactive elements
            if (e.target.closest('button, a')) return;
            
            const lesson = card.dataset.lesson;
            const category = card.dataset.category;
            const details = lessonDetails[lesson];
            
            if (details) {
                showLessonModal(lesson, category, details);
            } else {
                // Fallback toast
                showLessonInfo(lesson, category);
            }
        });
        
        // Add hover effects
        card.addEventListener('mouseenter', () => {
            const progressBar = card.querySelector('.progress-bar');
            if (progressBar) {
                progressBar.style.width = '100%';
            }
        });
        
        card.addEventListener('mouseleave', () => {
            const progressBar = card.querySelector('.progress-bar');
            if (progressBar) {
                progressBar.style.width = '0%';
            }
        });
    });
}

function showLessonModal(lesson, category, details) {
    const modalContent = `
        <h2>${lesson}: ${details.title}</h2>
        <div class="lesson-tags" style="margin-bottom: 1rem;">
            <span class="tag tag-${category}">${category}</span>
        </div>
        <p style="margin-bottom: 1.5rem;">${details.description}</p>
        
        <div class="modal-section">
            <h3>Technologies</h3>
            <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                ${details.technologies.map(tech => `<span class="tag tag-agents">${tech}</span>`).join('')}
            </div>
        </div>
        
        <div class="modal-section">
            <h3>Learning Outcomes</h3>
            <ul>
                ${details.outcomes.map(outcome => `<li>${outcome}</li>`).join('')}
            </ul>
        </div>
        
        <div class="modal-section">
            <h3>Notebook</h3>
            <p>Open in Colab: <code style="background: var(--bg-secondary); padding: 0.2rem 0.4rem; border-radius: 0.25rem;">lesson-${lesson}_*.ipynb</code></p>
        </div>
        
        <div class="modal-actions">
            <button class="btn btn-secondary" onclick="closeModal()">Close</button>
            <a href="https://colab.research.google.com/github/D2718281828nis/LLM_AI_agents/blob/main/lesson-${lesson}_*.ipynb" 
               class="btn btn-primary" target="_blank">
                Open in Colab &rarr;
            </a>
        </div>
    `;
    
    openModal(modalContent);
}

function showLessonInfo(lesson, category) {
    // Create a simple toast notification
    const toast = document.createElement('div');
    toast.className = 'lesson-toast';
    toast.innerHTML = `
        <div style="
            position: fixed;
            bottom: 2rem;
            right: 2rem;
            background: linear-gradient(135deg, #2563eb, #7c3aed);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 0.5rem;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            z-index: 10000;
            animation: slideInRight 0.3s ease-out;
            font-family: 'Inter', sans-serif;
        ">
            <strong>Lesson ${lesson}</strong> - ${category.toUpperCase()}
            <div style="font-size: 0.85rem; opacity: 0.9; margin-top: 0.25rem;">
                Click on "Open In Colab" in the notebook to run this lesson
            </div>
        </div>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'fadeIn 0.3s ease-out reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================
// Concept Animations
// ============================================

function animateMCP() {
    if (state.mcpAnimating) return;
    state.mcpAnimating = true;
    
    const visual = document.getElementById('mcpVisual');
    visual.innerHTML = `
        <div style="
            display: flex;
            align-items: center;
            justify-content: space-around;
            height: 100%;
            padding: 0 1rem;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.75rem;
        ">
            <div style="
                background: rgba(124, 58, 237, 0.2);
                border: 1px solid #7c3aed;
                padding: 0.5rem;
                border-radius: 0.25rem;
                text-align: center;
                min-width: 70px;
                animation: fadeIn 0.5s ease-out;
            ">
                <div style="color: #7c3aed; font-weight: bold;">LLM</div>
                <div style="color: white; font-size: 0.65rem;">Agent</div>
            </div>
            <div style="color: #94a3b8;">&rarr;</div>
            <div style="
                background: rgba(6, 182, 212, 0.2);
                border: 1px solid #06b6d4;
                padding: 0.5rem;
                border-radius: 0.25rem;
                text-align: center;
                min-width: 70px;
                animation: fadeIn 0.5s ease-out 0.1s both;
            ">
                <div style="color: #06b6d4; font-weight: bold;">MCP</div>
                <div style="color: white; font-size: 0.65rem;">Server</div>
            </div>
            <div style="color: #94a3b8;">&rarr;</div>
            <div style="
                background: rgba(34, 197, 94, 0.2);
                border: 1px solid #10b981;
                padding: 0.5rem;
                border-radius: 0.25rem;
                text-align: center;
                min-width: 70px;
                animation: fadeIn 0.5s ease-out 0.2s both;
            ">
                <div style="color: #10b981; font-weight: bold;">Tool</div>
                <div style="color: white; font-size: 0.65rem;">Function</div>
            </div>
        </div>
        <div style="
            margin-top: 0.5rem;
            font-size: 0.65rem;
            color: var(--text-muted);
            text-align: center;
            animation: fadeIn 0.5s ease-out 0.3s both;
        ">
            Standardized Tool Interface
        </div>
    `;
    
    setTimeout(() => {
        state.mcpAnimating = false;
    }, 1000);
}

function animateHyDE() {
    if (state.hydeAnimating) return;
    state.hydeAnimating = true;
    
    const visual = document.getElementById('hydeVisual');
    visual.innerHTML = `
        <div style="
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.5rem;
            height: 100%;
            padding: 0.5rem;
        ">
            <div style="
                background: rgba(124, 58, 237, 0.1);
                border: 1px solid #7c3aed;
                border-radius: 0.25rem;
                padding: 0.5rem;
                display: flex;
                flex-direction: column;
                align-items: center;
                animation: fadeIn 0.5s ease-out;
            ">
                <div style="color: #7c3aed; font-size: 0.7rem;">User Query</div>
                <div style="color: white; font-size: 0.6rem; margin-top: 0.25rem;">"What causes diabetes?"</div>
            </div>
            <div style="
                background: rgba(6, 182, 212, 0.1);
                border: 1px solid #06b6d4;
                border-radius: 0.25rem;
                padding: 0.5rem;
                display: flex;
                flex-direction: column;
                align-items: center;
                animation: fadeIn 0.5s ease-out 0.2s both;
            ">
                <div style="color: #06b6d4; font-size: 0.7rem;">HyDE</div>
                <div style="color: white; font-size: 0.6rem; margin-top: 0.25rem;">Generated Doc</div>
            </div>
            <div style="
                grid-column: span 2;
                background: rgba(34, 197, 94, 0.1);
                border: 1px solid #10b981;
                border-radius: 0.25rem;
                padding: 0.5rem;
                display: flex;
                flex-direction: column;
                align-items: center;
                animation: fadeIn 0.5s ease-out 0.4s both;
            ">
                <div style="color: #10b981; font-size: 0.7rem;">Vector DB</div>
                <div style="color: white; font-size: 0.6rem; margin-top: 0.25rem;">Retrieve Similar</div>
            </div>
        </div>
        <div style="
            margin-top: 0.5rem;
            font-size: 0.65rem;
            color: var(--text-muted);
            text-align: center;
            animation: fadeIn 0.5s ease-out 0.5s both;
        ">
            Query &rarr; Generate &rarr; Embed &rarr; Retrieve
        </div>
    `;
    
    setTimeout(() => {
        state.hydeAnimating = false;
    }, 1000);
}

function animateTAO() {
    if (state.taoAnimating) return;
    state.taoAnimating = true;
    
    const visual = document.getElementById('taoVisual');
    visual.innerHTML = `
        <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            position: relative;
        ">
            <div style="
                width: 60%;
                height: 60%;
                border: 2px solid #f97316;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.5s ease-out;
                position: relative;
            ">
                <div style="
                    width: 80%;
                    height: 80%;
                    border: 1px solid rgba(251, 146, 60, 0.5);
                    border-radius: 50%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    animation: pulse 2s infinite 0.5s;
                ">
                    <div style="color: #f97316; font-size: 0.65rem; font-weight: bold;">THINK</div>
                    <div style="color: #f97316; font-size: 0.65rem; font-weight: bold;">ACT</div>
                    <div style="color: #f97316; font-size: 0.65rem; font-weight: bold;">OBSERVE</div>
                </div>
            </div>
            <div style="
                position: absolute;
                top: -10px;
                left: 50%;
                transform: translateX(-50%);
                color: #f97316;
                font-size: 0.8rem;
                animation: fadeIn 0.5s ease-out 0.2s both;
            ">
                Loop
            </div>
        </div>
        <div style="
            margin-top: 0.5rem;
            font-size: 0.65rem;
            color: var(--text-muted);
            text-align: center;
            animation: fadeIn 0.5s ease-out 0.3s both;
        ">
            Iterative Problem Solving
        </div>
    `;
    
    setTimeout(() => {
        state.taoAnimating = false;
    }, 1000);
}

function animateRAG() {
    if (state.ragAnimating) return;
    state.ragAnimating = true;
    
    const visual = document.getElementById('ragVisual');
    visual.innerHTML = `
        <div style="
            display: flex;
            align-items: center;
            justify-content: space-around;
            height: 100%;
            padding: 0 1rem;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.7rem;
        ">
            <div style="
                display: flex;
                flex-direction: column;
                align-items: center;
                animation: fadeIn 0.5s ease-out;
            ">
                <div style="
                    background: rgba(251, 146, 60, 0.2);
                    border: 1px solid #f97316;
                    padding: 0.3rem 0.5rem;
                    border-radius: 0.2rem;
                    color: #f97316;
                ">Query</div>
                <div style="color: #94a3b8; margin-top: 0.25rem;">&darr;</div>
            </div>
            <div style="
                display: flex;
                flex-direction: column;
                align-items: center;
                animation: fadeIn 0.5s ease-out 0.1s both;
            ">
                <div style="
                    background: rgba(6, 182, 212, 0.2);
                    border: 1px solid #06b6d4;
                    padding: 0.3rem 0.5rem;
                    border-radius: 0.2rem;
                    color: #06b6d4;
                ">Retriever</div>
                <div style="color: #94a3b8; margin-top: 0.25rem;">&darr;</div>
            </div>
            <div style="
                display: flex;
                flex-direction: column;
                align-items: center;
                animation: fadeIn 0.5s ease-out 0.2s both;
            ">
                <div style="
                    background: rgba(34, 197, 94, 0.2);
                    border: 1px solid #10b981;
                    padding: 0.3rem 0.5rem;
                    border-radius: 0.2rem;
                    color: #10b981;
                ">Docs</div>
                <div style="color: #94a3b8; margin-top: 0.25rem;">&darr;</div>
            </div>
            <div style="
                display: flex;
                flex-direction: column;
                align-items: center;
                animation: fadeIn 0.5s ease-out 0.3s both;
            ">
                <div style="
                    background: rgba(124, 58, 237, 0.2);
                    border: 1px solid #7c3aed;
                    padding: 0.3rem 0.5rem;
                    border-radius: 0.2rem;
                    color: #7c3aed;
                ">LLM</div>
                <div style="color: #94a3b8; margin-top: 0.25rem;">&darr;</div>
            </div>
            <div style="
                display: flex;
                flex-direction: column;
                align-items: center;
                animation: fadeIn 0.5s ease-out 0.4s both;
            ">
                <div style="
                    background: rgba(236, 72, 153, 0.2);
                    border: 1px solid #ec4899;
                    padding: 0.3rem 0.5rem;
                    border-radius: 0.2rem;
                    color: #ec4899;
                ">Answer</div>
            </div>
        </div>
        <div style="
            margin-top: 0.5rem;
            font-size: 0.65rem;
            color: var(--text-muted);
            text-align: center;
            animation: fadeIn 0.5s ease-out 0.5s both;
        ">
            Query &rarr; Retrieve &rarr; Generate
        </div>
    `;
    
    setTimeout(() => {
        state.ragAnimating = false;
    }, 1000);
}

function animateDSPy() {
    if (state.dspyAnimating) return;
    state.dspyAnimating = false;
    
    const visual = document.getElementById('dspyVisual');
    visual.innerHTML = `
        <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            height: 100%;
            justify-content: center;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.65rem;
        ">
            <div style="
                background: rgba(168, 85, 247, 0.1);
                border: 1px solid #a78bfa;
                padding: 0.5rem;
                border-radius: 0.25rem;
                text-align: center;
                animation: fadeIn 0.5s ease-out;
            ">
                <div style="color: #a78bfa;">Program</div>
                <div style="color: white; font-size: 0.6rem;">with LM</div>
            </div>
            <div style="color: #94a3b8; margin: 0.25rem 0;">&darr;</div>
            <div style="
                background: rgba(37, 99, 235, 0.1);
                border: 1px solid #3b82f6;
                padding: 0.5rem;
                border-radius: 0.25rem;
                text-align: center;
                animation: fadeIn 0.5s ease-out 0.2s both;
            ">
                <div style="color: #3b82f6;">Optimize</div>
                <div style="color: white; font-size: 0.6rem;">Automatically</div>
            </div>
            <div style="color: #94a3b8; margin: 0.25rem 0;">&darr;</div>
            <div style="
                background: rgba(34, 197, 94, 0.1);
                border: 1px solid #10b981;
                padding: 0.5rem;
                border-radius: 0.25rem;
                text-align: center;
                animation: fadeIn 0.5s ease-out 0.4s both;
            ">
                <div style="color: #10b981;">Execute</div>
                <div style="color: white; font-size: 0.6rem;">Pipeline</div>
            </div>
        </div>
        <div style="
            margin-top: 0.5rem;
            font-size: 0.65rem;
            color: var(--text-muted);
            text-align: center;
            animation: fadeIn 0.5s ease-out 0.5s both;
        ">
            Code &rarr; Optimize &rarr; Run
        </div>
    `;
    
    setTimeout(() => {
        state.dspyAnimating = false;
    }, 1000);
}

function animateMultiAgent() {
    if (state.multiagentAnimating) return;
    state.multiagentAnimating = true;
    
    const visual = document.getElementById('multiagentVisual');
    visual.innerHTML = `
        <div style="
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 0.5rem;
            height: 100%;
            padding: 0.5rem;
        ">
            <div style="
                background: rgba(124, 58, 237, 0.2);
                border: 1px solid #7c3aed;
                border-radius: 0.25rem;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.5s ease-out;
            ">
                <div style="color: #7c3aed; font-size: 0.65rem;">Coordinator</div>
            </div>
            <div style="
                background: rgba(37, 99, 235, 0.2);
                border: 1px solid #2563eb;
                border-radius: 0.25rem;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.5s ease-out 0.1s both;
            ">
                <div style="color: #2563eb; font-size: 0.65rem;">Worker 1</div>
            </div>
            <div style="
                background: rgba(34, 197, 94, 0.2);
                border: 1px solid #10b981;
                border-radius: 0.25rem;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.5s ease-out 0.2s both;
            ">
                <div style="color: #10b981; font-size: 0.65rem;">Worker 2</div>
            </div>
            <div style="
                grid-column: span 3;
                background: rgba(251, 146, 60, 0.1);
                border: 1px solid #f97316;
                border-radius: 0.25rem;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.5s ease-out 0.3s both;
            ">
                <div style="color: #f97316; font-size: 0.65rem;">Critic</div>
            </div>
        </div>
        <div style="
            margin-top: 0.5rem;
            font-size: 0.65rem;
            color: var(--text-muted);
            text-align: center;
            animation: fadeIn 0.5s ease-out 0.4s both;
        ">
            Distribute &rarr; Execute &rarr; Validate
        </div>
    `;
    
    setTimeout(() => {
        state.multiagentAnimating = false;
    }, 1000);
}

// ============================================
// Demo Simulations
// ============================================

function runMCPDemo() {
    const query = document.getElementById('mcpQuery').value || 'What\'s the weather in Paris?';
    const output = document.getElementById('mcpOutput');
    
    output.innerHTML = `
        <p class="demo-result">
            <span class="highlight">Query:</span> "${query}"
        </p>
        <p class="demo-result" style="margin-top: 0.5rem;">
            <span class="highlight">LLM Analysis:</span> User is asking for weather information
        </p>
        <p class="demo-result" style="margin-top: 0.5rem;">
            <span class="highlight">Tool Selected:</span> weather_api
        </p>
        <p class="demo-result" style="margin-top: 0.5rem;">
            <span class="highlight">Tool Call:</span> weather_api(location="Paris")
        </p>
        <p class="demo-result" style="margin-top: 0.5rem;">
            <span class="highlight">Result:</span> {"temperature": 22, "condition": "sunny", "location": "Paris"}
        </p>
        <p class="demo-result" style="margin-top: 0.5rem;">
            <span class="highlight">Final Answer:</span> The weather in Paris is currently 22°C and sunny.
        </p>
    `;
}

function runHyDEDemo() {
    const query = document.getElementById('hydeQuery').value || 'treatment for type 2 diabetes';
    const output = document.getElementById('hydeOutput');
    
    output.innerHTML = `
        <p class="demo-result">
            <span class="highlight">User Query:</span> "${query}"
        </p>
        <p class="demo-result" style="margin-top: 0.5rem;">
            <span class="highlight">HyDE Generation:</span> LLM creates a hypothetical comprehensive answer...
        </p>
        <p class="demo-result" style="margin-top: 0.5rem; background: rgba(6, 182, 212, 0.1); padding: 0.5rem; border-radius: 0.25rem;">
            <em>"Type 2 diabetes treatment includes lifestyle modifications such as diet changes, increased physical activity, and weight management. 
            Medications like metformin, sulfonylureas, and insulin therapy may be prescribed. 
            Regular blood glucose monitoring and HbA1c testing are essential for managing the condition effectively."</em>
        </p>
        <p class="demo-result" style="margin-top: 0.5rem;">
            <span class="highlight">Embedding:</span> Generated document &rarr; Vector embedding
        </p>
        <p class="demo-result" style="margin-top: 0.5rem;">
            <span class="highlight">Retrieval:</span> Found 3 relevant medical guidelines with high similarity scores
        </p>
    `;
}

function runTAODemo() {
    const goal = document.getElementById('taoGoal').value || 'Find the capital of France';
    const output = document.getElementById('taoOutput');
    
    // Clear previous iterations
    output.innerHTML = '';
    
    // Simulate TAO loop with multiple iterations
    const iterations = [
        {
            type: 'THINK',
            content: 'The user wants to know the capital of France. I need to recall this information from my knowledge base.'
        },
        {
            type: 'ACT',
            content: 'Querying internal knowledge: "What is the capital of France?"'
        },
        {
            type: 'OBSERVE',
            content: 'Retrieved: "The capital of France is Paris." Confidence: 99.9%'
        },
        {
            type: 'THINK',
            content: 'The information is clear and confident. I should provide this as the final answer.'
        },
        {
            type: 'ACT',
            content: 'Preparing final response...'
        }
    ];
    
    iterations.forEach((iter, index) => {
        setTimeout(() => {
            const iterElement = document.createElement('div');
            iterElement.className = 'tao-iteration';
            iterElement.innerHTML = `
                <div class="iteration-type">${iter.type}</div>
                <div style="color: var(--text-secondary); font-size: 0.85rem;">${iter.content}</div>
            `;
            output.appendChild(iterElement);
            
            // Scroll to bottom
            output.scrollTop = output.scrollHeight;
        }, index * 800);
    });
    
    // Final answer
    setTimeout(() => {
        const finalElement = document.createElement('div');
        finalElement.style = `
            margin-top: 1rem;
            padding: 1rem;
            background: rgba(34, 197, 94, 0.1);
            border: 1px solid #10b981;
            border-radius: 0.5rem;
            text-align: center;
            color: #10b981;
            font-weight: 600;
        `;
        finalElement.innerHTML = `&#10003; Answer: The capital of France is Paris.`;
        output.appendChild(finalElement);
        output.scrollTop = output.scrollHeight;
    }, iterations.length * 800);
}

// ============================================
// Utility Functions
// ============================================

// Debounce function for performance
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle function for scroll events
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ============================================
// Export for potential module use
// ============================================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initNavigation,
        initConnectionLines,
        initScrollEffects,
        initLessonCards,
        animateMCP,
        animateHyDE,
        animateTAO,
        animateRAG,
        animateDSPy,
        animateMultiAgent,
        runMCPDemo,
        runHyDEDemo,
        runTAODemo
    };
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. Scroll styling for navbar
    const navbar = document.querySelector('.navbar');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // 2. Active state for navigation links based on scroll position
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-links a');

    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (scrollY >= (sectionTop - 150)) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href').includes(current)) {
                link.classList.add('active');
            }
        });
    });

    // 3. Scroll Reveal Animation
    const revealSections = document.querySelectorAll('.section');
    
    const revealCallback = (entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target); // Only animate once
            }
        });
    };

    const revealOptions = {
        root: null,
        threshold: 0.02, // Lower threshold so tall sections trigger on mobile
        rootMargin: "0px 0px -50px 0px" // Trigger slightly before the bottom
    };

    const revealObserver = new IntersectionObserver(revealCallback, revealOptions);

    revealSections.forEach(section => {
        revealObserver.observe(section);
        // Ensure the hero section is visible immediately on load
        if (section.classList.contains('hero')) {
            section.classList.add('visible');
        }
    });
});

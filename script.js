document.addEventListener('DOMContentLoaded', () => {
    const navbar = document.querySelector('.navbar');
    const navToggle = document.querySelector('.nav-toggle');
    const navList = document.querySelector('.nav-links');
    const navLinks = document.querySelectorAll('.nav-links a');
    const sections = document.querySelectorAll('main section[id]');

    // 1. Mobile menu
    const closeMenu = () => {
        navList.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.setAttribute('aria-label', 'Open navigation menu');
    };

    navToggle.addEventListener('click', () => {
        const open = navList.classList.toggle('open');
        navToggle.setAttribute('aria-expanded', String(open));
        navToggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
    });

    navLinks.forEach(link => link.addEventListener('click', closeMenu));

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && navList.classList.contains('open')) {
            closeMenu();
            navToggle.focus();
        }
    });

    // 2. Navbar shadow + active link, on one rAF-throttled passive listener.
    // Section offsets are cached so scrolling never forces a layout.
    let offsets = [];
    const measure = () => {
        offsets = Array.from(sections, section => ({
            id: section.id,
            top: section.offsetTop
        }));
    };

    const update = () => {
        navbar.classList.toggle('scrolled', window.scrollY > 50);

        let current = offsets.length ? offsets[0].id : null;
        offsets.forEach(({ id, top }) => {
            if (window.scrollY >= top - 150) {
                current = id;
            }
        });

        navLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === '#' + current);
        });
    };

    let ticking = false;
    const onScroll = () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            update();
            ticking = false;
        });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) closeMenu();
        measure();
        update();
    });
    window.addEventListener('load', () => {
        measure();
        update();
    });

    measure();
    update();

    // 3. Scroll reveal. CSS only hides sections once <html> has the `js` class,
    // so a failure here leaves the page readable rather than blank.
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, {
        root: null,
        threshold: 0.02, // Lower threshold so tall sections trigger on mobile
        rootMargin: '0px 0px -50px 0px' // Trigger slightly before the bottom
    });

    document.querySelectorAll('.section').forEach(section => {
        if (section.classList.contains('hero')) {
            section.classList.add('visible'); // Hero is visible immediately on load
        } else {
            revealObserver.observe(section);
        }
    });
});

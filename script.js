document.addEventListener('DOMContentLoaded', () => {
    // 0. Theme. The system preference decides unless the reader has chosen;
    // choosing pins data-theme, which CSS treats as an override in either
    // direction. Palette and logo variants are handled entirely in CSS.
    const themeToggle = document.querySelector('.theme-toggle');
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    const systemLight = window.matchMedia('(prefers-color-scheme: light)');

    const stored = () => localStorage.getItem('theme');
    const effective = () => stored() || (systemLight.matches ? 'light' : 'dark');

    const sync = () => {
        const choice = stored();
        if (choice) document.documentElement.setAttribute('data-theme', choice);
        else document.documentElement.removeAttribute('data-theme');

        const light = effective() === 'light';
        themeToggle.setAttribute('aria-label',
            light ? 'Switch to dark theme' : 'Switch to light theme');
        if (themeMeta) themeMeta.setAttribute('content', light ? '#ffffff' : '#0a0a0f');
    };

    themeToggle.addEventListener('click', () => {
        localStorage.setItem('theme', effective() === 'light' ? 'dark' : 'light');
        sync();
    });

    // follow the OS while the reader has expressed no preference of their own
    systemLight.addEventListener('change', () => { if (!stored()) sync(); });

    sync();

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

    // 2. Mark the nav link for whichever section is in view. Offsets are cached
    // so scrolling never forces a layout, and the work is rAF-throttled.
    let offsets = [];
    const measure = () => {
        offsets = Array.from(sections, section => ({
            id: section.id,
            top: section.offsetTop
        }));
    };

    const update = () => {
        let current = offsets.length ? offsets[0].id : null;
        offsets.forEach(({ id, top }) => {
            if (window.scrollY >= top - 150) {
                current = id;
            }
        });

        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            // Cross-page links (e.g. other.html) carry their own active state
            // from the markup; scroll position says nothing about them.
            if (!href.startsWith('#')) return;
            link.classList.toggle('active', href === '#' + current);
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
});

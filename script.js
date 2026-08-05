document.addEventListener('DOMContentLoaded', () => {
    // 0. Theme. Dark is the default; the inline bootstrap in <head> has already
    // applied any stored preference, so this only wires the toggle.
    const themeToggle = document.querySelector('.theme-toggle');
    const themeMeta = document.querySelector('meta[name="theme-color"]');

    const applyTheme = theme => {
        const light = theme === 'light';
        if (light) document.documentElement.setAttribute('data-theme', 'light');
        else document.documentElement.removeAttribute('data-theme');

        themeToggle.setAttribute('aria-label',
            light ? 'Switch to dark theme' : 'Switch to light theme');
        if (themeMeta) themeMeta.setAttribute('content', light ? '#ffffff' : '#0a0a0f');

        // Logos that would be invisible on the other background swap file.
        // Only the active variant is ever fetched.
        document.querySelectorAll('img[data-light]').forEach(img => {
            if (!img.dataset.dark) {
                img.dataset.dark = img.getAttribute('src');
                img.dataset.darkW = img.getAttribute('width');
                img.dataset.darkH = img.getAttribute('height');
            }
            img.setAttribute('src', light ? img.dataset.light : img.dataset.dark);
            img.setAttribute('width', light ? img.dataset.lightW : img.dataset.darkW);
            img.setAttribute('height', light ? img.dataset.lightH : img.dataset.darkH);
        });
    };

    applyTheme(localStorage.getItem('theme') === 'light' ? 'light' : 'dark');

    themeToggle.addEventListener('click', () => {
        const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        localStorage.setItem('theme', next);
        applyTheme(next);
    });

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

const header = document.querySelector('.site-header');
const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelectorAll('.site-nav a');

if (navToggle && header) {
  navToggle.addEventListener('click', () => {
    const isOpen = header.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });
}

navLinks.forEach((link) => {
  link.addEventListener('click', () => {
    if (header.classList.contains('open')) {
      header.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    }
  });
});

const form = document.getElementById('quote-form');
const message = document.querySelector('.form-message');

if (form && message) {
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    message.textContent = "Thanks! We'll be in touch shortly to confirm details.";
    form.reset();
  });
}

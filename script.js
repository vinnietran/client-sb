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

const formConfigs = [
  {
    id: 'quote-form',
    message: "Thanks! We've received your request and will follow up to confirm details.",
  },
];

let selectedAddress = '';
let addressElement = null;
let addressInput = null;

formConfigs.forEach(({ id, message }) => {
  const form = document.getElementById(id);
  if (!form) return;

  const status = form.querySelector('.form-message');
  if (!status) return;

  form.addEventListener('submit', (event) => {
    if (!form.checkValidity()) {
      event.preventDefault();
      form.reportValidity();
      return;
    }

    if (addressElement) {
      const currentValue = selectedAddress || addressInput?.value || '';
      if (!currentValue.trim()) {
        event.preventDefault();
        status.textContent = 'Please select an address from the suggestions.';
        addressElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }

    event.preventDefault();
    status.textContent = message;
    form.reset();
    selectedAddress = '';
  });
});

window.initAutocomplete = async function initAutocomplete() {
  addressElement = document.getElementById('service-address-autocomplete');
  addressInput = document.getElementById('service-address');
  if (!addressElement || !window.google || !google.maps || !google.maps.importLibrary) {
    return;
  }

  try {
    await google.maps.importLibrary('places');
  } catch (error) {
    return;
  }

  addressElement.addEventListener('gmp-select', async ({ placePrediction }) => {
    if (!placePrediction) return;
    try {
      const place = placePrediction.toPlace();
      await place.fetchFields({ fields: ['formattedAddress'] });
      selectedAddress = place.formattedAddress || '';
      if (addressInput) {
        addressInput.value = selectedAddress;
      }
    } catch (error) {
      selectedAddress = '';
      if (addressInput) {
        addressInput.value = '';
      }
    }
  });
};

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

const SERVICE_REQUEST_ENDPOINT =
  'https://us-central1-becks-junk-removal.cloudfunctions.net/submitServiceRequest';

let selectedAddress = '';
let addressElement = null;
let addressInput = null;

const form = document.getElementById('quote-form');
const status = form?.querySelector('.form-message');

if (form && status) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const currentValue = selectedAddress || addressInput?.value || '';
    if (addressElement && !currentValue.trim()) {
      status.textContent = 'Please select an address from the suggestions.';
      addressElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const serviceTypeSelections = Array.from(
      form.querySelectorAll('input[name="serviceType"]:checked'),
    ).map((input) => input.value);

    const payload = {
      customerName: form.querySelector('#customer-name')?.value?.trim() || '',
      customerEmail: form.querySelector('#customer-email')?.value?.trim() || '',
      customerPhone: form.querySelector('#customer-phone')?.value?.trim() || '',
      serviceAddress: currentValue.trim(),
      serviceType: serviceTypeSelections,
      serviceTypeOther: form.querySelector('input[name="serviceTypeOther"]')?.value?.trim() || '',
      desiredDate: form.querySelector('#desired-date')?.value || '',
      notes: form.querySelector('#request-details')?.value?.trim() || '',
      contactPreference:
        form.querySelector('input[name="contactPreference"]:checked')?.value || '',
      acceptTerms: form.querySelector('input[name="acceptTerms"]')?.checked === true,
    };

    status.classList.remove('success');
    status.textContent = 'Submitting request...';

    try {
      const response = await fetch(SERVICE_REQUEST_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        status.classList.remove('success');
        status.textContent =
          data.error || 'There was an error submitting your request. Please try again.';
        return;
      }

      status.classList.add('success');
      status.textContent =
        data.message || 'Request received. Someone from our team will be in touch soon.';
      form.reset();
      selectedAddress = '';
      if (addressInput) {
        addressInput.value = '';
      }
    } catch (error) {
      status.classList.remove('success');
      status.textContent =
        'There was an error submitting your request. Please check your connection and try again.';
    }
  });
}

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

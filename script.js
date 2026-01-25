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
const PLACES_ENDPOINT =
  'https://us-central1-becks-junk-removal.cloudfunctions.net/placeAutocomplete';

const form = document.getElementById('quote-form');
const status = form?.querySelector('.form-message');
const addressInput = document.getElementById('service-address');
const addressResults = document.getElementById('address-results');

let debounceId = null;
let sessionToken = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const clearResults = () => {
  if (!addressResults) return;
  addressResults.innerHTML = '';
  addressResults.classList.remove('is-open');
};

const renderResults = (predictions) => {
  if (!addressResults) return;
  addressResults.innerHTML = '';

  if (!predictions.length) {
    addressResults.classList.remove('is-open');
    return;
  }

  predictions.forEach((prediction) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'autocomplete-item';
    button.textContent = prediction.description;
    button.addEventListener('click', () => {
      if (addressInput) {
        addressInput.value = prediction.description;
      }
      clearResults();
      sessionToken = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    });
    addressResults.appendChild(button);
  });

  addressResults.classList.add('is-open');
};

const fetchPredictions = async (query) => {
  try {
    const response = await fetch(
      `${PLACES_ENDPOINT}?input=${encodeURIComponent(query)}&sessionToken=${sessionToken}`,
      { method: 'GET' },
    );
    const data = await response.json();
    if (!response.ok || !data.success) {
      return [];
    }
    return data.predictions || [];
  } catch (error) {
    return [];
  }
};

if (addressInput) {
  addressInput.addEventListener('input', () => {
    const value = addressInput.value.trim();
    clearResults();

    if (debounceId) {
      window.clearTimeout(debounceId);
    }

    if (value.length < 3) return;

    debounceId = window.setTimeout(async () => {
      const predictions = await fetchPredictions(value);
      renderResults(predictions);
    }, 250);
  });

  document.addEventListener('click', (event) => {
    if (!addressResults.contains(event.target) && event.target !== addressInput) {
      clearResults();
    }
  });
}

if (form && status) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const serviceTypeSelections = Array.from(
      form.querySelectorAll('input[name="serviceType"]:checked'),
    ).map((input) => input.value);

    const payload = {
      customerName: form.querySelector('#customer-name')?.value?.trim() || '',
      customerEmail: form.querySelector('#customer-email')?.value?.trim() || '',
      customerPhone: form.querySelector('#customer-phone')?.value?.trim() || '',
      serviceAddress: addressInput?.value?.trim() || '',
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
      clearResults();
      sessionToken = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    } catch (error) {
      status.classList.remove('success');
      status.textContent =
        'There was an error submitting your request. Please check your connection and try again.';
    }
  });
}

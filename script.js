const navToggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('.site-nav');
const navLinks = document.querySelectorAll('.site-nav a');

if (navToggle && nav) {
  navToggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('is-open');
    navToggle.classList.toggle('is-open', isOpen);
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });
}

navLinks.forEach((link) => {
  link.addEventListener('click', () => {
    if (nav?.classList.contains('is-open')) {
      nav.classList.remove('is-open');
      navToggle?.classList.remove('is-open');
      navToggle?.setAttribute('aria-expanded', 'false');
    }
  });
});

const SERVICE_REQUEST_ENDPOINT =
  'https://us-central1-becks-junk-removal.cloudfunctions.net/submitServiceRequest';
const PLACES_ENDPOINT =
  'https://us-central1-becks-junk-removal.cloudfunctions.net/placeAutocomplete';
const PHOTO_UPLOAD_ENDPOINT =
  'https://us-central1-becks-junk-removal.cloudfunctions.net/createPhotoUploadUrl';

const form = document.getElementById('quote-form');
const status = form?.querySelector('.form-message');
const addressInput = document.getElementById('service-address');
const addressResults = document.getElementById('address-results');
const photoInput = document.getElementById('service-photos');
const submitOverlay = document.getElementById('submit-overlay');
const submitOverlayTitle = submitOverlay?.querySelector('.submit-overlay__title');
const submitOverlayMessage = submitOverlay?.querySelector('.submit-overlay__message');

let debounceId = null;
let sessionToken = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
let selectedPhotoFiles = [];
let overlayTimeoutId = null;

const getFileKey = (file) => `${file.name}-${file.size}-${file.lastModified}`;

const syncPhotoInput = (files) => {
  if (!photoInput) return;
  const dataTransfer = new DataTransfer();
  files.forEach((file) => dataTransfer.items.add(file));
  photoInput.files = dataTransfer.files;
};

const setOverlayText = (title, message) => {
  if (submitOverlayTitle) {
    submitOverlayTitle.textContent = title;
  }
  if (submitOverlayMessage) {
    submitOverlayMessage.textContent = message;
  }
};

const clearOverlayTimeout = () => {
  if (overlayTimeoutId) {
    window.clearTimeout(overlayTimeoutId);
    overlayTimeoutId = null;
  }
};

const showSubmitOverlay = ({ title, message }) => {
  if (!submitOverlay) return;
  clearOverlayTimeout();
  setOverlayText(title, message);
  submitOverlay.classList.add('is-visible');
  submitOverlay.classList.remove('is-success');
  submitOverlay.setAttribute('aria-hidden', 'false');
  document.body.classList.add('is-overlay-open');
};

const showSubmitSuccess = ({ title, message }) => {
  if (!submitOverlay) return;
  clearOverlayTimeout();
  setOverlayText(title, message);
  submitOverlay.classList.add('is-visible', 'is-success');
  submitOverlay.setAttribute('aria-hidden', 'false');
  document.body.classList.add('is-overlay-open');
  overlayTimeoutId = window.setTimeout(() => {
    hideSubmitOverlay();
  }, 3200);
};

const hideSubmitOverlay = () => {
  if (!submitOverlay) return;
  clearOverlayTimeout();
  submitOverlay.classList.remove('is-visible', 'is-success');
  submitOverlay.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('is-overlay-open');
};

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const uploadPhotos = async (files, requestId, customerName) => {
  const slug = slugify(customerName || 'customer') || 'customer';

  return Promise.all(
    files.map(async (file, index) => {
      const response = await fetch(PHOTO_UPLOAD_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          size: file.size,
          requestId,
          customerNameSlug: slug,
          index,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success || !data.uploadUrl || !data.viewUrl) {
        throw new Error(data.error || 'Failed to prepare photo upload.');
      }

      const uploadResponse = await fetch(data.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload photo.');
      }

      return data.viewUrl;
    }),
  );
};

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

if (photoInput) {
  photoInput.addEventListener('change', () => {
    const incoming = Array.from(photoInput.files || []);
    if (!incoming.length) return;

    const combined = [...selectedPhotoFiles];
    const existingKeys = new Set(combined.map(getFileKey));

    incoming.forEach((file) => {
      const key = getFileKey(file);
      if (!existingKeys.has(key)) {
        combined.push(file);
        existingKeys.add(key);
      }
    });

    if (combined.length > 5) {
      selectedPhotoFiles = combined.slice(0, 5);
      if (status) {
        status.classList.remove('success');
        status.textContent = 'Please upload no more than 5 images.';
      }
    } else {
      selectedPhotoFiles = combined;
    }

    syncPhotoInput(selectedPhotoFiles);
  });
}

if (submitOverlay) {
  submitOverlay.addEventListener('click', () => {
    if (submitOverlay.classList.contains('is-success')) {
      hideSubmitOverlay();
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

    const rawFiles = selectedPhotoFiles.length
      ? selectedPhotoFiles
      : photoInput
        ? Array.from(photoInput.files || [])
        : [];
    if (rawFiles.length > 5) {
      status.textContent = 'Please upload no more than 5 images.';
      return;
    }

    const invalidType = rawFiles.find((file) => !file.type.startsWith('image/'));
    if (invalidType) {
      status.textContent = 'Only image files are allowed.';
      return;
    }

    const oversizedFile = rawFiles.find((file) => file.size > 5 * 1024 * 1024);
    if (oversizedFile) {
      status.textContent = 'Each image must be 5MB or less.';
      return;
    }

    showSubmitOverlay({
      title: rawFiles.length ? 'Uploading photos...' : 'Submitting your request...',
      message: 'Please wait while we process your request.',
    });
    status.classList.remove('success');
    status.textContent = rawFiles.length ? 'Uploading photos...' : 'Submitting request...';

    let photoUrls = [];
    if (rawFiles.length > 0) {
      const customerName = form.querySelector('#customer-name')?.value?.trim() || 'customer';
      const requestId = new Date().toISOString().replace(/[:.]/g, '-');

      try {
        photoUrls = await uploadPhotos(rawFiles, requestId, customerName);
      } catch (error) {
        console.error('Photo upload failed:', error);
        hideSubmitOverlay();
        status.textContent =
          'We could not upload your photos. Please try again or submit without photos.';
        return;
      }
    }

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
      photoUrls: photoUrls.length ? photoUrls : undefined,
    };

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
        hideSubmitOverlay();
        return;
      }

      status.classList.add('success');
      const successMessage =
        'Thank you for your request. Someone from the team will be in touch soon!';
      status.textContent = successMessage;
      showSubmitSuccess({
        title: 'Request sent!',
        message: successMessage,
      });
      form.reset();
      clearResults();
      sessionToken = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      selectedPhotoFiles = [];
      if (photoInput) {
        photoInput.value = '';
      }
    } catch (error) {
      status.classList.remove('success');
      status.textContent =
        'There was an error submitting your request. Please check your connection and try again.';
      hideSubmitOverlay();
    }
  });
}

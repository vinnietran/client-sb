const functions = require("firebase-functions");
const admin = require("firebase-admin");
const sgMail = require("@sendgrid/mail");

admin.initializeApp();
const bucket = admin.storage().bucket();

const allowedOrigins = [
  "https://vinnietran.github.io",
  "https://vinnietran.com",
  "https://www.becksjunk.com",
  "https://becksjunk.com",
  "http://127.0.0.1:5500",
  "http://localhost:5500",
];

const cors = require("cors")({
  origin: allowedOrigins,
  methods: ["POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
});
const corsAutocomplete = require("cors")({
  origin: allowedOrigins,
  methods: ["GET", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
});
const corsUploads = require("cors")({
  origin: allowedOrigins,
  methods: ["POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
});

sgMail.setApiKey(functions.config().sendgrid.api_key);

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

exports.submitServiceRequest = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method === "OPTIONS") {
      return res.status(204).send("");
    }

    if (req.method !== "POST") {
      return res
        .status(405)
        .json({ success: false, error: "Method not allowed" });
    }

    const {
      customerName,
      customerEmail,
      customerPhone,
      serviceAddress,
      serviceType,
      serviceTypeOther,
      desiredDate,
      notes,
      contactPreference,
      photoUrls,
      acceptTerms,
    } = req.body || {};

    const missing = [];

    if (!customerName || typeof customerName !== "string" || !customerName.trim()) {
      missing.push("customerName");
    }
    if (!customerEmail || typeof customerEmail !== "string" || !customerEmail.trim()) {
      missing.push("customerEmail");
    }
    if (!customerPhone || typeof customerPhone !== "string" || !customerPhone.trim()) {
      missing.push("customerPhone");
    }
    if (
      !serviceAddress ||
      typeof serviceAddress !== "string" ||
      !serviceAddress.trim()
    ) {
      missing.push("serviceAddress");
    }
    if (!desiredDate || typeof desiredDate !== "string" || !desiredDate.trim()) {
      missing.push("desiredDate");
    }
    if (
      !contactPreference ||
      typeof contactPreference !== "string" ||
      !contactPreference.trim()
    ) {
      missing.push("contactPreference");
    }
    if (acceptTerms !== true) {
      missing.push("acceptTerms");
    }

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Missing or invalid required fields",
        missing,
      });
    }

    let serviceTypeNormalized = "Not specified";
    if (Array.isArray(serviceType)) {
      serviceTypeNormalized = serviceType.join(", ");
    } else if (typeof serviceType === "string" && serviceType.trim() !== "") {
      serviceTypeNormalized = serviceType;
    }

    const other =
      typeof serviceTypeOther === "string" && serviceTypeOther.trim() !== ""
        ? serviceTypeOther.trim()
        : "N/A";
    const notesValue =
      typeof notes === "string" && notes.trim() !== "" ? notes.trim() : "None provided";
    const submittedAt = new Date().toISOString();
    const normalizedPhotoUrls = Array.isArray(photoUrls)
      ? photoUrls.filter((url) => typeof url === "string" && url.trim())
      : [];
    const photosLine =
      normalizedPhotoUrls.length > 0
        ? normalizedPhotoUrls.map((url, index) => `${index + 1}) ${url}`).join("\n")
        : "None provided";

    const baseSubject =
      functions.config().sendgrid.subject || "New Service Request - Beck's Junk";
    const subject = `${baseSubject} (${customerName.trim()})`;

    const plainTextBody = `
New Service Request - Beck's Junk

Customer Name: ${customerName.trim()}
Email: ${customerEmail.trim()}
Phone: ${customerPhone.trim()}
Service Address: ${serviceAddress.trim()}

Service Type(s): ${serviceTypeNormalized}
Other Service Type: ${other}

Desired Date: ${desiredDate.trim()}
Preferred Contact: ${contactPreference.trim()}

Notes:
${notesValue}

Photos:
${photosLine}

Terms Accepted: ${acceptTerms}
Submitted At (UTC): ${submittedAt}
`.trim();

    const htmlBody = `
      <!doctype html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta name="color-scheme" content="light" />
          <meta name="supported-color-schemes" content="light" />
          <style>
            @media (prefers-color-scheme: dark) {
              body,
              .email-body,
              .card {
                background: #ffffff !important;
                color: #111111 !important;
              }
              .muted {
                color: #4a4a4a !important;
              }
              a {
                color: #0b4f6c !important;
              }
            }
          </style>
        </head>
        <body style="margin:0; padding:0; background:#f2f2f2; color:#111111;">
          <div class="email-body" style="font-family: Arial, sans-serif; background:#f2f2f2; padding:20px; color:#111111;">
            <div class="card" style="max-width:620px; margin:0 auto; background:#ffffff; color:#111111; border-radius:12px; overflow:hidden; border:1px solid #e0e0e0;">
              <div style="padding:20px; background:#b71c1c; color:#ffffff;">
                <h2 style="margin:0; font-size:22px; color:#ffffff; -webkit-text-fill-color:#ffffff;">New Service Request - Beck's Junk</h2>
              </div>
              <div style="padding:20px; background:#ffffff; color:#111111;">
                <table role="presentation" style="width:100%; border-collapse:collapse; font-size:14px; color:#111111;">
                  <tr>
                    <td class="muted" style="padding:8px 0; color:#4a4a4a; width:160px;">Customer</td>
                    <td style="padding:8px 0; color:#111111;">${escapeHtml(customerName.trim())}</td>
                  </tr>
                  <tr>
                    <td class="muted" style="padding:8px 0; color:#4a4a4a; width:160px;">Email</td>
                    <td style="padding:8px 0; color:#111111;">${escapeHtml(customerEmail.trim())}</td>
                  </tr>
                  <tr>
                    <td class="muted" style="padding:8px 0; color:#4a4a4a; width:160px;">Phone</td>
                    <td style="padding:8px 0; color:#111111;">${escapeHtml(customerPhone.trim())}</td>
                  </tr>
                  <tr>
                    <td class="muted" style="padding:8px 0; color:#4a4a4a; width:160px;">Service Address</td>
                    <td style="padding:8px 0; color:#111111;">${escapeHtml(serviceAddress.trim())}</td>
                  </tr>
                  <tr>
                    <td class="muted" style="padding:8px 0; color:#4a4a4a; width:160px;">Service Type(s)</td>
                    <td style="padding:8px 0; color:#111111;">${escapeHtml(serviceTypeNormalized)}</td>
                  </tr>
                  <tr>
                    <td class="muted" style="padding:8px 0; color:#4a4a4a; width:160px;">Other Service Type</td>
                    <td style="padding:8px 0; color:#111111;">${escapeHtml(other)}</td>
                  </tr>
                  <tr>
                    <td class="muted" style="padding:8px 0; color:#4a4a4a; width:160px;">Desired Date</td>
                    <td style="padding:8px 0; color:#111111;">${escapeHtml(desiredDate.trim())}</td>
                  </tr>
                  <tr>
                    <td class="muted" style="padding:8px 0; color:#4a4a4a; width:160px;">Preferred Contact</td>
                    <td style="padding:8px 0; color:#111111;">${escapeHtml(contactPreference.trim())}</td>
                  </tr>
                </table>
                <div style="margin-top:16px; padding:12px; background:#fafafa; border:1px solid #e0e0e0; border-radius:8px;">
                  <div class="muted" style="font-size:12px; text-transform:uppercase; letter-spacing:1px; color:#6a6a6a;">Notes</div>
                  <div style="margin-top:8px; font-size:14px; color:#111111;">${escapeHtml(
                    notesValue,
                  ).replace(/\n/g, "<br>")}</div>
                </div>
                <div style="margin-top:16px; padding:12px; background:#fafafa; border:1px solid #e0e0e0; border-radius:8px;">
                  <div class="muted" style="font-size:12px; text-transform:uppercase; letter-spacing:1px; color:#6a6a6a;">Photos</div>
                  ${
                    normalizedPhotoUrls.length > 0
                      ? `<ul style="margin:8px 0 0; padding-left:18px; color:#111111;">
                          ${normalizedPhotoUrls
                            .map(
                              (url) =>
                                `<li style="margin-bottom:6px; color:#111111;"><a href="${escapeHtml(
                                  url,
                                )}" style="color:#0b4f6c; text-decoration:underline;">View photo</a></li>`,
                            )
                            .join("")}
                        </ul>`
                      : `<div style="margin-top:8px; font-size:14px; color:#111111;">None provided</div>`
                  }
                </div>
                <div class="muted" style="margin-top:16px; font-size:12px; color:#5a5a5a;">
                  <div><strong>Terms Accepted:</strong> ${acceptTerms}</div>
                  <div><strong>Submitted At (UTC):</strong> ${escapeHtml(submittedAt)}</div>
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const msg = {
      to: functions.config().sendgrid.to_email,
      from: functions.config().sendgrid.from_email,
      subject,
      text: plainTextBody,
      html: htmlBody,
    };

    try {
      await sgMail.send(msg);
      return res.status(200).json({
        success: true,
        message: "Service request submitted.",
      });
    } catch (err) {
      console.error("Error sending service request email:", err);
      return res.status(500).json({
        success: false,
        error: "Failed to send email.",
      });
    }
  });
});

exports.placeAutocomplete = functions.https.onRequest((req, res) => {
  corsAutocomplete(req, res, async () => {
    if (req.method === "OPTIONS") {
      return res.status(204).send("");
    }

    if (req.method !== "GET") {
      return res
        .status(405)
        .json({ success: false, error: "Method not allowed" });
    }

    const input = typeof req.query.input === "string" ? req.query.input.trim() : "";
    const sessionToken =
      typeof req.query.sessionToken === "string" ? req.query.sessionToken.trim() : "";

    if (!input) {
      return res.status(400).json({
        success: false,
        error: "Missing or invalid required fields",
        missing: ["input"],
      });
    }

    const apiKey = functions.config().google?.places_key;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: "Places API key not configured.",
      });
    }

    const url = "https://places.googleapis.com/v1/places:autocomplete";

    const body = {
      input,
    };

    if (sessionToken) {
      body.sessionToken = sessionToken;
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "suggestions.placePrediction.text,suggestions.placePrediction.placeId",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Places API error:", data.error?.message || data);
        return res.status(500).json({
          success: false,
          error: "Failed to fetch autocomplete results.",
        });
      }

      const predictions = (data.suggestions || [])
        .map((suggestion) => suggestion.placePrediction)
        .filter(Boolean)
        .map((prediction) => ({
          description: prediction.text?.text || "",
          placeId: prediction.placeId || "",
        }))
        .filter((prediction) => prediction.description);

      return res.status(200).json({
        success: true,
        predictions,
      });
    } catch (err) {
      console.error("Places API request failed:", err);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch autocomplete results.",
      });
    }
  });
});

exports.createPhotoUploadUrl = functions.https.onRequest((req, res) => {
  corsUploads(req, res, async () => {
    if (req.method === "OPTIONS") {
      return res.status(204).send("");
    }

    if (req.method !== "POST") {
      return res
        .status(405)
        .json({ success: false, error: "Method not allowed" });
    }

    const {
      fileName,
      contentType,
      size,
      requestId,
      customerNameSlug,
      index,
    } = req.body || {};

    const missing = [];
    if (!fileName || typeof fileName !== "string") missing.push("fileName");
    if (!contentType || typeof contentType !== "string") missing.push("contentType");
    if (!requestId || typeof requestId !== "string") missing.push("requestId");

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Missing or invalid required fields",
        missing,
      });
    }

    if (!contentType.startsWith("image/")) {
      return res.status(400).json({
        success: false,
        error: "Only image uploads are allowed.",
      });
    }

    if (typeof size === "number" && size > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        error: "Each image must be 5MB or less.",
      });
    }

    const safeSlug =
      typeof customerNameSlug === "string" && customerNameSlug.trim()
        ? customerNameSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "")
        : "customer";
    const safeName = fileName.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
    const safeRequestId = requestId.replace(/[^a-z0-9-]/gi, "-");

    const indexPrefix = Number.isInteger(index) ? `${index + 1}-` : "";
    const filePath = `serviceRequests/${safeRequestId}-${safeSlug}/photos/${indexPrefix}${safeName}`;
    const file = bucket.file(filePath);

    try {
      const [uploadUrl] = await file.getSignedUrl({
        version: "v4",
        action: "write",
        expires: Date.now() + 15 * 60 * 1000,
        contentType,
      });

      const [viewUrl] = await file.getSignedUrl({
        version: "v4",
        action: "read",
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });

      return res.status(200).json({
        success: true,
        uploadUrl,
        viewUrl,
        path: filePath,
      });
    } catch (error) {
      console.error("Failed to create upload URL:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to create upload URL.",
      });
    }
  });
});

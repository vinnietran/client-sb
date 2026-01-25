const functions = require("firebase-functions");
const cors = require("cors")({
  origin: [
    "https://vinnietran.github.io",
    "https://vinnietran.com",
    "http://127.0.0.1:5500",
    "http://localhost:5500",
  ],
  methods: ["POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
});
const corsAutocomplete = require("cors")({
  origin: [
    "https://vinnietran.github.io",
    "https://vinnietran.com",
    "http://127.0.0.1:5500",
    "http://localhost:5500",
  ],
  methods: ["GET", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
});
const sgMail = require("@sendgrid/mail");

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

Terms Accepted: ${acceptTerms}
Submitted At (UTC): ${submittedAt}
`.trim();

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; background:#f7f7f7; padding:20px;">
        <div style="max-width:620px; margin:0 auto; background:#111; color:#fff; border-radius:12px; overflow:hidden;">
          <div style="padding:20px; background:#b71c1c;">
            <h2 style="margin:0; font-size:22px;">New Service Request - Beck's Junk</h2>
          </div>
          <div style="padding:20px; background:#1a1a1a;">
            <table style="width:100%; border-collapse:collapse; font-size:14px;">
              <tr>
                <td style="padding:8px 0; color:#bdbdbd;">Customer</td>
                <td style="padding:8px 0;">${escapeHtml(customerName.trim())}</td>
              </tr>
              <tr>
                <td style="padding:8px 0; color:#bdbdbd;">Email</td>
                <td style="padding:8px 0;">${escapeHtml(customerEmail.trim())}</td>
              </tr>
              <tr>
                <td style="padding:8px 0; color:#bdbdbd;">Phone</td>
                <td style="padding:8px 0;">${escapeHtml(customerPhone.trim())}</td>
              </tr>
              <tr>
                <td style="padding:8px 0; color:#bdbdbd;">Service Address</td>
                <td style="padding:8px 0;">${escapeHtml(serviceAddress.trim())}</td>
              </tr>
              <tr>
                <td style="padding:8px 0; color:#bdbdbd;">Service Type(s)</td>
                <td style="padding:8px 0;">${escapeHtml(serviceTypeNormalized)}</td>
              </tr>
              <tr>
                <td style="padding:8px 0; color:#bdbdbd;">Other Service Type</td>
                <td style="padding:8px 0;">${escapeHtml(other)}</td>
              </tr>
              <tr>
                <td style="padding:8px 0; color:#bdbdbd;">Desired Date</td>
                <td style="padding:8px 0;">${escapeHtml(desiredDate.trim())}</td>
              </tr>
              <tr>
                <td style="padding:8px 0; color:#bdbdbd;">Preferred Contact</td>
                <td style="padding:8px 0;">${escapeHtml(contactPreference.trim())}</td>
              </tr>
            </table>
            <div style="margin-top:16px; padding:12px; background:#0f0f0f; border:1px solid #333; border-radius:8px;">
              <div style="font-size:12px; text-transform:uppercase; letter-spacing:1px; color:#bdbdbd;">Notes</div>
              <div style="margin-top:8px; font-size:14px;">${escapeHtml(notesValue).replace(/\n/g, "<br>")}</div>
            </div>
            <div style="margin-top:16px; font-size:12px; color:#9e9e9e;">
              <div><strong>Terms Accepted:</strong> ${acceptTerms}</div>
              <div><strong>Submitted At (UTC):</strong> ${escapeHtml(submittedAt)}</div>
            </div>
          </div>
        </div>
      </div>
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

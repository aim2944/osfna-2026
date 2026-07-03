const DEFAULT_DISPLAY_NAME = "OSFNA 2026";
const DEFAULT_BUTTON_COLOR = "#ef1b22";
const DEFAULT_STATEMENT_SUFFIX = "OSFNA2026";

function sanitizeStatementSuffix(value) {
  return (value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9 .]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 22);
}

export function buildCheckoutBranding({ displayName, submitMessage } = {}) {
  const resolvedDisplayName =
    displayName || process.env.STRIPE_DISPLAY_NAME || DEFAULT_DISPLAY_NAME;
  const resolvedSubmitMessage =
    submitMessage ||
    process.env.STRIPE_CHECKOUT_MESSAGE ||
    `Official ${resolvedDisplayName} checkout.`;

  void resolvedDisplayName;
  void DEFAULT_BUTTON_COLOR;
  return {
    custom_text: {
      submit: {
        message: resolvedSubmitMessage,
      },
    },
    // Request 3D Secure on every card payment. When the issuer runs 3DS,
    // liability for "fraudulent"/"unrecognized" disputes shifts to the
    // cardholder's bank instead of OSFNA. Issuers that don't support 3DS
    // (common on US cards) proceed without it — no payment is blocked.
    payment_method_options: {
      card: {
        request_three_d_secure: "any",
      },
    },
    // Billing address gives AVS data to Radar and stronger dispute evidence.
    billing_address_collection: "required",
  };
}

export function buildPaymentIntentBranding({
  description,
  statementSuffix,
} = {}) {
  const paymentIntentData = {};
  const resolvedSuffix = sanitizeStatementSuffix(
    statementSuffix ||
      process.env.STRIPE_STATEMENT_DESCRIPTOR_SUFFIX ||
      DEFAULT_STATEMENT_SUFFIX,
  );

  if (description) paymentIntentData.description = description;
  if (resolvedSuffix)
    paymentIntentData.statement_descriptor_suffix = resolvedSuffix;

  return paymentIntentData;
}

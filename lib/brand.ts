// Nome da marca (white-label). Cada cliente define NEXT_PUBLIC_APP_NAME no deploy.
// É build-time (NEXT_PUBLIC_*), então é inlinada — pode usar em qualquer lugar.
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Compras Coletivas";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "";

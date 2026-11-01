const apiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL?.trim() ||
  "https://fruits-salling-application.onrender.com"
).replace(/\/+$/, "");
const authApiBaseUrl =
  import.meta.env.VITE_AUTH_API_URL?.trim() ||
  `${apiBaseUrl}/api/auth`;
const fruitApiBaseUrl =
  import.meta.env.VITE_FRUIT_API_URL?.trim() ||
  `${apiBaseUrl}/api`;

export const connection = Object.freeze({
  authApiBaseUrl: authApiBaseUrl.replace(/\/+$/, ""),
  fruitApiBaseUrl: fruitApiBaseUrl.replace(/\/+$/, ""),
});

const authApiBaseUrl =
  import.meta.env.VITE_AUTH_API_URL?.trim() ||
  "http://127.0.0.1:3000/api/auth";
const fruitApiBaseUrl =
  import.meta.env.VITE_FRUIT_API_URL?.trim() ||
  "http://127.0.0.1:4000/api";

export const connection = Object.freeze({
  authApiBaseUrl: authApiBaseUrl.replace(/\/+$/, ""),
  fruitApiBaseUrl: fruitApiBaseUrl.replace(/\/+$/, ""),
});

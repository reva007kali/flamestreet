import axios from "axios";
import { getApiUrl } from "./env";
import { useAuthStore } from "../store/authStore";

export const api = axios.create({
  baseURL: getApiUrl(),
  headers: {
    Accept: "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

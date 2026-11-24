import config from "./playwright.mobile.config";
config.use = { ...config.use, baseURL: "http://127.0.0.1:34327" };
delete config.webServer;
export default config;

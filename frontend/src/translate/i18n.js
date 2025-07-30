import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import { messages } from "./languages";

i18n.use(LanguageDetector).init({
	debug: false,
	defaultNS: ["translations"],
	fallbackLng: "es",
	lng: "es", // Forzar idioma español
	ns: ["translations"],
	resources: messages,
	detection: {
		order: ['localStorage', 'navigator'],
		caches: ['localStorage'],
	},
	interpolation: {
		escapeValue: false,
	},
});

// Forzar el idioma español después de la inicialización
i18n.changeLanguage("es");

export { i18n };

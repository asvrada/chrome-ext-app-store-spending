import {initReactI18next} from "react-i18next";
import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import transEn from "./locale/en/translation.json"
import transZh from "./locale/zh/translation.json"

const resources = {
    en: {
        translation: transEn,
    },
    "zh-CN": {
        translation: transZh
    }
};

i18n
    .use(initReactI18next)
    .use(LanguageDetector)
    .init({
        resources,
        fallbackLng: "en",
        interpolation: {
            escapeValue: false,
        },
    });
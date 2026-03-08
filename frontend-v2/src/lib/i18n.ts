import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Translation resources
const resources = {
    en: {
        translation: {
            "home": "Home",
            "contact": "Contact",
            "features": "Features",
            "services": "Services",
            "how_it_works": "How it works",
            "knowledge_base": "Knowledge Base",
            "live_mode": "Live mode",
            "scan_documents": "Scan documents",
            "scan_now": "Scan Now",
            "log_in": "Log In",
            "create_account": "Create an Account",
            "hero_headline": "Understand Your Legal Rights Instantly",
            "hero_subheading": "CivicPulse empowers you to decode complex legal documents, uncover hidden risks, and understand your rights—powered by trusted, verified legal AI.",
            "experience_civicpulse": "Experience CivicPulse"
        }
    },
    hi: {
        translation: {
            "home": "मुख्य पृष्ठ",
            "contact": "संपर्क करें",
            "features": "विशेषताएं",
            "services": "सेवाएं",
            "how_it_works": "यह कैसे काम करता है",
            "knowledge_base": "ज्ञान का आधार",
            "live_mode": "लाइव मोड",
            "scan_documents": "दस्तावेज़ स्कैन करें",
            "scan_now": "अभी स्कैन करें",
            "log_in": "लॉग इन करें",
            "create_account": "खाता बनाएं",
            "hero_headline": "अपने कानूनी अधिकारों को तुरंत समझें",
            "hero_subheading": "सिविकपल्स आपको जटिल कानूनी दस्तावेजों को डिकोड करने, छिपे हुए जोखिमों को उजागर करने और अपने अधिकारों को समझने का अधिकार देता है—जो सत्यापित कानूनी एआई द्वारा संचालित है।",
            "experience_civicpulse": "सिविकपल्स का अनुभव करें"
        }
    }
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false, // react already safes from xss
        },
    });

export default i18n;

/**
 * English, Bengali and Hindi for the shop's own wording. Product names come
 * from the catalogue and stay as the shop typed them.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "bn", label: "বাংলা" },
  { code: "hi", label: "हिन्दी" },
] as const;

export type Lang = (typeof LANGUAGES)[number]["code"];

const STORAGE_KEY = "shaw-ev-lang";

const EN = {
  "nav.shop": "Shop All Products",
  "nav.offers": "Offers",
  "nav.findParts": "Find Parts for Your EV",
  "nav.bulk": "Dealer & Bulk Orders",
  "nav.track": "Track Order",
  "nav.account": "My Account",
  "nav.about": "About",
  "nav.contact": "Contact",
  "nav.categories": "Categories",
  "nav.home": "Home",
  "nav.search": "Search",
  "nav.cart": "Cart",
  "nav.quoteList": "Quote list",
  "nav.wishlist": "Wishlist",
  "nav.menu": "Open menu",
  "nav.whatsapp": "WhatsApp us",
  "nav.language": "Language",
  "product.addToCart": "Add to Cart",
  "product.addToQuote": "Add to quote",
  "product.buyNow": "Buy Now",
  "product.outOfStock": "Out of Stock",
  "product.inStock": "In stock",
  "product.priceOnRequest": "Price on request — ask on WhatsApp",
  "product.rateOnRequest": "Rate on request",
  "product.askPrice": "Get price",
  "common.viewAll": "View All",
  "quote.added": "Added to your quote list",
  "quote.title": "Your quote list",
  "quote.subtitle": "Add the parts and quantities you need and we'll send your rates.",
  "quote.empty": "Your quote list is empty",
  "quote.browse": "Browse parts",
  "quote.continue": "Continue",
  "quote.submit": "Submit for quote",
  "quote.success": "Quote request sent — we'll share your rates shortly",
  "quote.wholesaleOnly": "Wholesale orders go through quotes",
  "quote.goToList": "Go to quote list",
  "quote.statusAwaiting": "Awaiting rates",
  "quote.statusReady": "Rates ready",
  "quote.statusAccepted": "Accepted",
  "quote.statusDeclined": "Declined",
  "quote.statusExpired": "Expired",
} as const;

export type TranslationKey = keyof typeof EN;

const BN: Record<TranslationKey, string> = {
  "nav.shop": "সব পণ্য দেখুন",
  "nav.offers": "অফার",
  "nav.findParts": "আপনার গাড়ির যন্ত্রাংশ খুঁজুন",
  "nav.bulk": "ডিলার ও বাল্ক অর্ডার",
  "nav.track": "অর্ডার ট্র্যাক করুন",
  "nav.account": "আমার অ্যাকাউন্ট",
  "nav.about": "আমাদের সম্পর্কে",
  "nav.contact": "যোগাযোগ",
  "nav.categories": "ক্যাটাগরি",
  "nav.home": "হোম",
  "nav.search": "খুঁজুন",
  "nav.cart": "কার্ট",
  "nav.quoteList": "কোট তালিকা",
  "nav.wishlist": "পছন্দের তালিকা",
  "nav.menu": "মেনু খুলুন",
  "nav.whatsapp": "হোয়াটসঅ্যাপ করুন",
  "nav.language": "ভাষা",
  "product.addToCart": "কার্টে যোগ করুন",
  "product.addToQuote": "কোটে যোগ করুন",
  "product.buyNow": "এখনই কিনুন",
  "product.outOfStock": "স্টকে নেই",
  "product.inStock": "স্টকে আছে",
  "product.priceOnRequest": "দাম জানতে হোয়াটসঅ্যাপে জিজ্ঞাসা করুন",
  "product.rateOnRequest": "দর জানতে অনুরোধ করুন",
  "product.askPrice": "দাম জানুন",
  "common.viewAll": "সব দেখুন",
  "quote.added": "আপনার কোট তালিকায় যোগ হয়েছে",
  "quote.title": "আপনার কোট তালিকা",
  "quote.subtitle": "প্রয়োজনীয় যন্ত্রাংশ ও পরিমাণ যোগ করুন, আমরা দর পাঠাব।",
  "quote.empty": "আপনার কোট তালিকা খালি",
  "quote.browse": "যন্ত্রাংশ দেখুন",
  "quote.continue": "এগিয়ে যান",
  "quote.submit": "কোটের জন্য পাঠান",
  "quote.success": "কোটের অনুরোধ পাঠানো হয়েছে — আমরা শীঘ্রই দর জানাব",
  "quote.wholesaleOnly": "পাইকারি অর্ডার কোটের মাধ্যমে হয়",
  "quote.goToList": "কোট তালিকায় যান",
  "quote.statusAwaiting": "দরের অপেক্ষায়",
  "quote.statusReady": "দর প্রস্তুত",
  "quote.statusAccepted": "গৃহীত",
  "quote.statusDeclined": "প্রত্যাখ্যাত",
  "quote.statusExpired": "মেয়াদ শেষ",
};

const HI: Record<TranslationKey, string> = {
  "nav.shop": "सभी प्रोडक्ट देखें",
  "nav.offers": "ऑफ़र",
  "nav.findParts": "अपनी गाड़ी के पुर्ज़े खोजें",
  "nav.bulk": "डीलर और थोक ऑर्डर",
  "nav.track": "ऑर्डर ट्रैक करें",
  "nav.account": "मेरा खाता",
  "nav.about": "हमारे बारे में",
  "nav.contact": "संपर्क",
  "nav.categories": "श्रेणियाँ",
  "nav.home": "होम",
  "nav.search": "खोजें",
  "nav.cart": "कार्ट",
  "nav.quoteList": "कोट सूची",
  "nav.wishlist": "पसंदीदा",
  "nav.menu": "मेन्यू खोलें",
  "nav.whatsapp": "व्हाट्सएप करें",
  "nav.language": "भाषा",
  "product.addToCart": "कार्ट में डालें",
  "product.addToQuote": "कोट में जोड़ें",
  "product.buyNow": "अभी खरीदें",
  "product.outOfStock": "स्टॉक में नहीं",
  "product.inStock": "स्टॉक में है",
  "product.priceOnRequest": "कीमत के लिए व्हाट्सएप पर पूछें",
  "product.rateOnRequest": "दर अनुरोध पर",
  "product.askPrice": "कीमत जानें",
  "common.viewAll": "सभी देखें",
  "quote.added": "आपकी कोट सूची में जोड़ दिया गया",
  "quote.title": "आपकी कोट सूची",
  "quote.subtitle": "ज़रूरी पुर्ज़े और मात्रा जोड़ें, हम आपको दरें भेजेंगे।",
  "quote.empty": "आपकी कोट सूची खाली है",
  "quote.browse": "पुर्ज़े देखें",
  "quote.continue": "आगे बढ़ें",
  "quote.submit": "कोट के लिए भेजें",
  "quote.success": "कोट अनुरोध भेजा गया — हम जल्द ही दरें साझा करेंगे",
  "quote.wholesaleOnly": "थोक ऑर्डर कोट के माध्यम से होते हैं",
  "quote.goToList": "कोट सूची पर जाएँ",
  "quote.statusAwaiting": "दरों की प्रतीक्षा",
  "quote.statusReady": "दरें तैयार",
  "quote.statusAccepted": "स्वीकृत",
  "quote.statusDeclined": "अस्वीकृत",
  "quote.statusExpired": "समाप्त",
};

const DICT: Record<Lang, Record<TranslationKey, string>> = { en: EN, bn: BN, hi: HI };

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (key: TranslationKey) => string };

const LanguageContext = createContext<Ctx>({ lang: "en", setLang: () => {}, t: (k) => EN[k] });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  // Read after hydration so the server and client first render match.
  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (saved && saved in DICT) setLangState(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* private browsing */
    }
  }, []);

  const value = useMemo<Ctx>(
    () => ({ lang, setLang, t: (key: TranslationKey) => DICT[lang][key] ?? EN[key] }),
    [lang, setLang],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => useContext(LanguageContext);
export const useT = () => useContext(LanguageContext).t;

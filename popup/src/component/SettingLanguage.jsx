import { useTranslation } from "react-i18next";

export default function SettingLanguage() {
  const { t, i18n } = useTranslation();

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    i18n.changeLanguage(newLang);
  };

  return (
    <div className="w-auto fixed top-0 right-0 font-light opacity-50 text-xs">
      {t("setting_language")}:&#160;
      <select
        value={i18n.language}
        onChange={handleLanguageChange}
        className="text-xs p-1"
      >
        <option value="en">English</option>
        <option value="zh">中文-简体</option>
      </select>
    </div>
  );
}

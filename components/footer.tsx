import {
  ArrowUpRight,
  Building2,
  MapPin,
  Phone,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations("footer");
  const addressText = t("addressDetails").replace(/<br\s*\/?>/gi, "\n");

  return (
    <footer className="w-full bg-gradient-to-b from-background to-background/95 border-t border-border/50">
      {/* Main Footer */}
      <div className="max-w-[1600px] mx-auto px-4 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5 space-y-8">
            <div className="space-y-6">
              <span className="text-3xl font-bold bg-gradient-to-r from-primary via-primary/80 inline-block mb-2 to-primary/60 bg-clip-text text-transparent font-gmarket">
                WEETOO
              </span>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-md whitespace-pre-line">
                {t("companyDescription")}
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors w-full md:w-[410px]">
                <ShieldAlert className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {t("representative")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("representativeName")}
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors w-full md:w-[410px]">
                <Building2 className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {t("registration")}
                  </p>
                  <p className="text-sm text-muted-foreground">850-53-00866</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-8">
            <h2 className="text-sm font-semibold text-foreground">
              {t("quickLinks")}
            </h2>
            <div className="grid grid-cols-1 gap-3">
              <Link
                href="/terms"
                className="group flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <span className="text-sm text-muted-foreground group-hover:text-foreground">
                  {t("termsOfUse")}
                </span>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
              </Link>
              <Link
                href="/privacy"
                className="group flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <span className="text-sm text-muted-foreground group-hover:text-foreground">
                  {t("privacyPolicy")}
                </span>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
              </Link>
              <Link
                href="#"
                className="group flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <span className="text-sm text-muted-foreground group-hover:text-foreground">
                  {t("customerCenter")}
                </span>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
              </Link>
              <Link
                href="/free-board"
                className="group flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <span className="text-sm text-muted-foreground group-hover:text-foreground">
                  {t("community")}
                </span>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-8">
            <h3 className="text-sm font-semibold text-foreground">
              {t("contactUs")}
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <Phone className="w-5 h-5 mt-1 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {t("phone")}
                  </p>
                  <p className="text-sm text-muted-foreground">070-8670-4032</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <MapPin className="w-5 h-5 mt-1 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {t("address")}
                  </p>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {addressText}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Investment Risk Notice */}
      <div className="border-t border-border/50">
        <div className="max-w-[1600px] mx-auto px-4 py-8">
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-foreground text-left">
              {t("investmentRiskNotice")}
            </h3>
            <div className="prose prose-sm text-muted-foreground max-w-none">
              <p className="mb-3 text-sm leading-relaxed">
                {t("riskNoticeParagraph1")}
              </p>
              <p className="mb-3 text-sm leading-relaxed">
                {t("riskNoticeParagraph2")}
              </p>
              <p className="text-sm leading-relaxed">
                {t("riskNoticeParagraph3")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Preserved original background text */}
      <p className="text-center text-5xl md:text-9xl lg:text-[16rem] bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 dark:from-background to-neutral-200 dark:to-neutral-800 inset-x-0 font-extrabold select-none">
        WEETOO
      </p>

      {/* Bottom Bar */}
      <div className="border-t border-border/50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex justify-center">
            <p className="text-sm text-muted-foreground text-center">
              © {new Date().getFullYear()} {t("copyrightText")}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

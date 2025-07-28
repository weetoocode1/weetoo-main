import {
  ArrowUpRight,
  Building2,
  MapPin,
  Phone,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="w-full bg-gradient-to-b from-background to-background/95 border-t border-border/50">
      {/* Main Footer */}
      <div className="container mx-auto px-4 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5 space-y-8">
            <div className="space-y-6">
              <Link href="/" className="inline-block">
                <span className="text-3xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                  WEETOO
                </span>
              </Link>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
                Solomon Partners (WEE TOO_We are investors) is a margin
                trading/overseas futures information site for the general
                public.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors w-full md:w-[410px]">
                <ShieldAlert className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Representative
                  </p>
                  <p className="text-sm text-muted-foreground">Koh Hak-jin</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors w-full md:w-[410px]">
                <Building2 className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Registration
                  </p>
                  <p className="text-sm text-muted-foreground">850-53-00866</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-8">
            <h2 className="text-sm font-semibold text-foreground">
              Quick Links
            </h2>
            <div className="grid grid-cols-1 gap-3">
              <Link
                href="/terms"
                className="group flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <span className="text-sm text-muted-foreground group-hover:text-foreground">
                  Terms of Use
                </span>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
              </Link>
              <Link
                href="/privacy"
                className="group flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <span className="text-sm text-muted-foreground group-hover:text-foreground">
                  Privacy Policy
                </span>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
              </Link>
              <Link
                href="#"
                className="group flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <span className="text-sm text-muted-foreground group-hover:text-foreground">
                  Customer Center
                </span>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
              </Link>
              <Link
                href="/free-board"
                className="group flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <span className="text-sm text-muted-foreground group-hover:text-foreground">
                  Community
                </span>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-8">
            <h3 className="text-sm font-semibold text-foreground">
              Contact Us
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <Phone className="w-5 h-5 mt-1 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">Phone</p>
                  <p className="text-sm text-muted-foreground">070-8670-4032</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <MapPin className="w-5 h-5 mt-1 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">Address</p>
                  <p className="text-sm text-muted-foreground">
                    3012-53, 30th floor, Building A,
                    <br />
                    323 Incheon Tower-daero, Yeonsu-gu,
                    <br />
                    Incheon (Songdo-dong, Songdo Cent Road)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Investment Risk Notice */}
      <div className="border-t border-border/50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-foreground text-center">
              Investment Risk Notice
            </h3>
            <div className="prose prose-sm text-muted-foreground max-w-none">
              <p className="mb-3 text-sm leading-relaxed">
                Solomon Partners (WEE TOO_We are investors) is a margin
                trading/overseas futures information site for the general
                public, so it does not provide services such as &apos;investment
                brokerage&apos; or &apos;investment consulting and agency&apos;,
                and the trading history provided by our company is simulated
                investment content. Please note that actual CFD trading is a
                high-risk, high-return financial derivative product, and all
                losses are attributed to the trader.
              </p>
              <p className="mb-3 text-sm leading-relaxed">
                Risk Disclaimer: Solomon Partners (WEE TOO_We are Investors) is
                not responsible for any loss or damage caused by reliance on the
                information contained in this website, including market news,
                analysis, trading signals and Forex broker reviews. The data
                contained in this website is not necessarily real-time or
                accurate and the analysis is the opinion of the author and does
                not represent a recommendation by Solomon Partners (WEE TOO_We
                are Investors) or its staff.
              </p>
              <p className="text-sm leading-relaxed">
                Trading currency on margin carries a high level of risk and is
                not suitable for all investors. Leveraged products can result in
                losses exceeding the initial deposit and your capital is at
                risk. Before deciding to trade Forex or any other financial
                product, you should carefully consider your investment
                objectives, level of experience and risk appetite. We work hard
                to provide valuable information on all the brokers we review. In
                order to provide this free service, we receive advertising fees
                from overseas brokers, including some of those listed on this
                page and in our rankings. While we do our best to ensure that
                all data is up to date, we recommend that you verify the
                information directly with the overseas broker.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-border/50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex justify-center">
            <p className="text-sm text-muted-foreground text-center">
              © {new Date().getFullYear()} Solomon Partners (WEE TOO_We are
              investors). All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

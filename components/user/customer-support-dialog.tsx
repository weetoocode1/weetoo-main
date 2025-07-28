import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Link from "next/link";
import { Icons } from "../icons";

export function CustomerSupportDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-lg">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-2">
                  <Icons.customerSupport className="w-4 h-4 text-muted-foreground" />
                  <span className="whitespace-nowrap sr-only">
                    Customer Support
                  </span>
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom">Customer Support</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold mb-2 flex items-center gap-2">
            <Icons.customerSupport className="w-5 h-5 text-muted-foreground" />
            Customer Support
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {/* KakaoTalk Option */}
          <Link
            href="https://pf.kakao.com/_sUKMn"
            className="flex items-center gap-4 p-4 rounded-lg border hover:bg-yellow-50 dark:hover:bg-yellow-100/10 transition-colors group"
            target="_blank"
          >
            <span
              className="inline-flex items-center justify-center w-10 h-10 rounded-full"
              style={{ background: "#FFCD00" }}
            >
              {/* KakaoTalk SVG */}
              <svg
                role="img"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                className="w-7 h-7"
              >
                <title>KakaoTalk</title>
                <path d="M22.125 0H1.875C.8394 0 0 .8394 0 1.875v20.25C0 23.1606.8394 24 1.875 24h20.25C23.1606 24 24 23.1606 24 22.125V1.875C24 .8394 23.1606 0 22.125 0zM12 18.75c-.591 0-1.1697-.0413-1.7317-.1209-.5626.3965-3.813 2.6797-4.1198 2.7225 0 0-.1258.0489-.2328-.0141s-.0876-.2282-.0876-.2282c.0322-.2198.8426-3.0183.992-3.5333-2.7452-1.36-4.5701-3.7686-4.5701-6.5135C2.25 6.8168 6.6152 3.375 12 3.375s9.75 3.4418 9.75 7.6875c0 4.2457-4.3652 7.6875-9.75 7.6875zM8.0496 9.8672h-.8777v3.3417c0 .2963-.2523.5372-.5625.5372s-.5625-.2409-.5625-.5372V9.8672h-.8777c-.3044 0-.552-.2471-.552-.5508s.2477-.5508.552-.5508h2.8804c.3044 0 .552.2471.552.5508s-.2477.5508-.552.5508zm10.9879 2.9566a.558.558 0 0 1 .108.4167.5588.5588 0 0 1-.2183.371.5572.5572 0 0 1-.3383.1135.558.558 0 0 1-.4493-.2236l-1.3192-1.7479-.1952.1952v1.2273a.5635.5635 0 0 1-.5627.5628.563.563 0 0 1-.5625-.5625V9.3281c0-.3102.2523-.5625.5625-.5625s.5625.2523.5625.5625v1.209l1.5694-1.5694c.0807-.0807.1916-.1252.312-.1252.1404 0 .2814.0606.3871.1661.0985.0984.1573.2251.1654.3566.0082.1327-.036.2542-.1241.3425l-1.2818 1.2817 1.3845 1.8344zm-8.3502-3.5023c-.095-.2699-.3829-.5475-.7503-.5557-.3663.0083-.6542.2858-.749.5551l-1.3455 3.5415c-.1708.5305-.0217.7272.1333.7988a.8568.8568 0 0 0 .3576.0776c.2346 0 .4139-.0952.4678-.2481l.2787-.7297 1.7152.0001.2785.7292c.0541.1532.2335.2484.4681.2484a.8601.8601 0 0 0 .3576-.0775c.1551-.0713.3041-.2681.1329-.7999l-1.3449-3.5398zm-1.3116 2.4433l.5618-1.5961.5618 1.5961H9.3757zm5.9056 1.3836c0 .2843-.2418.5156-.5391.5156h-1.8047c-.2973 0-.5391-.2314-.5391-.5156V9.3281c0-.3102.2576-.5625.5742-.5625s.5742.2523.5742.5625v3.3047h1.1953c.2974 0 .5392.2314.5392.5156z" />
              </svg>
            </span>
            <div className="flex-1">
              <div className="font-semibold text-base">
                KakaoTalk 1:1 Consultation
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-300">
                Click to Go
              </div>
              <div className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                Deposit/Withdrawal <span className="mx-1">|</span> Inconvenience{" "}
                <span className="mx-1">|</span> Related Inquiries
              </div>
            </div>
          </Link>

          {/* Telegram Option */}
          <Link
            href="https://t.me/weetoo_kor"
            className="flex items-center gap-4 p-4 rounded-lg border hover:bg-blue-50 dark:hover:bg-blue-100/10 transition-colors group"
            target="_blank"
          >
            <span
              className="inline-flex items-center justify-center w-10 h-10 rounded-full"
              style={{ background: "#26A5E4" }}
            >
              {/* Telegram SVG */}
              <svg
                role="img"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                className="w-7 h-7"
              >
                <title>Telegram</title>
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
            </span>
            <div className="flex-1">
              <div className="font-semibold text-base">
                Telegram 1:1 Consultation
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-300">
                Click to Go
              </div>
              <div className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                Deposit/Withdrawal <span className="mx-1">|</span> Inconvenience
                <span className="mx-1">|</span> Related Inquiries
              </div>
            </div>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowLeftIcon, ArrowRightIcon, BookIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export function GuideBook() {
  const [step, setStep] = useState(1);
  const tg = useTranslations("guidebook.steps");
  const tu = useTranslations("guidebook.ui");

  const steps = [
    {
      title: tg("download.title"),
      description: tg("download.description"),
      body: (
        <div className="space-y-3">
          <ol className="list-decimal pl-5 space-y-2">
            <li>
              {tg("download.line1")}
              <br />
              <Link
                href="https://obsproject.com/download"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline underline-offset-4"
              >
                {tg("download.downloadUrlLabel")}
              </Link>
            </li>
            <li>{tg("download.line2")}</li>
            <li>{tg("download.line3")}</li>
          </ol>
        </div>
      ),
    },

    {
      title: tg("copyCreds.title"),
      description: tg("copyCreds.description"),
      body: (
        <div className="space-y-4">
          <ol className="list-decimal pl-5 space-y-2">
            <li>{tg("copyCreds.bullets.openSettings")}</li>
            <li>{tg("copyCreds.bullets.copyKey")}</li>
            <li>{tg("copyCreds.bullets.copyUrl")}</li>
          </ol>
          <div className="rounded-md border border-border bg-muted/5 p-2">
            <Image
              src="/guidebook/dashboard.png"
              alt={tg("copyCreds.screenshotAlt")}
              width={1024}
              height={480}
              className="w-full h-auto rounded-sm object-contain"
              priority
            />
          </div>
        </div>
      ),
    },
    {
      title: tg("configure.title"),
      description: tg("configure.description"),
      body: (
        <div className="space-y-4">
          <ol className="list-decimal pl-5 space-y-2">
            <li>{tg("configure.bullets.openSettingsStream")}</li>
            <li>{tg("configure.bullets.serviceMux")}</li>
            <li>{tg("configure.bullets.serverGlobal")}</li>
            <li>{tg("configure.bullets.pasteKey")}</li>
            <li>{tg("configure.bullets.applyOk")}</li>
          </ol>
          <div className="rounded-md">
            <Image
              src="/guidebook/obs.png"
              alt={tg("configure.screenshotAlt")}
              width={1100}
              height={560}
              className="w-full h-auto rounded-sm object-contain"
            />
          </div>
        </div>
      ),
    },
    {
      title: tg("output.title"),
      description: tg("output.description"),
      body: (
        <div className="space-y-4">
          <ol className="list-decimal pl-5 space-y-2">
            <li>
              {tg("output.openOutput")}
              <ul className="list-disc pl-5 mt-1 space-y-1">
                <li>{tg("output.bullets.encoder")}</li>
                <li>{tg("output.bullets.bitrate")}</li>
                <li>{tg("output.bullets.keyframe")}</li>
                <li>{tg("output.bullets.audioBitrate")}</li>
              </ul>
            </li>
          </ol>
          <div className="rounded-md border border-border bg-muted/5 p-2">
            <Image
              src="/guidebook/settings.png"
              alt={tg("output.screenshotAlt")}
              width={1100}
              height={760}
              className="w-full h-auto rounded-sm max-h-[420px] object-contain"
            />
          </div>
        </div>
      ),
    },
    {
      title: tg("scene.title"),
      description: tg("scene.description"),
      body: (
        <div className="space-y-4">
          <ol className="list-decimal pl-5 space-y-2">
            <li>{tg("scene.bullets.addScene")}</li>
            <li>{tg("scene.bullets.addSourceWindow")}</li>
            <li>{tg("scene.bullets.chooseWindow")}</li>
          </ol>
          <div className="rounded-md border border-border bg-muted/5 p-2">
            <Image
              src="/guidebook/scenes.png"
              alt={tg("scene.screenshotAlt")}
              width={800}
              height={360}
              className="w-full h-auto rounded-sm max-h-[320px] object-contain"
            />
          </div>
        </div>
      ),
    },
    {
      title: tg("live.title"),
      description: tg("live.description"),
      body: (
        <div className="space-y-3">
          <ol className="list-decimal pl-5 space-y-1">
            <li>{tg("live.bullets.ensureScenes")}</li>
            <li>{tg("live.bullets.pressStart")}</li>
            <li>{tg("live.bullets.checkDashboard")}</li>
          </ol>
          <div className="rounded-md border border-border bg-muted/5 p-2">
            <Image
              src="/guidebook/live.png"
              alt={tg("live.screenshotAlt")}
              width={700}
              height={320}
              className="w-full h-auto rounded-sm max-h-[260px] object-contain"
            />
          </div>
        </div>
      ),
    },
    {
      title: tg("youtube.title"),
      description: tg("youtube.description"),
      body: (
        <div className="space-y-3">
          <Link
            href="https://www.youtube.com/watch?v=DTk99mHDX_I"
            target="_blank"
            rel="noreferrer"
            className="block"
          >
            <div className="relative">
              <Image
                src="/guidebook/thumbnail.jpg"
                alt={tg("youtube.thumbnailAlt")}
                width={1280}
                height={720}
                className="w-full h-auto rounded-md object-contain max-h-[360px]"
                priority
              />
              <div className="absolute inset-0 grid place-items-center">
                <div className="rounded-full bg-black/60 text-white px-4 py-2 text-sm font-medium">
                  {tg("youtube.overlay")}
                </div>
              </div>
            </div>
          </Link>
        </div>
      ),
    },
  ];

  const total = steps.length;

  return (
    <Dialog
      onOpenChange={(open) => {
        if (open) setStep(1);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" title={tu("triggerTitle")}>
          <BookIcon className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[760px] p-0 overflow-hidden max-h-[85vh] flex flex-col">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
          <div className="px-6 pt-5 pb-3">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                {tu("stepOfTotal", { step, total })}
              </div>
              <div className="flex items-center gap-1.5">
                {Array.from({ length: total }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 w-1.5 rounded-full ${
                      i + 1 === step ? "bg-primary" : "bg-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>
            </div>
            <DialogHeader className="p-0 mt-2">
              <DialogTitle className="text-xl">
                {step}. {steps[step - 1].title}
              </DialogTitle>
              <DialogDescription className="text-sm">
                {steps[step - 1].description}
              </DialogDescription>
            </DialogHeader>
          </div>
        </div>

        <div className="px-6 pb-4 flex-1 overflow-auto min-h-0">
          <div className="rounded-md bg-muted/10 p-4 text-sm leading-relaxed">
            {steps[step - 1].body}
          </div>
        </div>

        <div className="px-6 py-3 border-t border-border flex items-center justify-between bg-background/90 backdrop-blur sticky bottom-0 z-10">
          <div />
          <DialogFooter className="m-0 p-0">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                disabled={step === 1}
                onClick={() => setStep((s) => Math.max(1, s - 1))}
              >
                <ArrowLeftIcon className="h-4 w-4 mr-1" />
                {tu("previous")}
              </Button>
              {step < total ? (
                <Button
                  type="button"
                  onClick={() => setStep((s) => Math.min(total, s + 1))}
                >
                  {tu("next")}
                  <ArrowRightIcon className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <DialogClose asChild>
                  <Button type="button">{tu("done")}</Button>
                </DialogClose>
              )}
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

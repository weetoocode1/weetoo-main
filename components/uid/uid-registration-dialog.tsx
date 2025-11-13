"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Resolver, useForm } from "react-hook-form";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Separator } from "../ui/separator";

// Broker data with logos
const BROKERS = [
  {
    id: "deepcoin",
    name: "DeepCoin",
    paybackRate: 55,
    status: "active",
    logo: "/broker/deepcoin.png",
  },
  {
    id: "bingx",
    name: "BingX",
    paybackRate: 60,
    status: "active",
    logo: "/broker/bingx.png",
  },
  {
    id: "orangex",
    name: "OrangeX",
    paybackRate: 50,
    status: "active",
    logo: "/broker/orangex.webp",
  },
  {
    id: "lbank",
    name: "LBank",
    paybackRate: 50,
    status: "active",
    logo: "/broker/Lbank.png",
  },
];

const createUidFormSchema = (t: (key: string) => string) =>
  z
    .object({
      brokerId: z.string().min(1, t("dialog.validation.selectBroker")),
      uid: z.string().min(1, t("dialog.validation.uidRequired")),
    })
    .superRefine((val, ctx) => {
      const { brokerId, uid } = val;
      if (brokerId === "lbank") {
        // LBank openId: allow 1-64 length, alphanumeric plus _ and -
        if (!/^[A-Za-z0-9_-]{1,64}$/.test(uid)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["uid"],
            message: t("dialog.validation.lbankOpenId"),
          });
        }
        return;
      }

      // Default (DeepCoin/OrangeX/BingX): numeric-only 3-20 and not all same digit
      if (uid.length < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["uid"],
          message: t("dialog.validation.uidMin3"),
        });
      }
      if (uid.length > 20) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["uid"],
          message: t("dialog.validation.uidMax20"),
        });
      }
      if (!/^\d+$/.test(uid)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["uid"],
          message: t("dialog.validation.uidDigitsOnly"),
        });
      }
      if (/^(\d)\1+$/.test(uid)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["uid"],
          message: t("dialog.validation.uidNoSameDigits"),
        });
      }
    });

type UidFormData = {
  brokerId: string;
  uid: string;
};

interface UidRegistrationDialogProps {
  title: string;
  trigger: React.ReactNode;
  onUIDAdded: (uid: string, brokerId: string) => Promise<void>;
  editingRecord?: {
    id: string;
    brokerId: string;
    uid: string;
  } | null;
  onUIDUpdated?: (id: string, uid: string, brokerId: string) => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultBrokerId?: string; // Optional: preselect broker when opening (non-breaking)
}

export function UidRegistrationDialog({
  title,
  trigger,
  onUIDAdded,
  editingRecord,
  onUIDUpdated,
  isOpen,
  onOpenChange,
  defaultBrokerId,
}: UidRegistrationDialogProps) {
  const t = useTranslations("profile.uidRegistration");
  const [internalIsOpen, setInternalIsOpen] = useState(false);

  // Use external state if provided, otherwise use internal state
  const dialogIsOpen = isOpen !== undefined ? isOpen : internalIsOpen;
  const setDialogIsOpen = onOpenChange || setInternalIsOpen;

  const uidFormSchema = useMemo(() => createUidFormSchema(t), [t]);
  const form = useForm<UidFormData>({
    resolver: zodResolver(uidFormSchema) as unknown as Resolver<UidFormData>,
    defaultValues: { brokerId: "", uid: "" },
  });

  const onSubmit = async (data: UidFormData) => {
    if (editingRecord && onUIDUpdated) {
      onUIDUpdated(editingRecord.id, data.uid, data.brokerId);
      form.reset();
      setDialogIsOpen(false);
      return;
    }

    form.reset();
    setDialogIsOpen(false);

    onUIDAdded(data.uid, data.brokerId).catch((error) => {
      console.error("Error adding UID:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to add UID"
      );
    });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
    }
    setDialogIsOpen(open);
  };

  // Set form values when editing (react-safe)
  useEffect(() => {
    if (editingRecord && dialogIsOpen) {
      form.reset({ brokerId: editingRecord.brokerId, uid: editingRecord.uid });
    }
  }, [
    editingRecord?.id,
    editingRecord?.brokerId,
    editingRecord?.uid,
    dialogIsOpen,
  ]);

  // Preselect default broker when opening (only if not editing)
  useEffect(() => {
    if (dialogIsOpen && defaultBrokerId && !editingRecord) {
      form.setValue("brokerId", defaultBrokerId);
    }
  }, [dialogIsOpen, defaultBrokerId, editingRecord, form]);

  return (
    <Dialog open={dialogIsOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="rounded-none">
        <DialogHeader className="gap-0">
          <DialogTitle>
            {editingRecord ? t("dialog.editTitle") : title}
          </DialogTitle>
          <DialogDescription>
            {editingRecord
              ? t("dialog.descriptionEdit")
              : t("dialog.descriptionAdd")}
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="broker">{t("dialog.labels.broker")}</Label>
            <Select
              value={form.watch("brokerId")}
              onValueChange={(value) => form.setValue("brokerId", value)}
            >
              <SelectTrigger id="broker" className="h-10 rounded-none">
                <SelectValue
                  placeholder={t("dialog.placeholders.selectBroker")}
                />
              </SelectTrigger>
              <SelectContent className="rounded-none">
                {BROKERS.map((broker) => (
                  <SelectItem
                    key={broker.id}
                    value={broker.id}
                    disabled={broker.status === "coming-soon"}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="w-6 h-6 relative flex-shrink-0">
                        <Image
                          src={broker.logo}
                          alt={`${broker.name} logo`}
                          width={24}
                          height={24}
                          className="object-contain"
                        />
                      </div>
                      <div className="flex items-center flex-1">
                        <span>{broker.name}</span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="uid">{t("dialog.labels.uid")}</Label>
            <Input
              id="uid"
              placeholder={t("dialog.placeholders.enterUid")}
              className="h-10 rounded-none"
              {...form.register("uid")}
            />
            {form.formState.errors.uid && (
              <div className="text-xs text-destructive">
                {form.formState.errors.uid.message}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2 justify-end">
            <Button type="submit" className="rounded-none">
              {editingRecord
                ? t("dialog.buttons.update")
                : t("dialog.buttons.addUid")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="rounded-none"
            >
              {t("dialog.buttons.cancel")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

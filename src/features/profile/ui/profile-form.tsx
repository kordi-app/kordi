"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { HTTPError } from "ky";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { updateProfile } from "../api/update-profile";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { nicknameSchema, type NicknameFormValues } from "../model/schema";
import { useNicknameCheck } from "../lib/use-nickname-check";

interface ProfileFormProps {
  currentNickname: string;
}

export function ProfileForm({ currentNickname }: ProfileFormProps) {
  const t = useTranslations("me");
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  /** the nickname as last saved (the prop only updates when the page re-renders) */
  const [savedNickname, setSavedNickname] = useState(currentNickname);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<NicknameFormValues>({
    resolver: zodResolver(nicknameSchema),
    defaultValues: { nickname: savedNickname },
  });

  const nickname = useWatch({ control, name: "nickname" });
  const duplicateStatus = useNicknameCheck(nickname, savedNickname);
  const { mutate, isPending } = useMutation({
    mutationFn: updateProfile,
    onSuccess: (user) => {
      setSavedNickname(user.nickname);
      reset({ nickname: user.nickname });
      setIsEditing(false);
      queryClient.setQueryData(["user", "me"], user);
      toast.success(t("saveSuccess"));
      router.refresh(); // server-rendered places (sidebar, other pages) pick up the new name
    },
    onError: (error) => {
      // 409: someone took the name between the check and the save
      const taken = error instanceof HTTPError && error.response.status === 409;
      toast.error(t(taken ? "nicknameDuplicated" : "saveError"));
    },
  });

  // Only a nickname the server just confirmed as free can be saved — this also
  // covers the debounce gap, before the check has even started
  const canSave = duplicateStatus === "available" && !isPending && nickname !== savedNickname;

  const onSubmit = (data: NicknameFormValues) => {
    if (!canSave) return;
    mutate(data.nickname);
  };

  const onDiscard = () => {
    reset({ nickname: savedNickname });
    setIsEditing(false);
  };

  const errorKey = errors.nickname?.message;

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-primary">
        {t("displayName")}
      </p>

      {!isEditing ? (
        <div className="flex items-center gap-3">
          <div className="glass flex-1 rounded-xl px-4 py-3">
            <span className="text-sm text-foreground">{savedNickname}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 text-primary border-primary/30 hover:bg-primary/10"
            onClick={() => setIsEditing(true)}
          >
            {t("edit")}
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="mb-3">
            <Input
              {...register("nickname")}
              placeholder={t("nicknamePlaceholder")}
              aria-invalid={!!errors.nickname}
              autoFocus
            />
            {errorKey && (
              <p className="mt-1 text-xs text-destructive">{t(errorKey)}</p>
            )}
            {duplicateStatus === "checking" && (
              <p className="mt-1 text-xs text-muted-foreground">...</p>
            )}
            {duplicateStatus === "available" && (
              <p className="mt-1 text-xs text-success">
                {t("nicknameAvailable")}
              </p>
            )}
            {duplicateStatus === "duplicated" && (
              <p className="mt-1 text-xs text-destructive">
                {t("nicknameDuplicated")}
              </p>
            )}
          </div>
          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDiscard}
              className="text-muted-foreground"
            >
              {t("discard")}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!canSave}
            >
              {isPending ? "..." : t("save")}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

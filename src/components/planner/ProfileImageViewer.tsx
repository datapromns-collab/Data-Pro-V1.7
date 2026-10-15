"use client";

import { useState } from 'react';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { User as UserIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type ProfileImageViewerProps = {
  imageUrl?: string;
  name: string;
  avatarClassName?: string;
  fallbackClassName?: string;
  fallbackIconClassName?: string;
};

export function ProfileImageViewer({
  imageUrl,
  name,
  avatarClassName,
  fallbackClassName,
  fallbackIconClassName,
}: ProfileImageViewerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const avatar = (
    <Avatar className={cn('shrink-0 rounded-full border border-slate-200', avatarClassName)}>
      <AvatarImage src={imageUrl} alt={`Foto de ${name}`} className="object-cover" />
      <AvatarFallback className={fallbackClassName}>
        <UserIcon className={cn('h-4 w-4 text-slate-400', fallbackIconClassName)} />
      </AvatarFallback>
    </Avatar>
  );

  if (!imageUrl) return avatar;

  return (
    <>
      <button
        type="button"
        aria-label={`Ver foto de ${name} en tamaño grande`}
        onClick={() => setIsOpen(true)}
        className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        {avatar}
      </button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-h-[90vh] w-[min(92vw,48rem)] max-w-none border-0 bg-slate-950 p-3 text-white sm:rounded-2xl">
          <DialogHeader className="pr-8 text-left">
            <DialogTitle>{name}</DialogTitle>
            <DialogDescription className="text-slate-300">
              Foto de perfil · solo visualización
            </DialogDescription>
          </DialogHeader>
          <div className="relative flex max-h-[72vh] min-h-48 w-full items-center justify-center overflow-hidden rounded-xl bg-black/40">
            <Image
              src={imageUrl}
              alt={`Foto de perfil de ${name}`}
              width={1024}
              height={1024}
              unoptimized
              className="max-h-[72vh] w-full object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

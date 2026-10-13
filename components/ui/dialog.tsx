"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        // max-h + overflow-y-auto keep tall dialogs inside the viewport. Without
        // them a dialog renders at its natural height while positioned `fixed`
        // — the New Revenue form measured 1076px — so its buttons sat past the
        // fold with no way to scroll to them. These sit before `className` so a
        // call site can still override them — the correct default ordering,
        // since tailwind-merge only honours a later override. CommandDialog
        // (components/ui/command.tsx), currently unused anywhere in the app,
        // is the case that would depend on this: it passes `overflow-hidden`
        // and would need that to keep winning if it were ever wired up.
        // No `sm:max-w-sm` here: tailwind-merge kept it alongside a call site's
        // `max-w-lg` (different modifier groups, no conflict) and it won in the
        // compiled CSS, so every dialog rendered 384px regardless of what its
        // call site asked for. Width is now the call site's decision.
        //
        // The small-screen inset is `w-[calc(100%-2rem)]`, not the earlier
        // `w-full max-w-[calc(100%-2rem)]`. That max-w shared a tailwind-merge
        // group with every call site's own max-w-*, so twMerge dropped it at all
        // 13 and dialogs ran edge-to-edge on a phone — measured at exactly 400px
        // in a 400px viewport. As a width it lands in a different group, so both
        // survive and the result is min(100% - 2rem, whatever the call site set).
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid w-[calc(100%-2rem)] max-h-[calc(100vh-4rem)] overflow-y-auto -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-popover p-4 text-sm text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className
        )}
        // Radix defaults aria-describedby to a generated id and only drops it
        // when a DialogDescription actually renders. None of these dialogs has
        // one, so every dialog shipped an aria-describedby pointing at an
        // element that does not exist — a broken reference for a screen reader,
        // and what Radix's warning was actually reporting. These are titled
        // forms where a description would restate the title, so the primitive
        // declares that there is no description: Radix's documented opt-out,
        // and the exact fix its own warning text suggests. Before the spread,
        // so a call site can still supply a real description id.
        //
        // A call site rendering a real DialogDescription must pair it with a
        // matching explicit aria-describedby/id, since this line otherwise
        // overrides Radix's auto-wired id back to undefined.
        aria-describedby={undefined}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close data-slot="dialog-close" asChild>
            <Button
              variant="ghost"
              className="absolute top-2 right-2"
              size="icon-sm"
            >
              <XIcon
              />
              <span className="sr-only">Close</span>
            </Button>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="outline">Close</Button>
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "font-heading text-base leading-none font-medium",
        className
      )}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}

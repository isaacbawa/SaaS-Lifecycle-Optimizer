'use client';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title?: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'default' | 'destructive';
    onConfirm: () => void | Promise<void>;
}

/**
 * Reusable confirmation dialog, primarily used for delete confirmations.
 *
 * Usage:
 * ```tsx
 * <ConfirmDialog
 *   open={deleteOpen}
 *   onOpenChange={setDeleteOpen}
 *   title="Delete segment?"
 *   description="This action cannot be undone."
 *   onConfirm={() => deleteSegment(id)}
 * />
 * ```
 */
export function ConfirmDialog({
    open,
    onOpenChange,
    title = 'Are you sure?',
    description = 'This action cannot be undone.',
    confirmLabel = 'Delete',
    cancelLabel = 'Cancel',
    variant = 'destructive',
    onConfirm,
}: ConfirmDialogProps) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
                    <AlertDialogAction
                        className={
                            variant === 'destructive'
                                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                                : undefined
                        }
                        onClick={async () => {
                            await onConfirm();
                            onOpenChange(false);
                        }}
                    >
                        {confirmLabel}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

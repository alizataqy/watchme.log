import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from 'lucide-react';
import { useShowContext } from '@/contexts/ShowContext';

interface ReviewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    showId: number;
    showName: string;
    seasonNumber?: number;
    initialRating?: number;
    initialNotes?: string;
    source?: string;
}

export function ReviewDialog({
    open,
    onOpenChange,
    showId,
    showName,
    seasonNumber,
    initialRating = 0,
    initialNotes = '',
    source = 'tvmaze'
}: ReviewDialogProps) {
    const [rating, setRating] = useState(initialRating);
    const [notes, setNotes] = useState(initialNotes);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { updateShowReview, saveSeasonReview } = useShowContext();

    useEffect(() => {
        if (open) {
            setRating(initialRating);
            setNotes(initialNotes);
        }
    }, [open, initialRating, initialNotes]);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            if (seasonNumber !== undefined) {
                await saveSeasonReview(showId, seasonNumber, rating, notes, source);
            } else {
                await updateShowReview(showId, rating, notes, source);
            }
            onOpenChange(false);
        } catch (error) {
            console.error('Failed to save review:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>
                        {seasonNumber !== undefined ? `Review Season ${seasonNumber}` : 'Review Film/Series'}
                    </DialogTitle>
                    <DialogDescription>
                        {showName}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="flex justify-center gap-2 mb-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                            <button
                                key={star}
                                onClick={() => setRating(star)}
                                className={`transition-all hover:scale-110 ${star <= rating ? 'text-yellow-500' : 'text-muted-foreground'}`}
                            >
                                <Star className={`h-6 w-6 ${star <= rating ? 'fill-yellow-500' : ''}`} />
                            </button>
                        ))}
                    </div>
                    <div className="text-center text-sm font-medium mb-2">
                        Rating: {rating}/10
                    </div>
                    <Textarea
                        placeholder="Tulis pendapatmu di sini..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="min-h-[100px]"
                    />
                </div>
                <DialogFooter>
                    <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        Batal
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? 'Menyimpan...' : 'Simpan Review'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { Search, Clock, Eye, Calendar, BadgeInfo } from "lucide-react";

interface OnboardingProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const Onboarding = ({ open, onOpenChange }: OnboardingProps) => {
    const { t } = useLanguage();
    const { updateProfile } = useAuth();
    const [step, setStep] = useState(0);

    const steps = [
        {
            title: t('onboarding.welcome'),
            description: t('onboarding.welcomeDesc'),
            icon: <BadgeInfo className="h-7 w-7 text-primary" />,
        },
        {
            title: t('onboarding.step1.title'),
            description: t('onboarding.step1.desc'),
            icon: <Search className="h-7 w-7 text-blue-500" />,
        },
        {
            title: t('onboarding.step2.title'),
            description: t('onboarding.step2.desc'),
            icon: <Clock className="h-7 w-7 text-orange-500" />,
        },
        {
            title: t('onboarding.step4.title'),
            description: t('onboarding.step4.desc'),
            icon: <Calendar className="h-7 w-7 text-purple-500" />,
        },
        {
            title: t('onboarding.step3.title'),
            description: t('onboarding.step3.desc'),
            icon: <Eye className="h-7 w-7 text-green-500" />,
        },
    ];

    const handleNext = () => {
        if (step < steps.length - 1) {
            setStep(step + 1);
        } else {
            handleComplete();
        }
    };

    const handleComplete = async () => {
        await updateProfile({ has_onboarded: true });
        // Also save to localStorage as a fallback
        localStorage.setItem('has_onboarded', 'true');
        onOpenChange(false);
    };

    const currentStep = steps[step];

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (!val) handleComplete();
        }}>
            <DialogContent className="sm:max-w-lg max-w-xs rounded-lg">
                <DialogHeader className="items-center text-center">
                    <div className="mt-4 p-3 bg-primary/10 rounded-full animate-bounce duration-1000">
                        {currentStep.icon}
                    </div>
                    <DialogTitle className="text-xl font-bold">{currentStep.title}</DialogTitle>
                    <DialogDescription className="text-base pt-2 text-wrap">
                        {currentStep.description}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex justify-center gap-1.5 py-4">
                    {steps.map((_, i) => (
                        <div
                            key={i}
                            className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-6 bg-primary' : 'w-1.5 bg-border'
                                }`}
                        />
                    ))}
                </div>

                <DialogFooter className="flex-row gap-2 sm:justify-center">
                    {step === 0 ? (
                        <Button variant="destructive" className="flex-1" onClick={handleComplete}>
                            {t('onboarding.skip')}
                        </Button>
                    ) : (
                        <Button variant="outline" className="flex-1" onClick={() => setStep(step - 1)}>
                            {t('common.back')}
                        </Button>
                    )}
                    {step !== steps.length - 1 && (
                        <Button variant='default' className="flex-1" onClick={handleNext}>
                            {t('onboarding.next')}
                        </Button>
                    )}
                    {step == steps.length - 1 && (
                        <Button variant='success' className="flex-1" onClick={handleComplete}>
                            {t('onboarding.finish')}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

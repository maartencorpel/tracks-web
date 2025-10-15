"use client"

import { Progress } from "@/components/ui/progress"

interface ProgressStepsProps {
  currentStep: number
  totalSteps: number
  stepLabels: string[]
}

export function ProgressSteps({ currentStep, totalSteps, stepLabels }: ProgressStepsProps) {
  const progress = (currentStep / totalSteps) * 100

  return (
    <div className="w-full space-y-4">
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>Step {currentStep} of {totalSteps}</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <Progress value={progress} className="w-full" />
      <div className="text-center">
        <p className="text-sm font-medium">{stepLabels[currentStep - 1] || "Processing..."}</p>
      </div>
    </div>
  )
}
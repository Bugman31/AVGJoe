import React, { createContext, useContext, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { OnboardingData } from '@/types';

const STORAGE_KEY = 'onboarding_partial';

const defaultData: OnboardingData = {
  primaryGoal: '',
  secondaryGoals: [],
  experienceLevel: '',
  daysPerWeek: 3,
  sessionDurationMins: 60,
  preferredSplit: '',
  availableEquipment: [],
  restrictions: [],
  injuryFlags: [],
  workoutEnvironment: 'commercial_gym',
  priorityAreas: [],
  programStyle: 'structured',
  unitSystem: 'lbs',
};

interface OnboardingContextValue {
  data: OnboardingData;
  currentStep: number;
  totalSteps: number;
  setField: <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => void;
  goToStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  savePartial: () => Promise<void>;
  loadPartial: () => Promise<void>;
  clearPartial: () => Promise<void>;
}

const TOTAL_STEPS = 12;

const OnboardingContext = createContext<OnboardingContextValue>({
  data: defaultData,
  currentStep: 1,
  totalSteps: TOTAL_STEPS,
  setField: () => {},
  goToStep: () => {},
  nextStep: () => {},
  prevStep: () => {},
  savePartial: async () => {},
  loadPartial: async () => {},
  clearPartial: async () => {},
});

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<OnboardingData>(defaultData);
  const [currentStep, setCurrentStep] = useState(1);

  const setField = useCallback(<K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const goToStep = useCallback((step: number) => {
    setCurrentStep(Math.max(1, Math.min(step, TOTAL_STEPS)));
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep((s) => Math.max(s - 1, 1));
  }, []);

  const savePartial = useCallback(async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ data, currentStep }));
    } catch {}
  }, [data, currentStep]);

  const loadPartial = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.data) setData({ ...defaultData, ...parsed.data });
        if (parsed.currentStep) setCurrentStep(parsed.currentStep);
      }
    } catch {}
  }, []);

  const clearPartial = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {}
    setData(defaultData);
    setCurrentStep(1);
  }, []);

  return (
    <OnboardingContext.Provider value={{ data, currentStep, totalSteps: TOTAL_STEPS, setField, goToStep, nextStep, prevStep, savePartial, loadPartial, clearPartial }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  return useContext(OnboardingContext);
}

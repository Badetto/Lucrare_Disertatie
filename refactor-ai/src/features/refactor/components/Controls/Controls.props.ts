import { AiProvider } from "../../../../types/api.types";

export interface ControlsProps {
  selectedProvider: AiProvider;
  selectedLanguage: string;
  onProviderChange: (provider: AiProvider) => void;
  onLanguageChange: (language: string) => void;
  onRefactorClick: () => void;
  isLoading: boolean;
}
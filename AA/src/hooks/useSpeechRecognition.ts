import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import type {
  SpeechRecognition,
  SpeechRecognitionEvent,
  SpeechRecognitionErrorEvent
} from '../types/speechRecognition';
import type {
  ChatInputLanguage,
  ChatInputTranslation
} from '../constants/chatInputTranslations';

type MicrophonePermissionState = 'granted' | 'denied' | 'prompt' | 'unknown';

interface UseSpeechRecognitionOptions {
  language: ChatInputLanguage;
  translations: ChatInputTranslation;
  value: string;
  onChange: (value: string) => void;
  onRequirePermissionDialog: () => void;
}

interface UseSpeechRecognitionResult {
  isListening: boolean;
  speechSupported: boolean;
  speechError: string | null;
  interimTranscript: string;
  microphonePermission: MicrophonePermissionState;
  isCheckingPermission: boolean;
  toggleSpeechRecognition: () => Promise<void>;
  clearSpeechError: () => void;
  requestMicrophoneAccess: () => Promise<boolean>;
}

const speechLanguages: Record<ChatInputLanguage, string> = {
  fr: 'fr-FR',
  en: 'en-US',
  ar: 'ar-SA'
};

export function useSpeechRecognition({
  language,
  translations: t,
  value,
  onChange,
  onRequirePermissionDialog
}: UseSpeechRecognitionOptions): UseSpeechRecognitionResult {
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [microphonePermission, setMicrophonePermission] =
    useState<MicrophonePermissionState>('unknown');
  const [isCheckingPermission, setIsCheckingPermission] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const valueRef = useRef(value);
  const speechErrorRef = useRef<string | null>(null);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const appendTranscript = useCallback(
    (transcript: string) => {
      const currentValue = valueRef.current;
      const newValue = currentValue ? `${currentValue} ${transcript}` : transcript;
      onChange(newValue);
    },
    [onChange]
  );

  const checkSpeechRecognitionSupport = useCallback((): boolean => {
    if (typeof window === 'undefined') {
      return false;
    }

    return (
      'SpeechRecognition' in window ||
      'webkitSpeechRecognition' in window
    );
  }, []);

  const checkMicrophonePermission = useCallback(async () => {
    if (typeof navigator === 'undefined') {
      return 'unknown';
    }

    try {
      if ('permissions' in navigator) {
        // PermissionName n'inclut pas "microphone" dans TypeScript, cast requis
        const result = await navigator.permissions.query({
          name: 'microphone' as PermissionName
        });
        return result.state as MicrophonePermissionState;
      }
      return 'unknown';
    } catch (error) {
      console.warn('Permission API not supported:', error);
      return 'unknown';
    }
  }, []);

  const requestMicrophoneAccess = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
      toast.error(t.browserNotSupported);
      return false;
    }

    try {
      setIsCheckingPermission(true);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setMicrophonePermission('granted');
      toast.success(t.permissionGranted);
      return true;
    } catch (error) {
      console.error('Microphone access denied:', error);
      setMicrophonePermission('denied');
      setSpeechError(t.microphonePermissionDenied);
      onRequirePermissionDialog();
      return false;
    } finally {
      setIsCheckingPermission(false);
    }
  }, [onRequirePermissionDialog, t]);

  useEffect(() => {
    speechErrorRef.current = speechError;
  }, [speechError]);

  useEffect(() => {
    if (!checkSpeechRecognitionSupport()) {
      setSpeechSupported(false);
      return;
    }

    setSpeechSupported(true);

    checkMicrophonePermission().then(permission => {
      setMicrophonePermission(permission);
    });

    try {
      const SpeechRecognitionConstructor =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (!SpeechRecognitionConstructor) {
        throw new Error('Speech recognition not available');
      }

      const recognition: SpeechRecognition = new SpeechRecognitionConstructor();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.lang = speechLanguages[language];

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
        setInterimTranscript('');
        toast.success(t.speechStarted);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interim = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interim += transcript;
          }
        }

        setInterimTranscript(interim);

        if (finalTranscript) {
          appendTranscript(finalTranscript);
          setInterimTranscript('');
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        setIsListening(false);
        setInterimTranscript('');

        let message = t.speechRecognitionError;

        switch (event.error) {
          case 'not-allowed':
            message = t.microphonePermissionDenied;
            setMicrophonePermission('denied');
            onRequirePermissionDialog();
            break;
          case 'no-speech':
            message = t.noSpeechDetected;
            break;
          case 'network':
            message = t.networkError;
            break;
          default:
            break;
        }

        setSpeechError(message);
        toast.error(message);
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
        if (!speechErrorRef.current) {
          toast.info(t.speechStopped);
        }
      };

      recognitionRef.current = recognition;
    } catch (error) {
      console.error('Error initializing speech recognition:', error);
      setSpeechSupported(false);
      toast.error(t.browserNotSupported);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          console.error('Error stopping speech recognition:', error);
        }
      }
      recognitionRef.current = null;
    };
  }, [
    appendTranscript,
    checkMicrophonePermission,
    checkSpeechRecognitionSupport,
    language,
    onRequirePermissionDialog,
    t
  ]);

  const toggleSpeechRecognition = useCallback(async () => {
    const recognition = recognitionRef.current;

    if (!speechSupported) {
      toast.error(t.speechNotSupported);
      return;
    }

    if (!recognition) {
      toast.error(t.browserNotSupported);
      return;
    }

    if (isListening) {
      try {
        recognition.stop();
      } catch (error) {
        console.error('Error stopping recognition:', error);
        setIsListening(false);
      }
      return;
    }

    if (microphonePermission === 'denied') {
      onRequirePermissionDialog();
      return;
    }

    if (microphonePermission !== 'granted') {
      const hasAccess = await requestMicrophoneAccess();
      if (!hasAccess) {
        return;
      }
    }

    try {
      recognition.lang = speechLanguages[language];
      recognition.start();
    } catch (error) {
      console.error('Error starting recognition:', error);
      toast.error(t.speechRecognitionError);
    }
  }, [
    isListening,
    language,
    microphonePermission,
    onRequirePermissionDialog,
    requestMicrophoneAccess,
    speechSupported,
    t
  ]);

  const clearSpeechError = useCallback(() => {
    setSpeechError(null);
  }, []);

  return {
    isListening,
    speechSupported,
    speechError,
    interimTranscript,
    microphonePermission,
    isCheckingPermission,
    toggleSpeechRecognition,
    clearSpeechError,
    requestMicrophoneAccess
  };
}

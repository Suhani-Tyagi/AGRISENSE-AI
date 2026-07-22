import React, { useState, useEffect } from 'react';
import { Mic, MicOff, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  placeholderText?: string;
  context: 'crop' | 'market';
}

const MOCK_PHRASES = {
  crop: [
    "My tomato leaves have dark brown spots with yellow rings on them.",
    "The wheat crop is showing yellowing of leaves and powdery white coating.",
    "My rice crop is getting grey lesions on the leaves, is it blast disease?",
    "Cotton leaves are turning red and drying up on the edges."
  ],
  market: [
    "I want to sell five hundred kilograms of organic wheat from Ludhiana.",
    "List two hundred kilograms of Grade A Tomatoes at Jaipur Mandi.",
    "Create listing for eight hundred kilograms of Cotton in Nagpur.",
    "Sell one thousand kilograms of Rice at twenty-eight rupees per kilogram."
  ]
};

export const VoiceInput: React.FC<VoiceInputProps> = ({ onTranscript, placeholderText = "Tap to speak", context }) => {
  const { i18n } = useTranslation();
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [recognitionInstance, setRecognitionInstance] = useState<any>(null);

  useEffect(() => {
    // Initialize Web Speech API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    
    // Set language based on active language toggle
    rec.lang = i18n.language === 'hi' ? 'hi-IN' : 'en-IN';

    rec.onstart = () => {
      setIsListening(true);
      setErrorMsg(null);
    };

    rec.onresult = (event: any) => {
      const resultText = event.results[0][0].transcript;
      onTranscript(resultText);
    };

    rec.onerror = (event: any) => {
      console.warn("Speech recognition error:", event.error);
      if (event.error === 'no-speech') {
        setErrorMsg("No speech detected. Please try again.");
      } else {
        setErrorMsg("Voice capture error. Falling back to typing.");
      }
      setIsListening(false);
    };

    rec.onend = () => {
      setIsListening(false);
    };

    setRecognitionInstance(rec);
  }, [i18n.language, onTranscript]);

  const toggleListening = () => {
    if (!isSupported) {
      // Fallback: run simulated mock transcript for demo/testing convenience
      setIsListening(true);
      setErrorMsg("Speech API not supported in this browser. Simulating voice input...");
      setTimeout(() => {
        const phrases = MOCK_PHRASES[context];
        const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
        onTranscript(randomPhrase);
        setIsListening(false);
        setErrorMsg(null);
      }, 2000);
      return;
    }

    if (isListening) {
      recognitionInstance.stop();
    } else {
      try {
        recognitionInstance.start();
      } catch (err) {
        // Handle instances where it is already running
        recognitionInstance.stop();
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-earth-100 dark:bg-forest-800 rounded-2xl border border-earth-200 dark:border-forest-700 w-full transition duration-150">
      {isListening ? (
        <div className="flex flex-col items-center space-y-3 py-1">
          <div className="flex items-center space-x-1.5 h-8">
            <span className="voice-bar animate-bounce" style={{ animationDelay: '0.1s' }}></span>
            <span className="voice-bar animate-bounce" style={{ animationDelay: '0.2s' }}></span>
            <span className="voice-bar animate-bounce" style={{ animationDelay: '0.3s' }}></span>
            <span className="voice-bar animate-bounce" style={{ animationDelay: '0.4s' }}></span>
            <span className="voice-bar animate-bounce" style={{ animationDelay: '0.5s' }}></span>
            <span className="voice-bar animate-bounce" style={{ animationDelay: '0.6s' }}></span>
          </div>
          <button
            type="button"
            onClick={toggleListening}
            className="flex items-center space-x-2 text-terracotta-600 hover:text-terracotta-700 focus:outline-none text-xs font-bold bg-white dark:bg-forest-750 px-3 py-1.5 rounded-full border border-terracotta-100"
          >
            <MicOff className="w-4 h-4" />
            <span>Stop Capturing</span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={toggleListening}
          aria-label="Start Voice Input"
          className="flex items-center space-x-3 text-forest-700 dark:text-forest-300 hover:text-forest-800 focus:outline-none py-2 px-4 rounded-xl hover:bg-earth-200 dark:hover:bg-forest-700 transition w-full justify-center"
        >
          <Mic className="w-6 h-6 text-forest-500 animate-bounce" />
          <span className="text-sm font-semibold">{placeholderText}</span>
        </button>
      )}

      {errorMsg && (
        <div className="flex items-center space-x-1 text-[10px] text-terracotta-600 mt-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
};

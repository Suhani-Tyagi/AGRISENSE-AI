import React, { useState } from 'react';
import { Mic } from 'lucide-react';

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
  const [showAnimation, setShowAnimation] = useState(false);

  const startListening = () => {
    setShowAnimation(true);
    
    // Simulate speech-to-text delay
    setTimeout(() => {
      const phrases = MOCK_PHRASES[context];
      const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
      onTranscript(randomPhrase);
      setShowAnimation(false);
    }, 3000);
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-earth-100 dark:bg-forest-800 rounded-2xl border border-earth-200 dark:border-forest-700 w-full">
      {showAnimation ? (
        <div className="flex flex-col items-center space-y-4 py-2">
          <div className="flex items-center space-x-1 h-8">
            <span className="voice-bar"></span>
            <span className="voice-bar"></span>
            <span className="voice-bar"></span>
            <span className="voice-bar"></span>
            <span className="voice-bar"></span>
            <span className="voice-bar"></span>
          </div>
          <span className="text-sm font-medium text-forest-600 dark:text-forest-400 animate-pulse">
            Listening / सुन रहे हैं...
          </span>
        </div>
      ) : (
        <button
          type="button"
          onClick={startListening}
          className="flex items-center space-x-3 text-forest-700 dark:text-forest-300 hover:text-forest-800 focus:outline-none py-2 px-4 rounded-xl hover:bg-earth-200 dark:hover:bg-forest-700 transition"
        >
          <Mic className="w-6 h-6 text-forest-500 animate-bounce" />
          <span className="text-sm font-semibold">{placeholderText}</span>
        </button>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { MessageSquare, X } from 'lucide-react';
import Chat from './Chat';

const ChatButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-4 right-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 ease-in-out z-50 ${
          isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'
        }`}
      >
        <MessageSquare className="h-6 w-6" />
      </button>

      {/* Chat Window */}
      {isOpen && <Chat onClose={() => setIsOpen(false)} />}
    </>
  );
};

export default ChatButton; 
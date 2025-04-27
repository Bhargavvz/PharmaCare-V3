import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, X, Minimize2, Maximize2, Plus, MessageSquare } from 'lucide-react';

type MessageSender = 'user' | 'assistant';

interface Message {
  message: string;
  sender: MessageSender;
}

interface Chat {
  id: string;
  messages: Message[];
  createdAt: string;
}

const GROQ_API_KEY = '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';

const MEDICAL_SYSTEM_PROMPT = `You are a medical assistant for PharmaCare. Your role is to provide accurate, helpful, and safe medical information. 
Please follow these guidelines:
1. Only answer medical and health-related questions
2. If asked about non-medical topics, politely decline and explain that you're a medical assistant
3. Always remind users to consult their healthcare provider for medical advice
4. Be clear about what is medical fact vs. general advice
5. Never provide diagnoses or treatment plans
6. Focus on medication information, general health advice, and wellness tips
7. If unsure about an answer, say so and suggest consulting a healthcare professional`;

const Chat: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string>('');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showChatList, setShowChatList] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chats from localStorage on component mount
  useEffect(() => {
    const savedChats = localStorage.getItem('pharmacare-chats');
    if (savedChats) {
      try {
        const parsedChats = JSON.parse(savedChats) as Chat[];
        setChats(parsedChats);
        // Set current chat to the most recent one
        if (parsedChats.length > 0) {
          setCurrentChatId(parsedChats[0].id);
        } else {
          createNewChat();
        }
      } catch (error) {
        console.error('Error parsing saved chats:', error);
        createNewChat();
      }
    } else {
      createNewChat();
    }
  }, []);

  // Save chats to localStorage whenever they change
  useEffect(() => {
    if (chats.length > 0) {
      localStorage.setItem('pharmacare-chats', JSON.stringify(chats));
    }
  }, [chats]);

  const createNewChat = () => {
    const initialMessage: Message = {
      message: "Hello! I'm your PharmaCare Medical Assistant. I can help you with medication information, general health advice, and wellness tips. Please remember that I'm not a substitute for professional medical advice. How can I help you today?",
      sender: 'assistant'
    };

    const newChat: Chat = {
      id: Date.now().toString(),
      messages: [initialMessage],
      createdAt: new Date().toISOString()
    };

    setChats(prevChats => [newChat, ...prevChats]);
    setCurrentChatId(newChat.id);
    setShowChatList(false);
  };

  const getCurrentChat = () => {
    return chats.find(chat => chat.id === currentChatId);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [getCurrentChat()?.messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // Add user message to chat
    const updatedChats = chats.map(chat => {
      if (chat.id === currentChatId) {
        return {
          ...chat,
          messages: [...chat.messages, { message: userMessage, sender: 'user' }]
        };
      }
      return chat;
    });
    setChats(updatedChats);

    try {
      const currentChat = getCurrentChat();
      if (!currentChat) return;

      // Prepare the conversation history for the API
      const conversationHistory = currentChat.messages.map(msg => ({
        role: msg.sender,
        content: msg.message
      }));

      // Add the system prompt and user's message
      const messagesForAPI = [
        { role: 'system' as const, content: MEDICAL_SYSTEM_PROMPT },
        ...conversationHistory.slice(-5), // Keep only last 5 messages for context
        { role: 'user' as const, content: userMessage }
      ];

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama3-70b-8192',
          messages: messagesForAPI,
          temperature: 0.7,
          max_tokens: 500,
          stream: false
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Groq API Error:', errorData);
        throw new Error(`Failed to get response from Groq API: ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const assistantMessage = data.choices[0].message.content;
      
      // Update chat with assistant's response
      setChats(prevChats => prevChats.map(chat => {
        if (chat.id === currentChatId) {
          return {
            ...chat,
            messages: [...chat.messages, { 
              message: assistantMessage || "I'm sorry, I couldn't process that request. Please try again.", 
              sender: 'assistant' as const 
            }]
          };
        }
        return chat;
      }));
    } catch (error) {
      console.error('Error sending message:', error);
      setChats(prevChats => prevChats.map(chat => {
        if (chat.id === currentChatId) {
          return {
            ...chat,
            messages: [...chat.messages, { 
        message: 'Sorry, I encountered an error. Please try again.', 
        sender: 'assistant' 
            }]
          };
        }
        return chat;
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const currentChat = getCurrentChat();
  if (!currentChat) return null;

  return (
    <div className={`fixed bottom-20 right-4 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col transition-all duration-300 ease-in-out z-50 ${
      isMinimized ? 'h-16' : 'h-[600px]'
    }`}>
      {/* Chat Header */}
      <div className="bg-gradient-to-r from-teal-500 to-teal-600 p-4 text-white flex justify-between items-center">
        <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setShowChatList(!showChatList)}>
          <Bot className="h-6 w-6" />
          <h2 className="text-lg font-semibold">PharmaCare Assistant</h2>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={createNewChat}
            className="p-1 hover:bg-teal-600 rounded-full transition-colors duration-200"
            title="New Chat"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-teal-600 rounded-full transition-colors duration-200"
          >
            {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-teal-600 rounded-full transition-colors duration-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Chat List Sidebar */}
          {showChatList && (
            <div className="absolute top-16 left-0 w-full bg-white border-r border-gray-200 shadow-lg z-10 max-h-[400px] overflow-y-auto">
              <div className="p-2">
                <button
                  onClick={createNewChat}
                  className="w-full flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                >
                  <Plus className="h-4 w-4" />
                  <span>New Chat</span>
                </button>
                {chats.map(chat => (
                  <button
                    key={chat.id}
                    onClick={() => {
                      setCurrentChatId(chat.id);
                      setShowChatList(false);
                    }}
                    className={`w-full flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200 ${
                      chat.id === currentChatId ? 'bg-gray-100' : ''
                    }`}
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span className="truncate text-left">
                      {chat.messages[1]?.message.slice(0, 30) || 'New Chat'}...
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {currentChat.messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl p-4 shadow-sm ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-br-none'
                      : 'bg-white text-gray-800 rounded-bl-none border border-gray-100'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    {msg.sender === 'assistant' ? (
                      <Bot className="h-5 w-5 text-teal-500 mt-1 flex-shrink-0" />
                    ) : (
                      <User className="h-5 w-5 text-white mt-1 flex-shrink-0" />
                    )}
                    <p className="text-sm leading-relaxed">{msg.message}</p>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start animate-fadeIn">
                <div className="bg-white text-gray-800 rounded-2xl p-4 rounded-bl-none max-w-[80%] shadow-sm border border-gray-100">
                  <div className="flex items-center space-x-2">
                    <Bot className="h-5 w-5 text-teal-500" />
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce delay-100" />
                      <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce delay-200" />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 p-4 bg-white">
            <div className="flex space-x-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask a medical question..."
                className="flex-1 rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl px-4 py-2 hover:from-teal-600 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-all duration-200 shadow-sm hover:shadow"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Chat; 
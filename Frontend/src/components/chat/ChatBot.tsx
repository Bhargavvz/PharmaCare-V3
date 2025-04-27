import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X } from 'lucide-react';

interface Message {
    id: string;
    text: string;
    isUser: boolean;
    timestamp: Date;
}

const ChatBot: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [sessionId, setSessionId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && !sessionId) {
            createNewSession();
        }
    }, [isOpen]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const createNewSession = async () => {
        try {
            const response = await fetch('http://localhost:8080/api/chat/session', {
                method: 'POST',
            });
            const data = await response.json();
            setSessionId(data);
        } catch (error) {
            console.error('Error creating session:', error);
        }
    };

    const sendMessage = async () => {
        if (!inputMessage.trim() || !sessionId) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            text: inputMessage,
            isUser: true,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInputMessage('');
        setIsLoading(true);

        try {
            const response = await fetch(
                `http://localhost:8080/api/chat/message?message=${encodeURIComponent(
                    inputMessage
                )}&sessionId=${sessionId}`,
                {
                    method: 'POST',
                }
            );

            const data = await response.json();
            const botMessage: Message = {
                id: Date.now().toString(),
                text: data.message,
                isUser: false,
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, botMessage]);
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <>
            {/* Chat Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-8 right-8 z-50 flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-lg hover:from-teal-600 hover:to-teal-700 transition-all duration-300 transform hover:scale-110"
            >
                {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-24 right-8 w-96 h-[600px] bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col z-50">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-teal-500 to-teal-600 p-4 text-white">
                        <h2 className="text-lg font-semibold">PharmaCare+ Assistant</h2>
                    </div>

                    {/* Messages Container */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex ${
                                    message.isUser ? 'justify-end' : 'justify-start'
                                }`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-lg p-3 ${
                                        message.isUser
                                            ? 'bg-teal-500 text-white rounded-br-none'
                                            : 'bg-gray-100 text-gray-800 rounded-bl-none'
                                    }`}
                                >
                                    <p className="text-sm">{message.text}</p>
                                    <span className="text-xs opacity-70 mt-1 block">
                                        {message.timestamp.toLocaleTimeString()}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-gray-100 text-gray-800 rounded-lg p-3 rounded-bl-none max-w-[80%]">
                                    <div className="flex space-x-2">
                                        <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" />
                                        <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce delay-100" />
                                        <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce delay-200" />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="border-t border-gray-200 p-4">
                        <div className="flex items-center space-x-2">
                            <input
                                type="text"
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Type your message..."
                                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                            <button
                                onClick={sendMessage}
                                disabled={!inputMessage.trim() || isLoading}
                                className="bg-teal-500 text-white rounded-lg p-2 hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Send size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ChatBot; 
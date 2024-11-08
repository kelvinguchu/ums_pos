"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageCircle,
  Loader2,
  Send,
  Bot,
  Sparkles,
  Trash2,
} from "lucide-react";
import { getChatResponse } from "@/lib/actions/geminiActions";
import { Badge } from "@/components/ui/badge";
import { usePathname } from "next/navigation";
import { getCurrentUser } from "@/lib/actions/supabaseActions";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import localFont from "next/font/local";

const geistMono = localFont({
  src: "../public/fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

interface Message {
  role: "user" | "assistant";
  content: string;
  isTyping?: boolean;
}

interface ChatContext {
  role: string;
  currentPage: string;
  recentActions: string[];
}

const CHAT_CACHE_KEY = "chatMessages";
const CHAT_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

interface CachedMessages {
  messages: Message[];
  timestamp: number;
}

export function AIChatAssistant() {
  const [messages, setMessages] = useState<Message[]>(() => {
    // Load and validate cached messages on initial render
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem(CHAT_CACHE_KEY);
      if (cached) {
        try {
          const parsedCache: CachedMessages = JSON.parse(cached);
          const now = Date.now();

          // Check if cache is still valid (less than 24 hours old)
          if (now - parsedCache.timestamp < CHAT_CACHE_DURATION) {
            return parsedCache.messages;
          } else {
            // Clear expired cache
            localStorage.removeItem(CHAT_CACHE_KEY);
          }
        } catch (error) {
          console.error("Error parsing cached messages:", error);
          localStorage.removeItem(CHAT_CACHE_KEY);
        }
      }
    }
    return [];
  });

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [context, setContext] = useState<ChatContext>({
    role: "",
    currentPage: "",
    recentActions: [],
  });

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();
  const { toast } = useToast();

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      const cacheData: CachedMessages = {
        messages,
        timestamp: Date.now(),
      };
      localStorage.setItem(CHAT_CACHE_KEY, JSON.stringify(cacheData));
    }
  }, [messages]);

  // Add cleanup function to clear expired messages
  useEffect(() => {
    const clearExpiredCache = () => {
      const cached = localStorage.getItem(CHAT_CACHE_KEY);
      if (cached) {
        try {
          const parsedCache: CachedMessages = JSON.parse(cached);
          const now = Date.now();
          if (now - parsedCache.timestamp >= CHAT_CACHE_DURATION) {
            localStorage.removeItem(CHAT_CACHE_KEY);
            setMessages([]); // Clear messages in state
          }
        } catch (error) {
          console.error("Error checking cache expiry:", error);
          localStorage.removeItem(CHAT_CACHE_KEY);
        }
      }
    };

    // Check for expired cache on mount
    clearExpiredCache();

    // Optional: Set up periodic checks
    const interval = setInterval(clearExpiredCache, 60 * 60 * 1000); // Check every hour

    return () => clearInterval(interval);
  }, []);

  // Auto-focus input when sheet opens
  const handleSheetOpen = (open: boolean) => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  // Improved scroll to bottom function
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Auto-scroll effect for new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Increased typing speed (changed from 30ms to 15ms)
  const typeMessage = async (content: string) => {
    let currentMessage = "";

    // Add message once with empty content
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: currentMessage,
        isTyping: true,
      },
    ]);

    // Type each character with increased speed
    for (let i = 0; i < content.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 15)); // Increased speed here

      currentMessage += content[i];

      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          role: "assistant",
          content: currentMessage,
          isTyping: i < content.length - 1,
        },
      ]);

      scrollToBottom();
    }
  };

  // Initialize context with user data and current page
  useEffect(() => {
    const initContext = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          setContext((prev) => ({
            ...prev,
            role: user.role || "user",
            currentPage: pathname,
          }));
        }
      } catch (error) {
        console.error("Error initializing context:", error);
      }
    };

    initContext();
  }, [pathname]);

  const updateRecentActions = (action: string) => {
    setContext((prev) => ({
      ...prev,
      recentActions: [action, ...(prev.recentActions || [])].slice(0, 5),
    }));
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    setIsLoading(true);
    const userMessage = input;
    setInput("");

    // Add user message
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    updateRecentActions(userMessage);
    scrollToBottom();

    try {
      let attempts = 0;
      let response;

      while (attempts < 3) {
        try {
          response = await getChatResponse(userMessage, context);
          break;
        } catch (error) {
          attempts++;
          if (attempts === 3) throw error;
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      if (response) {
        await typeMessage(response);
      } else {
        throw new Error("No response received");
      }
    } catch (error) {
      console.error("Chat error:", error);
      await typeMessage(
        "I apologize, but I encountered an error. Please try rephrasing your question or try again later."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize with welcome message
  useEffect(() => {
    const initializeChat = async () => {
      if (messages.length === 0 && context.role) {
        const welcomeMessage = "Hello! I'm your UMS Assistant. How can I help?";
        await typeMessage(welcomeMessage);
      }
    };

    initializeChat();
  }, [context.role]);

  // Add effect to focus input after each response
  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading]);

  // Add clear chat handler
  const handleClearChat = () => {
    setMessages([]);
    localStorage.removeItem(CHAT_CACHE_KEY);

    // Show success toast
    toast({
      title: "Chat Cleared",
      description: "Your chat history has been cleared successfully.",
      style: { backgroundColor: "#2ECC40", color: "white" },
      duration: 3000,
    });

    // Re-initialize welcome message
    const welcomeMessage = "Hello! I'm your UMS Assistant. How can I help?";
    typeMessage(welcomeMessage);
  };

  return (
    <Sheet onOpenChange={handleSheetOpen}>
      <SheetTrigger asChild>
        <Button
          variant='outline'
          size='icon'
          className='fixed bottom-20 right-4 h-12 w-12 rounded-full shadow-xl bg-white hover:bg-gray-100 transition-all duration-300 hover:scale-110'>
          <Sparkles className='h-6 w-6 text-[#000080]' />
        </Button>
      </SheetTrigger>
      <SheetContent
        className={`${geistMono.className} min-w-[90vw] lg:min-w-[50vw] h-[100vh] flex flex-col p-0 gap-0 bg-gradient-to-b from-white to-gray-50`}>
        <SheetHeader className='px-6 py-4 border-b'>
          <div className='flex items-center justify-between'>
            <SheetTitle className='flex items-center gap-2 text-lg'>
              <div className='p-1.5 rounded-md bg-[#000080]/10'>
                <Sparkles className='h-5 w-5 text-[#000080]' />
              </div>
              <span className='font-semibold'>UMS Assistant</span>
              <Badge
                variant='outline'
                className='bg-[#000080]/10 text-[#000080] border-none'>
                AI Powered
              </Badge>
            </SheetTitle>
            <Button
              variant='ghost'
              size='icon'
              onClick={handleClearChat}
              className='hover:bg-red-100 group'
              title='Clear chat history'>
              <Trash2 className='h-4 w-4 text-gray-500 group-hover:text-red-500 transition-colors' />
            </Button>
          </div>
          <SheetDescription>
            AI Assistant chat interface for UMS POS system
          </SheetDescription>
        </SheetHeader>

        <ScrollArea
          className='flex-1 px-6 py-4 overflow-y-auto'
          ref={scrollAreaRef}>
          <div className='space-y-4'>
            <AnimatePresence initial={false} mode='sync'>
              {messages.map((message, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={cn(
                    "flex gap-2",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}>
                  {message.role === "assistant" && (
                    <div className='w-6 h-6 rounded-full bg-[#000080]/10 flex items-center justify-center flex-shrink-0'>
                      <Sparkles className='h-3 w-3 text-[#000080]' />
                    </div>
                  )}
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-2 max-w-[80%] shadow-sm",
                      message.role === "user"
                        ? "bg-[#000080] text-white rounded-br-none"
                        : "bg-white border rounded-bl-none"
                    )}>
                    <p className='leading-relaxed'>
                      {message.content}
                      {message.isTyping && (
                        <motion.span
                          animate={{ opacity: [0, 1] }}
                          transition={{ repeat: Infinity, duration: 0.5 }}
                          className='ml-1 text-[#000080]'>
                          ▋
                        </motion.span>
                      )}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className='flex items-start gap-2'>
                <div className='w-6 h-6 rounded-full bg-[#000080]/10 flex items-center justify-center'>
                  <Sparkles className='h-3 w-3 text-[#000080]' />
                </div>
                <div className='rounded-2xl px-4 py-2 bg-white border rounded-bl-none'>
                  <motion.div
                    animate={{
                      rotate: [0, 180, 360],
                      scale: [1, 1.2, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className='flex items-center justify-center'>
                    <Sparkles className='h-5 w-5 text-[#000080]' />
                  </motion.div>
                </div>
              </motion.div>
            )}
            {/* Add an empty div at the end for scrolling reference */}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className='p-4 border-t bg-white'>
          <div className='flex items-center gap-2 max-w-3xl mx-auto'>
            <Input
              ref={inputRef} // Add ref for autofocus
              placeholder='Ask me anything...'
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) =>
                e.key === "Enter" && !isLoading && handleSend()
              }
              className='flex-1 border-gray-200 focus:ring-[#000080] focus:border-[#000080]'
              disabled={isLoading}
              autoFocus // Add autoFocus prop
            />
            <Button
              size='icon'
              onClick={handleSend}
              disabled={isLoading}
              className={cn(
                "bg-[#000080] hover:bg-[#000066] transition-all duration-300",
                isLoading && "opacity-50 cursor-not-allowed"
              )}>
              <Send className='h-4 w-4' />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Update the clear chat history function
export function clearChatHistory() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(CHAT_CACHE_KEY);
  }
}

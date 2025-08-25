"use client"

import type React from "react"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { PlusIcon, MessageSquareIcon, UserIcon, BotIcon, CheckIcon, FileTextIcon } from "lucide-react"
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ChevronDownIcon } from "lucide-react"
import { AuthStatus } from "@/components/auth-status"
import { useAuth } from "@/hooks/use-auth"

interface ChatSession {
  id: string
  title: string
  lastMessage: string
  timestamp: Date
}

const modelMapping: { [key: string]: string } = {
  "Fast": "gpt-4.1-nano",
  "Smart": "gpt-5-mini",
};

// Create a short, readable title from the user's first prompt
function generateChatTitle(prompt: string): string {
  const original = (prompt || "").trim();
  if (!original) return "New Chat";

  let text = original.replace(/[`"'\(\)\[\]{}<>_*#~:;!?.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Remove common leading filler phrases
  const leadingPatterns: RegExp[] = [
    /^(please\s+)?(help\s+me\s+)?(write|create|draft|generate|make|produce|prepare|design|build|give|provide|explain|summarize|answer)\s+(me\s+with\s+|me\s+|a\s+|an\s+)?/i,
    /^(who|what|where|when|why|how)\s+(is|are|was|were|do|does|did|to|the)\s+/i,
    /^(tell\s+me\s+about|give\s+me\s+an?\s+|show\s+me\s+|i\s+need\s+an?\s+)/i,
  ];
  for (const rx of leadingPatterns) {
    text = text.replace(rx, "").trim();
  }

  // Limit to a few words, keeping key terms
  const stop = new Set([
    "the","a","an","and","or","of","for","to","in","on","at","about","with","please"
  ]);
  const tokens = text.split(/\s+/).filter(Boolean);
  const picked: string[] = [];
  for (const token of tokens) {
    if (picked.length >= 6) break; // cap to ~6 words
    if (picked.length === 0) {
      picked.push(token);
      continue;
    }
    if (!stop.has(token.toLowerCase())) picked.push(token);
  }
  if (picked.length === 0) picked.push(tokens[0] || "Chat");

  // Title case (keep small words lower unless first)
  const small = new Set(["and","or","for","to","in","on","at","of","a","an","the","with","about"]);
  const titled = picked.map((w, i) => {
    const lower = w.toLowerCase();
    if (i > 0 && small.has(lower)) return lower;
    return w.charAt(0).toUpperCase() + w.slice(1);
  }).join(" ");

  return titled;
}

// Animate a chat title appearing one character at a time
async function animateChatTitle(
  update: (title: string) => void,
  finalTitle: string,
  delayMs: number = 25,
) {
  const text = (finalTitle || "").toString();
  let current = "";
  for (const ch of text) {
    current += ch;
    update(current);
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, delayMs));
  }
}

export default function ChatGPTClone() {
  const [chatHistories, setChatHistories] = useState<{ [key: string]: any[] }>({})
  // Ref to the Radix ScrollArea root for auto-scroll
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [input, setInput] = useState("")
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [currentChatId, setCurrentChatId] = useState<string>("")
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [selectedModel, setSelectedModel] = useState<string>("Fast")
  
  // Get auth status
  const { authenticated, loading: authLoading } = useAuth()

  const messages = chatHistories[currentChatId] || []

  // Initialize with a default chat session
  useEffect(() => {
    const defaultChat: ChatSession = {
      id: "default",
      title: "New Chat",
      lastMessage: "",
      timestamp: new Date(),
    }
    setChatSessions([defaultChat])
    setCurrentChatId("default")
    setChatHistories({ default: [] })
  }, [])

  // Update chat session's last message and timestamp
  useEffect(() => {
    if (messages.length > 0 && currentChatId) {
      const lastMessage = messages[messages.length - 1]
      setChatSessions((prev) =>
        prev.map((chat) =>
          chat.id === currentChatId
            ? {
                ...chat,
                lastMessage: lastMessage.content,
                timestamp: new Date(),
              }
            : chat,
        ),
      )
    }
  }, [messages, currentChatId])

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement
      if (viewport) {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' })
      }
    }
  }, [messages])

  const startNewChat = () => {
    const newChatId = `chat-${Date.now()}`
    const newChat: ChatSession = {
      id: newChatId,
      title: "New Chat",
      lastMessage: "",
      timestamp: new Date(),
    }

    setChatSessions((prev) => [newChat, ...prev])
    setCurrentChatId(newChatId)
    setChatHistories(prev => ({ ...prev, [newChatId]: [] }))
  }

  const selectChat = (chatId: string) => {
    setCurrentChatId(chatId)
  }

  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return "Today"
    if (days === 1) return "Yesterday"
    if (days < 7) return `${days} days ago`
    return date.toLocaleDateString()
  }

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
  }, [])

  const appendToMessage = useCallback((messageId: string, chunk: string) => {
    setChatHistories((prevHistories) => {
      const currentMessages = prevHistories[currentChatId] || [];
      return {
        ...prevHistories,
        [currentChatId]: currentMessages.map((msg) => {
          if (msg.id === messageId) {
            return { ...msg, content: (msg.content || "") + chunk };
          }
          return msg;
        }),
      }
    });
  }, [currentChatId]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setSelectedFiles(files)
  }, [])

  const triggerFileInput = useCallback(() => {
    const fileInput = document.getElementById("file-input") as HTMLInputElement
    fileInput?.click()
  }, [])

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      // Don't send an empty question unless you've attached files
      if (!input.trim() && selectedFiles.length === 0) return

      // Check if user is authenticated
      if (!authenticated && !authLoading) {
        // Add a system message prompting to sign in
        const currentMessages = chatHistories[currentChatId] || [];
        const userMessage = {
          id: `user-${Date.now()}`,
          role: "user",
          content: input,
          files: selectedFiles,
        }
        const systemMessageId = `system-${Date.now()}`
        const systemMessage = {
          id: systemMessageId,
          role: "assistant",
          content: "Sorry, you need to sign in to chat with WhyMaker Bot. Please click the **Sign In** button in the top right corner to authenticate with your Google account and access the knowledge base.",
        }

        setChatHistories(prev => ({
          ...prev,
          [currentChatId]: [...currentMessages, userMessage, systemMessage]
        }));
        setInput("")
        setSelectedFiles([])
        return
      }

      const currentMessages = chatHistories[currentChatId] || [];

      // Build the new user message (with its files)
      const userMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: input,
        files: selectedFiles,
      }
      const botMessageId = `bot-${Date.now()}`
      const initialBotMessage = {
        id: botMessageId,
        role: "assistant",
        content: "", // Start with empty content for animation
      }

      // Add user and placeholder assistant messages
      setChatHistories(prev => ({
        ...prev,
        [currentChatId]: [...currentMessages, userMessage, initialBotMessage]
      }));
      // Capture selected files for upload before clearing UI state
      const filesToSend = selectedFiles
      setInput("")
      setSelectedFiles([])

      // Generate a title for brand-new chats
      if (currentMessages.length === 0) {
        const chatIdSnapshot = currentChatId
        // Keep "New Chat" visible until we have a generated title, then animate it in

        ;(async () => {
          let finalTitle: string | undefined
          try {
            const res = await fetch('/api/title', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt: input })
            })
            if (res.ok) {
              const data = await res.json()
              finalTitle = data?.title
            }
          } catch {
            // ignore API failure; we'll fall back
          }

        if (!finalTitle) finalTitle = generateChatTitle(input)

          // Animate the title update
          await animateChatTitle((title: string) => {
            setChatSessions((prev) => prev.map((c) => c.id === chatIdSnapshot ? { ...c, title } : c))
          }, finalTitle)
        })()
      }

      try {
        // Call the API route. If files were attached, send as multipart/form-data
        let response: Response
        if (filesToSend && filesToSend.length > 0) {
          const formData = new FormData()
          formData.append('question', input)
          formData.append('chat_history', JSON.stringify(currentMessages.map(({ role, content }) => ({ role, content }))))
          formData.append('model', modelMapping[selectedModel])
          for (const file of filesToSend) formData.append('files', file)
          response = await fetch('/api/chat', { method: 'POST', body: formData })
        } else {
          response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              question: input,
              chat_history: currentMessages.map(({ role, content }) => ({ role, content })),
              model: modelMapping[selectedModel]
            }),
          })
        }

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const contentType = response.headers.get('content-type') || '';

        // If server streams text, incrementally append
        if (!contentType.includes('application/json') && response.body) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            appendToMessage(botMessageId, chunk);
          }
        } else {
          // Fallback: non-streaming JSON
          const data = await response.json();
          setChatHistories(prev => ({
            ...prev,
            [currentChatId]: prev[currentChatId].map(msg => 
              msg.id === botMessageId 
                ? { ...msg, content: data.answer }
                : msg
            )
          }));
        }

      } catch (error) {
        console.error('Error:', error);
        setChatHistories(prev => ({
          ...prev,
          [currentChatId]: prev[currentChatId].map(msg => 
            msg.id === botMessageId 
              ? { ...msg, content: "Sorry, I encountered an error. Please try again." }
              : msg
          )
        }));
      }
    },
    [input, currentChatId, chatHistories, selectedFiles, selectedModel, authenticated, authLoading],
  )

  return (
    <div className="flex h-screen text-white" style={{ backgroundColor: "var(--bg-primary)" }}>
      {/* Sidebar */}
      <div
        className="w-64 flex flex-col"
        style={{
          backgroundColor: "var(--bg-elevated-secondary)",
          borderRight: "1px solid var(--border-default)",
        }}
      >
        {/* New Chat Button */}
        <div className="p-4">
          <Button
            onClick={startNewChat}
            className="w-full text-white border bg-transparent focus:outline-none" // Added focus:outline-none
            variant="outline"
            style={{
              backgroundColor: "var(--interactive-bg-secondary-default)",
              borderColor: "var(--border-default)",
              color: "var(--text-primary)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--interactive-bg-secondary-hover)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--interactive-bg-secondary-default)"
            }}
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </div>

        <Separator style={{ backgroundColor: "var(--border-default)" }} />

        {/* Chat History */}
        <ScrollArea className="flex-1 px-2">
          <div className="space-y-1 py-2">
            {chatSessions.map((chat) => (
              <Button
                key={chat.id}
                onClick={() => selectChat(chat.id)}
                variant="ghost"
                className={`w-full justify-start text-left p-3 h-auto focus:outline-none`} // Added focus:outline-none
                style={{
                  backgroundColor:
                    currentChatId === chat.id ? "var(--interactive-bg-secondary-selected)" : "transparent",
                  color: "var(--text-primary)",
                }}
                onMouseEnter={(e) => {
                  if (currentChatId !== chat.id) {
                    e.currentTarget.style.backgroundColor = "var(--interactive-bg-secondary-hover)"
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentChatId !== chat.id) {
                    e.currentTarget.style.backgroundColor = "transparent"
                  }
                }}
              >
                <div className="flex items-start space-x-3 w-full">
                  <MessageSquareIcon
                    className="w-4 h-4 mt-1 flex-shrink-0"
                    style={{ color: "var(--icon-secondary)" }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{chat.title}</div>
                    <div className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
                      {formatTime(chat.timestamp)}
                    </div>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative">
        {/* Top Bar with Model Selector (left) and Auth Status (right) */}
        <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-center">
          {/* Model Selector - Top Left */}
          <div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center space-x-0 px-3 py-2 rounded-lg focus:outline-none"
                style={{
                  backgroundColor: "var(--interactive-bg-secondary-default)",
                  color: "var(--text-primary)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--interactive-bg-secondary-hover)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--interactive-bg-secondary-default)"
                }}
              >
                <span className="text-base font-normal">{selectedModel}</span>
                <ChevronDownIcon className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-64"
              style={{
                backgroundColor: "var(--bg-elevated-primary)",
                borderColor: "var(--border-default)",
                color: "var(--text-primary)",
              }}
            >
              <DropdownMenuItem
                onClick={() => setSelectedModel("Fast")}
                className="cursor-pointer focus:outline-none flex flex-col items-start relative py-2"
                style={{ color: "var(--text-primary)" }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--bg-tertiary)"; e.currentTarget.style.outline = "none"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                <span>Fast</span>
                <span className="text-xs -mt-0.5 leading-[.5rem]" style={{ color: "var(--text-tertiary)" }}>
                  Model - GPT 4.1 Nano
                </span>
                {selectedModel === "Fast" && (
                  <CheckIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4" />
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setSelectedModel("Smart")}
                className="cursor-pointer focus:outline-none flex flex-col items-start py-2 relative"
                style={{ color: "var(--text-primary)" }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--bg-tertiary)"; e.currentTarget.style.outline = "none"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                <span>Smart</span>
                <span className="text-xs -mt-0.5 leading-[.5rem]" style={{ color: "var(--text-tertiary)" }}>
                  Model - GPT‑5 Mini
                </span>
                {selectedModel === "Smart" && (
                  <CheckIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4" />
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
          
          {/* Auth Status - Top Right */}
          <AuthStatus />
        </div>

        {messages.length === 0 ? (
          // This container will hold and center both the welcome text and the input bar
          <div className="flex-1 flex flex-col items-center justify-center p-4">
            <div className="text-center mb-8">
              {" "}
              {/* Welcome text */}
              <div className="flex items-center justify-center mb-4">
                {" "}
                {/* Removed gap-2 */}
                <img
                  src="/images/whymaker-chatbot-logo.png" // Updated image source
                  alt="WhyMaker Chatbot Logo"
                  className="h-20 w-auto" // Adjust height as needed
                />
                {/* Removed the separate Chatbot span */}
              </div>
            </div>
            {/* Input Area - now part of the centered block */}
            <div className="max-w-3xl mx-auto w-full">
              <form onSubmit={handleSubmit} className="relative">
                <div className="flex items-center space-x-2">
                  <Button
                    type="button"
                    onClick={triggerFileInput}
                    className="rounded-full p-2 w-[40px] h-[40px] flex items-center justify-center focus:outline-none" // Added focus:outline-none
                    style={{
                      backgroundColor: "var(--interactive-bg-secondary-default)",
                      color: "var(--text-secondary)",
                      border: "1px solid var(--border-default)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "var(--interactive-bg-secondary-hover)"
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "var(--interactive-bg-secondary-default)"
                    }}
                  >
                    <PlusIcon className="w-4 h-4" />
                  </Button>
                  <div className="flex-1 relative">
                    <Input
                      value={input}
                      onChange={handleInputChange}
                      placeholder={!authenticated && !authLoading ? "Sign in to chat with WhyMaker Bot..." : "Message WhyMaker Bot..."}
                      className="w-full pr-12 py-3 rounded-xl focus:ring-2 focus:border-transparent focus:outline-none" // Added focus:outline-none
                      style={{
                        backgroundColor: "var(--bg-secondary)",
                        borderColor: "var(--border-default)",
                        color: "var(--text-primary)",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15), 0 1px 4px rgba(0, 0, 0, 0.1)",
                      }}
                    />
                    <Button
                      type="submit"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 rounded-full p-2 w-[30px] h-[30px] flex items-center justify-center focus:outline-none" // Added focus:outline-none
                      disabled={!input.trim()}
                      style={{
                        backgroundColor: "white",
                        color: "var(--text-inverted)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--interactive-bg-primary-hover)"
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "white"
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        data-rtl-flip=""
                        className="icon-sm"
                        style={{ transform: "rotate(-45deg)" }}
                      >
                        <path d="M11.3349 10.3301V5.60547L4.47065 12.4707C4.21095 12.7304 3.78895 12.7304 3.52925 12.4707C3.26955 12.211 3.26955 11.789 3.52925 11.5293L10.3945 4.66504H5.66011C5.29284 4.66504 4.99507 4.36727 4.99507 4C4.99507 3.63273 5.29284 3.33496 5.66011 3.33496H11.9999L12.1337 3.34863C12.4369 3.41057 12.665 3.67857 12.665 4V10.3301C12.6649 10.6973 12.3672 10.9951 11.9999 10.9951C11.6327 10.9951 11.335 10.6973 11.3349 10.3301ZM11.333 4.66699L11.3349 4.66797L11.332 4.66504H11.331L11.333 4.66699Z"></path>
                      </svg>
                    </Button>
                  </div>
                </div>
                <input
                  id="file-input"
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                  accept="image/*,.pdf,.doc,.docx,.txt"
                />
                {selectedFiles.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="px-3 py-1 rounded-full text-xs flex items-center space-x-2"
                        style={{
                          backgroundColor: "var(--bg-tertiary)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        <span>{file.name}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedFiles((files) => files.filter((_, i) => i !== index))}
                          className="hover:opacity-70"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </form>
              <div className="text-xs text-center mt-2" style={{ color: "var(--text-tertiary)" }}>
                WhyMaker Bot can make mistakes. Consider checking important information.
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Chat Messages */}
            <ScrollArea ref={scrollAreaRef} className="flex-1 pt-20 px-4 pb-4">
              <div className="max-w-3xl mx-auto space-y-6">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    {message.role === "user" ? (
                      // User message - separate bubbles for attachments and text
                      <div className="flex flex-col items-end max-w-[70%] space-y-1">
                        {message.files && message.files.map((file: File, idx: number) => (
                          <div
                            key={idx}
                            className="p-2 rounded-lg flex items-center space-x-3 mb-1"
                            style={{
                              backgroundColor: "transparent",
                              border: "1px solid var(--border-default)",
                            }}
                          >
                            <FileTextIcon className="w-5 h-5 flex-shrink-0" style={{ color: "var(--text-secondary)" }} />
                            <div className="flex flex-col overflow-hidden">
                              <span className="text-sm font-medium truncate">{file.name}</span>
                              <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                                {file.type.split('/')[1]?.toUpperCase() || 'FILE'}
                              </span>
                            </div>
                          </div>
                        ))}
                        {message.content && (
                          <div className="flex items-start">
                        <div
                          className="px-4 py-2 rounded-2xl"
                          style={{
                                backgroundColor: "var(--bg-secondary)",
                            color: "var(--text-primary)",
                          }}
                        >
                              <div className="text-sm markdown" style={{ color: "var(--text-secondary)" }}>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        </div>
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ml-3"
                          style={{ backgroundColor: "var(--text-accent)" }}
                        >
                          <UserIcon className="w-4 h-4" style={{ color: "var(--text-inverted)" }} />
                        </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      // Bot message
                      <div className="flex items-center space-x-3 max-w-[70%]">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: "var(--bg-tertiary)" }}
                        >
                          <BotIcon className="w-4 h-4" style={{ color: "var(--icon-primary)" }} />
                        </div>
                        <div className="flex-1">
                          {message.content === "" ? (
                            // Loading indicator
                            <div className="loader"></div>
                          ) : (
                            <div className="text-sm markdown" style={{ color: "var(--text-secondary)" }}>
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {message.content}
                              </ReactMarkdown>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Input Area - always at the bottom when messages exist */}
            <div className="p-4 relative">
              <div className="max-w-3xl mx-auto w-full">
                <form onSubmit={handleSubmit} className="relative">
                  <div className="flex items-center space-x-2">
                    <Button
                      type="button"
                      onClick={triggerFileInput}
                      className="rounded-full p-2 w-[40px] h-[40px] flex items-center justify-center focus:outline-none" // Added focus:outline-none
                      style={{
                        backgroundColor: "var(--interactive-bg-secondary-default)",
                        color: "var(--text-secondary)",
                        border: "1px solid var(--border-default)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--interactive-bg-secondary-hover)"
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--interactive-bg-secondary-default)"
                      }}
                    >
                      <PlusIcon className="w-4 h-4" />
                    </Button>
                    <div className="flex-1 relative">
                      <Input
                        value={input}
                        onChange={handleInputChange}
                        placeholder={!authenticated && !authLoading ? "Sign in to chat with WhyMaker Bot..." : "Message WhyMaker Bot..."}
                        className="w-full pr-12 py-3 rounded-xl focus:ring-2 focus:border-transparent focus:outline-none" // Added focus:outline-none
                        style={{
                          backgroundColor: "var(--bg-secondary)",
                          borderColor: "var(--border-default)",
                          color: "var(--text-primary)",
                          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15), 0 1px 4px rgba(0, 0, 0, 0.1)",
                        }}
                      />
                      <Button
                        type="submit"
                        size="sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 rounded-full p-2 w-[30px] h-[30px] flex items-center justify-center focus:outline-none" // Added focus:outline-none
                        disabled={!input.trim()}
                        style={{
                          backgroundColor: "white",
                          color: "var(--text-inverted)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "var(--interactive-bg-primary-hover)"
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "white"
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="currentColor"
                          data-rtl-flip=""
                          className="icon-sm"
                          style={{ transform: "rotate(-45deg)" }}
                        >
                          <path d="M11.3349 10.3301V5.60547L4.47065 12.4707C4.21095 12.7304 3.78895 12.7304 3.52925 12.4707C3.26955 12.211 3.26955 11.789 3.52925 11.5293L10.3945 4.66504H5.66011C5.29284 4.66504 4.99507 4.36727 4.99507 4C4.99507 3.63273 5.29284 3.33496 5.66011 3.33496H11.9999L12.1337 3.34863C12.4369 3.41057 12.665 3.67857 12.665 4V10.3301C12.6649 10.6973 12.3672 10.9951 11.9999 10.9951C11.6327 10.9951 11.335 10.6973 11.3349 10.3301ZM11.333 4.66699L11.3349 4.66797L11.332 4.66504H11.331L11.333 4.66699Z"></path>
                        </svg>
                      </Button>
                    </div>
                  </div>
                  <input
                    id="file-input"
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                    accept="image/*,.pdf,.doc,.docx,.txt"
                  />
                  {selectedFiles.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="px-3 py-1 rounded-full text-xs flex items-center space-x-2"
                          style={{
                            backgroundColor: "var(--bg-tertiary)",
                            color: "var(--text-secondary)",
                          }}
                        >
                          <span>{file.name}</span>
                          <button
                            type="button"
                            onClick={() => setSelectedFiles((files) => files.filter((_, i) => i !== index))}
                            className="hover:opacity-70"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </form>
                <div className="text-xs text-center mt-2" style={{ color: "var(--text-tertiary)" }}>
                  WhyMaker Bot can make mistakes. Consider checking important information.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

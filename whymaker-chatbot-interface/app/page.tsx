"use client"

import type React from "react"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { PlusIcon, MessageSquareIcon, UserIcon, BotIcon, CheckIcon } from "lucide-react" // Import CheckIcon
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ChevronDownIcon } from "lucide-react"

interface ChatSession {
  id: string
  title: string
  lastMessage: string
  timestamp: Date
}

const modelMapping: { [key: string]: string } = {
  "Quick & Dumb": "gpt-4.1-nano",
  "Standard": "o4-mini",
  "Deep Reasoning": "o3",
};

export default function ChatGPTClone() {
  const [messages, setMessages] = useState<any[]>([])
  // Ref to the Radix ScrollArea root for auto-scroll
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [input, setInput] = useState("")
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [currentChatId, setCurrentChatId] = useState<string>("")
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [selectedModel, setSelectedModel] = useState<string>("Standard")

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
    setMessages([])
  }

  const selectChat = (chatId: string) => {
    setCurrentChatId(chatId)
    // In a real app, you'd load the messages for this chat from storage
    setMessages([])
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

  const typeWriterEffect = useCallback((messageId: string, fullText: string) => {
    const words = fullText.split(" ");
    let wordIndex = 0;
    const interval = setInterval(() => {
      setMessages((prevMessages) =>
        prevMessages.map((msg) => {
          if (msg.id === messageId) {
            return { ...msg, content: words.slice(0, wordIndex + 1).join(" ") };
          }
          return msg;
        }),
      );
      wordIndex++;
      if (wordIndex >= words.length) {
        clearInterval(interval);
      }
    }, 50); // 150ms per word; adjust for speed
  }, []);

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
      if (!input.trim()) return

      const userMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: input,
      }

      const botMessageId = `bot-${Date.now()}`
      const initialBotMessage = {
        id: botMessageId,
        role: "assistant",
        content: "", // Start with empty content for animation
      }

      // Add user and placeholder assistant messages
      setMessages((prevMessages) => [...prevMessages, userMessage, initialBotMessage])
      setInput("")

      // Call backend API for real response
      try {
        const res = await fetch('http://localhost:8000/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: input,
            chat_history: messages.map(({ id, ...rest }) => rest),
            model: modelMapping[selectedModel], // Use mapping here
          }),
        })
        const data = await res.json()
        const answer = data.answer || 'I encountered an error.'
        const summaryTitle = data.title || ''
        // Update the chat session title with AI summary
        if (summaryTitle) {
          setChatSessions((prev) =>
            prev.map((chat) =>
              chat.id === currentChatId
                ? { ...chat, title: summaryTitle }
                : chat
            )
          )
        }
        // Animate the assistant's response
        typeWriterEffect(botMessageId, answer)
      } catch (err) {
        console.error('Chat API error:', err)
        typeWriterEffect(botMessageId, 'Sorry, something went wrong.')
      }
    },
    [input, typeWriterEffect, messages, selectedModel], // Add selectedModel to dependencies
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
        {/* Model Selector - Top Left (always visible) */}
        <div className="absolute top-4 left-4 z-10">
          {" "}
          {/* Added z-10 to ensure it's on top */}
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
              className="w-48"
              style={{
                backgroundColor: "var(--bg-elevated-primary)",
                borderColor: "var(--border-default)",
                color: "var(--text-primary)",
              }}
            >
              <DropdownMenuItem
                onClick={() => setSelectedModel("Quick & Dumb")}
                className="cursor-pointer focus:outline-none flex flex-col items-start relative py-2"
                style={{ color: "var(--text-primary)" }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--bg-tertiary)"; e.currentTarget.style.outline = "none"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                <span>Quick & Dumb</span>
                <span className="text-xs -mt-0.5 leading-[.5rem]" style={{ color: "var(--text-tertiary)" }}>
                  Model - GPT 4.1 Nano
                </span>
                {selectedModel === "Quick & Dumb" && (
                  <CheckIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4" />
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setSelectedModel("Standard")}
                className="cursor-pointer focus:outline-none flex flex-col items-start py-2 relative"
                style={{ color: "var(--text-primary)" }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--bg-tertiary)"; e.currentTarget.style.outline = "none"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                <span>Standard</span>
                <span className="text-xs -mt-0.5 leading-[.5rem]" style={{ color: "var(--text-tertiary)" }}>
                  Model - o4-mini
                </span>
                {selectedModel === "Standard" && (
                  <CheckIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4" />
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setSelectedModel("Deep Reasoning")}
                className="cursor-pointer focus:outline-none flex flex-col items-start py-2 relative"
                style={{ color: "var(--text-primary)" }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--bg-tertiary)"; e.currentTarget.style.outline = "none"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                <span>Deep Reasoning</span>
                <span className="text-xs -mt-0.5 leading-[.5rem]" style={{ color: "var(--text-tertiary)" }}>
                  Model - o3
                </span>
                {selectedModel === "Deep Reasoning" && (
                  <CheckIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4" />
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
                      placeholder="Message WhyMaker Bot..."
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
                      // User message - right side with chat bubble
                      <div className="flex items-start max-w-[70%]">
                        <div
                          className="px-4 py-2 rounded-2xl"
                          style={{
                            backgroundColor: "var(--bg-secondary)", // Same color as input bar
                            color: "var(--text-primary)",
                          }}
                        >
                          <div className="text-sm markdown" style={{ color: "var(--text-primary)" }}>
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
                        placeholder="Message WhyMaker Bot..."
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

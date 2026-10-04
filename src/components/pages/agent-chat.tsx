'use client';

import { useEffect, useState, useRef } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Send, Sparkles, Brain, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  toolResults?: any[];
  timestamp: string;
}

const SUGGESTIONS = [
  'What should I reorder today?',
  'Which items are likely to stock out?',
  'Show me slow-moving inventory.',
  'Group all recommended orders by supplier.',
];

export function AgentChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! I'm the AI Inventory Decision Agent. I can help you analyze inventory, forecast demand, identify stockout risks, calculate reorder quantities, and prepare purchase orders — all grounded in your real retail data.\n\nTry asking me something like \"What should I reorder today?\" or \"Which items are at risk of stocking out?\"",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const send = async (msg?: string) => {
    const content = msg || input.trim();
    if (!content || loading) return;
    
    const userMsg: Message = {
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    
    try {
      const res = await fetch('/api/v1/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          history: messages.map(m => ({ role: m.role, content: m.content, timestamp: m.timestamp })),
        }),
      });
      
      const data = await res.json();
      
      if (data.error) {
        toast({ title: 'Agent error', description: data.error, variant: 'destructive' });
      } else if (data.messages && data.messages.length > 0) {
        const assistantMsg = data.messages.find((m: any) => m.role === 'assistant');
        if (assistantMsg) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: assistantMsg.content,
            toolResults: assistantMsg.toolResults,
            timestamp: new Date().toISOString(),
          }]);
        }
      }
    } catch (e: any) {
      toast({ title: 'Network error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-card-success border-primary/20">
        <CardContent className="py-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shrink-0">
            <Brain className="w-6 h-6 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold">AI Inventory Agent</h2>
            <p className="text-sm text-muted-foreground">
              Tool-calling LLM agent — 12 tools, structured JSON outputs, no hallucinated numbers.
              The LLM orchestrates; deterministic services own the math.
            </p>
          </div>
          <Badge className="bg-success text-success-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-success-foreground mr-1 animate-pulse-soft" />
            Online
          </Badge>
        </CardContent>
      </Card>

      <Card className="h-[600px] flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="w-4 h-4 text-primary" />
            Conversation
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-3 min-h-0">
          <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pr-2">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-2' : ''}`}>
                  <div className={`rounded-lg px-4 py-2 ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}>
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                  </div>
                  {msg.toolResults && msg.toolResults.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        Tools called: {msg.toolResults.length}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {msg.toolResults.map((t: any, j: number) => (
                          <Badge
                            key={j}
                            variant="outline"
                            className={`text-xs ${t.success ? 'bg-success/10 text-success border-success/30' : 'bg-destructive/10 text-destructive border-destructive/30'}`}
                          >
                            {t.tool} {t.success ? '✓' : '✗'}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground mt-1 px-1">
                    {new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-primary/60 animate-pulse-soft" />
                    <span className="w-2 h-2 rounded-full bg-primary/60 animate-pulse-soft" style={{ animationDelay: '0.2s' }} />
                    <span className="w-2 h-2 rounded-full bg-primary/60 animate-pulse-soft" style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Suggestions */}
          {messages.length <= 1 && (
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map(s => (
                <Button
                  key={s}
                  variant="outline"
                  size="sm"
                  onClick={() => send(s)}
                  disabled={loading}
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  {s}
                </Button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about inventory, forecasts, reorders, festivals, POs..."
              className="flex-1 min-h-[44px] max-h-32 resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              disabled={loading}
            />
            <Button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              className="self-end"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

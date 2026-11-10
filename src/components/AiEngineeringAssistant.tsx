import React, { useState, useRef, useEffect } from 'react';
import { VehicleProfile, ConnectorPin, BenchReading, ElectricalFault } from '../types/automotive';
import { 
  Bot, 
  Send, 
  User, 
  Sparkles, 
  HelpCircle, 
  Cpu, 
  ShieldCheck, 
  RotateCcw,
  Zap
} from 'lucide-react';

interface AiEngineeringAssistantProps {
  vehicle: VehicleProfile;
  selectedPin: ConnectorPin | null;
  readings: BenchReading[];
  activeFault: ElectricalFault;
}

interface ChatMessage {
  id: string;
  sender: 'USER' | 'AI';
  text: string;
  timestamp: string;
}

export const AiEngineeringAssistant: React.FC<AiEngineeringAssistantProps> = ({
  vehicle,
  selectedPin,
  readings,
  activeFault,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'AI',
      text: `Welcome to **AutoElectric Lab Pro Engineering Intelligence**.
I have loaded the active vehicle profile: **${vehicle.make} ${vehicle.model} (${vehicle.engineCode} ${vehicle.ecuManufacturer} ${vehicle.ecuModel})**.

You can ask me to:
- Explain specific ECU pin functions, wire colors, and OEM voltage specifications.
- Provide step-by-step bench testing instructions with power supplies, DMMs, and oscilloscopes.
- Diagnose missing 5V references, open injector drivers, or CAN communication dropouts.
- Recommend board-level PCB repairs for power management ASICs, freewheeling diodes, or shorted capacitors.`,
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);

  const [inputMessage, setInputMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputMessage.trim();
    if (!textToSend || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'USER',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          activeVehicle: vehicle,
          activePin: selectedPin,
          benchReadings: readings,
          activeFault,
        }),
      });

      const data = await response.json();

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'AI',
        text: data.reply || 'No technical response received from engineering brain.',
        timestamp: new Date().toLocaleTimeString(),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (error: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'AI',
        text: `Error connecting to automotive engineering brain: ${error.message}. Please verify local network or server connectivity.`,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Context Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4 border-b border-slate-800 bg-slate-900/60">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400 shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">AI Automotive Engineering Assistant</h3>
            <p className="text-xs font-mono text-slate-400 truncate max-w-[260px] sm:max-w-none">
              Active Context: {vehicle.make} {vehicle.model} ({vehicle.ecuPartNumber})
              {selectedPin ? ` · Pin #${selectedPin.pinNumber} (${selectedPin.label})` : ''}
            </p>
          </div>
        </div>

        <button
          onClick={() =>
            setMessages([
              {
                id: 'welcome-reset',
                sender: 'AI',
                text: `Context refreshed for **${vehicle.make} ${vehicle.model}**. How can I assist with your bench testing or wiring analysis?`,
                timestamp: new Date().toLocaleTimeString(),
              },
            ])
          }
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-slate-400 hover:text-white bg-workstation-bg hover:bg-white/5 rounded border border-white/5 transition-colors whitespace-nowrap"
          title="Clear chat and reset context"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Session</span>
        </button>
      </div>

      {/* Main Conversation Stream */}
      <div className="flex-1 p-3 sm:p-6 overflow-y-auto space-y-4 tech-grid">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 max-w-3xl ${
              msg.sender === 'USER' ? 'ml-auto flex-row-reverse' : ''
            }`}
          >
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-mono font-bold ${
                msg.sender === 'USER'
                  ? 'bg-workstation-accent text-workstation-bg shadow-sm'
                  : 'bg-white/5 text-workstation-accent border border-white/10'
              }`}
            >
              {msg.sender === 'USER' ? <User className="w-4 h-4" /> : <Cpu className="w-4 h-4" />}
            </div>

            <div
              className={`p-4 rounded-xl border text-xs leading-relaxed ${
                msg.sender === 'USER'
                  ? 'bg-workstation-accent/10 border-workstation-accent/30 text-white'
                  : 'bg-workstation-panel/90 border-white/5 text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-800/80 text-[10px] font-mono text-slate-500">
                <span>{msg.sender === 'USER' ? 'BENCH TECHNICIAN' : 'ENGINEERING BRAIN (GEMINI)'}</span>
                <span>{msg.timestamp}</span>
              </div>
              <div className="prose prose-invert prose-xs max-w-none whitespace-pre-wrap font-sans">
                {msg.text}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 max-w-md">
            <div className="w-7 h-7 rounded-lg bg-white/5 text-workstation-accent border border-white/10 flex items-center justify-center shrink-0">
              <Cpu className="w-4 h-4 animate-spin" />
            </div>
            <div className="p-3 bg-workstation-panel border border-white/5 rounded-xl text-xs text-slate-400 font-mono flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-workstation-accent animate-ping" />
              <span>Synthesizing automotive engineering diagnostics...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Question Chips */}
      <div className="px-4 py-2 bg-workstation-panel/80 border-t border-white/5 flex items-center gap-2 overflow-x-auto">
        <span className="text-[10px] font-mono text-slate-500 whitespace-nowrap">
          Quick Inquiries:
        </span>
        {[
          selectedPin ? `Explain Pin #${selectedPin.pinNumber} (${selectedPin.label})` : 'Explain ECU main power pins',
          'Why is 5V sensor reference collapsed (P0641)?',
          'CAN bus U0100 bench diagnostic procedure',
          'How to test Suction Control Valve (SCV) low-side MOSFET',
          'Common PCB component failures on this Denso ECU',
        ].map((promptText, i) => (
          <button
            key={i}
            onClick={() => handleSendMessage(promptText)}
            className="px-2.5 py-1 text-[11px] font-mono text-slate-300 hover:text-white bg-workstation-bg hover:bg-white/5 rounded border border-white/10 whitespace-nowrap transition-colors"
          >
            {promptText}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <div className="p-4 bg-workstation-panel border-t border-white/5 flex items-center gap-2">
        <input
          type="text"
          placeholder="Ask engineering question about this ECU, pinouts, bench testing, or wiring..."
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          disabled={isLoading}
          className="flex-1 px-4 py-2.5 text-xs bg-workstation-bg border border-white/5 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-workstation-accent"
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={!inputMessage.trim() || isLoading}
          className="flex items-center justify-center px-4 py-2.5 text-xs font-semibold text-workstation-bg bg-workstation-accent hover:bg-workstation-accent-light disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors shadow-sm"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

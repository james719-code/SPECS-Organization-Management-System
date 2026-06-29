import React, { useState, useEffect } from 'react';

const MockTerminal: React.FC = () => {
  const [lines, setLines] = useState<string[]>([]);
  
  useEffect(() => {
    const scripts = [
      { text: "$ specs init --portal", delay: 800 },
      { text: "Initializing SPECS Core Platform...", delay: 500 },
      { text: "Connecting to Appwrite databases...", delay: 600 },
      { text: "✓ Connection secure. Port 443 active.", delay: 400 },
      { text: "$ specs db --sync", delay: 900 },
      { text: "Fetching active member data...", delay: 600 },
      { text: "Synchronized 500+ records successfully.", delay: 500 },
      { text: "$ npm run compile:dues", delay: 800 },
      { text: "Processing pending payment clearances...", delay: 400 },
      { text: "✓ Membership fee sync: 100% OK", delay: 400 },
      { text: "$ specs --health-check", delay: 900 },
      { text: "System Load: 0.08 | Integrity: SECURE", delay: 400 },
      { text: "--- RESETTING SHELL ---", delay: 1500 }
    ];

    let currentIdx = 0;
    let timeoutId: any;

    const runScript = () => {
      if (currentIdx >= scripts.length) {
        setLines([]);
        currentIdx = 0;
      }
      
      const current = scripts[currentIdx];
      if (!current) return;
      
      timeoutId = setTimeout(() => {
        if (current.text === "--- RESETTING SHELL ---") {
          setLines([]);
        } else {
          setLines(prev => {
            const next = [...prev, current.text];
            if (next.length > 5) {
              return next.slice(next.length - 5);
            }
            return next;
          });
        }
        currentIdx++;
        runScript();
      }, current.delay);
    };

    runScript();

    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div className="hidden sm:block rounded-xl bg-slate-900 border border-white/5 p-3 font-mono text-[9px] text-teal-300 space-y-1 h-[95px] overflow-hidden relative">
      <div className="absolute top-1.5 right-2 flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse"></span>
        <span className="text-[6px] text-slate-500 font-bold uppercase tracking-wider">LIVE</span>
      </div>
      {lines.map((line, idx) => {
        const isCmd = line.startsWith('$');
        const isSuccess = line.startsWith('✓') || line.includes('secure') || line.includes('complete') || line.includes('SECURE') || line.includes('OK') || line.includes('Synchronized');
        const colorClass = isCmd 
          ? 'text-teal-300' 
          : isSuccess 
            ? 'text-emerald-400 font-semibold' 
            : 'text-slate-400';
            
        return (
          <p key={idx} className={`${colorClass} truncate transition-all duration-300 animate-slide-up`}>
            {isCmd ? (
              <>
                <span className="text-slate-500 font-bold mr-1">$</span>
                {line.slice(2)}
              </>
            ) : line}
          </p>
        );
      })}
      <p className="text-teal-300">
        <span className="text-slate-500 font-bold mr-1">$</span>
        <span className="inline-block h-2.5 w-1 bg-teal-300 animate-pulse align-middle"></span>
      </p>
    </div>
  );
};

export default MockTerminal;

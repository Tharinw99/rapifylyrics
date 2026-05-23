import React, { useRef, useEffect, useState } from 'react';
import { Section, SectionType } from '../types';
import { ChevronDown, ChevronRight, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { countSyllables } from '../lib/syllables';
import { computeRhymes, rhymeColors } from '../lib/rhymes';

interface EditorSectionProps {
  section: Section;
  onChange: (id: string, newContent: string) => void;
  onToggleCollapse: (id: string) => void;
  onRemove: (id: string) => void;
  isRhymeCheckOn: boolean;
  isAdvancedRhymeOn: boolean;
}

const colorMap: Record<SectionType, { text: string, border: string, bgHover: string }> = {
  'Intro': { text: 'text-zinc-500', border: 'border-zinc-500', bgHover: 'hover:bg-zinc-500/10' },
  'Verse': { text: 'text-blue-500', border: 'border-blue-500', bgHover: 'hover:bg-blue-500/10' },
  'Pre Hook': { text: 'text-purple-500', border: 'border-purple-500', bgHover: 'hover:bg-purple-500/10' },
  'Hook': { text: 'text-amber-500', border: 'border-amber-500', bgHover: 'hover:bg-amber-500/10' },
  'Bridge': { text: 'text-pink-500', border: 'border-pink-500', bgHover: 'hover:bg-pink-500/10' },
  'Outro': { text: 'text-zinc-600', border: 'border-zinc-600', bgHover: 'hover:bg-zinc-600/10' },
};

export function EditorSection({ section, onChange, onToggleCollapse, onRemove, isRhymeCheckOn, isAdvancedRhymeOn }: EditorSectionProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const colors = colorMap[section.type];
  
  const [cursorPos, setCursorPos] = useState<number>(0);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(section.id, e.target.value);
    setCursorPos(e.target.selectionStart);
    
    // Auto-resize
    const target = e.target;
    target.style.height = 'auto';
    target.style.height = `${target.scrollHeight}px`;
  };

  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    setCursorPos(e.currentTarget.selectionStart);
  };

  // Calculate syllables for the line where cursor is
  const textBeforeCursor = section.content.substr(0, cursorPos);
  const currentLineIndex = textBeforeCursor.split('\n').length - 1;
  const lines = section.content.split('\n');
  const currentLineText = lines[currentLineIndex] || '';
  const syllablesInCurrentLine = countSyllables(currentLineText);

  // Total syllables
  const totalSyllables = countSyllables(section.content);

  const tokens = (isRhymeCheckOn && section.content) ? computeRhymes(section.content, isAdvancedRhymeOn) : [];

  // Adjust height on mount or uncollapse
  useEffect(() => {
    if (!section.collapsed && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [section.collapsed, section.content]);

  return (
    <div className={cn("group mb-8 transition-opacity duration-200 relative", section.collapsed ? "opacity-70 hover:opacity-100" : "opacity-100")}>
      <div 
        className={cn(
          "flex items-center gap-2 cursor-pointer select-none rounded-md px-2 py-1 -ml-2 transition-colors", 
          colors.bgHover
        )}
        onClick={() => onToggleCollapse(section.id)}
      >
        <div className={cn("w-[2px] h-4 rounded-full", colors.border, "bg-current")} />
        
        {section.collapsed ? (
           <ChevronRight className={cn("w-4 h-4", colors.text)} />
        ) : (
           <ChevronDown className={cn("w-4 h-4", colors.text)} />
        )}
        
        <h3 className={cn("text-xs font-bold uppercase tracking-[0.2em]", colors.text)}>
          {section.name}
        </h3>
        
        <span className="text-[10px] text-zinc-500 font-mono tracking-widest ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {totalSyllables} SYL
        </span>

        <button 
          onClick={(e) => { e.stopPropagation(); onRemove(section.id); }}
          className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity p-1 text-zinc-600 hover:text-red-400"
          title="Remove Section"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {!section.collapsed && (
        <div className="mt-2 pl-4 border-l-2 border-zinc-800/50 focus-within:border-zinc-700 transition-colors relative">
          
          {isRhymeCheckOn && (
            <div className="absolute top-0 left-4 right-0 bottom-0 pointer-events-none whitespace-pre-wrap break-words text-lg md:text-xl font-medium leading-[1.8] tracking-tight">
              {tokens.map((t, i) => (
                <span 
                  key={i} 
                  className={t.colorIndex !== undefined ? cn(rhymeColors[t.colorIndex], "rounded-[2px] px-[1px] py-[2px]") : "text-transparent"}
                >
                  {t.text}
                </span>
              ))}
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={section.content}
            onChange={handleInput}
            onSelect={handleSelect}
            onKeyUp={handleSelect}
            onClick={handleSelect}
            placeholder="Write your bars here..."
            className={cn(
              "w-full bg-transparent resize-none outline-none text-lg md:text-xl font-medium leading-[1.8] tracking-tight placeholder:text-zinc-800 relative z-10",
              isRhymeCheckOn ? "text-transparent caret-white" : "text-zinc-100"
            )}
            spellCheck={false}
          />
          {section.content.length > 0 && (
            <div className="absolute right-0 top-1 text-[10px] font-mono text-zinc-600 bg-zinc-950/80 px-1.5 py-0.5 rounded bg-opacity-80 pointer-events-none fade-in">
              {syllablesInCurrentLine}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

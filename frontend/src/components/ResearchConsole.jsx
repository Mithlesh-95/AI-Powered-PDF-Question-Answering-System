import React, { useState, useRef, useEffect } from 'react';
import { Send, BookOpen, AlertCircle, RefreshCw, Copy, Check, ChevronRight, FileText } from 'lucide-react';
import api from '../utils/api';
import ReactMarkdown from 'react-markdown';

export default function ResearchConsole({ activeDocumentIds }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [querying, setQuerying] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const messageEndRef = useRef(null);

  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, querying]);

  const handleQuerySubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || querying) return;

    const queryText = inputValue.trim();
    setInputValue('');

    // Append user message
    const userMessage = {
      role: 'user',
      content: queryText,
      timestamp: new Date().toLocaleTimeString()
    };
    setMessages(prev => [...prev, userMessage]);
    setQuerying(true);

    try {
      const response = await api.post('/api/query', {
        query: queryText,
        document_ids: activeDocumentIds.length > 0 ? activeDocumentIds : null,
      });

      // Append assistant findings
      const assistantMessage = {
        role: 'assistant',
        content: response.data.findings,
        citations: response.data.citations,
        confidence: response.data.confidence,
        responseTime: response.data.response_time_ms,
        timestamp: new Date().toLocaleTimeString()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Auto-focus the first citation in Referenced Pages panel if available
      if (assistantMessage.citations && assistantMessage.citations.length > 0) {
        setSelectedCitation(assistantMessage.citations[0]);
      } else {
        setSelectedCitation(null);
      }

    } catch (err) {
      console.error(err);
      const isAuthErr = err.response?.status === 401 || err.response?.status === 403;
      
      const errorMessage = {
        role: 'system_error',
        content: isAuthErr 
          ? "CRITICAL ERROR: OpenRouter API authentication failed. Verify that the OPENROUTER_API_KEY environment variable is correctly set in your backend .env file."
          : `SYSTEM INGESTION FAULT: ${err.response?.data?.detail || err.message || "Failed to contact research engine."}`,
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setQuerying(false);
    }
  };

  const handleCopyText = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  const handleRegenerate = async (lastQueryIndex) => {
    if (lastQueryIndex === -1 || querying) return;
    const queryText = messages[lastQueryIndex].content;
    
    // Slice off all messages after the query
    setMessages(prev => prev.slice(0, lastQueryIndex + 1));
    setQuerying(true);

    try {
      const response = await api.post('/api/query', {
        query: queryText,
        document_ids: activeDocumentIds.length > 0 ? activeDocumentIds : null
      });

      const assistantMessage = {
        role: 'assistant',
        content: response.data.findings,
        citations: response.data.citations,
        confidence: response.data.confidence,
        responseTime: response.data.response_time_ms,
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, assistantMessage]);
      if (assistantMessage.citations && assistantMessage.citations.length > 0) {
        setSelectedCitation(assistantMessage.citations[0]);
      }
    } catch (err) {
      console.error(err);
      const isAuthErr = err.response?.status === 401 || err.response?.status === 403;
      setMessages(prev => [...prev, {
        role: 'system_error',
        content: isAuthErr
          ? "CRITICAL ERROR: OpenRouter API authentication failed. Verify that the OPENROUTER_API_KEY environment variable is correctly set in your backend .env file."
          : `SYSTEM INGESTION FAULT: ${err.message}`,
        timestamp: new Date().toLocaleTimeString()
      }]);
    } finally {
      setQuerying(false);
    }
  };

  const handleCitationClick = (citation) => {
    setSelectedCitation(citation);
  };

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-brutalist-bg">
      {/* Center Column: Research Dialogues */}
      <div className="flex-1 flex flex-col h-full border-r-2 border-brutalist-ink relative">
        {/* Title Bar */}
        <div className="p-6 border-b-2 border-brutalist-ink bg-brutalist-bg flex justify-between items-center">
          <div>
            <span className="text-xs font-mono font-bold tracking-widest text-brutalist-muted uppercase">03 / CONSOLE</span>
            <h2 className="text-xl font-editorial font-extrabold tracking-tight mt-1">RESEARCH CONSOLE</h2>
          </div>
          {activeDocumentIds.length > 0 && (
            <div className="text-[10px] font-mono border-2 border-brutalist-ink bg-brutalist-ink text-brutalist-bg px-3 py-1 font-bold">
              SCOPED INDEX: {activeDocumentIds.length} ACTIVE SOURCES
            </div>
          )}
        </div>

        {/* Message stream */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto">
              <BookOpen className="w-12 h-12 mb-6 text-brutalist-muted" />
              <h3 className="font-editorial font-bold text-xl mb-3">CONSTRUCT HYPOTHESIS</h3>
              <p className="text-xs font-mono text-brutalist-muted uppercase leading-relaxed">
                Choose knowledge sources from the left panel index, enter a research query below, and generate AI analysis.
              </p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              const isError = msg.role === 'system_error';

              if (isUser) {
                return (
                  <div key={index} className="flex justify-end pl-12">
                    <div className="border-2 border-brutalist-ink p-5 bg-brutalist-ink text-brutalist-bg max-w-xl shadow-[4px_4px_0px_rgba(5,8,22,0.15)]">
                      <div className="text-[10px] font-mono opacity-60 uppercase mb-2">
                        HYPOTHESIS QUERY // {msg.timestamp}
                      </div>
                      <p className="font-sans font-bold text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                );
              }

              if (isError) {
                return (
                  <div key={index} className="flex justify-start pr-12">
                    <div className="border-2 border-red-600 p-5 bg-red-50 text-red-800 max-w-2xl flex gap-3 shadow-[4px_4px_0px_#b91c1c]">
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      <div className="space-y-3">
                        <div className="text-[10px] font-mono font-bold uppercase tracking-wider">
                          SYSTEM FAULT ENCOUNTERED
                        </div>
                        <p className="font-mono text-xs leading-relaxed">{msg.content}</p>
                      </div>
                    </div>
                  </div>
                );
              }

              // Assistant Findings
              return (
                <div key={index} className="flex justify-start pr-12">
                  <div className="border-2 border-brutalist-ink p-6 bg-white text-brutalist-ink max-w-2xl relative shadow-[6px_6px_0px_#050816]">
                    
                    {/* Header bar */}
                    <div className="flex justify-between items-center text-[10px] font-mono text-brutalist-muted pb-3 mb-4 border-b border-dashed border-brutalist-ink/30">
                      <span>RESEARCH FINDINGS // CONFIDENCE: {msg.confidence}%</span>
                      <span>{msg.responseTime}ms // {msg.timestamp}</span>
                    </div>

                    {/* Markdown answer content */}
                    <div className="font-sans text-sm leading-relaxed space-y-4 prose max-w-none">
                      <ReactMarkdown
                        components={{
                          code({ node, inline, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || '');
                            return !inline ? (
                              <pre className="bg-brutalist-bg border border-brutalist-ink p-3 overflow-x-auto font-mono text-xs my-3 select-text">
                                <code {...props} className={className}>{children}</code>
                              </pre>
                            ) : (
                              <code {...props} className="bg-brutalist-bg px-1.5 py-0.5 border border-brutalist-ink/30 font-mono text-xs">{children}</code>
                            );
                          }
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>

                    {/* Citation Pills */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-6 pt-4 border-t border-dashed border-brutalist-ink/30">
                        <div className="text-[10px] font-mono text-brutalist-muted uppercase tracking-wider mb-2.5">
                          Sources consulted ({msg.citations.length})
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {msg.citations.map((cit) => (
                            <button
                              key={cit.source_id}
                              onClick={() => handleCitationClick(cit)}
                              className={`flex items-center gap-1.5 text-xs font-mono border-2 px-2.5 py-1 hover:bg-brutalist-ink hover:text-brutalist-bg transition-colors ${
                                selectedCitation?.chunk_id === cit.chunk_id
                                  ? 'border-brutalist-ink bg-brutalist-ink text-brutalist-bg'
                                  : 'border-brutalist-ink/30 text-brutalist-ink bg-brutalist-bg'
                              }`}
                            >
                              <span>[Source {cit.source_id}]</span>
                              <span className="opacity-75 truncate max-w-[80px]">{cit.filename}</span>
                              <span className="opacity-60 num-mono">P.{cit.page_number}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="mt-6 pt-3 border-t border-brutalist-ink/10 flex justify-end gap-3 text-xs font-mono">
                      <button
                        onClick={() => handleCopyText(msg.content, index)}
                        className="flex items-center gap-1 hover:text-brutalist-active transition-colors font-bold"
                      >
                        {copiedIndex === index ? (
                          <>
                            <Check className="w-3.5 h-3.5" /> COPIED
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> COPY FINDINGS
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          // Find index of the query for this assistant message
                          const queryIndex = messages.slice(0, index).map(m => m.role).lastIndexOf('user');
                          handleRegenerate(queryIndex);
                        }}
                        className="flex items-center gap-1 hover:text-brutalist-active transition-colors font-bold"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> RE-EVALUATE
                      </button>
                    </div>

                  </div>
                </div>
              );
            })
          )}

          {/* AI thinking state indicator */}
          {querying && (
            <div className="flex justify-start pr-12">
              <div className="border-2 border-brutalist-ink p-5 bg-white max-w-md w-full relative shadow-[4px_4px_0px_#050816]">
                <div className="flex items-center gap-3 font-mono text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-brutalist-active" />
                  <span className="font-bold tracking-wider uppercase animate-pulse">
                    Synthesizing knowledge index matching coordinates...
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={messageEndRef} />
        </div>

        {/* Input Bar Form */}
        <form 
          onSubmit={handleQuerySubmit} 
          className="p-6 border-t-2 border-brutalist-ink bg-brutalist-bg sticky bottom-0"
        >
          <div className="relative flex items-center border-2 border-brutalist-ink bg-white shadow-[4px_4px_0px_rgba(5,8,22,0.15)] focus-within:shadow-[6px_6px_0px_#050816] transition-all">
            <input
              type="text"
              placeholder="ENTER HYPOTHESIS QUERY..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={querying}
              className="flex-1 bg-transparent p-4 font-mono text-sm outline-none placeholder-brutalist-muted select-text"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || querying}
              className="p-4 bg-brutalist-ink text-brutalist-bg hover:bg-brutalist-active hover:text-brutalist-bg disabled:opacity-30 disabled:hover:bg-brutalist-ink disabled:hover:text-brutalist-bg transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-2 text-[10px] font-mono text-brutalist-muted uppercase flex justify-between">
            <span>Press Enter to Submit</span>
            <span>OpenRouter LLM System V1.5</span>
          </div>
        </form>
      </div>

      {/* Right Column: Referenced Pages Viewer */}
      <div className="w-80 h-full flex flex-col overflow-hidden bg-brutalist-bg">
        <div className="p-6 border-b-2 border-brutalist-ink bg-brutalist-bg">
          <span className="text-xs font-mono font-bold tracking-widest text-brutalist-muted uppercase">04 / ARCHIVE</span>
          <h2 className="text-xl font-editorial font-extrabold tracking-tight mt-1">REFERENCED PAGES</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {selectedCitation ? (
            <div className="space-y-6">
              {/* Confidence Badge */}
              <div className="border-2 border-brutalist-ink p-4 bg-white shadow-[3px_3px_0px_#050816]">
                <div className="text-[9px] font-mono text-brutalist-muted uppercase mb-1">COGNITIVE MATCH SCORE</div>
                <div className="text-2xl font-editorial font-black num-mono text-brutalist-ink">
                  {Math.round((selectedCitation.score + 1) * 50)}% CONFIDENCE
                </div>
              </div>

              {/* Source Details */}
              <div className="space-y-2">
                <div className="text-[10px] font-mono text-brutalist-muted uppercase tracking-wider pb-1 border-b border-brutalist-ink/20 flex gap-2">
                  <FileText className="w-3.5 h-3.5 text-brutalist-ink" /> CITATION PARAMETERS
                </div>
                <div className="text-xs font-mono space-y-1">
                  <div className="truncate"><span className="font-bold">FILE:</span> {selectedCitation.filename}</div>
                  <div><span className="font-bold">PAGE NUMBER:</span> {selectedCitation.page_number}</div>
                  <div><span className="font-bold">SOURCE CHUNK ID:</span> <span className="text-[10px] opacity-75">{selectedCitation.chunk_id}</span></div>
                </div>
              </div>

              {/* Verified Text Passage Excerpt */}
              <div className="space-y-2">
                <div className="text-[10px] font-mono text-brutalist-muted uppercase tracking-wider pb-1 border-b border-brutalist-ink/20">
                  VERIFIED TEXT EXCERPT
                </div>
                <div className="border-2 border-brutalist-ink p-4 bg-brutalist-bg font-sans text-xs leading-relaxed italic text-brutalist-ink select-text whitespace-pre-wrap">
                  "{selectedCitation.text}"
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-4 text-brutalist-muted">
              <FileText className="w-8 h-8 mb-4 opacity-50" />
              <span className="text-xs font-mono uppercase">
                Select an inline [Source] citation tag to review document coordinate verification logs
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Extra local loader since lucide doesn't have loader by default in some lists
function Loader2({ className }) {
  return (
    <svg 
      className={className} 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
  );
}

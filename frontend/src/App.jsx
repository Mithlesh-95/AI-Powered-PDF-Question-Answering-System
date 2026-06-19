import React, { useState } from 'react';
import LandingPage from './components/LandingPage';
import Navigation from './components/Navigation';
import KnowledgeVault from './components/KnowledgeVault';
import ResearchConsole from './components/ResearchConsole';
import Observatory from './components/Observatory';
import Laboratory from './components/Laboratory';

export default function App() {
  const [view, setView] = useState('landing'); // 'landing', 'workspace'
  const [workspaceTab, setWorkspaceTab] = useState('workspace'); // 'workspace', 'observatory', 'laboratory'
  const [activeDocumentIds, setActiveDocumentIds] = useState([]);

  const handleEnterWorkspace = () => {
    setView('workspace');
    setWorkspaceTab('workspace');
  };

  return (
    <div className="min-h-screen bg-brutalist-bg flex flex-col font-sans select-none text-brutalist-ink">
      
      {/* Dynamic Navigation rendering for workspace */}
      {view === 'workspace' && (
        <Navigation
          activeTab={workspaceTab}
          onTabChange={setWorkspaceTab}
          onGoHome={() => setView('landing')}
        />
      )}

      {/* Main viewport panels router */}
      <div className="flex-1 w-full overflow-hidden">
        {view === 'landing' ? (
          <LandingPage
            onEnterWorkspace={handleEnterWorkspace}
            onFileDropped={(file) => {
              setView('workspace');
              setWorkspaceTab('workspace');
              // Trigger upload simulation in Vault component via key modal delay
              setTimeout(() => {
                const input = document.getElementById('vault-file-input');
                if (input) {
                  // Simulate file loading by mounting it
                  const dataTransfer = new DataTransfer();
                  dataTransfer.items.add(file);
                  input.files = dataTransfer.files;
                  input.dispatchEvent(new Event('change', { bubbles: true }));
                }
              }, 400);
            }}
          />
        ) : (
          <div className="h-[calc(100vh-80px)] w-full">
            {workspaceTab === 'workspace' && (
              <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] h-full w-full overflow-hidden">
                <KnowledgeVault
                  activeDocumentIds={activeDocumentIds}
                  onSelectDocument={setActiveDocumentIds}
                />
                <ResearchConsole
                  activeDocumentIds={activeDocumentIds}
                />
              </div>
            )}

            {workspaceTab === 'observatory' && <Observatory />}

            {workspaceTab === 'laboratory' && (
              <Laboratory />
            )}
          </div>
        )}
      </div>

    </div>
  );
}

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import useEscapeKey from '@/hooks/useEscapeKey';
import { getPairCacheKey } from '@/lib/aiHelpers';
import MatchExplorer from '@/components/MatchExplorer';
import type {
  Profile, MatchResult, AIPitchResponse, JourneyStage, PartnerPreferences, SentRecord,
} from '@/types/matchmaking';
import LoginScreen from '@/components/dashboard/LoginScreen';
import CustomerSidebar from '@/components/dashboard/CustomerSidebar';
import CandidatePoolTable from '@/components/dashboard/CandidatePoolTable';
import useToast from '@/hooks/useToast';
import CustomerBiodata from '@/components/dashboard/CustomerBiodata';
import CustomerNotes from '@/components/dashboard/CustomerNotes';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import useFilteredCustomers from '@/hooks/useFilteredCustomers';
import ToastNotification from '@/components/dashboard/ToastNotification';
import ClientHeader from '@/components/dashboard/ClientHeader';
import DashboardTabs, { type DashboardTab } from '@/components/dashboard/DashboardTabs';
import MatchPitchModal from '@/components/dashboard/MatchPitchModal';

// Demo credentials, shown on the login screen so reviewers can sign in. They are verified server-side.
const DEMO_EMAIL = 'simran@thedatecrew.com';
const DEMO_PASSWORD = 'tdc-matchmaker-2026';

type Draft = { subject?: string; body?: string };

export default function MatchmakerDashboard() {
  // Auth state. `booting` is true until we know whether a valid session cookie already exists.
  const [booting, setBooting] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [loginError, setLoginError] = useState('');
  const [matchmakerName, setMatchmakerName] = useState('Matchmaker');

  // Server-backed data (loaded from /api/customer; nothing is bundled into the browser)
  const [customers, setCustomers] = useState<Profile[]>([]);
  const [poolCount, setPoolCount] = useState(0);
  const [shortlist, setShortlist] = useState<Record<string, boolean>>({});
  const [sentMatches, setSentMatches] = useState<Record<string, SentRecord>>({});

  // UI state
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('All');
  const [activeTab, setActiveTab] = useState<DashboardTab>('matches');
  const [newNoteText, setNewNoteText] = useState('');

  // Pool tab (fetched on demand from /api/pool)
  const [poolCandidates, setPoolCandidates] = useState<Profile[]>([]);
  const [poolTotal, setPoolTotal] = useState(0);
  const [poolQuery, setPoolQuery] = useState('');
  const [poolLoading, setPoolLoading] = useState(false);

  // AI pitch state (keyed by preference signature so it only changes when preferences/notes change)
  const [aiCache, setAiCache] = useState<Record<string, AIPitchResponse>>({});
  const [loadingAiKey, setLoadingAiKey] = useState<string | null>(null);
  const [activeModalMatch, setActiveModalMatch] = useState<MatchResult | null>(null);
  const [activeModalWeights, setActiveModalWeights] = useState<Record<string, number> | undefined>(undefined);
  const [activeModalPrefs, setActiveModalPrefs] = useState<PartnerPreferences | undefined>(undefined);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const { toastMessage, showToast } = useToast();

  useEscapeKey(() => setActiveModalMatch(null));

  const selectedClient = useMemo(
    () => customers.find((c) => c.id === selectedClientId) || customers[0],
    [customers, selectedClientId]
  );
  const filteredCustomers = useFilteredCustomers(customers, searchQuery, stageFilter);

  /* ---------------------------- data loading ---------------------------- */

  /** Loads everything for the dashboard. Returns false if there is no valid session (HTTP 401). */
  const loadDashboard = useCallback(async (): Promise<boolean> => {
    const response = await fetch('/api/customer', { credentials: 'same-origin', cache: 'no-store' });
    if (response.status === 401) return false;
    if (!response.ok) throw new Error('Could not load dashboard data');

    const data = await response.json();
    if (!Array.isArray(data.customers) || data.customers.length === 0) {
      throw new Error('Invalid or empty dashboard data');
    }
    const sent: Record<string, SentRecord> = data.sent ?? {};
    setMatchmakerName(data.matchmaker?.name ?? 'Matchmaker');
    setCustomers(data.customers);
    setSelectedClientId((current) => current || data.customers[0].id);
    setPoolCount(data.poolCount ?? 0);
    setShortlist(data.shortlist ?? {});
    setSentMatches(sent);
    // Re-opening a sent match shows the exact email that was sent
    setAiCache((prev) => ({ ...Object.fromEntries(Object.entries(sent).map(([key, rec]) => [key, rec.pitch])), ...prev }));
    setIsLoggedIn(true);
    return true;
  }, []);

  // Restore the session on page load (the cookie survives a refresh; the React state does not)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadDashboard();
      } catch {
        /* fall through to the login screen */
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadDashboard]);

  // Pool tab: fetch the opposite-gender pool (filtered on the server) when the tab is open
  useEffect(() => {
    if (!isLoggedIn || activeTab !== 'pool' || !selectedClientId) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setPoolLoading(true);
      try {
        const res = await fetch(
          `/api/pool?clientId=${encodeURIComponent(selectedClientId)}&q=${encodeURIComponent(poolQuery)}`,
          { credentials: 'same-origin', signal: controller.signal }
        );
        if (res.ok) {
          const data = await res.json();
          setPoolCandidates(data.candidates);
          setPoolTotal(data.total);
        }
      } catch {
        /* aborted or offline: keep the previous rows */
      } finally {
        if (!controller.signal.aborted) setPoolLoading(false);
      }
    }, poolQuery ? 250 : 0);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [isLoggedIn, activeTab, selectedClientId, poolQuery]);

  /* ------------------------------ mutations ------------------------------ */

  const updateCustomerApi = async (payload: Record<string, unknown>) => {
    const response = await fetch('/api/customer', {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (response.status === 401) {
      setIsLoggedIn(false);
      setLoginError('Your session expired. Please log in again.');
      throw new Error('Session expired');
    }
    if (!response.ok) throw new Error(result.error ?? 'Update failed');
    return result;
  };

  /** The server always returns the fully merged customer (profile + all notes + preferences). */
  const applyCustomer = (updated: Profile) =>
    setCustomers((previous) => previous.map((c) => (c.id === updated.id ? updated : c)));

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: username, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setLoginError(data.error ?? 'Invalid credentials');
        return;
      }
      if (!(await loadDashboard())) throw new Error('Could not start your session');
    } catch (error) {
      await fetch('/api/auth', { method: 'DELETE', credentials: 'same-origin' }).catch(() => undefined);
      setLoginError(error instanceof Error ? error.message : 'Unable to connect to the server');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth', { method: 'DELETE', credentials: 'same-origin' });
    } finally {
      setIsLoggedIn(false);
      setCustomers([]);
      setShortlist({});
      setSentMatches({});
      setAiCache({});
      setDrafts({});
      setSelectedClientId('');
      setActiveModalMatch(null);
      setPassword('');
    }
  };

  const handleStatusChange = async (newStage: JourneyStage) => {
    try {
      const result = await updateCustomerApi({ clientId: selectedClient.id, action: 'updateStage', statusTag: newStage });
      applyCustomer(result.customer);
      showToast('Customer stage updated');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Update failed');
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = newNoteText.trim();
    if (!text) return;
    try {
      const result = await updateCustomerApi({ clientId: selectedClient.id, action: 'addNote', text });
      applyCustomer(result.customer);
      setNewNoteText('');
      showToast('Call note saved');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not save note');
    }
  };

  const handleSavePreferences = async (preferences: PartnerPreferences) => {
    try {
      const result = await updateCustomerApi({ clientId: selectedClient.id, action: 'updatePreferences', preferences });
      applyCustomer(result.customer);
      showToast('Dealbreakers saved');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not save dealbreakers');
    }
  };

  const toggleShortlist = async (candidateId: string) => {
    const key = `${selectedClient.id}_${candidateId}`;
    const next = !shortlist[key];
    try {
      // Explicit value (not "toggle") so the server and browser can never drift apart
      const result = await updateCustomerApi({ clientId: selectedClient.id, action: 'setShortlist', candidateId, value: next });
      setShortlist((previous) => ({ ...previous, [key]: Boolean(result.shortlisted) }));
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not update shortlist');
    }
  };

  /* ------------------------------ AI pitch ------------------------------ */

  const triggerAiAnalysisAndModal = async (
    match: MatchResult,
    weights?: Record<string, number>,
    preferences?: PartnerPreferences,
    forceRefresh = false
  ) => {
    const prefCacheKey = getPairCacheKey(selectedClient, match.candidate.id, weights);
    const simpleKey = `${selectedClient.id}_${match.candidate.id}`;
    setActiveModalMatch(match);
    setActiveModalWeights(weights);
    setActiveModalPrefs(preferences);

    // Reuse a cached pitch, or the exact email that was already sent
    if (!forceRefresh && (aiCache[prefCacheKey] || (sentMatches[simpleKey] && aiCache[simpleKey]))) return;

    setLoadingAiKey(prefCacheKey);
    try {
      // IDs only: the server looks up both profiles and recomputes the score itself
      const res = await fetch('/api/ai-pitch', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClient.id,
          candidateId: match.candidate.id,
          weights,
          preferences,
          forceRefresh,
        }),
      });
      if (!res.ok) throw new Error('AI pitch request failed');
      const data: AIPitchResponse = await res.json();
      setAiCache((prev) => ({ ...prev, [prefCacheKey]: data, [simpleKey]: data }));
    } catch (err) {
      console.error(err);
      setActiveModalMatch(null);
      showToast('Could not generate the AI pitch. Please try again.');
    } finally {
      setLoadingAiKey(null);
    }
  };

  const handleConfirmSendMatch = async (match: MatchResult) => {
    const simpleKey = `${selectedClient.id}_${match.candidate.id}`;
    const prefKey = getPairCacheKey(selectedClient, match.candidate.id, activeModalWeights);
    const base = aiCache[prefKey] ?? aiCache[simpleKey];
    if (!base) return;

    // Send exactly what the matchmaker sees, including any edits to the subject and body
    const pitch: AIPitchResponse = {
      ...base,
      emailSubject: drafts[prefKey]?.subject ?? base.emailSubject,
      emailBody: drafts[prefKey]?.body ?? base.emailBody,
    };

    try {
      const result = await updateCustomerApi({
        clientId: selectedClient.id,
        action: 'markSent',
        candidateId: match.candidate.id,
        score: match.totalScore,
        pitch,
      });
      const record: SentRecord = result.sent;
      setSentMatches((previous) => ({ ...previous, [simpleKey]: record }));
      setAiCache((previous) => ({ ...previous, [simpleKey]: record.pitch }));
      setActiveModalMatch(null);
      showToast('Intro email sent and recorded');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not record match');
    }
  };

  const setDraft = (key: string, patch: Draft) =>
    setDrafts((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  /* -------------------------------- views -------------------------------- */

  if (booting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 text-stone-500 gap-2 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading your dashboard…
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <LoginScreen
        username={username}
        password={password}
        loginError={loginError}
        demoEmail={DEMO_EMAIL}
        demoPassword={DEMO_PASSWORD}
        onUsernameChange={setUsername}
        onPasswordChange={setPassword}
        onSubmit={handleLogin}
      />
    );
  }

  const selectedSimpleKey = (match: MatchResult) => `${selectedClient.id}_${match.candidate.id}`;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col">
      <ToastNotification message={toastMessage} />

      <DashboardHeader matchmakerName={matchmakerName} customerCount={customers.length} onLogout={handleLogout} />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 max-w-[1600px] w-full mx-auto">
        <CustomerSidebar
          customers={filteredCustomers}
          selectedClientId={selectedClient.id}
          searchQuery={searchQuery}
          stageFilter={stageFilter}
          onSearchChange={setSearchQuery}
          onStageFilterChange={setStageFilter}
          onSelectClient={setSelectedClientId}
        />

        <main className="lg:col-span-9 p-6 space-y-6 overflow-y-auto">
          <ClientHeader client={selectedClient} onStageChange={handleStatusChange} />

          <DashboardTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            notesCount={selectedClient.notes?.length || 0}
            oppositeGenderPoolCount={poolCount}
          />

          {/* TAB 1: match explorer. key resets sliders and filters when switching client. */}
          {activeTab === 'matches' && (
            <MatchExplorer
              key={selectedClient.id}
              client={selectedClient}
              sent={sentMatches}
              shortlist={shortlist}
              aiCache={aiCache}
              onToggleShortlist={toggleShortlist}
              onPitch={(match, weights, preferences) => triggerAiAnalysisAndModal(match, weights, preferences, false)}
              onSavePreferences={handleSavePreferences}
            />
          )}

          {/* TAB 2: biodata and call notes */}
          {activeTab === 'biodata' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <CustomerBiodata client={selectedClient} />
              <CustomerNotes
                client={selectedClient}
                noteText={newNoteText}
                onNoteTextChange={setNewNoteText}
                onSubmit={handleAddNote}
              />
            </div>
          )}

          {/* TAB 3: opposite-gender pool, filtered on the server */}
          {activeTab === 'pool' && (
            <CandidatePoolTable
              candidates={poolCandidates}
              total={poolTotal}
              clientGender={selectedClient.gender}
              query={poolQuery}
              loading={poolLoading}
              onQueryChange={setPoolQuery}
            />
          )}
        </main>
      </div>

      {activeModalMatch && (
        <MatchPitchModal
          client={selectedClient}
          match={activeModalMatch}
          weights={activeModalWeights}
          sentRecord={sentMatches[selectedSimpleKey(activeModalMatch)]}
          aiCache={aiCache}
          loadingAiKey={loadingAiKey}
          drafts={drafts}
          onRegenerate={() => triggerAiAnalysisAndModal(activeModalMatch, activeModalWeights, activeModalPrefs, true)}
          onClose={() => setActiveModalMatch(null)}
          onDraftChange={setDraft}
          onConfirmSend={handleConfirmSendMatch}
        />
      )}
    </div>
  );
}

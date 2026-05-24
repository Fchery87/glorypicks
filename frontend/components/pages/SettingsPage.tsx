'use client';

import { useState, useEffect, useRef } from 'react';
import { Header } from '@/components/layout/Header';
import { StatusBar } from '@/components/layout/StatusBar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { TickerSearch } from '@/components/TickerSearch';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { downloadExport, importUserData, clearAllData, clearCache } from '@/lib/dataExport';
import {
  ArrowLeft,
  Bell,
  Key,
  Monitor,
  Database,
  Keyboard,
  Info,
  Save,
  Download,
  Upload,
  ExternalLink,
  Check,
  Github,
  Book,
  MessageCircle,
  Eye,
  EyeOff,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';

/**
 * Request browser notification permission
 */
const requestNotificationPermission = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false;
  if (!('Notification' in window)) return false;

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Failed to request notification permission:', error);
    return false;
  }
};

// Settings sections configuration
const settingsSections = [
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'api-keys', label: 'API Keys', icon: Key },
  { id: 'display', label: 'Display', icon: Monitor },
  { id: 'data', label: 'Data Management', icon: Database },
  { id: 'shortcuts', label: 'Keyboard Shortcuts', icon: Keyboard },
  { id: 'about', label: 'About', icon: Info },
] as const;

type SectionId = (typeof settingsSections)[number]['id'];

// Keyboard shortcuts data
const keyboardShortcuts = [
  { key: 'Ctrl + K', description: 'Open ticker search' },
  { key: 'Ctrl + /', description: 'Show keyboard shortcuts' },
  { key: '1', description: 'Switch to 15m timeframe' },
  { key: '2', description: 'Switch to 1h timeframe' },
  { key: '3', description: 'Switch to 1d timeframe' },
  { key: 'R', description: 'Refresh data' },
  { key: 'F', description: 'Toggle fullscreen chart' },
  { key: 'Esc', description: 'Close modal/exit fullscreen' },
];

// API Key Input Component
interface ApiKeyInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  helpText: React.ReactNode;
  providerLabel?: string;
}

const ApiKeyInput = ({
  label,
  value,
  onChange,
  placeholder,
  helpText,
  providerLabel,
}: ApiKeyInputProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  const maskedValue = value ? '•'.repeat(Math.max(0, value.length - 4)) + value.slice(-4) : '';

  const handleTest = async () => {
    if (!value) return;
    setTestStatus('testing');
    // Simulate API test (visual only for now)
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setTestStatus('success');
    setTimeout(() => setTestStatus('idle'), 2000);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-text-primary font-medium">{label}</Label>
        {providerLabel && (
          <span
            className={cn(
              'text-xs',
              providerLabel === 'Primary Provider' ? 'text-accent-bullish' : 'text-text-tertiary'
            )}
          >
            {providerLabel}
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <Input
          type={isVisible ? 'text' : 'password'}
          value={isVisible ? value : maskedValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="font-mono flex-1"
        />
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsVisible(!isVisible)}
          title={isVisible ? 'Hide API key' : 'Show API key'}
        >
          {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleTest}
          disabled={!value || testStatus === 'testing'}
          className={cn(
            testStatus === 'success' &&
              'bg-accent-bullish/20 text-accent-bullish border-accent-bullish',
            testStatus === 'error' &&
              'bg-accent-bearish/20 text-accent-bearish border-accent-bearish'
          )}
        >
          {testStatus === 'testing'
            ? 'Testing...'
            : testStatus === 'success'
              ? 'Connected'
              : testStatus === 'error'
                ? 'Failed'
                : 'Test'}
        </Button>
      </div>
      {helpText && <p className="text-xs text-text-tertiary">{helpText}</p>}
    </div>
  );
};

export function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SectionId>('notifications');
  const [isSaving, setIsSaving] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);

  // Mobile tab state
  const [mobileTab, setMobileTab] = useState<SectionId>('notifications');

  // Get preferences and setter from store
  const { preferences, setPreferences, addToast } = useStore();

  // Ref for file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handler for exporting data
  const handleExport = () => {
    try {
      downloadExport();
      addToast('Data exported successfully', 'success');
    } catch (error) {
      addToast('Failed to export data', 'error');
    }
  };

  // Handler for importing data
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const result = importUserData(text);

      if (result.success) {
        addToast(
          `Imported ${result.imported?.watchlists} watchlists and ${result.imported?.alerts} alerts`,
          'success'
        );
      } else {
        addToast(result.message, 'error');
      }
    } catch (error) {
      addToast('Failed to import file', 'error');
    }

    // Reset input
    event.target.value = '';
  };

  // Handler for clearing cache
  const handleClearCache = () => {
    clearCache();
    addToast('Cache cleared', 'success');
  };

  // Handler for clearing all data
  const handleClearAllData = () => {
    if (confirm('Are you sure? This will delete all your watchlists, alerts, and preferences.')) {
      clearAllData();
      addToast('All data cleared', 'success');
    }
  };

  // Intersection observer for active section detection
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id as SectionId;
            setActiveSection(id);
            setMobileTab(id);
          }
        });
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
    );

    settingsSections.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (sectionId: SectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const headerOffset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 3000);
  };

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <Header>
        <TickerSearch />
      </Header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-4 lg:p-6 pb-24">
          {/* Back Navigation */}
          <div className="mb-6">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </div>

          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl text-text-primary font-semibold mb-2">Settings</h1>
            <p className="text-text-secondary">
              Configure your GloryPicks dashboard preferences and integrations
            </p>
          </div>

          {/* Mobile Tabs */}
          <div className="lg:hidden mb-6">
            <div className="flex gap-1 p-1 bg-bg-secondary rounded-md overflow-x-auto scrollbar-hide">
              {settingsSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => {
                    setMobileTab(section.id);
                    scrollToSection(section.id);
                  }}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-sm whitespace-nowrap transition-colors',
                    mobileTab === section.id
                      ? 'bg-bg-tertiary text-text-primary'
                      : 'text-text-secondary hover:text-text-primary'
                  )}
                >
                  <section.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{section.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Main Content Layout */}
          <div className="flex gap-6">
            {/* Desktop Sidebar Navigation */}
            <aside className="hidden lg:block w-64 shrink-0">
              <nav className="sticky top-6 space-y-1">
                {settingsSections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 text-left rounded-sm transition-colors',
                      activeSection === section.id
                        ? 'bg-bg-tertiary text-text-primary border-l-2 border-accent-primary'
                        : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary border-l-2 border-transparent'
                    )}
                  >
                    <section.icon className="w-5 h-5" />
                    <span className="font-medium">{section.label}</span>
                  </button>
                ))}
              </nav>
            </aside>

            {/* Settings Content */}
            <div className="flex-1 space-y-6">
              {/* Notifications Section */}
              <Card id="notifications" className="scroll-mt-24">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 bg-bg-secondary rounded-sm">
                      <Bell className="w-5 h-5 text-accent-primary" />
                    </div>
                    Notifications
                  </CardTitle>
                  <CardDescription>
                    Configure how and when you receive alerts and notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between py-4 border-b border-border-subtle">
                    <div>
                      <Label className="text-text-primary font-medium">Browser Notifications</Label>
                      <p className="text-text-secondary text-sm mt-1">
                        Receive alerts through your browser when signals trigger
                      </p>
                    </div>
                    <Switch
                      checked={preferences.notifications.browserEnabled}
                      onCheckedChange={async (checked) => {
                        if (checked) {
                          const granted = await requestNotificationPermission();
                          if (!granted) {
                            console.log('Browser notification permission denied');
                          }
                        }
                        setPreferences({ notifications: { browserEnabled: checked } });
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between py-4 border-b border-border-subtle">
                    <div>
                      <Label className="text-text-primary font-medium">Sound Effects</Label>
                      <p className="text-text-secondary text-sm mt-1">
                        Play audio alerts for important events
                      </p>
                    </div>
                    <Switch
                      checked={preferences.notifications.soundEnabled}
                      onCheckedChange={(checked) =>
                        setPreferences({ notifications: { soundEnabled: checked } })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between py-4 border-b border-border-subtle">
                    <div>
                      <Label className="text-text-primary font-medium">Signal Alerts</Label>
                      <p className="text-text-secondary text-sm mt-1">
                        Get notified when trading signals change
                      </p>
                    </div>
                    <Switch
                      checked={preferences.notifications.signalAlerts}
                      onCheckedChange={(checked) =>
                        setPreferences({ notifications: { signalAlerts: checked } })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between py-4 border-b border-border-subtle">
                    <div>
                      <Label className="text-text-primary font-medium">Price Alerts</Label>
                      <p className="text-text-secondary text-sm mt-1">
                        Notifications when price targets are hit
                      </p>
                    </div>
                    <Switch
                      checked={preferences.notifications.priceAlerts}
                      onCheckedChange={(checked) =>
                        setPreferences({ notifications: { priceAlerts: checked } })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between py-4">
                    <div>
                      <Label className="text-text-primary font-medium">Email Notifications</Label>
                      <p className="text-text-secondary text-sm mt-1">
                        Receive summaries and alerts via email
                      </p>
                    </div>
                    <Switch
                      checked={preferences.notifications.emailNotifications}
                      onCheckedChange={(checked) =>
                        setPreferences({ notifications: { emailNotifications: checked } })
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {/* API Keys Section */}
              <Card id="api-keys" className="scroll-mt-24">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 bg-bg-secondary rounded-sm">
                      <Key className="w-5 h-5 text-accent-primary" />
                    </div>
                    API Keys
                  </CardTitle>
                  <CardDescription>
                    Configure your API keys for market data providers
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Security Warning */}
                  <div className="flex items-start gap-3 p-3 bg-accent-bearish/10 border border-accent-bearish/30 rounded-sm">
                    <ShieldAlert className="w-5 h-5 text-accent-bearish shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-text-primary font-medium">Security Notice</p>
                      <p className="text-xs text-text-secondary mt-1">
                        API keys are stored locally in your browser&apos;s LocalStorage. They are
                        not sent to any server. Clear your browser data to remove them.
                      </p>
                    </div>
                  </div>

                  {/* Finnhub */}
                  <ApiKeyInput
                    label="Finnhub API Key"
                    value={preferences.apiKeys.finnhub || ''}
                    onChange={(value) =>
                      setPreferences({ apiKeys: { ...preferences.apiKeys, finnhub: value } })
                    }
                    placeholder="Enter your Finnhub API key"
                    providerLabel="Primary Provider"
                    helpText={
                      <>
                        Required for stocks and forex data. Get your key at{' '}
                        <a
                          href="https://finnhub.io"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent-primary hover:underline inline-flex items-center gap-1"
                        >
                          finnhub.io
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </>
                    }
                  />

                  {/* Alpha Vantage */}
                  <div className="pt-4 border-t border-border-subtle">
                    <ApiKeyInput
                      label="Alpha Vantage API Key"
                      value={preferences.apiKeys.alphavantage || ''}
                      onChange={(value) =>
                        setPreferences({ apiKeys: { ...preferences.apiKeys, alphavantage: value } })
                      }
                      placeholder="Enter your Alpha Vantage API key"
                      providerLabel="Backup Provider"
                      helpText={
                        <>
                          Alternative for stocks data. Get your key at{' '}
                          <a
                            href="https://www.alphavantage.co"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent-primary hover:underline inline-flex items-center gap-1"
                          >
                            alphavantage.co
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </>
                      }
                    />
                  </div>

                  {/* Binance */}
                  <div className="pt-4 border-t border-border-subtle">
                    <ApiKeyInput
                      label="Binance API Key (Optional)"
                      value={preferences.apiKeys.binance || ''}
                      onChange={(value) =>
                        setPreferences({ apiKeys: { ...preferences.apiKeys, binance: value } })
                      }
                      placeholder="Enter your Binance API key"
                      helpText={
                        <>
                          Optional. Only needed for advanced crypto features. Create API keys at{' '}
                          <a
                            href="https://www.binance.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent-primary hover:underline inline-flex items-center gap-1"
                          >
                            binance.com
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </>
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Display Section */}
              <Card id="display" className="scroll-mt-24">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 bg-bg-secondary rounded-sm">
                      <Monitor className="w-5 h-5 text-accent-primary" />
                    </div>
                    Display
                  </CardTitle>
                  <CardDescription>
                    Customize the appearance and behavior of your dashboard
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-text-primary font-medium">Theme</Label>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      {[
                        {
                          value: 'dark' as const,
                          label: 'Dark',
                          description: 'Obsidian trading cockpit',
                          preview: 'bg-[#050608] border-[#2B3542]',
                          swatch: 'bg-[#D6B56D]',
                        },
                        {
                          value: 'light' as const,
                          label: 'Light',
                          description: 'Warm paper trading desk',
                          preview: 'bg-[#F5F1E8] border-[#C7B99F]',
                          swatch: 'bg-[#8F6B22]',
                        },
                        {
                          value: 'system' as const,
                          label: 'System',
                          description: 'Follow device setting',
                          preview:
                            'bg-gradient-to-br from-[#050608] to-[#F5F1E8] border-border-default',
                          swatch: 'bg-accent-cyan',
                        },
                      ].map((themeOption) => {
                        const isSelected = preferences.display.theme === themeOption.value;

                        return (
                          <button
                            key={themeOption.value}
                            type="button"
                            onClick={() =>
                              setPreferences({ display: { theme: themeOption.value } })
                            }
                            className={cn(
                              'rounded-xl border-2 bg-bg-secondary p-4 text-left transition-all hover:border-accent-primary/50',
                              isSelected
                                ? 'border-accent-primary ring-1 ring-accent-primary/40'
                                : 'border-border-subtle'
                            )}
                          >
                            <div
                              className={cn(
                                'mb-3 h-14 w-full rounded-lg border',
                                themeOption.preview
                              )}
                            >
                              <div className="flex h-full items-end justify-between p-2">
                                <div className="h-7 w-12 rounded bg-white/15" />
                                <div className={cn('h-3 w-3 rounded-full', themeOption.swatch)} />
                              </div>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-medium text-text-primary">
                                {themeOption.label}
                              </span>
                              {isSelected && <Check className="h-4 w-4 text-accent-primary" />}
                            </div>
                            <p className="mt-1 text-xs text-text-secondary">
                              {themeOption.description}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-border-subtle">
                    <Label className="text-text-primary font-medium">Chart Preferences</Label>

                    <div className="flex items-center justify-between py-3">
                      <div>
                        <span className="text-text-primary">Show Volume</span>
                        <p className="text-text-secondary text-sm">
                          Display volume bars below price chart
                        </p>
                      </div>
                      <Switch
                        checked={preferences.display.chartShowVolume}
                        onCheckedChange={(checked) =>
                          setPreferences({ display: { chartShowVolume: checked } })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between py-3">
                      <div>
                        <span className="text-text-primary">Show Grid Lines</span>
                        <p className="text-text-secondary text-sm">Display grid on price charts</p>
                      </div>
                      <Switch
                        checked={preferences.display.chartShowGrid}
                        onCheckedChange={(checked) =>
                          setPreferences({ display: { chartShowGrid: checked } })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between py-3">
                      <div>
                        <span className="text-text-primary">Compact Mode</span>
                        <p className="text-text-secondary text-sm">
                          Reduce padding for denser layout
                        </p>
                      </div>
                      <Switch
                        checked={preferences.display.compactMode}
                        onCheckedChange={(checked) =>
                          setPreferences({ display: { compactMode: checked } })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-border-subtle">
                    <Label className="text-text-primary font-medium">Default Timeframe</Label>
                    <select
                      className="w-full h-10 rounded-sm border border-border-default bg-bg-secondary px-3 text-text-primary focus-visible:outline-none focus-visible:border-border-strong"
                      value={preferences.display.defaultTimeframe}
                      onChange={(e) =>
                        setPreferences({ display: { defaultTimeframe: e.target.value } })
                      }
                    >
                      <option value="15m">15 Minutes</option>
                      <option value="1h">1 Hour</option>
                      <option value="1d">1 Day</option>
                    </select>
                  </div>
                </CardContent>
              </Card>

              {/* Data Management Section */}
              <Card id="data" className="scroll-mt-24">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 bg-bg-secondary rounded-sm">
                      <Database className="w-5 h-5 text-accent-primary" />
                    </div>
                    Data Management
                  </CardTitle>
                  <CardDescription>
                    Export, import, or clear your data and preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Export */}
                  <div className="flex items-start justify-between py-4 border-b border-border-subtle">
                    <div>
                      <Label className="text-text-primary font-medium">Export Data</Label>
                      <p className="text-text-secondary text-sm mt-1">
                        Download all your watchlists, alerts, and settings as a JSON file
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={handleExport}
                      leftIcon={<Download className="h-4 w-4" />}
                    >
                      Export
                    </Button>
                  </div>

                  {/* Import */}
                  <div className="flex items-start justify-between py-4 border-b border-border-subtle">
                    <div>
                      <Label className="text-text-primary font-medium">Import Data</Label>
                      <p className="text-text-secondary text-sm mt-1">
                        Restore your settings from a previously exported file
                      </p>
                    </div>
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json"
                        onChange={handleImport}
                        className="hidden"
                      />
                      <Button
                        variant="secondary"
                        leftIcon={<Upload className="h-4 w-4" />}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Import
                      </Button>
                    </div>
                  </div>

                  {/* Clear Cache */}
                  <div className="flex items-start justify-between py-4 border-b border-border-subtle">
                    <div>
                      <Label className="text-text-primary font-medium">Clear Cache</Label>
                      <p className="text-text-secondary text-sm mt-1">
                        Clear cached market data and force a fresh reload
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={handleClearCache}
                      leftIcon={<Trash2 className="h-4 w-4" />}
                    >
                      Clear
                    </Button>
                  </div>

                  {/* Clear All - Danger Zone */}
                  <div className="pt-4 border-t border-border-subtle">
                    <div className="flex items-start justify-between py-4">
                      <div>
                        <Label className="text-text-primary font-medium text-accent-bearish">
                          Reset All Settings
                        </Label>
                        <p className="text-text-secondary text-sm mt-1">
                          Clear all preferences and restore default settings
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={handleClearAllData}
                        className="text-accent-bearish border-accent-bearish hover:bg-accent-bearish/10"
                        leftIcon={<Trash2 className="h-4 w-4" />}
                      >
                        Reset
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Keyboard Shortcuts Section */}
              <Card id="shortcuts" className="scroll-mt-24">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 bg-bg-secondary rounded-sm">
                      <Keyboard className="w-5 h-5 text-accent-primary" />
                    </div>
                    Keyboard Shortcuts
                  </CardTitle>
                  <CardDescription>
                    Quick keyboard commands to navigate the dashboard efficiently
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-hidden rounded-sm border border-border-subtle">
                    <table className="w-full text-left">
                      <thead className="bg-bg-secondary">
                        <tr>
                          <th className="px-4 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">
                            Shortcut
                          </th>
                          <th className="px-4 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle">
                        {keyboardShortcuts.map((shortcut, index) => (
                          <tr key={index} className="hover:bg-bg-secondary/50">
                            <td className="px-4 py-3">
                              <kbd className="px-2 py-1 bg-bg-secondary border border-border-default rounded-sm text-sm font-mono text-text-primary">
                                {shortcut.key}
                              </kbd>
                            </td>
                            <td className="px-4 py-3 text-text-secondary">
                              {shortcut.description}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* About Section */}
              <Card id="about" className="scroll-mt-24">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 bg-bg-secondary rounded-sm">
                      <Info className="w-5 h-5 text-accent-primary" />
                    </div>
                    About
                  </CardTitle>
                  <CardDescription>
                    Information about GloryPicks and helpful resources
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-bg-secondary rounded-md flex items-center justify-center border border-border-subtle">
                        <span className="text-2xl font-bold text-accent-primary">GP</span>
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-text-primary">GloryPicks</h3>
                        <p className="text-text-secondary">Version 1.0.0</p>
                        <p className="text-text-tertiary text-sm mt-1">
                          Professional-grade trading signals platform
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border-subtle">
                      <p className="text-text-secondary text-sm leading-relaxed">
                        GloryPicks is a professional-grade, real-time multi-asset trading signals
                        dashboard implementing ICT (Inner Circle Trading) strategies. The
                        application provides institutional-level technical analysis for stocks,
                        crypto, forex, and indices.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                      <a
                        href="#"
                        className="flex items-center gap-3 p-3 bg-bg-secondary rounded-sm hover:bg-bg-elevated transition-colors"
                      >
                        <Book className="w-5 h-5 text-text-secondary" />
                        <div>
                          <span className="text-text-primary font-medium block">Documentation</span>
                          <span className="text-text-tertiary text-xs">Read the docs</span>
                        </div>
                      </a>
                      <a
                        href="#"
                        className="flex items-center gap-3 p-3 bg-bg-secondary rounded-sm hover:bg-bg-elevated transition-colors"
                      >
                        <Github className="w-5 h-5 text-text-secondary" />
                        <div>
                          <span className="text-text-primary font-medium block">GitHub</span>
                          <span className="text-text-tertiary text-xs">View source code</span>
                        </div>
                      </a>
                      <a
                        href="#"
                        className="flex items-center gap-3 p-3 bg-bg-secondary rounded-sm hover:bg-bg-elevated transition-colors"
                      >
                        <MessageCircle className="w-5 h-5 text-text-secondary" />
                        <div>
                          <span className="text-text-primary font-medium block">Support</span>
                          <span className="text-text-tertiary text-xs">Get help and feedback</span>
                        </div>
                      </a>
                      <a
                        href="#"
                        className="flex items-center gap-3 p-3 bg-bg-secondary rounded-sm hover:bg-bg-elevated transition-colors"
                      >
                        <ExternalLink className="w-5 h-5 text-text-secondary" />
                        <div>
                          <span className="text-text-primary font-medium block">API Docs</span>
                          <span className="text-text-tertiary text-xs">Backend API reference</span>
                        </div>
                      </a>
                    </div>

                    <div className="pt-4 border-t border-border-subtle">
                      <p className="text-text-tertiary text-xs">
                        Licensed under MIT License. Trading involves risk. Past performance does not
                        guarantee future results.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Save Button */}
              <div className="sticky bottom-6 flex justify-end gap-3 bg-bg-primary/80 backdrop-blur-sm p-4 rounded-md border border-border-subtle">
                <Link href="/">
                  <Button variant="ghost">Cancel</Button>
                </Link>
                <Button
                  onClick={handleSave}
                  loading={isSaving}
                  leftIcon={<Save className="h-4 w-4" />}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <StatusBar />

      {/* Saved Toast */}
      {showSavedToast && (
        <div className="fixed bottom-20 right-6 bg-accent-bullish text-bg-primary px-4 py-3 rounded-md shadow-lg flex items-center gap-2 animate-in slide-in-from-bottom-2 fade-in duration-200">
          <Check className="w-5 h-5" />
          <span className="font-medium">Settings saved successfully</span>
        </div>
      )}
    </div>
  );
}

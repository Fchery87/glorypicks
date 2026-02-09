"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { StatusBar } from "@/components/layout/StatusBar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { TickerSearch } from "@/components/TickerSearch";
import { 
  ArrowLeft, 
  Bell, 
  Shield, 
  Eye, 
  Database,
  Save,
  RefreshCw
} from "lucide-react";
import Link from "next/link";

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState("general");
  const [isSaving, setIsSaving] = useState(false);

  // Mock settings state
  const [settings, setSettings] = useState({
    // General
    defaultSymbol: "AAPL",
    defaultTimeframe: "15m",
    autoRefresh: true,
    refreshInterval: 5,
    
    // Notifications
    priceAlerts: true,
    signalAlerts: true,
    emailNotifications: false,
    soundEffects: true,
    
    // Display
    showVolume: true,
    showGrid: true,
    compactMode: false,
    
    // API
    apiEndpoint: "http://localhost:8000",
    websocketEnabled: true,
  });

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <Header>
        <TickerSearch />
      </Header>

      <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-16">
        <div className="max-w-4xl mx-auto">
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
            <h1 className="text-h1 text-text-primary font-semibold mb-2">Settings</h1>
            <p className="text-text-secondary">
              Configure your GloryPicks dashboard preferences and notifications
            </p>
          </div>

          {/* Settings Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="general" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                <span className="hidden sm:inline">General</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">Notifications</span>
              </TabsTrigger>
              <TabsTrigger value="display" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                <span className="hidden sm:inline">Display</span>
              </TabsTrigger>
              <TabsTrigger value="api" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">API</span>
              </TabsTrigger>
            </TabsList>

            {/* General Settings */}
            <TabsContent value="general">
              <Card>
                <CardHeader>
                  <h2 className="text-h3 text-text-primary font-semibold">General Settings</h2>
                  <p className="text-text-secondary text-sm">Configure default behavior and preferences</p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Default Symbol</Label>
                      <Input 
                        value={settings.defaultSymbol}
                        onChange={(e) => setSettings({...settings, defaultSymbol: e.target.value})}
                        placeholder="e.g., AAPL"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Default Timeframe</Label>
                      <select 
                        className="w-full h-10 rounded-sm border border-border-default bg-bg-secondary px-3 text-text-primary focus-visible:outline-none focus-visible:border-border-strong"
                        value={settings.defaultTimeframe}
                        onChange={(e) => setSettings({...settings, defaultTimeframe: e.target.value})}
                      >
                        <option value="15m">15 Minutes</option>
                        <option value="1h">1 Hour</option>
                        <option value="1d">1 Day</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-4 border-t border-border-subtle">
                    <div>
                      <Label className="text-text-primary">Auto Refresh</Label>
                      <p className="text-text-secondary text-sm mt-1">
                        Automatically refresh data at intervals
                      </p>
                    </div>
                    <Switch 
                      checked={settings.autoRefresh}
                      onCheckedChange={(checked) => setSettings({...settings, autoRefresh: checked})}
                    />
                  </div>

                  {settings.autoRefresh && (
                    <div className="space-y-2">
                      <Label>Refresh Interval (seconds)</Label>
                      <Input 
                        type="number"
                        min={1}
                        max={60}
                        value={settings.refreshInterval}
                        onChange={(e) => setSettings({...settings, refreshInterval: parseInt(e.target.value)})}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications */}
            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <h2 className="text-h3 text-text-primary font-semibold">Notifications</h2>
                  <p className="text-text-secondary text-sm">Configure alert and notification preferences</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { key: "priceAlerts", label: "Price Alerts", desc: "Get notified when price targets are hit" },
                    { key: "signalAlerts", label: "Signal Alerts", desc: "Notifications when signals change" },
                    { key: "emailNotifications", label: "Email Notifications", desc: "Receive alerts via email" },
                    { key: "soundEffects", label: "Sound Effects", desc: "Play sounds for important events" },
                  ].map((item) => (
                    <div 
                      key={item.key}
                      className="flex items-center justify-between py-3 border-b border-border-subtle last:border-0"
                    >
                      <div>
                        <Label className="text-text-primary">{item.label}</Label>
                        <p className="text-text-secondary text-sm mt-1">{item.desc}</p>
                      </div>
                      <Switch 
                        checked={settings[item.key as keyof typeof settings] as boolean}
                        onCheckedChange={(checked) => 
                          setSettings({...settings, [item.key]: checked})
                        }
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Display */}
            <TabsContent value="display">
              <Card>
                <CardHeader>
                  <h2 className="text-h3 text-text-primary font-semibold">Display Settings</h2>
                  <p className="text-text-secondary text-sm">Customize chart and interface appearance</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { key: "showVolume", label: "Show Volume", desc: "Display volume bars on charts" },
                    { key: "showGrid", label: "Show Grid", desc: "Display grid lines on charts" },
                    { key: "compactMode", label: "Compact Mode", desc: "Reduce padding for denser layout" },
                  ].map((item) => (
                    <div 
                      key={item.key}
                      className="flex items-center justify-between py-3 border-b border-border-subtle last:border-0"
                    >
                      <div>
                        <Label className="text-text-primary">{item.label}</Label>
                        <p className="text-text-secondary text-sm mt-1">{item.desc}</p>
                      </div>
                      <Switch 
                        checked={settings[item.key as keyof typeof settings] as boolean}
                        onCheckedChange={(checked) => 
                          setSettings({...settings, [item.key]: checked})
                        }
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* API */}
            <TabsContent value="api">
              <Card>
                <CardHeader>
                  <h2 className="text-h3 text-text-primary font-semibold">API Configuration</h2>
                  <p className="text-text-secondary text-sm">Configure backend connection settings</p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>API Endpoint</Label>
                    <Input 
                      value={settings.apiEndpoint}
                      onChange={(e) => setSettings({...settings, apiEndpoint: e.target.value})}
                      placeholder="http://localhost:8000"
                    />
                    <p className="text-text-tertiary text-xs">
                      The URL of your GloryPicks backend server
                    </p>
                  </div>

                  <div className="flex items-center justify-between py-4 border-t border-border-subtle">
                    <div>
                      <Label className="text-text-primary">WebSocket Connection</Label>
                      <p className="text-text-secondary text-sm mt-1">
                        Enable real-time data streaming
                      </p>
                    </div>
                    <Switch 
                      checked={settings.websocketEnabled}
                      onCheckedChange={(checked) => setSettings({...settings, websocketEnabled: checked})}
                    />
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-border-subtle">
                    <Button 
                      variant="secondary" 
                      leftIcon={<RefreshCw className="h-4 w-4" />}
                    >
                      Test Connection
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Save Button */}
          <div className="mt-8 flex justify-end gap-3">
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
      </main>

      <StatusBar />
    </div>
  );
}

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Bell, 
  Mail, 
  Smartphone, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Clock,
  Save,
  Loader2,
  CheckCircle2
} from 'lucide-react';

export function NotificationSettings() {
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Fetch notification preferences
  const { data: preferences, isLoading, refetch } = trpc.notifications.getPreferences.useQuery();

  // Local state for form
  const [globalSettings, setGlobalSettings] = useState({
    emailNotificationsEnabled: true,
    pushNotificationsEnabled: true,
    notifyOnEntry: true,
    notifyOnExit: true,
    notifyOnProfit: true,
    notifyOnLoss: true,
    quietHoursStart: '',
    quietHoursEnd: '',
  });

  const [strategySettings, setStrategySettings] = useState<Record<number, { emailEnabled: boolean; pushEnabled: boolean }>>({});

  // Update local state when data loads
  useEffect(() => {
    if (preferences) {
      setGlobalSettings({
        emailNotificationsEnabled: preferences.global.emailNotificationsEnabled,
        pushNotificationsEnabled: preferences.global.pushNotificationsEnabled,
        notifyOnEntry: preferences.global.notifyOnEntry,
        notifyOnExit: preferences.global.notifyOnExit,
        notifyOnProfit: preferences.global.notifyOnProfit,
        notifyOnLoss: preferences.global.notifyOnLoss,
        quietHoursStart: preferences.global.quietHoursStart || '',
        quietHoursEnd: preferences.global.quietHoursEnd || '',
      });
      
      const stratSettings: Record<number, { emailEnabled: boolean; pushEnabled: boolean }> = {};
      preferences.strategies.forEach(s => {
        stratSettings[s.id] = { emailEnabled: s.emailEnabled, pushEnabled: s.pushEnabled };
      });
      setStrategySettings(stratSettings);
    }
  }, [preferences]);

  // Mutations
  const updateGlobalMutation = trpc.notifications.updateGlobalPreferences.useMutation({
    onSuccess: () => {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      setHasChanges(false);
      refetch();
    },
  });

  const toggleStrategyMutation = trpc.notifications.toggleStrategy.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const handleGlobalChange = (key: keyof typeof globalSettings, value: boolean | string) => {
    setGlobalSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleStrategyToggle = (strategyId: number, field: 'emailEnabled' | 'pushEnabled', value: boolean) => {
    setStrategySettings(prev => ({
      ...prev,
      [strategyId]: { ...prev[strategyId], [field]: value },
    }));
    
    toggleStrategyMutation.mutate({
      strategyId,
      [field]: value,
    });
  };

  const handleSaveGlobal = () => {
    updateGlobalMutation.mutate({
      emailNotificationsEnabled: globalSettings.emailNotificationsEnabled,
      pushNotificationsEnabled: globalSettings.pushNotificationsEnabled,
      notifyOnEntry: globalSettings.notifyOnEntry,
      notifyOnExit: globalSettings.notifyOnExit,
      notifyOnProfit: globalSettings.notifyOnProfit,
      notifyOnLoss: globalSettings.notifyOnLoss,
      quietHoursStart: globalSettings.quietHoursStart || null,
      quietHoursEnd: globalSettings.quietHoursEnd || null,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const strategies = preferences?.strategies || [];

  return (
    <div className="space-y-6">
      {/* Global Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Global Notification Settings
          </CardTitle>
          <CardDescription>
            Control how and when you receive notifications across all strategies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Notification Channels */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Notification Channels</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-blue-500/10">
                    <Mail className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <Label className="font-medium">Email Notifications</Label>
                    <p className="text-xs text-muted-foreground">Receive alerts via email</p>
                  </div>
                </div>
                <Switch
                  checked={globalSettings.emailNotificationsEnabled}
                  onCheckedChange={(checked) => handleGlobalChange('emailNotificationsEnabled', checked)}
                />
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-green-500/10">
                    <Smartphone className="h-4 w-4 text-green-500" />
                  </div>
                  <div>
                    <Label className="font-medium">Push Notifications</Label>
                    <p className="text-xs text-muted-foreground">Receive in-app alerts</p>
                  </div>
                </div>
                <Switch
                  checked={globalSettings.pushNotificationsEnabled}
                  onCheckedChange={(checked) => handleGlobalChange('pushNotificationsEnabled', checked)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Notification Types */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Notification Types</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <Label>Trade Entries</Label>
                </div>
                <Switch
                  checked={globalSettings.notifyOnEntry}
                  onCheckedChange={(checked) => handleGlobalChange('notifyOnEntry', checked)}
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  <Label>Trade Exits</Label>
                </div>
                <Switch
                  checked={globalSettings.notifyOnExit}
                  onCheckedChange={(checked) => handleGlobalChange('notifyOnExit', checked)}
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-500" />
                  <Label>Profitable Trades</Label>
                </div>
                <Switch
                  checked={globalSettings.notifyOnProfit}
                  onCheckedChange={(checked) => handleGlobalChange('notifyOnProfit', checked)}
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-red-500" />
                  <Label>Losing Trades</Label>
                </div>
                <Switch
                  checked={globalSettings.notifyOnLoss}
                  onCheckedChange={(checked) => handleGlobalChange('notifyOnLoss', checked)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Quiet Hours */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-medium text-muted-foreground">Quiet Hours (Optional)</h4>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={globalSettings.quietHoursStart}
                  onChange={(e) => handleGlobalChange('quietHoursStart', e.target.value)}
                  placeholder="22:00"
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={globalSettings.quietHoursEnd}
                  onChange={(e) => handleGlobalChange('quietHoursEnd', e.target.value)}
                  placeholder="07:00"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Notifications will be silenced during quiet hours (timezone: America/New_York)
            </p>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button 
              onClick={handleSaveGlobal} 
              disabled={!hasChanges || updateGlobalMutation.isPending}
              className="min-w-[140px]"
            >
              {updateGlobalMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : saveSuccess ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Saved!
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Per-Strategy Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Strategy Notifications
          </CardTitle>
          <CardDescription>
            Enable or disable notifications for each strategy individually
          </CardDescription>
        </CardHeader>
        <CardContent>
          {strategies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No strategies available</p>
              <p className="text-sm">Subscribe to strategies to configure their notifications</p>
            </div>
          ) : (
            <div className="space-y-3">
              {strategies.map((strategy) => {
                const settings = strategySettings[strategy.id] || { emailEnabled: strategy.emailEnabled, pushEnabled: strategy.pushEnabled };
                return (
                  <div 
                    key={strategy.id} 
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-primary/10">
                        <TrendingUp className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{strategy.name}</p>
                        <p className="text-xs text-muted-foreground">{strategy.symbol}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <Switch
                          checked={settings.emailEnabled}
                          onCheckedChange={(checked) => handleStrategyToggle(strategy.id, 'emailEnabled', checked)}
                          disabled={!globalSettings.emailNotificationsEnabled}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-muted-foreground" />
                        <Switch
                          checked={settings.pushEnabled}
                          onCheckedChange={(checked) => handleStrategyToggle(strategy.id, 'pushEnabled', checked)}
                          disabled={!globalSettings.pushNotificationsEnabled}
                        />
                      </div>
                      {(settings.emailEnabled || settings.pushEnabled) && (
                        <Badge variant="secondary" className="ml-2">
                          Active
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

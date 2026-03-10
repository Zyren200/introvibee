import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';

const AccountSecuritySection = ({ settings, accountEmail, onUpdate, onDeleteAccount }) => {
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const displayEmail = typeof accountEmail === 'string' && accountEmail.trim()
    ? accountEmail.trim()
    : 'No email on file';

  const handlePasswordChange = () => {
    if (passwordData?.new === passwordData?.confirm) {
      alert('Password updated successfully!');
      setShowPasswordFields(false);
      setPasswordData({ current: '', new: '', confirm: '' });
    } else {
      alert('New passwords do not match');
    }
  };

  const handleDataExport = () => {
    onUpdate({ dataExportRequested: true });
    alert('Data export request received. You will receive an email with your data within 24 hours.');
  };

  const handleDeleteAccount = () => {
    setShowDeleteConfirm(false);
    const result = onDeleteAccount
      ? onDeleteAccount()
      : { success: false, error: 'Delete account is currently unavailable.' };

    if (!result?.success) {
      alert(result?.error || 'Failed to delete account. Please try again.');
    }
  };

  return (
    <div className="bg-card rounded-xl p-6 border border-border shadow-gentle transition-gentle hover:shadow-gentle-md">
      <div className="flex items-start space-x-4 mb-6">
        <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center flex-shrink-0">
          <Icon name="Shield" size={24} color="var(--color-success)" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-heading font-semibold text-foreground mb-2">
            Account Security Management
          </h2>
          <p className="text-muted-foreground font-body text-sm">
            Manage your account security, privacy settings, and data preferences
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center justify-between mb-2">
              <div>
                <div className="font-body font-medium text-foreground">Email Address</div>
                <div className="text-sm text-muted-foreground caption">{displayEmail}</div>
              </div>
            <Icon name="CheckCircle" size={20} color="var(--color-success)" />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-body font-medium text-foreground">Password</div>
              <div className="text-sm text-muted-foreground caption">Last updated 30 days ago</div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPasswordFields(!showPasswordFields)}
            >
              {showPasswordFields ? 'Cancel' : 'Change Password'}
            </Button>
          </div>

          {showPasswordFields && (
            <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
              <Input
                type="password"
                label="Current Password"
                value={passwordData?.current}
                onChange={(e) => setPasswordData({ ...passwordData, current: e?.target?.value })}
                required
              />
              <Input
                type="password"
                label="New Password"
                value={passwordData?.new}
                onChange={(e) => setPasswordData({ ...passwordData, new: e?.target?.value })}
                description="At least 8 characters with letters and numbers"
                required
              />
              <Input
                type="password"
                label="Confirm New Password"
                value={passwordData?.confirm}
                onChange={(e) => setPasswordData({ ...passwordData, confirm: e?.target?.value })}
                required
              />
              <Button
                variant="default"
                onClick={handlePasswordChange}
                iconName="Lock"
                fullWidth
              >
                Update Password
              </Button>
            </div>
          )}
        </div>

        <div className="p-4 bg-muted/30 rounded-lg">
          <Checkbox
            checked={settings?.twoFactorEnabled}
            onChange={(e) => onUpdate({ twoFactorEnabled: e?.target?.checked })}
            label="Two-Factor Authentication"
            description="Add an extra layer of security to your account with 2FA"
          />
        </div>

        <div className="border-t border-border pt-6">
          <h3 className="font-body font-semibold text-foreground mb-4">Privacy & Data</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center space-x-3">
                <Icon name="Download" size={20} color="var(--color-foreground)" />
                <div>
                  <div className="font-body font-medium text-foreground">Export Your Data</div>
                  <div className="text-sm text-muted-foreground caption">Download a copy of your personal data</div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDataExport}
              >
                Request Export
              </Button>
            </div>

            <div className="p-4 bg-error/5 border border-error/20 rounded-lg">
              <div className="flex items-start space-x-3 mb-4">
                <Icon name="AlertTriangle" size={20} color="var(--color-error)" className="flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-body font-semibold text-foreground mb-1">Delete Account</div>
                  <div className="text-sm text-muted-foreground caption">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </div>
                </div>
              </div>
              
              {!showDeleteConfirm ? (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Delete Account
                </Button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-error font-body">
                    Are you sure? This will permanently delete your account.
                  </p>
                  <div className="flex space-x-2">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={handleDeleteAccount}
                    >
                      Yes, Delete My Account
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg flex items-start space-x-3">
          <Icon name="Lock" size={18} color="var(--color-primary)" className="flex-shrink-0 mt-0.5" />
          <div className="text-sm text-foreground font-body">
            <strong>Your Privacy Matters:</strong> We use industry-standard encryption to protect your data. Your information is never shared with third parties without your explicit consent.
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountSecuritySection;

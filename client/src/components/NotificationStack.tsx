import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export interface Notification {
  id: string;
  title: string;
  description?: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  duration?: number; // milliseconds, default 5000
  icon?: React.ReactNode;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
}

export const NotificationContext = React.createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (notification: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const duration = notification.duration ?? 5000;

    setNotifications(prev => [...prev, { ...notification, id, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification }}>
      {children}
      <NotificationStack notifications={notifications} onRemove={removeNotification} />
    </NotificationContext.Provider>
  );
}

function NotificationStack({ notifications, onRemove }: { notifications: Notification[]; onRemove: (id: string) => void }) {
  const getBackgroundColor = (type?: string) => {
    switch (type) {
      case 'success':
        return 'oklch(35% 0.18 145 / 95%)';
      case 'error':
        return 'oklch(35% 0.18 25 / 95%)';
      case 'warning':
        return 'oklch(50% 0.18 70 / 95%)';
      case 'info':
      default:
        return 'oklch(22% 0.030 55 / 95%)';
    }
  };

  const getTextColor = (type?: string) => {
    switch (type) {
      case 'success':
        return 'oklch(85% 0.15 145)';
      case 'error':
        return 'oklch(85% 0.15 25)';
      case 'warning':
        return 'oklch(85% 0.15 70)';
      case 'info':
      default:
        return 'oklch(96.2% 0.012 75)';
    }
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 lg:left-auto lg:right-4 lg:w-96 z-50 flex flex-col gap-2 pointer-events-none">
      {notifications.map((notification, index) => (
        <div
          key={notification.id}
          className="animate-in slide-in-from-bottom-4 fade-in duration-300 pointer-events-auto"
          style={{
            background: getBackgroundColor(notification.type),
            animation: `slideUp 0.3s ease-out`,
          }}
        >
          <div className="rounded-lg p-4 flex items-start gap-3 backdrop-blur-sm border border-white/10">
            {notification.icon && (
              <div className="flex-shrink-0 mt-0.5">
                {notification.icon}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm" style={{ color: getTextColor(notification.type) }}>
                {notification.title}
              </h3>
              {notification.description && (
                <p className="text-xs mt-1 opacity-90" style={{ color: getTextColor(notification.type) }}>
                  {notification.description}
                </p>
              )}
            </div>
            <button
              onClick={() => onRemove(notification.id)}
              className="flex-shrink-0 p-1 hover:bg-white/10 rounded transition-colors"
              aria-label="Fechar notificação"
            >
              <X className="w-4 h-4" style={{ color: getTextColor(notification.type) }} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function useNotification() {
  const context = React.useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification deve ser usado dentro de NotificationProvider');
  }
  return context;
}



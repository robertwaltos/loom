import { describe, expect, it } from 'vitest';
import { createDynastyNotificationService } from '../dynasty-notification.js';

describe('dynasty notification simulation', () => {
  it('simulates campaign notifications and read lifecycle', () => {
    let time = 100;
    let id = 0;
    const svc = createDynastyNotificationService({
      clock: { nowMicroseconds: () => time++ },
      idGenerator: { next: () => 'n-' + String(id++) },
    });

    const a = svc.send({ dynastyId: 'd1', type: 'info', title: 'Welcome', body: 'Start here' });
    svc.send({ dynastyId: 'd1', type: 'economy', title: 'Treasury update', body: 'Yield +2%' });
    svc.send({ dynastyId: 'd1', type: 'warning', title: 'Border threat', body: 'Scout report' });

    expect(svc.getUnreadCount('d1')).toBe(3);

    svc.markRead(a.notificationId);

    const unread = svc.getForDynasty('d1', { unreadOnly: true });
    const economy = svc.getForDynasty('d1', { type: 'economy' });

    expect(unread).toHaveLength(2);
    expect(economy).toHaveLength(1);
    expect(svc.getStats().totalNotifications).toBe(3);
  });
});

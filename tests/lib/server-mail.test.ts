import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getAuthEnv: vi.fn(),
  createTransport: vi.fn(),
  sendMail: vi.fn(),
  info: vi.fn()
}));

vi.mock('../../src/lib/server/auth-env', () => ({
  getAuthEnv: mocks.getAuthEnv
}));

vi.mock('nodemailer', () => ({
  default: {
    createTransport: mocks.createTransport
  }
}));

describe('sendMail', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubGlobal('console', {
      ...console,
      info: mocks.info
    });
  });

  it('sends mail through SMTP when the mail environment is configured', async () => {
    mocks.getAuthEnv.mockReturnValue({
      mailFrom: 'noreply@example.com',
      smtpHost: 'smtp.example.com',
      smtpPort: 587,
      smtpSecure: true,
      smtpUser: 'mailer',
      smtpPass: 'secret'
    });
    mocks.createTransport.mockReturnValue({
      sendMail: mocks.sendMail
    });

    const { sendMail } = await import('../../src/lib/server/mail');

    await sendMail({
      to: 'user@example.com',
      subject: 'Reset password',
      text: 'Use this link'
    });

    expect(mocks.createTransport).toHaveBeenCalledTimes(1);
    expect(mocks.createTransport).toHaveBeenCalledWith({
      host: 'smtp.example.com',
      port: 587,
      secure: true,
      auth: {
        user: 'mailer',
        pass: 'secret'
      }
    });
    expect(mocks.sendMail).toHaveBeenCalledWith({
      from: 'noreply@example.com',
      to: 'user@example.com',
      subject: 'Reset password',
      text: 'Use this link'
    });
    expect(mocks.info).not.toHaveBeenCalled();
  });

  it('reuses the cached transporter across sends', async () => {
    mocks.getAuthEnv.mockReturnValue({
      mailFrom: 'noreply@example.com',
      smtpHost: 'smtp.example.com',
      smtpPort: 587,
      smtpSecure: false,
      smtpUser: 'mailer',
      smtpPass: 'secret'
    });
    mocks.createTransport.mockReturnValue({
      sendMail: mocks.sendMail
    });

    const { sendMail } = await import('../../src/lib/server/mail');

    await sendMail({ to: 'first@example.com', subject: 'One', text: 'First' });
    await sendMail({ to: 'second@example.com', subject: 'Two', text: 'Second' });

    expect(mocks.createTransport).toHaveBeenCalledTimes(1);
    expect(mocks.sendMail).toHaveBeenCalledTimes(2);
  });

  it('logs a preview instead of sending when mail is not configured', async () => {
    mocks.getAuthEnv.mockReturnValue({
      mailFrom: '',
      smtpHost: '',
      smtpPort: undefined,
      smtpSecure: false,
      smtpUser: '',
      smtpPass: ''
    });

    const { sendMail } = await import('../../src/lib/server/mail');

    await sendMail({
      to: 'user@example.com',
      subject: 'Reset password',
      text: 'Use this link'
    });

    expect(mocks.createTransport).not.toHaveBeenCalled();
    expect(mocks.sendMail).not.toHaveBeenCalled();
    expect(mocks.info).toHaveBeenCalledWith([
      '[mail stub]',
      'to=user@example.com',
      'subject=Reset password',
      'Use this link'
    ].join('\n'));
  });
});
